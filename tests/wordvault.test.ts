import { describe, expect, it } from "vitest";

import type { HangyumiRound } from "@/lib/hangyumi/rules";
import { createPreviewHangyumi, type PracticeWord } from "@/lib/hangyumi/service";
import { VAULT_PIECES, plan, progress } from "@/lib/wordvault/presentation";

/* =========================================================
   Yumi Wordvault's rounds (lib/wordvault/presentation.ts)

   The same server rounds as Hangyumi, read as a walk to a chest: a step
   for each place a letter fills, a copy of her U, I or O for each miss.
   These pin the show, and that the show never pays: the cookies are what
   the server said, shared with Hangyumi (Codex wrote the first of these
   for its preview; kept, and run against the shared service).
   ========================================================= */

const word: PracticeWord = { language: "en", level: "B1", answer: "apple", partOfSpeech: "noun", clues: { en: "a fruit" } };
const start = async (service: ReturnType<typeof createPreviewHangyumi>, id: string) =>
  (await service.start({ roundId: id, language: "en", level: "B1", hintLanguage: "en" })) as HangyumiRound;

describe("Wordvault's rounds", () => {
  it("sends the copies out U, I, O, where Hangyumi hangs O, I, U", () => {
    expect(VAULT_PIECES).toEqual(["body", "arm", "eye"]);
  });

  it("walks two steps for the P of APPLE, and pays it once", async () => {
    const service = createPreviewHangyumi({ words: [word], delayMs: 0 });
    const before = await start(service, "a");
    const after = await service.guess("a", "p");
    expect(plan(before, after).map(beat => beat.phase)).toEqual(["step", "step"]);
    expect(progress(after)).toEqual({ total: 5, revealed: 2, fraction: 0.4 });
    expect(after.paid.letter).toBe(3);
    // The same letter again: no show, no pay.
    expect(plan(after, await service.guess("a", "p"))).toEqual([]);
  });

  it("shares today's 333 with Hangyumi, and a word pays once in either game", async () => {
    const service = createPreviewHangyumi({ words: [word], delayMs: 0, earnedToday: 330 });
    await start(service, "hangyumi");
    await start(service, "wordvault");
    expect((await service.guess("hangyumi", "p")).paid.letter).toBe(3);
    expect((await service.guess("wordvault", "p")).paid.letter).toBe(0);
    expect((await service.guess("wordvault", "a")).paid.letter).toBe(0);
    expect((await service.today()).earned).toBe(333);
  });

  it("pays a word's letter once between the games, under the cap too", async () => {
    const service = createPreviewHangyumi({ words: [word], delayMs: 0 });
    await start(service, "hang");
    await start(service, "vault");
    await service.guess("hang", "p");
    expect((await service.guess("vault", "p")).paid.already).toBe(true);
  });

  it("brings every copy home after a loss, without the shown answer carrying her to the chest", async () => {
    const service = createPreviewHangyumi({ words: [word], delayMs: 0 });
    let before = await start(service, "a");
    for (const char of ["p", "x", "y"]) before = await service.guess("a", char);
    const after = await service.guess("a", "z");
    const beats = plan(before, after);
    expect(beats.map(beat => beat.phase)).toEqual(["projectile", "restore", "recover"]);
    expect(beats[0].piece).toBe(2);
    expect(progress(after).fraction).toBe(0.4);
    expect(after.earned).toBe(3);
  });

  it("brings the copies home before the key and the lock, and the show mints nothing", async () => {
    const service = createPreviewHangyumi({ words: [word], delayMs: 0 });
    let before = await start(service, "a");
    for (const char of ["x", "a", "p", "l"]) before = await service.guess("a", char);
    const after = await service.guess("a", "e");
    expect(after.paid.word).toBe(9);
    expect(plan(before, after).map(beat => beat.phase)).toEqual(["step", "restore", "key", "unlock", "celebrate"]);
    for (let i = 0; i < 5; i++) plan(before, after);
    expect((await service.today()).earned).toBe(21);
  });

  it("counts places, not keys: a Chinese character twice, an accented letter as itself", async () => {
    for (const [language, answer, guess] of [["zh-TW", "山山", "山"], ["fr", "été", "é"]] as const) {
      const service = createPreviewHangyumi({ words: [{ ...word, language, answer }], delayMs: 0 });
      const before = (await service.start({ roundId: "r", language, level: "B1", hintLanguage: "en" })) as HangyumiRound;
      const after = await service.guess("r", guess);
      expect(plan(before, after).filter(beat => beat.phase === "step")).toHaveLength(2);
      expect(after.paid.letter).toBe(3);
    }
  });
});
