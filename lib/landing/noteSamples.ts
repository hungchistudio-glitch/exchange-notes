import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   The landing page's note, in all five languages

   The note under "Keep" shows one sentence and its translation, and the
   reader chooses the translation's language, as a note's "view in" does in
   the app. These are content, not interface: each sentence and its key
   word are written in their own language, and every one of them is a
   rendering of the same thought, so any two make a faithful pair.

   The key word is the one the next two sections carry on (the exchange's
   card and Yumi's review chip), and each dictionary's notes.translationLang
   picks which of these a reader sees first.
   ========================================================= */

export type NoteSample = {
  sentence: string;
  /** The word for the feeling, exactly as it appears in the sentence. */
  word: string;
  /** How to say it: pinyin for Chinese, IPA for the rest. */
  reading: string;
};

export const NOTE_SAMPLES: Record<LanguageCode, NoteSample> = {
  en: {
    sentence: "I finally found the word for that feeling: bittersweet.",
    word: "bittersweet",
    reading: "/ˌbɪtərˈswiːt/",
  },
  "zh-TW": {
    sentence: "我終於找到形容那種感覺的詞：苦樂參半。",
    word: "苦樂參半",
    reading: "kǔ lè cān bàn",
  },
  es: {
    sentence: "Por fin encontré la palabra para esa sensación: agridulce.",
    word: "agridulce",
    reading: "/a.ɣɾiˈðul.θe/",
  },
  fr: {
    sentence: "J'ai enfin trouvé le mot pour ce sentiment : doux-amer.",
    word: "doux-amer",
    reading: "/du.za.mɛʁ/",
  },
  it: {
    sentence: "Ho finalmente trovato la parola per quella sensazione: agrodolce.",
    word: "agrodolce",
    reading: "/a.ɡroˈdol.tʃe/",
  },
};

/**
 * The language the note was written in, given the one it is shown in: the
 * English sentence, unless English is the translation asked for, in which
 * case the Chinese one, so the two lines are never the same language.
 */
export function noteOriginalFor(translation: LanguageCode): LanguageCode {
  return translation === "en" ? "zh-TW" : "en";
}
