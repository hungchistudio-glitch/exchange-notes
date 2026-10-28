import type { SupabaseClient } from "@supabase/supabase-js";

import type { LanguageCode } from "@/lib/languages";
import { SHOP_ITEMS } from "@/lib/shop/catalog";
import { MYTHIC_ITEMS } from "@/lib/shop/mythicCollection";

import {
  DAILY_CAP, MAX_MISSES, REWARDS, readGuess, readStart, readTodayState,
  type ChestReward, type ChestTier, type HangyumiCard, type HangyumiGame, type HangyumiGuessResult, type HangyumiLevel, type HangyumiRound, type HangyumiStart, type PartOfSpeech,
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

/** A finished round's word, as the reader asks to keep it. */
export type SavableWord = {
  answer: string;
  language: LanguageCode;
  partOfSpeech: PartOfSpeech;
  /** The clue, kept as the gloss when no translation can be had. */
  hint: string;
  hintLanguage: LanguageCode;
  /** The gloss the word's card already fetched, so saving does not ask again. */
  translation?: string;
  translationLanguage?: LanguageCode;
};

/** "duplicate": it was already in the reader's vocabulary, which is what they wanted. */
export type SaveWord = (word: SavableWord) => Promise<"saved" | "duplicate">;

export type HangyumiService = {
  start(input: { roundId: string; language: LanguageCode; level: HangyumiLevel; hintLanguage: LanguageCode; game?: HangyumiGame }): Promise<HangyumiStart>;
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
    async start({ roundId, language, level, hintLanguage, game = "hangyumi" }) {
      /* Hangyumi through the four-argument start, which every deployed page
         calls; Wordvault through the one that knows the game. */
      return readStart(await call("hangyumi_start", {
        p_round_id: roundId, p_language: language, p_level: level, p_hint_language: hintLanguage,
        ...(game === "wordvault" ? { p_game: game } : {}),
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
  card?: HangyumiCard;
};

/** Practice words for the review screen only. The real bank never ships to a browser. */
export const PRACTICE_WORDS: PracticeWord[] = [
  { language: "en", level: "B1", answer: "well-being", partOfSpeech: "noun", clues: { en: "feeling healthy and happy", "zh-TW": "身心健康、過得好的狀態" }, card: {"reading": {"ipa": "/ˌwɛlˈbiɪŋ/"}, "translations": {"zh-TW": {"text": "幸福", "reading": {"pinyin": "xìng fú", "zhuyin": "ㄒㄧㄥˋ ㄈㄨˊ"}}, "es": {"text": "bienestar", "reading": {"ipa": "/bjenesˈtaɾ/"}}, "fr": {"text": "bien-être", "reading": {"ipa": "/bjɛ̃nɛtʁ/"}}, "it": {"text": "benessere", "reading": {"ipa": "/beˈnɛssere/"}}}} },
  { language: "en", level: "C2", answer: "ephemeral", partOfSpeech: "adj", clues: { en: "lasting for a very short time", "zh-TW": "只存在很短暫的時間" }, card: {"reading": {"ipa": "/ɪˈfɛmərəl/"}, "translations": {"zh-TW": {"text": "短暫的", "reading": {"pinyin": "duǎn zàn de", "zhuyin": "ㄉㄨㄢˇ ㄗㄢˋ ˙ㄉㄜ"}}, "es": {"text": "efímero", "reading": {"ipa": "/eˈfimeɾo/"}}, "fr": {"text": "éphémère", "reading": {"ipa": "/efemɛʁ/"}}, "it": {"text": "effimero", "reading": {"ipa": "/efˈfimero/"}}}} },
  { language: "fr", level: "C1", answer: "éphémère", partOfSpeech: "adj", clues: { en: "lasting a very short time", "zh-TW": "只存在很短的時間" }, card: {"reading": {"ipa": "/efemɛʁ/"}, "translations": {"en": {"text": "ephemeral", "reading": {"ipa": "/ɪˈfɛmərəl/"}}, "zh-TW": {"text": "短暫的", "reading": {"pinyin": "duǎn zàn de", "zhuyin": "ㄉㄨㄢˇ ㄗㄢˋ ˙ㄉㄜ"}}, "es": {"text": "efímero", "reading": {"ipa": "/eˈfimeɾo/"}}, "it": {"text": "effimero", "reading": {"ipa": "/efˈfimero/"}}}} },
  { language: "es", level: "B1", answer: "montaña", partOfSpeech: "noun", clues: { en: "a very high hill", "zh-TW": "非常高的山" }, card: {"reading": {"ipa": "/monˈtaɲa/"}, "translations": {"en": {"text": "mountain", "reading": {"ipa": "/ˈmaʊntən/"}}, "zh-TW": {"text": "山", "reading": {"pinyin": "shān", "zhuyin": "ㄕㄢ"}}, "fr": {"text": "montagne", "reading": {"ipa": "/mɔ̃taɲ/"}}, "it": {"text": "montagna", "reading": {"ipa": "/monˈtaɲɲa/"}}}} },
  { language: "it", level: "B1", answer: "città", partOfSpeech: "noun", clues: { en: "a large place with many people and buildings", "zh-TW": "人口多、建築密集的大地方" }, card: {"reading": {"ipa": "/tʃitˈta/"}, "translations": {"en": {"text": "city", "reading": {"ipa": "/ˈsɪti/"}}, "zh-TW": {"text": "城市", "reading": {"pinyin": "chéng shì", "zhuyin": "ㄔㄥˊ ㄕˋ"}}, "es": {"text": "ciudad", "reading": {"ipa": "/sjuˈdad/"}}, "fr": {"text": "ville", "reading": {"ipa": "/vil/"}}}} },
  { language: "zh-TW", level: "B1", answer: "旅行", partOfSpeech: "noun", clues: { en: "going away from home to visit other places for pleasure", "zh-TW": "離開家，到別的地方去遊玩" }, card: {"reading": {"pinyin": "lǚ xíng", "zhuyin": "ㄌㄩˇ ㄒㄧㄥˊ"}, "translations": {"en": {"text": "travel", "reading": {"ipa": "/ˈtrævəl/"}}, "es": {"text": "viaje", "reading": {"ipa": "/ˈbjaxe/"}}, "fr": {"text": "voyage", "reading": {"ipa": "/vwajaʒ/"}}, "it": {"text": "viaggio", "reading": {"ipa": "/ˈvjaddʒo/"}}}} },
  { language: "zh-TW", level: "C2", answer: "畫蛇添足", partOfSpeech: "idiom", clues: { en: "spoiling something by adding what it did not need", "zh-TW": "多此一舉，反而把事情弄糟" }, card: {"reading": {"pinyin": "huà shé tiān zú", "zhuyin": "ㄏㄨㄚˋ ㄕㄜˊ ㄊㄧㄢ ㄗㄨˊ"}, "translations": {"en": {"text": "gild the lily", "reading": {"ipa": "/ɡɪld ðə ˈlɪli/"}}, "es": {"text": "pasarse de rosca", "reading": {"ipa": "/paˈsaɾse de ˈroska/"}}, "fr": {"text": "en faire trop", "reading": {"ipa": "/ɑ̃ fɛʁ tʁo/"}}, "it": {"text": "strafare", "reading": {"ipa": "/straˈfare/"}}}} },
];

const isLetter = (char: string) => /\p{L}/u.test(char);
const lower = (value: string) => value.normalize("NFC").toLocaleLowerCase();

type PreviewRound = {
  id: string; word: PracticeWord; hintLanguage: LanguageCode; guessed: string[]; misses: number;
  status: HangyumiRound["status"]; earned: number; keyboard: string[] | null;
  game: HangyumiGame; chest: ChestTier | null; chestReward: ChestReward | null; abandoned: boolean;
};

/** The same rules as the server, in memory, with nothing written anywhere. */
export function createPreviewHangyumi(options: {
  words?: PracticeWord[]; earnedToday?: number; delayMs?: number;
  /** Wordvault: words already won in a row, and the pieces already owned. */
  streak?: number; owned?: readonly string[];
  /** Picks a chest's piece from those on offer; random unless a test says. */
  pick?: (ids: string[]) => string;
} = {}): HangyumiService {
  const words = options.words ?? PRACTICE_WORDS;
  const rounds = new Map<string, PreviewRound>();
  const awards = new Set<string>();
  let earnedToday = options.earnedToday ?? 0;
  let balance = 240;
  const delay = options.delayMs ?? 220;
  const settle = () => new Promise(resolve => setTimeout(resolve, delay));
  const day = new Date().toISOString().slice(0, 10);
  let turn = 0;
  let streak = options.streak ?? 0;
  const owned = new Set(options.owned ?? []);
  const pick = options.pick ?? (ids => ids[Math.floor(Math.random() * ids.length)]);

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
      card: round.status === "playing" ? null : round.word.card ?? null,
      game: round.game,
      chest: round.chest,
      streak: round.game === "wordvault" ? streak : null,
      chestReward: round.status === "playing" ? null : round.chestReward,
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

  /* The chest, as private.hangyumi_guess opens it: the word's whole worth
     (every letter and the word bonus, paid today or not) once again or
     twice again, outside the 333, and a piece the reader does not own. */
  function finishChest(round: PreviewRound) {
    if (round.status === "won") {
      const tier: ChestTier = round.chest === "medium" && streak === 3 ? "medium"
        : round.chest === "premium" && streak === 6 ? "premium" : "normal";
      let cookies = 0;
      let item: string | null = null;
      if (tier !== "normal") {
        const letters = new Set([...round.word.answer].filter(isLetter).map(lower)).size;
        const worth = letters * REWARDS[round.word.level].letter + REWARDS[round.word.level].word;
        cookies = worth * (tier === "medium" ? 1 : 2);
        balance += cookies;
        const pool = (tier === "premium" ? MYTHIC_ITEMS : SHOP_ITEMS).map(i => i.id).filter(id => !owned.has(id));
        if (pool.length) {
          item = pick(pool);
          owned.add(item);
        }
      }
      round.chestReward = { tier, cookies, item, limited: tier === "premium" && item !== null };
      streak = streak + 1 >= 7 ? 0 : streak + 1;
    } else {
      round.chestReward = { tier: round.chest ?? "normal", cookies: 0, item: null, limited: false };
      streak = 0;
    }
  }

  return {
    async start({ roundId, language, level, hintLanguage, game = "hangyumi" }) {
      await settle();
      const existing = rounds.get(roundId);
      if (existing) return state(existing);
      /* The server's rules: a word of this game, language and level still
         in play (dealt on another device) goes on, rather than a new one. */
      const inPlay = [...rounds.values()].reverse().find(r =>
        r.game === game && r.status === "playing" && r.word.language === language && r.word.level === level);
      if (inPlay) {
        inPlay.hintLanguage = hintLanguage;
        return state(inPlay);
      }
      const choices = words.filter(word => word.language === language && word.level === level);
      if (!choices.length) return { status: "missing", language, level };
      const word = choices[turn++ % choices.length];
      let keyboard: string[] | null = null;
      if (language === "zh-TW") {
        const answerChars = [...new Set([...word.answer].filter(isLetter))];
        const extra = [..."山海光日月星雲風心學文天地時人路城夜雨花"].filter(c => !answerChars.includes(c));
        keyboard = [...answerChars, ...extra.slice(0, Math.max(0, 16 - answerChars.length))].sort(() => Math.random() - 0.5);
      }
      /* The server's rules (private.hangyumi_start): a Wordvault word left
         half-guessed ends the streak, and the streak names the chest. */
      let chest: ChestTier | null = null;
      if (game === "wordvault") {
        const abandoned = [...rounds.values()].filter(r =>
          r.game === "wordvault" && r.status === "playing" && r.guessed.length > 0 && !r.abandoned);
        if (abandoned.length) {
          abandoned.forEach(r => { r.chest = "normal"; r.abandoned = true; });
          streak = 0;
        }
        chest = streak === 3 ? "medium" : streak === 6 ? "premium" : "normal";
      }
      const round: PreviewRound = {
        id: roundId, word, hintLanguage, guessed: [], misses: 0, status: "playing", earned: 0, keyboard,
        game, chest, chestReward: null, abandoned: false,
      };
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
      if (round.game === "wordvault" && round.status !== "playing") finishChest(round);
      return { ...state(round), hit, repeat: false, paid, balance };
    },
    async today() {
      await settle();
      return { day, earned: earnedToday, cap: DAILY_CAP, remaining: Math.max(0, DAILY_CAP - earnedToday), reviewer: false, approved: {} };
    },
  };
}

/** The review screen's save: kept in memory only, nobody's vocabulary is touched. */
export function createPreviewSaveWord(delayMs = 300): SaveWord {
  const kept = new Set<string>();
  return async word => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    const key = `${word.language}:${word.answer.normalize("NFC").toLocaleLowerCase()}`;
    if (kept.has(key)) return "duplicate";
    kept.add(key);
    return "saved";
  };
}
