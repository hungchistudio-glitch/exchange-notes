import { HANJA_READINGS } from "./hanjaReadings";

/* =========================================================
   A Korean word's hanja, when it has them (2026-11-16)

   Most of Korean's learned vocabulary is Sino-Korean: 도서관 is 圖書館,
   학교 學校. A reader who knows Chinese characters learns those words in
   one look once the characters are shown, so a Korean card shows them
   (Chi: 漢字橋樑).

   A pairing is shown only when it checks out character by character: the
   Korean word has one syllable per character, and each syllable is a
   reading of its character. 사과 and 蘋果 mean the same fruit but fail
   (蘋 is 빈), so a native Korean word is never given a Chinese spelling
   it does not have.
   ========================================================= */

let table: Map<string, readonly string[]> | null = null;

function readings(): Map<string, readonly string[]> {
  if (table) return table;
  table = new Map();
  let current = "";
  for (const char of HANJA_READINGS) {
    if (/\p{Script=Han}/u.test(char)) {
      current = char;
      table.set(current, []);
    } else if (current) {
      (table.get(current) as string[]).push(char);
    }
  }
  return table;
}

const BASE = 0xac00;
const IOTIZED = new Set([2, 6, 7, 12, 17, 20]); // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
const INITIAL_N = 2;
const INITIAL_R = 5;
const INITIAL_SILENT = 11;

function parts(syllable: string) {
  const code = syllable.charCodeAt(0) - BASE;
  return { initial: Math.floor(code / 588), medial: Math.floor((code % 588) / 28), final: code % 28 };
}

function compose(initial: number, medial: number, final: number) {
  return String.fromCharCode(BASE + initial * 588 + medial * 28 + final);
}

/**
 * The reading as said at the start of a word (두음 법칙): 력 → 역,
 * 로 → 노, 녀 → 여.
 */
function atWordStart(reading: string): string {
  const { initial, medial, final } = parts(reading);
  if (initial === INITIAL_R) return compose(IOTIZED.has(medial) ? INITIAL_SILENT : INITIAL_N, medial, final);
  if (initial === INITIAL_N && IOTIZED.has(medial)) return compose(INITIAL_SILENT, medial, final);
  return reading;
}

/** 렬 and 률 are said 열 and 율 after a vowel or ㄴ: 비율, 규율. */
function afterVowel(reading: string): string {
  const { initial, medial, final } = parts(reading);
  return initial === INITIAL_R && (medial === 6 || medial === 17) && final === 8
    ? compose(INITIAL_SILENT, medial, final)
    : reading;
}

/** Whether `hanja` is how `korean` is written in Chinese characters. */
export function isHanjaOf(korean: string, hanja: string): boolean {
  const syllables = [...korean.trim()];
  const characters = [...hanja.trim()];
  if (syllables.length < 2 || syllables.length !== characters.length) return false;
  if (!syllables.every((syllable) => /[가-힣]/.test(syllable))) return false;

  const known = readings();
  return characters.every((character, index) => {
    const options = known.get(character);
    if (!options?.length) return false;
    const said = syllables[index];
    const previous = index > 0 ? parts(syllables[index - 1]) : null;
    /* A four-character idiom is two words, and its second starts afresh:
       天真爛漫 is 천진난만, 濫竽充數 남우충수. */
    const startsAWord = index === 0 || (characters.length === 4 && index === 2);
    return options.some(
      (reading) =>
        reading === said ||
        (startsAWord && atWordStart(reading) === said) ||
        (previous !== null && (previous.final === 0 || previous.final === 4) && afterVowel(reading) === said),
    );
  });
}

/** The first of `candidates` that is `korean` in hanja, if any. */
export function hanjaFor(korean: string, candidates: readonly (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    const text = candidate?.trim();
    if (text && isHanjaOf(korean, text)) return text;
  }
  return null;
}
