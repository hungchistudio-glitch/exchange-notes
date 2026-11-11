import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   Hangyumi: Hangman with Yumi (Chi, 2026-10-25)

   The server keeps every rule that pays (supabase/migrations/
   *_hangyumi.sql): it deals the word, never sends the answer while a
   round is on, checks each guess, and pays at most 333 cookies a reader's
   day. What is here is only for saying so, drawing the keys, and reading
   back what the server sent.

     a new correct letter pays   B1 3   B2 6   C1 9   C2 12
     finishing the word pays     B1 9   B2 18  C1 27  C2 36

   Three wrong guesses hang her eye (O), then her arm (I), then her body
   (U), and the round is over; what was won before that is kept.
   ========================================================= */

export const LEVELS = ["B1", "B2", "C1", "C2"] as const;
export type HangyumiLevel = (typeof LEVELS)[number];

export const REWARDS: Record<HangyumiLevel, { letter: number; word: number }> = {
  B1: { letter: 3, word: 9 },
  B2: { letter: 6, word: 18 },
  C1: { letter: 9, word: 27 },
  C2: { letter: 12, word: 36 },
};

export const DAILY_CAP = 333;
export const MAX_MISSES = 3;

/** What each wrong guess hangs, in order. */
export const PIECES = ["eye", "arm", "body"] as const;
export type HangyumiPiece = (typeof PIECES)[number];

export const PARTS_OF_SPEECH = ["noun", "verb", "adj", "adv", "idiom"] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

export function isLevel(value: unknown): value is HangyumiLevel {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

/**
 * The letters each language is guessed with. Accents are letters of their
 * own (é is not e), so each has its own key; case is not (É is é).
 */
const LATIN = [..."abcdefghijklmnopqrstuvwxyz"];
export const KEYBOARDS: Record<Exclude<LanguageCode, "zh-TW">, { letters: string[]; accents: string[] }> = {
  en: { letters: LATIN, accents: [] },
  es: { letters: LATIN, accents: [..."áéíóúüñ"] },
  fr: { letters: LATIN, accents: [..."àâæçéèêëîïôœùûüÿ"] },
  it: { letters: LATIN, accents: [..."àèéìíòóù"] },
};

/** A key press as the server will read it: one letter, NFC, lower case. */
export function normalizeGuess(input: string): string | null {
  const value = input.normalize("NFC").trim().toLocaleLowerCase();
  if ([...value].length !== 1 || !/\p{L}/u.test(value)) return null;
  return value;
}

// ------------------------------------------------- what the server sends

export type HangyumiSlot = { letter: boolean; char: string | null };

export type HangyumiStatus = "playing" | "won" | "lost";

export type HangyumiToday = { day: string; earned: number; cap: number; remaining: number };

/** How one side of the word card reads: IPA, or pinyin and zhuyin for Chinese. */
export type HangyumiReading = { ipa?: string; pinyin?: string; zhuyin?: string };

/** The finished word's card: its reading, and the word in the other four
    languages with theirs, written ahead beside the word bank. */
export type HangyumiCard = {
  reading: HangyumiReading;
  translations: Partial<Record<LanguageCode, { text: string; reading: HangyumiReading }>>;
};

/** The chest a Wordvault word holds: medium the fourth word in a row, premium the seventh. */
export type ChestTier = "normal" | "medium" | "premium";

/** What a finished Wordvault word's chest gave: cookies outside the 333, and a piece. */
export type ChestReward = { tier: ChestTier; cookies: number; item: string | null; limited: boolean };

export type HangyumiGame = "hangyumi" | "wordvault" | "starweaver";

export const GAMES: readonly HangyumiGame[] = ["hangyumi", "wordvault", "starweaver"];

export const isGame = (value: unknown): value is HangyumiGame => (GAMES as readonly unknown[]).includes(value);

/** A relic a seventh voyage brought back: the cycle it ended, and the piece. */
export type StarweaverAward = { id: number; itemId: string };

/** A piece a third Hangyumi win unlocked: the cycle it ended, and the piece. */
export type NightscaleAward = StarweaverAward;

/**
 * Yumi Starweaver｜織星者 (Chi, 2026-11-10): the reader's voyages, counted by
 * the server. Every seventh word won brings back one of the 17 Starwoven
 * Relics not owned yet; a loss takes nothing away. Live on every round of the
 * game, and once the word is over, what it brought back.
 */
export type StarweaverState = {
  completedTotal: number;
  /** Where this voyage stands in its seven: 0 right after a relic. */
  cycleProgress: number;
  cycleLength: number;
  collectedCount: number;
  collectionSize: number;
  collectionComplete: boolean;
  /** Only once the word is over, and only for a seventh that found a relic. */
  award: StarweaverAward | null;
};

/**
 * Hangyumi's Nightscale (Chi, 2026-11-11): the reader's words won, counted
 * by the server. Every third unlocks one of the 24 pieces not owned yet; a
 * loss takes nothing away. The same shape as Starweaver's, in threes.
 */
export type NightscaleState = Omit<StarweaverState, "award"> & {
  /** Only once the word is over, and only for a third that found a piece. */
  award: NightscaleAward | null;
};

export type HangyumiRound = {
  id: string;
  status: HangyumiStatus;
  language: LanguageCode;
  level: HangyumiLevel;
  partOfSpeech: PartOfSpeech;
  hint: string;
  hintLanguage: LanguageCode;
  slots: HangyumiSlot[];
  guessed: string[];
  wrong: string[];
  misses: number;
  /** For Chinese only: the characters to choose from. */
  keyboard: string[] | null;
  earned: number;
  rewards: { letter: number; word: number };
  today: HangyumiToday;
  /** Only once the round is over. */
  answer: string | null;
  /** Only once the round is over, and only for a word whose card is written. */
  card: HangyumiCard | null;
  game: HangyumiGame;
  /** Wordvault: the chest this word holds. */
  chest: ChestTier | null;
  /** Wordvault: words won in a row before this one finished (0–6). */
  streak: number | null;
  /** Wordvault, once the word is over: what its chest gave. */
  chestReward: ChestReward | null;
  /** Starweaver: voyages and relics. Never a chest. */
  starweaver: StarweaverState | null;
  /** Hangyumi: words won and Nightscale pieces. */
  nightscale: NightscaleState | null;
};

export type HangyumiPaid = { letter: number; word: number; already: boolean; capped: boolean };

export type HangyumiGuessResult = HangyumiRound & {
  hit: boolean;
  repeat: boolean;
  paid: HangyumiPaid;
  balance: number | null;
};

export type HangyumiStart = { status: "missing"; language: LanguageCode; level: HangyumiLevel } | HangyumiRound;

const LANGUAGE_CODES: readonly string[] = ["en", "zh-TW", "es", "fr", "it"];
const isLanguage = (value: unknown): value is LanguageCode =>
  typeof value === "string" && LANGUAGE_CODES.includes(value);

const count = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function readToday(value: unknown): HangyumiToday {
  const row = (value ?? {}) as Record<string, unknown>;
  const cap = count(row.cap) || DAILY_CAP;
  const earned = Math.min(cap, count(row.earned));
  return { day: typeof row.day === "string" ? row.day : "", earned, cap, remaining: Math.max(0, cap - earned) };
}

function readReading(value: unknown): HangyumiReading {
  const row = (value ?? {}) as Record<string, unknown>;
  const reading: HangyumiReading = {};
  for (const key of ["ipa", "pinyin", "zhuyin"] as const) {
    if (typeof row[key] === "string" && row[key]) reading[key] = row[key];
  }
  return reading;
}

function readCard(value: unknown): HangyumiCard | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const translations: HangyumiCard["translations"] = {};
  for (const [language, side] of Object.entries((row.translations ?? {}) as Record<string, unknown>)) {
    const text = (side as Record<string, unknown> | null)?.text;
    if (isLanguage(language) && typeof text === "string" && text.trim()) {
      translations[language] = { text, reading: readReading(side) };
    }
  }
  return { reading: readReading(row), translations };
}

const isTier = (value: unknown): value is ChestTier => value === "normal" || value === "medium" || value === "premium";

function readChestReward(value: unknown): ChestReward | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isTier(row.tier)) return null;
  return {
    tier: row.tier,
    cookies: count(row.cookies),
    item: typeof row.item === "string" && row.item ? row.item : null,
    limited: row.limited === true,
  };
}

/* A collection's progress as the server reports it: Starweaver's in
   sevens, Hangyumi's Nightscale in threes. */
function readCollection(value: unknown, status: HangyumiStatus, cycle: number): StarweaverState | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const award = (row.award ?? null) as Record<string, unknown> | null;
  const cycleLength = count(row.cycleLength) || cycle;
  return {
    completedTotal: count(row.completedTotal),
    cycleProgress: Math.min(cycleLength - 1, count(row.cycleProgress)),
    cycleLength,
    collectedCount: count(row.collectedCount),
    collectionSize: count(row.collectionSize),
    collectionComplete: row.collectionComplete === true,
    award: status !== "playing" && award && typeof award.itemId === "string" && award.itemId
      ? { id: count(award.id), itemId: award.itemId }
      : null,
  };
}

export function readRound(value: unknown): HangyumiRound {
  const row = (value ?? {}) as Record<string, unknown>;
  if (typeof row.id !== "string" || !isLanguage(row.language) || !isLevel(row.level)) {
    throw new Error("Invalid Hangyumi round.");
  }
  const status: HangyumiStatus = row.status === "won" || row.status === "lost" ? row.status : "playing";
  const slots = Array.isArray(row.slots)
    ? row.slots.map(slot => {
        const s = (slot ?? {}) as Record<string, unknown>;
        return { letter: s.letter !== false, char: typeof s.char === "string" ? s.char : null };
      })
    : [];
  const rewards = (row.rewards ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    status,
    language: row.language,
    level: row.level,
    partOfSpeech: (PARTS_OF_SPEECH as readonly string[]).includes(row.partOfSpeech as string)
      ? (row.partOfSpeech as PartOfSpeech)
      : "noun",
    hint: typeof row.hint === "string" ? row.hint : "",
    hintLanguage: isLanguage(row.hintLanguage) ? row.hintLanguage : "en",
    slots,
    guessed: strings(row.guessed),
    wrong: strings(row.wrong),
    misses: Math.min(MAX_MISSES, count(row.misses)),
    keyboard: Array.isArray(row.keyboard) ? strings(row.keyboard) : null,
    earned: count(row.earned),
    rewards: { letter: count(rewards.letter) || REWARDS[row.level].letter, word: count(rewards.word) || REWARDS[row.level].word },
    today: readToday(row.today),
    answer: status !== "playing" && typeof row.answer === "string" ? row.answer : null,
    card: status !== "playing" ? readCard(row.card) : null,
    game: isGame(row.game) ? row.game : "hangyumi",
    chest: isTier(row.chest) ? row.chest : null,
    streak: row.streak === null || row.streak === undefined ? null : Math.min(6, count(row.streak)),
    chestReward: status !== "playing" ? readChestReward(row.chestReward) : null,
    starweaver: row.game === "starweaver" ? readCollection(row.starweaver, status, 7) : null,
    nightscale: isGame(row.game) && row.game !== "hangyumi" ? null : readCollection(row.nightscale, status, 3),
  };
}

/**
 * How far a round's guesses have built the word: the places a guess filled,
 * out of every place there is to guess (spaces, hyphens and punctuation are
 * not places). Shared by every stage, so Wordvault's path and Starweaver's
 * star chart can never count differently. A lost round shows the whole
 * answer, which must not count as built.
 */
export function revealProgress(round: Pick<HangyumiRound, "slots" | "guessed">) {
  const places = round.slots.filter(slot => slot.letter);
  const revealed = places.filter(slot =>
    slot.char !== null && round.guessed.includes(slot.char.normalize("NFC").toLocaleLowerCase()),
  ).length;
  return { total: places.length, revealed, fraction: places.length ? revealed / places.length : 0 };
}

export function readStart(value: unknown): HangyumiStart {
  const row = (value ?? {}) as Record<string, unknown>;
  if (row.status === "missing" && isLanguage(row.language) && isLevel(row.level)) {
    return { status: "missing", language: row.language, level: row.level };
  }
  return readRound(value);
}

export function readGuess(value: unknown): HangyumiGuessResult {
  const row = (value ?? {}) as Record<string, unknown>;
  const paid = (row.paid ?? {}) as Record<string, unknown>;
  return {
    ...readRound(value),
    hit: row.hit === true,
    repeat: row.repeat === true,
    paid: { letter: count(paid.letter), word: count(paid.word), already: paid.already === true, capped: paid.capped === true },
    balance: row.balance === undefined || row.balance === null ? null : count(row.balance),
  };
}

export function readTodayState(value: unknown): HangyumiToday & { reviewer: boolean; approved: Record<string, number> } {
  const row = (value ?? {}) as Record<string, unknown>;
  const approved: Record<string, number> = {};
  if (row.approved && typeof row.approved === "object") {
    for (const [key, n] of Object.entries(row.approved as Record<string, unknown>)) approved[key] = count(n);
  }
  return { ...readToday(value), reviewer: row.reviewer === true, approved };
}
