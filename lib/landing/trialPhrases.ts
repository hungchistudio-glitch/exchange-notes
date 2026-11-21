import type { LanguageCode, SpeechTag } from "@/lib/languages";

/* =========================================================
   The hero's word, in all seven languages

   The landing page lets a stranger try the app on one word before signing
   in. Its words for the interface come from lib/i18n (landing.hero.journey);
   this is the part that is not interface: the same thing named in each of
   the seven languages the app teaches, each written in its own language,
   for the "compare" view, which has its own language picker.

   A dolphin (Chi, 2026-11-21: 把留白換掉，換動物名稱 → 海豚; it was 留白,
   dolce far niente and 눈치). An animal's name is the plainest kind of word
   a reader meets, and its parts tell a story: 海豚 is "sea pig". Three
   ways in, because a reader always meets it in a language that is not
   theirs: 海豚 for most, delfino for readers of Chinese, and 돌고래 for
   readers of Japanese (see journey.phrase in each dictionary). The seven
   names of it are the same for all three.
   ========================================================= */

export type TrialRendering = {
  /** The name of it in this language. */
  text: string;
  /** What it is, in this language. */
  note: string;
};

export type TrialPhrase = {
  /** The voice the word is read in. */
  speech: SpeechTag;
  renderings: Record<LanguageCode, TrialRendering>;
};

const DOLPHIN: Record<LanguageCode, TrialRendering> = {
  en: {
    text: "dolphin",
    note: "A small, quick whale that lives in groups and loves to play.",
  },
  "zh-TW": {
    text: "海豚",
    note: "成群生活、聰明又愛玩的小型鯨類。",
  },
  es: {
    text: "delfín",
    note: "Un cetáceo pequeño y veloz que vive en grupo y adora jugar.",
  },
  fr: {
    text: "dauphin",
    note: "Un petit cétacé rapide qui vit en groupe et adore jouer.",
  },
  it: {
    text: "delfino",
    note: "Un piccolo cetaceo veloce che vive in gruppo e ama giocare.",
  },
  ja: {
    text: "イルカ",
    note: "群れで暮らし、遊ぶのが大好きな小さなクジラの仲間。",
  },
  ko: {
    text: "돌고래",
    note: "무리 지어 살며 노는 것을 좋아하는 작은 고래.",
  },
};

const HAI_TUN: TrialPhrase = { speech: "zh-TW", renderings: DOLPHIN };
const DELFINO: TrialPhrase = { speech: "it-IT", renderings: DOLPHIN };
const DOLGORAE: TrialPhrase = { speech: "ko-KR", renderings: DOLPHIN };

/** The word a dictionary's journey uses, by the language it is in. */
export function trialPhraseFor(phraseLang: string): TrialPhrase {
  const tag = phraseLang.toLowerCase();
  if (tag.startsWith("it")) return DELFINO;
  if (tag.startsWith("ko")) return DOLGORAE;
  return HAI_TUN;
}
