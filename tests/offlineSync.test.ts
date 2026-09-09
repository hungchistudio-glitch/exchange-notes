import { beforeEach, describe, expect, it, vi } from "vitest";

import { STORES, clearStore } from "@/lib/offline/db";
import { queueMutation, readOutbox } from "@/lib/offline/vocabulary";

/* =========================================================
   Telling the server what happened while it was away

   Two kinds of failure, and treating them the same is how a queue either
   loses a reader's work or never drains. A request that never reached
   anyone is fine and will go through later. A request the server actively
   refused will be refused identically forever.
   ========================================================= */

const server = vi.hoisted(() => ({
  calls: 0,
  answer: null as { code?: string; message?: string } | null,
  throwNetwork: false,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const result = () => {
      server.calls += 1;
      if (server.throwNetwork) throw new TypeError("Failed to fetch");
      return Promise.resolve({ error: server.answer });
    };

    const chain = {
      insert: result,
      update: () => ({ eq: result }),
      delete: () => ({ eq: result }),
    };

    return { from: () => chain };
  },
}));

const { flushOutbox } = await import("@/lib/offline/sync");

describe("flushOutbox", () => {
  beforeEach(async () => {
    await clearStore(STORES.outbox);
    server.calls = 0;
    server.answer = null;
    server.throwNetwork = false;
  });

  it("sends what was saved with no connection, and forgets it once taken", async () => {
    await queueMutation({ kind: "delete", itemId: "a" });
    await queueMutation({ kind: "status", itemId: "b", status: "mastered" });

    const result = await flushOutbox();

    expect(result.sent).toBe(2);
    expect(await readOutbox()).toHaveLength(0);
  });

  it("keeps everything when there is still no connection", async () => {
    await queueMutation({ kind: "delete", itemId: "a" });
    server.throwNetwork = true;

    const result = await flushOutbox();

    // Nothing was delivered and nothing is lost. It goes next time.
    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(1);
    expect(await readOutbox()).toHaveLength(1);
  });

  it("stops at the first entry it cannot deliver, rather than skipping it", async () => {
    await queueMutation({ kind: "status", itemId: "a", status: "learning" });
    await queueMutation({ kind: "status", itemId: "a", status: "mastered" });

    server.throwNetwork = true;

    await flushOutbox();

    // The queue is ordered because the changes were. Sending the second
    // edit before the first is how a reader ends up with a value they
    // never chose.
    expect(await readOutbox()).toHaveLength(2);
  });

  it("drops a change the server refused, instead of retrying it forever", async () => {
    await queueMutation({ kind: "delete", itemId: "a" });
    // A check constraint will fail identically in an hour.
    server.answer = { code: "23514", message: "violates check constraint" };

    const result = await flushOutbox();

    expect(result.dropped).toBe(1);
    expect(await readOutbox()).toHaveLength(0);
  });

  it("treats an already-present row as delivered", async () => {
    await queueMutation({ kind: "delete", itemId: "a" });
    // A duplicate key means the word arrived — from another device, or
    // from a retry whose response was lost. That is success, not failure.
    server.answer = { code: "23505", message: "duplicate key" };

    await flushOutbox();

    expect(await readOutbox()).toHaveLength(0);
  });

  it("leaves a server error it does not recognise for another attempt", async () => {
    await queueMutation({ kind: "delete", itemId: "a" });
    server.answer = { code: "57014", message: "statement timeout" };

    const result = await flushOutbox();

    // A timeout is the server being busy, not the server saying no.
    expect(result.dropped).toBe(0);
    expect(await readOutbox()).toHaveLength(1);
  });

  it("does nothing, cheaply, when there is nothing to send", async () => {
    const result = await flushOutbox();

    expect(result).toEqual({ sent: 0, dropped: 0, remaining: 0 });
    expect(server.calls).toBe(0);
  });
});
