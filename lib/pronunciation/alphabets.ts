import { kanaToRomaji } from "@/lib/japanese/kana";

/* =========================================================
   The two charts a beginner learns first (Chi, 2026-11-16)

   Japanese: the kana, row by row, as a Japanese classroom hangs them (あ か
   さ た な は ま や ら わ, then ん), with the voiced rows and the combined
   ones (きゃ) on their own tabs, in hiragana or katakana. Korean: the 19
   consonants with their names (ㄱ is 기역), the 21 vowels, and the grid of
   syllables the basic ones make (가 갸 거 …).

   Data, not prose: a cell's romaji comes from the same kanaToRomaji that
   writes a word card's romaji line, and a syllable is composed from its
   letters, so nothing here can disagree with the rest of the app.
   ========================================================= */

/** One kana cell, or a gap where the chart has none (yi, ye, wi, we, wu). */
export type KanaCell = { hiragana: string; katakana: string; romaji: string } | null;

export type KanaRow = { id: string; cells: KanaCell[] };

/** Hiragana to katakana: the two blocks sit 0x60 apart. */
export function toKatakana(hiragana: string): string {
  return hiragana.replace(/[ぁ-ゖ]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
}

function row(id: string, kana: string): KanaRow {
  // "・" marks a gap; anything else is one kana or a kana with its small ゃゅょ.
  const cells = kana.split(" ").map((hiragana): KanaCell =>
    hiragana === "・" ? null : { hiragana, katakana: toKatakana(hiragana), romaji: kanaToRomaji(hiragana) },
  );
  return { id, cells };
}

/** あいうえお order, one row per consonant. */
export const KANA_BASIC: readonly KanaRow[] = [
  row("a", "あ い う え お"),
  row("ka", "か き く け こ"),
  row("sa", "さ し す せ そ"),
  row("ta", "た ち つ て と"),
  row("na", "な に ぬ ね の"),
  row("ha", "は ひ ふ へ ほ"),
  row("ma", "ま み む め も"),
  row("ya", "や ・ ゆ ・ よ"),
  row("ra", "ら り る れ ろ"),
  row("wa", "わ ・ ・ ・ を"),
  row("n", "ん ・ ・ ・ ・"),
];

/** The rows with ゛ (voiced) and ゜ (p). */
export const KANA_VOICED: readonly KanaRow[] = [
  row("ga", "が ぎ ぐ げ ご"),
  row("za", "ざ じ ず ぜ ぞ"),
  row("da", "だ ぢ づ で ど"),
  row("ba", "ば び ぶ べ ぼ"),
  row("pa", "ぱ ぴ ぷ ぺ ぽ"),
];

/** A kana of the i column with a small ゃ ゅ ょ: きゃ きゅ きょ. */
export const KANA_COMBINED: readonly KanaRow[] = [
  "き", "し", "ち", "に", "ひ", "み", "り", "ぎ", "じ", "び", "ぴ",
].map((head) => row(`${kanaToRomaji(head)}-y`, `${head}ゃ ${head}ゅ ${head}ょ`));

/* ---------- Hangul ---------- */

export type HangulLetter = {
  letter: string;
  /** What it is called: 기역, 아. A consonant is said by its name. */
  name: string;
  /** Revised Romanization: g/k for a consonant (start / end of a syllable). */
  romanization: string;
};

const consonant = (letter: string, name: string, romanization: string): HangulLetter => ({ letter, name, romanization });

/** The 14 basic consonants, in dictionary order. */
export const HANGUL_CONSONANTS: readonly HangulLetter[] = [
  consonant("ㄱ", "기역", "g / k"),
  consonant("ㄴ", "니은", "n"),
  consonant("ㄷ", "디귿", "d / t"),
  consonant("ㄹ", "리을", "r / l"),
  consonant("ㅁ", "미음", "m"),
  consonant("ㅂ", "비읍", "b / p"),
  consonant("ㅅ", "시옷", "s / t"),
  consonant("ㅇ", "이응", "– / ng"),
  consonant("ㅈ", "지읒", "j / t"),
  consonant("ㅊ", "치읓", "ch / t"),
  consonant("ㅋ", "키읔", "k"),
  consonant("ㅌ", "티읕", "t"),
  consonant("ㅍ", "피읖", "p"),
  consonant("ㅎ", "히읗", "h / t"),
];

/** The five tense (doubled) consonants. */
export const HANGUL_TENSE: readonly HangulLetter[] = [
  consonant("ㄲ", "쌍기역", "kk"),
  consonant("ㄸ", "쌍디귿", "tt"),
  consonant("ㅃ", "쌍비읍", "pp"),
  consonant("ㅆ", "쌍시옷", "ss"),
  consonant("ㅉ", "쌍지읒", "jj"),
];

const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const MEDIALS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";

/** The syllable a consonant and a vowel make, with no final: ㄱ + ㅏ → 가. */
export function syllableOf(initial: string, medial: string): string {
  const i = INITIALS.indexOf(initial);
  const m = MEDIALS.indexOf(medial);
  if (i < 0 || m < 0) return "";
  return String.fromCharCode(0xac00 + (i * 21 + m) * 28);
}

/* A vowel is named by itself after the silent ㅇ: ㅏ is 아. */
const vowel = (letter: string, romanization: string): HangulLetter => ({
  letter,
  name: syllableOf("ㅇ", letter),
  romanization,
});

/** The ten basic vowels, in dictionary order. */
export const HANGUL_VOWELS: readonly HangulLetter[] = [
  vowel("ㅏ", "a"),
  vowel("ㅑ", "ya"),
  vowel("ㅓ", "eo"),
  vowel("ㅕ", "yeo"),
  vowel("ㅗ", "o"),
  vowel("ㅛ", "yo"),
  vowel("ㅜ", "u"),
  vowel("ㅠ", "yu"),
  vowel("ㅡ", "eu"),
  vowel("ㅣ", "i"),
];

/** The eleven compound vowels. */
export const HANGUL_COMPOUND_VOWELS: readonly HangulLetter[] = [
  vowel("ㅐ", "ae"),
  vowel("ㅒ", "yae"),
  vowel("ㅔ", "e"),
  vowel("ㅖ", "ye"),
  vowel("ㅘ", "wa"),
  vowel("ㅙ", "wae"),
  vowel("ㅚ", "oe"),
  vowel("ㅝ", "wo"),
  vowel("ㅞ", "we"),
  vowel("ㅟ", "wi"),
  vowel("ㅢ", "ui"),
];
