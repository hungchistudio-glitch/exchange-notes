import type { LanguageCode, SpeechTag } from "@/lib/languages";

/* =========================================================
   The hero's phrase, in all seven languages

   The landing page lets a stranger try the app on one phrase before signing
   in. Its words for the interface come from lib/i18n (landing.hero.journey);
   this is the part that is not interface: the same idea rendered in each
   of the seven languages the app teaches, each written in its own language,
   for the "compare" view, which has its own language picker.

   Three phrases, because a reader always meets one from a language that is
   not theirs: 留白 for most, dolce far niente for readers of Chinese, and
   눈치 for readers of Japanese (see journey.phrase in each dictionary).
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
    ja: {
      text: "余白",
      note: "絵や部屋や一日の中に、わざと残した空白。ほかのすべてが呼吸できるように。",
    },
    ko: {
      text: "여백의 미",
      note: "그림이나 공간, 하루 속에 일부러 비워 둔 자리. 나머지가 숨 쉴 수 있도록.",
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
    ja: {
      text: "何もしない贅沢",
      note: "急がず、うしろめたさもなく、のんびりした時間を味わうこと。",
    },
    ko: {
      text: "아무것도 하지 않는 달콤함",
      note: "서두르지 않고 죄책감 없이 한가한 시간을 즐기는 것.",
    },
  },
};

/*
 * Japanese readers meet a Korean word (Chi, 2026-11-16): 눈치, which their
 * own language has a phrase for. Korean readers meet 留白, as everyone but
 * Chinese readers does, and find 여백의 미 beside it.
 */
const NUNCHI: TrialPhrase = {
  speech: "ko-KR",
  replySpeech: "en-US",
  renderings: {
    en: {
      text: "reading the room",
      note: "Sensing the mood and what others feel before anyone says it.",
    },
    "zh-TW": {
      text: "察言觀色",
      note: "在別人開口之前，就察覺氣氛和對方的心情。",
    },
    es: {
      text: "leer el ambiente",
      note: "Percibir el ambiente y lo que sienten los demás antes de que nadie lo diga.",
    },
    fr: {
      text: "sentir l’ambiance",
      note: "Percevoir l’atmosphère et ce que ressentent les autres avant qu’on le dise.",
    },
    it: {
      text: "leggere l’atmosfera",
      note: "Cogliere l’atmosfera e ciò che provano gli altri prima che qualcuno lo dica.",
    },
    ja: {
      text: "空気を読む",
      note: "誰かが口にする前に、その場の雰囲気や相手の気持ちを察すること。",
    },
    ko: {
      text: "눈치",
      note: "누가 말하기 전에 분위기와 다른 사람의 마음을 알아채는 힘.",
    },
  },
};

/** The phrase a dictionary's journey uses, by the language it is in. */
export function trialPhraseFor(phraseLang: string): TrialPhrase {
  const tag = phraseLang.toLowerCase();
  if (tag.startsWith("it")) return DOLCE_FAR_NIENTE;
  if (tag.startsWith("ko")) return NUNCHI;
  return LIU_BAI;
}
