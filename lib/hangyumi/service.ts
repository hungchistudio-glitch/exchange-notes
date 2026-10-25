import type { SupabaseClient } from "@supabase/supabase-js";

import type { LanguageCode } from "@/lib/languages";

import {
  DAILY_CAP, MAX_MISSES, REWARDS, readGuess, readStart, readTodayState,
  type HangyumiGuessResult, type HangyumiLevel, type HangyumiRound, type HangyumiStart, type PartOfSpeech,
} from "./rules";

/* =========================================================
   Talking to Hangyumi's server functions

   hangyumi_start deals a word (or says the level has none approved yet),
   hangyumi_guess checks one letter and pays for it, hangyumi_today says
   how much of today's 333 is spent. Every call carries the reader's own
   session; the browser never sees the word bank.

   The preview service plays the same rules in memory, with a handful of
   practice words, for the review screen and the tests.
   ========================================================= */

export type HangyumiToday = ReturnType<typeof readTodayState>;

export type HangyumiService = {
  start(input: { roundId: string; language: LanguageCode; level: HangyumiLevel; hintLanguage: LanguageCode }): Promise<HangyumiStart>;
  guess(roundId: string, letter: string): Promise<HangyumiGuessResult>;
  today(): Promise<HangyumiToday>;
};

/** The database functions are not there: an old build against a new page, or the reverse. */
export class HangyumiClosedError extends Error {
  constructor() {
    super("Hangyumi's database functions are not available.");
    this.name = "HangyumiClosedError";
  }
}

function isMissingFunction(error: { code?: string } | null) {
  return error?.code === "PGRST202" || error?.code === "42883";
}

export function createSupabaseHangyumi(supabase: SupabaseClient): HangyumiService {
  async function call(name: string, args?: Record<string, unknown>) {
    const { data, error } = await supabase.rpc(name, args);
    if (isMissingFunction(error)) throw new HangyumiClosedError();
    if (error) throw new Error(error.message);
    return data;
  }

  return {
    async start({ roundId, language, level, hintLanguage }) {
      return readStart(await call("hangyumi_start", {
        p_round_id: roundId, p_language: language, p_level: level, p_hint_language: hintLanguage,
      }));
    },
    async guess(roundId, letter) {
      return readGuess(await call("hangyumi_guess", { p_round_id: roundId, p_char: letter }));
    },
    async today() {
      return readTodayState(await call("hangyumi_today"));
    },
  };
}

// ------------------------------------------------------------ preview

export type PracticeWord = {
  language: LanguageCode;
  level: HangyumiLevel;
  answer: string;
  partOfSpeech: PartOfSpeech;
  clues: Partial<Record<LanguageCode, string>>;
};

/** Practice words for the review screen only. The real bank never ships to a browser. */
export const PRACTICE_WORDS: PracticeWord[] = [
  { language: "en", level: "B1", answer: "well-being", partOfSpeech: "noun", clues: { en: "feeling healthy and happy", "zh-TW": "身心健康、過得好的狀態" } },
  { language: "en", level: "C2", answer: "ephemeral", partOfSpeech: "adj", clues: { en: "lasting for a very short time", "zh-TW": "只存在很短暫的時間" } },
  { language: "fr", level: "C1", answer: "éphémère", partOfSpeech: "adj", clues: { en: "lasting a very short time", "zh-TW": "只存在很短的時間" } },
  { language: "es", level: "B1", answer: "montaña", partOfSpeech: "noun", clues: { en: "a very high hill", "zh-TW": "非常高的山" } },
  { language: "it", level: "B1", answer: "città", partOfSpeech: "noun", clues: { en: "a large place with many people and buildings", "zh-TW": "人口多、建築密集的大地方" } },
  { language: "zh-TW", level: "B1", answer: "旅行", partOfSpeech: "noun", clues: { en: "going away from home to visit other places for pleasure", "zh-TW": "離開家，到別的地方去遊玩" } },
  { language: "zh-TW", level: "C2", answer: "畫蛇添足", partOfSpeech: "idiom", clues: { en: "spoiling something by adding what it did not need", "zh-TW": "多此一舉，反而把事情弄糟" } },
];

const isLetter = (char: string) => /\p{L}/u.test(char);
const lower = (value: string) => value.normalize("NFC").toLocaleLowerCase();

type PreviewRound = { id: string; word: PracticeWord; hintLanguage: LanguageCode; guessed: string[]; misses: number; status: HangyumiRound["status"]; earned: number; keyboard: string[] | null };

/** The same rules as the server, in memory, with nothing written anywhere. */
export function createPreviewHangyumi(options: { words?: PracticeWord[]; earnedToday?: number; delayMs?: number } = {}): HangyumiService {
  const words = options.words ?? PRACTICE_WORDS;
  const rounds = new Map<string, PreviewRound>();
  const awards = new Set<string>();
  let earnedToday = options.earnedToday ?? 0;
  let balance = 240;
  const delay = options.delayMs ?? 220;
  const settle = () => new Promise(resolve => setTimeout(resolve, delay));
  const day = new Date().toISOString().slice(0, 10);
  let turn = 0;

  function state(round: PreviewRound): HangyumiRound {
    const chars = [...round.word.answer.normalize("NFC")];
    const letters = chars.filter(isLetter).map(lower);
    return {
      id: round.id,
      status: round.status,
      language: round.word.language,
      level: round.word.level,
      partOfSpeech: round.word.partOfSpeech,
      hint: round.word.clues[round.hintLanguage] ?? round.word.clues.en ?? "",
      hintLanguage: round.hintLanguage,
      slots: chars.map(char => isLetter(char)
        ? { letter: true, char: round.status !== "playing" || round.guessed.includes(lower(char)) ? char : null }
        : { letter: false, char }),
      guessed: [...round.guessed],
      wrong: round.guessed.filter(g => !letters.includes(g)),
      misses: round.misses,
      keyboard: round.keyboard,
      earned: round.earned,
      rewards: REWARDS[round.word.level],
      today: { day, earned: earnedToday, cap: DAILY_CAP, remaining: Math.max(0, DAILY_CAP - earnedToday) },
      answer: round.status === "playing" ? null : round.word.answer,
    };
  }

  function pay(word: PracticeWord, event: string, amount: number) {
    const key = `${day}:${word.language}:${lower(word.answer)}:${event}`;
    const left = Math.max(0, DAILY_CAP - earnedToday);
    const paid = Math.min(amount, left);
    if (paid <= 0) return { paid: 0, already: false, capped: true };
    if (awards.has(key)) return { paid: 0, already: true, capped: paid < amount };
    awards.add(key);
    earnedToday += paid;
    balance += paid;
    return { paid, already: false, capped: paid < amount };
  }

  return {
    async start({ roundId, language, level, hintLanguage }) {
      await settle();
      const existing = rounds.get(roundId);
      if (existing) return state(existing);
      const choices = words.filter(word => word.language === language && word.level === level);
      if (!choices.length) return { status: "missing", language, level };
      const word = choices[turn++ % choices.length];
      let keyboard: string[] | null = null;
      if (language === "zh-TW") {
        const answerChars = [...new Set([...word.answer].filter(isLetter))];
        const extra = [..."山海光日月星雲風心學文天地時人路城夜雨花"].filter(c => !answerChars.includes(c));
        keyboard = [...answerChars, ...extra.slice(0, Math.max(0, 16 - answerChars.length))].sort(() => Math.random() - 0.5);
      }
      const round: PreviewRound = { id: roundId, word, hintLanguage, guessed: [], misses: 0, status: "playing", earned: 0, keyboard };
      rounds.set(roundId, round);
      return state(round);
    },
    async guess(roundId, input) {
      await settle();
      const round = rounds.get(roundId);
      if (!round) throw new Error("No such round.");
      const char = lower(input.trim());
      const nothing = { letter: 0, word: 0, already: false, capped: false };
      if (round.status !== "playing" || [...char].length !== 1 || !isLetter(char) || round.guessed.includes(char)
        || (round.keyboard && !round.keyboard.includes(char))) {
        return { ...state(round), hit: false, repeat: true, paid: nothing, balance };
      }
      const letters = [...new Set([...round.word.answer].filter(isLetter).map(lower))];
      const hit = letters.includes(char);
      round.guessed.push(char);
      const paid = { ...nothing };
      if (hit) {
        const letter = pay(round.word, `letter:${char}`, REWARDS[round.word.level].letter);
        paid.letter = letter.paid;
        paid.already ||= letter.already;
        paid.capped ||= letter.capped;
        if (letters.every(l => round.guessed.includes(l))) {
          round.status = "won";
          const word = pay(round.word, "complete", REWARDS[round.word.level].word);
          paid.word = word.paid;
          paid.already ||= word.already;
          paid.capped ||= word.capped;
        }
      } else {
        round.misses += 1;
        if (round.misses >= MAX_MISSES) round.status = "lost";
      }
      round.earned += paid.letter + paid.word;
      return { ...state(round), hit, repeat: false, paid, balance };
    },
    async today() {
      await settle();
      return { day, earned: earnedToday, cap: DAILY_CAP, remaining: Math.max(0, DAILY_CAP - earnedToday), reviewer: false, approved: {} };
    },
  };
}
