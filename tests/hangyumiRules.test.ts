import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DAILY_CAP, REWARDS, normalizeGuess, readGuess, readRound, readStart } from "@/lib/hangyumi/rules";
import { createPreviewHangyumi, type PracticeWord } from "@/lib/hangyumi/service";

/* =========================================================
   Hangyumi's rules, as the browser reads them and as the preview plays them

   The server is what pays (supabase/migrations/*_hangyumi.sql, tested in
   a rolled-back transaction before it was applied). Here: that the
   browser's copy of the numbers matches the migration's, that it reads
   the server's answers defensively, and that the in-memory preview plays
   by the same rules: accents are letters, a letter pays once, a word pays
   once a day whatever its level, the 333 is paid down to its last cookie,
   and a lost round keeps what it won.
   ========================================================= */

const migration = (() => {
  const dir = join(__dirname, "..", "supabase", "migrations");
  const file = readdirSync(dir).find(name => /_hangyumi\.sql$/.test(name));
  return readFileSync(join(dir, file!), "utf8");
})();

describe("the numbers", () => {
  it("match the server's", () => {
    expect(migration).toContain("when 'B1' then 3 when 'B2' then 6 when 'C1' then 9 when 'C2' then 12");
    expect(migration).toContain("private.hangyumi_letter_reward(p_level) * 3");
    for (const level of ["B1", "B2", "C1", "C2"] as const) expect(REWARDS[level].word).toBe(REWARDS[level].letter * 3);
    expect(REWARDS).toEqual({ B1: { letter: 3, word: 9 }, B2: { letter: 6, word: 18 }, C1: { letter: 9, word: 27 }, C2: { letter: 12, word: 36 } });
    expect(DAILY_CAP).toBe(333);
    expect(migration.match(/333/g)!.length).toBeGreaterThanOrEqual(5);
  });
});

describe("a key press", () => {
  it("merges case but keeps accents", () => {
    expect(normalizeGuess("É")).toBe("é");
    expect(normalizeGuess("é")).toBe("é");
    expect(normalizeGuess("é")).not.toBe(normalizeGuess("e"));
    expect(normalizeGuess("Œ")).toBe("œ");
    expect(normalizeGuess("學")).toBe("學");
  });

  it("is one letter or nothing", () => {
    expect(normalizeGuess("ab")).toBeNull();
    expect(normalizeGuess("-")).toBeNull();
    expect(normalizeGuess("3")).toBeNull();
    expect(normalizeGuess(" ")).toBeNull();
  });
});

describe("reading the server", () => {
  const playing = {
    id: "r1", status: "playing", language: "fr", level: "C1", partOfSpeech: "adj", hint: "x", hintLanguage: "zh-TW",
    slots: [{ letter: true, char: null }, { letter: false, char: "-" }], guessed: ["z"], wrong: ["z"], misses: 1,
    keyboard: null, earned: 0, rewards: { letter: 9, word: 27 }, today: { day: "2026-10-25", earned: 12, cap: 333, remaining: 321 },
    answer: "leaked",
  };

  it("never holds an answer while the round is on", () => {
    expect(readRound(playing).answer).toBeNull();
    expect(readRound({ ...playing, status: "lost" }).answer).toBe("leaked");
  });

  it("never holds the word's card while the round is on, and reads it once it is over", () => {
    const card = {
      ipa: "/efemɛʁ/",
      translations: { en: { text: "ephemeral", ipa: "/ɪˈfɛmərəl/" }, "zh-TW": { text: "短暫的", pinyin: "duǎn zàn de", zhuyin: "ㄉㄨㄢˇ ㄗㄢˋ ˙ㄉㄜ" }, de: { text: "vergänglich" } },
    };
    expect(readRound({ ...playing, card }).card).toBeNull();
    expect(readRound({ ...playing, status: "won", card }).card).toEqual({
      reading: { ipa: "/efemɛʁ/" },
      translations: {
        en: { text: "ephemeral", reading: { ipa: "/ɪˈfɛmərəl/" } },
        "zh-TW": { text: "短暫的", reading: { pinyin: "duǎn zàn de", zhuyin: "ㄉㄨㄢˇ ㄗㄢˋ ˙ㄉㄜ" } },
      },
    });
    // A word whose card is not written yet.
    expect(readRound({ ...playing, status: "lost" }).card).toBeNull();
  });

  it("knows a level with no approved words", () => {
    expect(readStart({ status: "missing", language: "it", level: "C2" })).toEqual({ status: "missing", language: "it", level: "C2" });
  });

  it("reads what a guess paid", () => {
    const result = readGuess({ ...playing, hit: true, paid: { letter: 9, word: 0, already: false, capped: false }, balance: 120 });
    expect(result.paid).toEqual({ letter: 9, word: 0, already: false, capped: false });
    expect(result.balance).toBe(120);
    expect(result.slots[1]).toEqual({ letter: false, char: "-" });
  });

  it("refuses a round it cannot read", () => {
    expect(() => readRound({ id: "r1", language: "de", level: "C1" })).toThrow();
  });
});

describe("the preview plays by the server's rules", () => {
  const words: PracticeWord[] = [
    { language: "fr", level: "C1", answer: "éphémère", partOfSpeech: "adj", clues: { en: "brief" } },
    { language: "fr", level: "C2", answer: "éphémère", partOfSpeech: "adj", clues: { en: "brief" } },
    { language: "en", level: "B1", answer: "well-being", partOfSpeech: "noun", clues: { en: "health" } },
  ];
  const start = (service: ReturnType<typeof createPreviewHangyumi>, roundId: string, language: "fr" | "en", level: "C1" | "C2" | "B1") =>
    service.start({ roundId, language, level, hintLanguage: "en" });

  it("treats é, è and e as three letters, and pays each once", async () => {
    const service = createPreviewHangyumi({ words, delayMs: 0 });
    await start(service, "a", "fr", "C1");
    const e = await service.guess("a", "e");
    expect(e.paid.letter).toBe(9);
    expect(e.slots.filter(slot => slot.char).map(slot => slot.char)).toEqual(["e"]);
    const capital = await service.guess("a", "É");
    expect(capital.paid.letter).toBe(9);
    expect(capital.slots.filter(slot => slot.char)).toHaveLength(3);
    const again = await service.guess("a", "é");
    expect(again.repeat).toBe(true);
    expect(again.paid.letter).toBe(0);
  });

  it("pays the word's bonus on finishing, and never twice a day, whatever the level", async () => {
    const service = createPreviewHangyumi({ words, delayMs: 0 });
    await start(service, "a", "fr", "C1");
    let last;
    for (const letter of ["é", "p", "h", "m", "è", "r", "e"]) last = await service.guess("a", letter);
    expect(last!.status).toBe("won");
    expect(last!.paid.word).toBe(27);
    expect(last!.earned).toBe(7 * 9 + 27);
    expect(last!.answer).toBe("éphémère");

    await start(service, "b", "fr", "C2");
    const replay = await service.guess("b", "é");
    expect(replay.paid.letter).toBe(0);
    expect(replay.paid.already).toBe(true);
  });

  it("pays only what is left of the 333", async () => {
    const service = createPreviewHangyumi({ words, delayMs: 0, earnedToday: 331 });
    await start(service, "a", "fr", "C1");
    const first = await service.guess("a", "é");
    expect(first.paid).toMatchObject({ letter: 2, capped: true });
    expect(first.today.remaining).toBe(0);
    const second = await service.guess("a", "p");
    expect(second.paid).toMatchObject({ letter: 0, capped: true });
  });

  it("shows a hyphen from the start, ends on the third miss, and keeps what was won", async () => {
    const service = createPreviewHangyumi({ words, delayMs: 0 });
    const round = await start(service, "a", "en", "B1");
    expect(round.status !== "missing" && round.slots[4]).toEqual({ letter: false, char: "-" });
    await service.guess("a", "w");
    await service.guess("a", "x");
    await service.guess("a", "q");
    const lost = await service.guess("a", "z");
    expect(lost.status).toBe("lost");
    expect(lost.misses).toBe(3);
    expect(lost.earned).toBe(3);
    expect(lost.answer).toBe("well-being");
    expect((await service.guess("a", "e")).repeat).toBe(true);
  });

  it("says when a level has nothing approved", async () => {
    const service = createPreviewHangyumi({ words, delayMs: 0 });
    expect(await service.start({ roundId: "a", language: "it", level: "B1", hintLanguage: "en" }))
      .toEqual({ status: "missing", language: "it", level: "B1" });
  });
});
