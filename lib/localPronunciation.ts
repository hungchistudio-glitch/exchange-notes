import { dictionary } from "cmu-pronouncing-dictionary";

type PronunciationDictionary = Record<string, string>;

const pronunciationDictionary = dictionary as PronunciationDictionary;

const ARPABET_TO_READABLE: Record<string, string> = {
  AA: "ah",
  AE: "a",
  AH: "uh",
  AO: "aw",
  AW: "ow",
  AY: "eye",
  EH: "eh",
  ER: "er",
  EY: "ay",
  IH: "ih",
  IY: "ee",
  OW: "oh",
  OY: "oy",
  UH: "oo",
  UW: "oo",
  B: "b",
  CH: "ch",
  D: "d",
  DH: "th",
  F: "f",
  G: "g",
  HH: "h",
  JH: "j",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ng",
  P: "p",
  R: "r",
  S: "s",
  SH: "sh",
  T: "t",
  TH: "th",
  V: "v",
  W: "w",
  Y: "y",
  Z: "z",
  ZH: "zh",
};

function convertArpabet(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((phoneme) => {
      const stressMatch = phoneme.match(/([A-Z]+)([0-2])?/);
      if (!stressMatch) return phoneme.toLowerCase();

      const [, base, stress] = stressMatch;
      const readable = ARPABET_TO_READABLE[base] ?? base.toLowerCase();

      return stress === "1" ? readable.toUpperCase() : readable;
    })
    .join("-");
}

function normalizeWord(value: string) {
  return value.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g, "");
}

function getSingleWordPronunciation(word: string) {
  const normalized = normalizeWord(word);

  if (!normalized) return "";

  const pronunciation =
    pronunciationDictionary[normalized.toUpperCase()] ??
    pronunciationDictionary[normalized];

  if (!pronunciation) return normalized;

  return convertArpabet(pronunciation);
}

export function getLocalEnglishPronunciation(value: string) {
  const text = value.trim();

  if (!text) return "";

  return text
    .split(/\s+/)
    .map(getSingleWordPronunciation)
    .filter(Boolean)
    .join(" ");
}
