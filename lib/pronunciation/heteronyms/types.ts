import type { LanguageCode } from "@/lib/languages";
import type { PartOfSpeechKey } from "@/lib/vocabulary/partOfSpeech";

import type { LocalizedText } from "../localizedText";

/* =========================================================
   One spelling, several readings

   破音字 in Chinese — 行 is ㄒㄧㄥˊ in 行走 and ㄏㄤˊ in 銀行 — and their
   cousins everywhere else: English "record" stressed on its first syllable
   as a noun and its second as a verb, French "fils" (sons /fis/, threads
   /fil/), Italian "àncora/ancóra", Spanish "público/publico/publicó"
   (Chi, 2026-10-19: "破音字或是同單字不同發音，記住這是個多種語言的app").

   Written and checked by hand rather than asked of a model each time: a
   reading taught wrong is worse than one not taught. A lookup can add
   readings a model finds for words not listed here (LexiconEntry
   .termReadings), shown the same way.
   ========================================================= */

export type HeteronymReading = {
  /** zhuyin for zh-TW ("ㄏㄤˊ"); IPA for the rest ("/ˈrɛkərd/"). */
  phonetic: string;
  /** zh-TW only: the same reading in pinyin. */
  pinyin?: string;
  /** The word as written when the spelling itself tells the readings apart
   *  ("publicó", "àncora"). Absent when it is written the same way. */
  spelling?: string;
  /** What the word means, read this way. */
  meaning: LocalizedText;
  /** A word or phrase that can only be read this way — what is spoken to
   *  demonstrate it: 銀行, "a record", "les fils de la toile". */
  example: string;
  /** The example's own transcription, zhuyin or IPA, so Yumi can show it. */
  examplePhonetic: string;
  /** The part of speech that selects this reading, where that is what
   *  decides it. */
  partOfSpeech?: PartOfSpeechKey;
};

export type Heteronym = {
  language: LanguageCode;
  /** What is looked up: the character, or the word without the accents
   *  that tell its readings apart ("publico", "ancora"). */
  word: string;
  readings: readonly HeteronymReading[];
};

/** Five interface languages, in one call: en, zh-TW, es, fr, it. */
export function meaning(
  english: string,
  chinese: string,
  spanish: string,
  french: string,
  italian: string,
): LocalizedText {
  return {
    english,
    "traditional-chinese": chinese,
    spanish,
    french,
    italian,
  };
}
