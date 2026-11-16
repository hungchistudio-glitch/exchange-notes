/* =========================================================
   Kana: the reading line and the furigana (Chi, 2026-11-16)

   Chi chose how a Japanese word shows its reading: small hiragana over its
   kanji only — never over kana, which already says itself — and one muted
   line of romaji on single-word cards. This file is the part of that which
   needs no dictionary: telling kanji from kana, turning a reading into
   romaji, and laying a reading over the kanji it belongs to.

   Where a reading comes from (the lookup, the phonetics route's cache, a
   model) is decided elsewhere; everything here is pure and runs anywhere.

   Romaji is Hepburn consonants (shi, chi, tsu, fu, ji) with long vowels
   written as they are spelled in kana — おう is "ou", ー doubles the vowel
   (コーヒー "koohii"). Macrons would be prettier, but they cannot be placed
   without knowing where one word ends and the next begins: 思う is "omou",
   not "omō", and nothing short of a dictionary tells the two apart.
   ========================================================= */

const HAN = /[\p{Script=Han}々〆ヶ]/u;
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u;

/** Whether the text has a kanji in it — the only case furigana is for. */
export function hasKanji(text: string): boolean {
  return HAN.test(text);
}

/** Whether every letter of the text is kana. */
export function isAllKana(text: string): boolean {
  const letters = [...text].filter((char) => /\p{L}|ー/u.test(char));
  return letters.length > 0 && letters.every((char) => KANA.test(char));
}

/** Katakana to hiragana; everything else unchanged. */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}

const DIGRAPHS: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho", しぇ: "she",
  じゃ: "ja", じゅ: "ju", じょ: "jo", じぇ: "je",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho", ちぇ: "che",
  ぢゃ: "ja", ぢゅ: "ju", ぢょ: "jo",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ふぁ: "fa", ふぃ: "fi", ふぇ: "fe", ふぉ: "fo",
  てぃ: "ti", でぃ: "di", とぅ: "tu", どぅ: "du",
  うぃ: "wi", うぇ: "we", うぉ: "wo",
  ゔぁ: "va", ゔぃ: "vi", ゔぇ: "ve", ゔぉ: "vo",
  つぁ: "tsa", つぃ: "tsi", つぇ: "tse", つぉ: "tso",
};

const MONOGRAPHS: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", ゐ: "i", ゑ: "e", を: "o",
  ゔ: "vu",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
  ゃ: "ya", ゅ: "yu", ょ: "yo", ゎ: "wa",
};

/** The vowel a romaji syllable ends in, for ー to repeat. */
function lastVowel(romaji: string): string {
  const match = /[aeiou](?!.*[aeiou])/.exec(romaji);
  return match ? match[0] : "";
}

/**
 * A kana reading in romaji. Anything that is not kana (a Latin letter, a
 * number, punctuation) is passed through, so a mixed reading stays readable.
 */
export function kanaToRomaji(kana: string): string {
  const text = toHiragana(kana.normalize("NFC"));
  const syllables: string[] = [];
  let pendingDouble = false;

  for (let index = 0; index < text.length; ) {
    const pair = text.slice(index, index + 2);
    const char = text[index];

    if (char === "っ") {
      pendingDouble = true;
      index += 1;
      continue;
    }

    if (char === "ー") {
      const previous = syllables[syllables.length - 1] ?? "";
      syllables.push(lastVowel(previous));
      index += 1;
      continue;
    }

    if (char === "ん") {
      const next = text[index + 1];
      const nextRomaji = next ? (DIGRAPHS[text.slice(index + 1, index + 3)] ?? MONOGRAPHS[next] ?? "") : "";
      /* n' before a vowel or y, so ほんや (hon'ya) is not read ho-nya. */
      syllables.push(/^[aeiouy]/.test(nextRomaji) ? "n'" : "n");
      index += 1;
      continue;
    }

    let romaji = DIGRAPHS[pair];
    let length = 2;
    if (!romaji) {
      romaji = MONOGRAPHS[char];
      length = 1;
    }

    if (!romaji) {
      syllables.push(char);
      pendingDouble = false;
      index += 1;
      continue;
    }

    if (pendingDouble) {
      /* っち is "tchi" in Hepburn; anything else doubles its first letter. */
      romaji = romaji.startsWith("ch") ? `t${romaji}` : `${romaji[0]}${romaji}`;
      pendingDouble = false;
    }

    syllables.push(romaji);
    index += length;
  }

  return syllables.join("");
}

/** One piece of a word laid out for ruby: text, and its reading if kanji. */
export type FuriganaSegment = { text: string; ruby?: string };

/**
 * A reading laid over the kanji it belongs to: 食べる + たべる → 食(た)べる.
 *
 * The kana in the word are matched against the reading, and whatever is
 * left between them is the kanji's. When the two do not line up (a reading
 * from somewhere else, an irregular word), the whole word carries the whole
 * reading rather than a wrong split.
 */
export function alignFurigana(surface: string, reading: string): FuriganaSegment[] {
  const text = surface.normalize("NFC");
  const kana = toHiragana(reading.normalize("NFC")).replace(/\s+/g, "");
  if (!hasKanji(text) || !kana) return [{ text }];

  const runs: { text: string; kanji: boolean }[] = [];
  for (const char of text) {
    const kanji = HAN.test(char);
    const last = runs[runs.length - 1];
    if (last && last.kanji === kanji) last.text += char;
    else runs.push({ text: char, kanji });
  }

  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^${runs.map((run) => (run.kanji ? "(.+?)" : `(${escape(toHiragana(run.text))})`)).join("")}$`,
    "u",
  );
  const match = pattern.exec(kana);
  if (!match) return [{ text, ruby: kana }];

  return runs.map((run, index) =>
    run.kanji ? { text: run.text, ruby: match[index + 1] } : { text: run.text },
  );
}

/**
 * Text written with its readings inline — {友達|ともだち}と{遊|あそ}ぶ —
 * as segments. The form a model is asked to write long Japanese text in, so
 * a story can carry furigana without a dictionary on the server.
 */
export function parseAnnotatedFurigana(annotated: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  const pattern = /\{([^{}|]+)\|([^{}|]+)\}/gu;
  let last = 0;
  for (const match of annotated.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) segments.push({ text: annotated.slice(last, at) });
    segments.push({ text: match[1], ruby: toHiragana(match[2]) });
    last = at + match[0].length;
  }
  if (last < annotated.length) segments.push({ text: annotated.slice(last) });
  return segments;
}

/** The plain text of annotated text, readings removed. */
export function stripAnnotatedFurigana(annotated: string): string {
  return annotated.replace(/\{([^{}|]+)\|[^{}|]+\}/gu, "$1");
}
