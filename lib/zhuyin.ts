const INITIALS: Array<[string, string]> = [
  ["zh", "ㄓ"],
  ["ch", "ㄔ"],
  ["sh", "ㄕ"],
  ["b", "ㄅ"],
  ["p", "ㄆ"],
  ["m", "ㄇ"],
  ["f", "ㄈ"],
  ["d", "ㄉ"],
  ["t", "ㄊ"],
  ["n", "ㄋ"],
  ["l", "ㄌ"],
  ["g", "ㄍ"],
  ["k", "ㄎ"],
  ["h", "ㄏ"],
  ["j", "ㄐ"],
  ["q", "ㄑ"],
  ["x", "ㄒ"],
  ["r", "ㄖ"],
  ["z", "ㄗ"],
  ["c", "ㄘ"],
  ["s", "ㄙ"],
];

const FINALS: Record<string, string> = {
  a: "ㄚ",
  o: "ㄛ",
  e: "ㄜ",
  ai: "ㄞ",
  ei: "ㄟ",
  ao: "ㄠ",
  ou: "ㄡ",
  an: "ㄢ",
  en: "ㄣ",
  ang: "ㄤ",
  eng: "ㄥ",
  er: "ㄦ",

  i: "ㄧ",
  ia: "ㄧㄚ",
  ie: "ㄧㄝ",
  iao: "ㄧㄠ",
  iu: "ㄧㄡ",
  ian: "ㄧㄢ",
  in: "ㄧㄣ",
  iang: "ㄧㄤ",
  ing: "ㄧㄥ",
  iong: "ㄩㄥ",

  u: "ㄨ",
  ua: "ㄨㄚ",
  uo: "ㄨㄛ",
  uai: "ㄨㄞ",
  ui: "ㄨㄟ",
  uan: "ㄨㄢ",
  un: "ㄨㄣ",
  uang: "ㄨㄤ",
  ong: "ㄨㄥ",

  ü: "ㄩ",
  v: "ㄩ",
  üe: "ㄩㄝ",
  ve: "ㄩㄝ",
  üan: "ㄩㄢ",
  van: "ㄩㄢ",
  ün: "ㄩㄣ",
  vn: "ㄩㄣ",
};

const TONE_MARKS: Record<string, [string, number]> = {
  ā: ["a", 1],
  á: ["a", 2],
  ǎ: ["a", 3],
  à: ["a", 4],
  ē: ["e", 1],
  é: ["e", 2],
  ě: ["e", 3],
  è: ["e", 4],
  ī: ["i", 1],
  í: ["i", 2],
  ǐ: ["i", 3],
  ì: ["i", 4],
  ō: ["o", 1],
  ó: ["o", 2],
  ǒ: ["o", 3],
  ò: ["o", 4],
  ū: ["u", 1],
  ú: ["u", 2],
  ǔ: ["u", 3],
  ù: ["u", 4],
  ǖ: ["ü", 1],
  ǘ: ["ü", 2],
  ǚ: ["ü", 3],
  ǜ: ["ü", 4],
};

const ZHUYIN_TONES: Record<number, string> = {
  1: "",
  2: "ˊ",
  3: "ˇ",
  4: "ˋ",
  5: "˙",
};

function normalizeSyllable(value: string) {
  let tone = 1;
  let syllable = value.toLowerCase();

  syllable = syllable.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (character) => {
    const replacement = TONE_MARKS[character];

    if (!replacement) return character;

    tone = replacement[1];
    return replacement[0];
  });

  const numericTone = syllable.match(/[1-5]$/);

  if (numericTone) {
    tone = Number(numericTone[0]);
    syllable = syllable.slice(0, -1);
  }

  syllable = syllable.replace(/u:/g, "ü");

  return { syllable, tone };
}

function convertSyllable(value: string) {
  const { syllable: rawSyllable, tone } = normalizeSyllable(value);

  if (!rawSyllable) return "";

  let syllable = rawSyllable;
  let initial = "";

  for (const [pinyin, zhuyin] of INITIALS) {
    if (syllable.startsWith(pinyin)) {
      initial = zhuyin;
      syllable = syllable.slice(pinyin.length);
      break;
    }
  }

  if (["j", "q", "x"].some((value) => rawSyllable.startsWith(value))) {
    syllable = syllable
      .replace(/^u/, "ü")
      .replace(/^uan/, "üan")
      .replace(/^un/, "ün");
  }

  if (!initial) {
    if (syllable.startsWith("yi")) {
      syllable = syllable.replace(/^yi/, "i");
    } else if (syllable.startsWith("y")) {
      syllable = syllable.replace(/^y/, "i");
    } else if (syllable.startsWith("wu")) {
      syllable = syllable.replace(/^wu/, "u");
    } else if (syllable.startsWith("w")) {
      syllable = syllable.replace(/^w/, "u");
    } else if (syllable.startsWith("yu")) {
      syllable = syllable.replace(/^yu/, "ü");
    }
  }

  const final = FINALS[syllable];

  if (!final) {
    return value;
  }

  return `${initial}${final}${ZHUYIN_TONES[tone] ?? ""}`;
}

export function pinyinToZhuyin(pinyin: string) {
  return pinyin
    .trim()
    .split(/\s+/)
    .map(convertSyllable)
    .filter(Boolean)
    .join(" ");
}
