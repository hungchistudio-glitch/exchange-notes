export type MurphMood =
  | "hungry"
  | "curious"
  | "happy"
  | "excited"
  | "proud"
  | "missingYou"
  // A UI-triggered, transient expression (not part of the daily steady
  // mood computed in moodEngine.ts) — shown while a vocabulary search
  // comes back empty.
  | "confused";

// Two core content systems, per the "Murph cookie system" design doc:
// the full Zhuyin symbol set and the full A-Z alphabet. No standalone
// "pinyin" or "special" star cookie anymore.
export type CookieType = "letter" | "zhuyin";

export type PetState = {
  user_id: string;
  fed_word_ids: string[];
  total_cookies_fed: number;
  last_fed_at: string | null;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Cookie = {
  id: string;
  word: string;
  type: CookieType;
  // The actual symbol this cookie represents — the real first letter of
  // the learned English word, or the real first Zhuyin symbol from its
  // Chinese reading — so a cookie reads as a concrete learning outcome,
  // not a decorative placeholder.
  glyph: string;
};
