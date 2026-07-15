import { dictionary } from "cmu-pronouncing-dictionary";

type Dictionary = Record<string, string>;

const cmuDictionary = dictionary as Dictionary;

const PHONEME_MAP: Record<string, string> = {
  AA: "ah",
  AE: "a",
  AH: "uh",
  AO: "aw",
  AW: "ow",
  AY: "eye",
  B: "b",
  CH: "ch",
  D: "d",
  DH: "th",
  EH: "eh",
  ER: "er",
  EY: "ay",
  F: "f",
  G: "g",
  HH: "h",
  IH: "ih",
  IY: "ee",
  JH: "j",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ng",
  OW: "oh",
  OY: "oy",
  P: "p",
  R: "r",
  S: "s",
  SH: "sh",
  T: "t",
  TH: "th",
  UH: "oo",
  UW: "oo",
  V: "v",
  W: "w",
  Y: "y",
  Z: "z",
  ZH: "zh",
};

function normalizeDictionaryKey(word: string) {
  return word
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z-]/g, "");
}

function phonemeToReadable(phoneme: string) {
  const stress = phoneme.match(/\d/)?.[0];
  const base = phoneme.replace(/\d/g, "");
  const readable = PHONEME_MAP[base] ?? base.toLowerCase();

  return stress === "1" ? readable.toUpperCase() : readable;
}

export function getLocalEnglishPronunciation(word: string): string {
  const key = normalizeDictionaryKey(word);

  if (!key) return "";

  const direct = cmuDictionary[key];

  if (direct) {
    return direct.split(/\s+/).map(phonemeToReadable).join("-");
  }

  const parts = key.split("-").filter(Boolean);

  if (parts.length > 1) {
    const pronunciations = parts.map((part) => cmuDictionary[part]);

    if (pronunciations.every(Boolean)) {
      return pronunciations
        .map((value) => value.split(/\s+/).map(phonemeToReadable).join("-"))
        .join(" ");
    }
  }

  return word.trim();
}
