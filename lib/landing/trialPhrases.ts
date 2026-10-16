import type { LanguageCode, SpeechTag } from "@/lib/languages";

/* =========================================================
   The hero's phrase, in all five languages

   The landing page lets a stranger try the app on one phrase before signing
   in. Its words for the interface come from lib/i18n (landing.hero.journey);
   this is the part that is not interface: the same idea rendered in each
   of the five languages the app teaches, each written in its own language,
   for the "compare" view, which has its own language picker.

   Two phrases, because a reader always meets one from a language that is
   not theirs: 留白 for everyone but readers of Chinese, who get
   dolce far niente (see journey.phrase in each dictionary).
   ========================================================= */

export type TrialRendering = {
  /** The closest way to say it in this language. */
  text: string;
  /** What it means, in this language. */
  note: string;
};

export type TrialPhrase = {
  /** The voice the phrase is read in. */
  speech: SpeechTag;
  /** The voice the friend's word is read in. */
  replySpeech: SpeechTag;
  renderings: Record<LanguageCode, TrialRendering>;
};

const LIU_BAI: TrialPhrase = {
  speech: "zh-TW",
  replySpeech: "it-IT",
  renderings: {
    en: {
      text: "breathing room",
      note: "Space left empty on purpose — in a painting, a room or a day — so that everything else can breathe.",
    },
    "zh-TW": {
      text: "留白",
      note: "在畫面、空間或日子裡刻意留下的空白，讓其餘的部分得以呼吸。",
    },
    es: {
      text: "espacio para respirar",
      note: "Un vacío dejado a propósito —en un cuadro, una sala o un día— para que todo lo demás respire.",
    },
    fr: {
      text: "laisser respirer",
      note: "Un vide laissé exprès — dans un tableau, une pièce ou une journée — pour que tout le reste respire.",
    },
    it: {
      text: "respiro",
      note: "Uno spazio vuoto lasciato apposta — in un quadro, una stanza o una giornata — perché tutto il resto respiri.",
    },
  },
};

const DOLCE_FAR_NIENTE: TrialPhrase = {
  speech: "it-IT",
  replySpeech: "es-ES",
  renderings: {
    en: {
      text: "the sweetness of doing nothing",
      note: "Enjoying idle time, unhurried and without guilt.",
    },
    "zh-TW": {
      text: "偷得浮生半日閒",
      note: "在忙碌之中，好好享受一段什麼都不用做的悠閒時光。",
    },
    es: {
      text: "el dulce placer de no hacer nada",
      note: "Disfrutar del tiempo libre, sin prisa y sin culpa.",
    },
    fr: {
      text: "la douceur de ne rien faire",
      note: "Savourer le temps libre, sans hâte et sans culpabilité.",
    },
    it: {
      text: "dolce far niente",
      note: "Godersi l’ozio, senza fretta e senza sensi di colpa.",
    },
  },
};

/** The phrase a dictionary's journey uses, by the language it is in. */
export function trialPhraseFor(phraseLang: string): TrialPhrase {
  return phraseLang.toLowerCase().startsWith("it") ? DOLCE_FAR_NIENTE : LIU_BAI;
}
