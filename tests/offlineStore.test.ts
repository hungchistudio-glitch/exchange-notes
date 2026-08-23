import { beforeEach, describe, expect, it } from "vitest";

import { STORES, clearStore, readAll } from "@/lib/offline/db";
import {
  applyPending,
  draftVocabularyItem,
  forgetMutation,
  queueMutation,
  readMirror,
  readOutbox,
  searchLocal,
  writeMirror,
} from "@/lib/offline/vocabulary";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   The local copy

   Exchange Notes is used on trips, which is exactly where there is no
   signal. Every screen used to read straight from Supabase, and the
   service worker deliberately did not cache those calls, so offline the
   app opened and had nothing in it.
   ========================================================= */

function word(id: string, texts: Record<string, string>): VocabularyItem {
  return draftVocabularyItem({
    id,
    user_id: "u",
    texts,
    word: texts.en ?? "",
    translation: texts["zh-TW"] ?? "",
    created_at: `2026-08-${id.padStart(2, "0")}T00:00:00Z`,
  } as never);
}

describe("the mirror", () => {
  beforeEach(async () => {
    await clearStore(STORES.vocabulary);
    await clearStore(STORES.outbox);
  });

  it("keeps the reader's words across a closed app", async () => {
    await writeMirror([word("01", { en: "prison", it: "prigione" })]);

    const kept = await readMirror();

    expect(kept).toHaveLength(1);
    expect(kept[0].texts.it).toBe("prigione");
  });

  it("replaces rather than merges, so a deleted word does not come back", async () => {
    await writeMirror([word("01", { en: "one" }), word("02", { en: "two" })]);
    await writeMirror([word("01", { en: "one" })]);

    expect(await readMirror()).toHaveLength(1);
  });

  it("is never observed empty midway through a sync", async () => {
    await writeMirror([word("01", { en: "one" })]);

    // One transaction, not clear-then-write: an interrupted sync should
    // leave yesterday's copy intact rather than nothing at all.
    const write = writeMirror([word("02", { en: "two" }), word("03", { en: "three" })]);
    const during = await readMirror();
    await write;

    expect(during.length).toBeGreaterThan(0);
    expect(await readMirror()).toHaveLength(2);
  });
});

describe("the outbox", () => {
  beforeEach(async () => {
    await clearStore(STORES.outbox);
  });

  it("keeps changes made with no connection, in the order they were made", async () => {
    await queueMutation({ kind: "status", itemId: "a", status: "learning" });
    await queueMutation({ kind: "status", itemId: "a", status: "mastered" });

    const queued = await readOutbox();

    // Two edits to the same word have to land the same way round on the
    // server as they did on screen.
    expect(queued.map((m) => (m.kind === "status" ? m.status : null))).toEqual([
      "learning",
      "mastered",
    ]);
  });

  it("drops an entry once it has been delivered", async () => {
    await queueMutation({ kind: "delete", itemId: "a" });

    const [queued] = await readOutbox();
    await forgetMutation(queued.id!);

    expect(await readOutbox()).toHaveLength(0);
  });

  it("survives being read back as raw records", async () => {
    await queueMutation({ kind: "delete", itemId: "a" });

    expect(await readAll(STORES.outbox)).toHaveLength(1);
  });
});

describe("what a screen renders offline", () => {
  it("shows a word saved on a train as simply saved", async () => {
    const saved = word("09", { en: "tunnel" });

    const shown = applyPending([word("01", { en: "one" })], [
      { kind: "insert", at: "now", item: saved },
    ]);

    // No badge, no "pending" state. From the reader's side it is saved,
    // and it will be.
    expect(shown.map((item) => item.id)).toContain("09");
  });

  it("applies edits and removals in order", () => {
    const items = [word("01", { en: "one" }), word("02", { en: "two" })];

    const shown = applyPending(items, [
      { kind: "status", at: "1", itemId: "01", status: "learning" },
      { kind: "status", at: "2", itemId: "01", status: "mastered" },
      { kind: "delete", at: "3", itemId: "02" },
    ]);

    expect(shown).toHaveLength(1);
    expect(shown[0].status).toBe("mastered");
  });

  it("gives an offline word a real id, not one to be swapped later", () => {
    const draft = draftVocabularyItem({ user_id: "u" });

    // Everything written offline that refers to this word refers to this
    // id. An id that changes when the network returns is an id that was
    // wrong everywhere it was written down.
    expect(draft.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("finding a word with no connection", () => {
  const library = [
    word("01", { en: "consultancy", it: "consulenza" }),
    word("02", { en: "consult", it: "consultare" }),
    word("03", { en: "insult", it: "insulto" }),
  ];

  it("finds a word in any language it is held in", () => {
    expect(searchLocal(library, "consulenza")[0].texts.en).toBe("consultancy");
    expect(searchLocal(library, "insult")[0].texts.it).toBe("insulto");
  });

  it("puts an exact match above a word that merely starts the same", () => {
    // "consult" is also the start of "consultancy", and the reader who
    // typed it exactly meant it exactly.
    expect(searchLocal(library, "consult")[0].texts.en).toBe("consult");
  });

  it("still finds a long word by its middle", () => {
    expect(searchLocal(library, "sult").length).toBeGreaterThan(0);
  });

  it("finds nothing for nothing", () => {
    expect(searchLocal(library, "   ")).toEqual([]);
  });
});
