import type { VocabularyStatus } from "@/lib/types/app";

export type YumiMood =
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

// Two core content systems, per the "Yumi cookie system" design doc:
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

  /*
   * The three fields below are the word's own lifecycle, carried across
   * rather than invented here.
   *
   * A cookie is a projection of one vocabulary row — the row is still the
   * only record of anything, and nothing on this type is written back. They
   * exist because Cosmic Mode paints a cookie as a Learning Core whose colour
   * has to mean something (see cosmicCoreTone in moodEngine.ts); without them
   * the tray would be picking pretty colours, which is the one thing a
   * semantic palette must not do.
   *
   * Standard Mode ignores all three and keeps its letter/zhuyin split, so
   * nothing here changes what a cookie is worth or how it is earned.
   */
  status: VocabularyStatus;
  // Earned today, on this device's clock — the same day-key rule the word
  // streak counts by, so the cookies marked new are exactly the ones behind
  // "3 words today".
  isNew: boolean;
  // Reviewed at least once and now past its scheduled return. A word that has
  // never been reviewed is not "due" for this purpose even though the review
  // queue counts it: everything would be, and a signal everything has is not
  // a signal.
  reviewDue: boolean;
};
