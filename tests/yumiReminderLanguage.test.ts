import { describe, expect, it } from "vitest";

import { yumiReminderCopy } from "@/lib/push/yumiReminderCopy";

/* =========================================================
   Yumi's reminder arrives in the reader's own two languages

   It was one hardcoded string sent to everybody — "Yumi 想你了 · Yumi misses
   you" — so a reader whose interface is Spanish and who is learning Italian
   was reminded in neither of their languages.

   Bilingual on purpose, and still bilingual: the interface language so the
   reminder is understood, and the language being learned because a
   notification is a free moment of contact with it.
   ========================================================= */

describe("writing Yumi's reminder", () => {
  it("uses the interface language and the language being learned", async () => {
    const copy = await yumiReminderCopy("spanish", "it");

    expect(copy.title).toBe("Yumi te echa de menos · Manchi a Yumi");
    expect(copy.body).toContain("galleta-palabra");
    expect(copy.body).toContain("biscotto-parola");
  });

  it("reads in the other direction too", async () => {
    const copy = await yumiReminderCopy("traditional-chinese", "fr");

    expect(copy.title).toBe("Yumi 想你了 · Vous manquez à Yumi");
  });

  /*
   * The case that only shows up on the one account nobody tested with.
   */
  it("says it once when both languages are the same", async () => {
    const copy = await yumiReminderCopy("english", "en");

    expect(copy.title).toBe("Yumi misses you");
    expect(copy.title).not.toContain("·");
    expect(copy.body).not.toContain("·");
  });

  it("says it once when the reader has no learning language yet", async () => {
    const copy = await yumiReminderCopy("french", null);

    expect(copy.title).toBe("Vous manquez à Yumi");
    expect(copy.title).not.toContain("·");
  });

  it("never leaves the reminder empty", async () => {
    for (const language of [
      "english",
      "traditional-chinese",
      "spanish",
      "french",
      "italian",
    ] as const) {
      const copy = await yumiReminderCopy(language, null);

      expect(copy.title.trim(), language).not.toBe("");
      expect(copy.body.trim(), language).not.toBe("");
    }
  });

  /*
   * Every pairing a reader can actually be in — five interfaces against five
   * learning languages. The bilingual ones must genuinely carry two
   * sentences, not the same one twice because a dictionary was missed.
   */
  it("produces two distinct halves for every mixed pairing", async () => {
    const interfaces = [
      "english",
      "traditional-chinese",
      "spanish",
      "french",
      "italian",
    ] as const;
    const learning = ["en", "zh-TW", "es", "fr", "it"] as const;

    const codeFor = {
      english: "en",
      "traditional-chinese": "zh-TW",
      spanish: "es",
      french: "fr",
      italian: "it",
    } as const;

    for (const ui of interfaces) {
      for (const code of learning) {
        const copy = await yumiReminderCopy(ui, code);
        const pairing = `${ui} + ${code}`;

        if (codeFor[ui] === code) {
          expect(copy.title, pairing).not.toContain("·");
          continue;
        }

        expect(copy.title, pairing).toContain(" · ");
        const [first, second] = copy.title.split(" · ");
        expect(first, pairing).not.toBe(second);
      }
    }
  });
});
