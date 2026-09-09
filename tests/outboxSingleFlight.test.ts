import { beforeEach, describe, expect, it, vi } from "vitest";

import { STORES, clearStore } from "@/lib/offline/db";
import { queueMutation, readOutbox } from "@/lib/offline/vocabulary";

/* =========================================================
   One reconnection, one replay

   Two things start a flush — the app mounting, and the `online` event — and
   the ordinary case is both at once: a reader opens the app as the signal
   comes back. Nothing stopped them overlapping, so each held its own copy of
   the outbox, read before the other had emptied it, and every queued change
   went to the server twice.

   Three queued changes produced six sends. Duplicate inserts came back as
   23505, which this module correctly treats as terminal, so a completely
   normal reconnection logged "Dropped an offline change the server refused"
   and counted work as discarded that had in fact been done — and both runs
   reported having sent everything, so the caller re-read the whole library
   twice.
   ========================================================= */

const server = vi.hoisted(() => ({
  sends: [] as string[],
  latencyMs: 0,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const result = (payload?: unknown) => {
      const fields = payload as Record<string, unknown> | undefined;
      server.sends.push(
        fields && "status" in fields ? String(fields.status) : "other",
      );

      return new Promise((resolve) =>
        setTimeout(() => resolve({ error: null }), server.latencyMs),
      );
    };

    const chain = {
      insert: result,
      update: (payload: unknown) => ({ eq: () => result(payload) }),
      delete: () => ({ eq: () => result() }),
    };

    return { from: () => chain };
  },
}));

const { flushOutbox } = await import("@/lib/offline/sync");

beforeEach(async () => {
  await clearStore(STORES.outbox);
  server.sends = [];
  server.latencyMs = 20;
});

describe("flushing while a flush is already running", () => {
  it("sends each change once, however many callers ask", async () => {
    await queueMutation({ kind: "status", itemId: "w1", status: "learning" });
    await queueMutation({ kind: "status", itemId: "w2", status: "new" });
    await queueMutation({ kind: "status", itemId: "w3", status: "mastered" });

    // Mounting, then the signal coming back a moment later.
    const onMount = flushOutbox();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const onOnline = flushOutbox();

    const [mounted, online] = await Promise.all([onMount, onOnline]);

    expect(server.sends).toEqual(["learning", "new", "mastered"]);
    expect(await readOutbox()).toHaveLength(0);

    // Both callers get the same true answer rather than each claiming the
    // whole queue for itself.
    expect(mounted.sent).toBe(3);
    expect(mounted.dropped).toBe(0);
    expect(online).toEqual(mounted);
  });

  it("still sends a word saved while the flush was in the air", async () => {
    await queueMutation({ kind: "status", itemId: "w1", status: "learning" });

    const flushing = flushOutbox();

    // The reader saves something mid-flush. The pass already running is
    // working from a copy of the outbox that predates it.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await queueMutation({ kind: "status", itemId: "w2", status: "mastered" });

    const result = await flushing;

    expect(server.sends).toEqual(["learning", "mastered"]);
    expect(result.sent).toBe(2);
    expect(await readOutbox()).toHaveLength(0);
  });

  it("starts a fresh run once the previous one has finished", async () => {
    await queueMutation({ kind: "status", itemId: "w1", status: "learning" });
    await flushOutbox();

    await queueMutation({ kind: "status", itemId: "w2", status: "mastered" });
    const second = await flushOutbox();

    expect(server.sends).toEqual(["learning", "mastered"]);
    expect(second.sent).toBe(1);
  });
});
