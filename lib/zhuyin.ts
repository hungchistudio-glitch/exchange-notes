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
  üe: "ㄩㄝ",
  üan: "ㄩㄢ",
  ün: "ㄩㄣ",
};

const ACCENTED_VOWELS: Record<string, [string, number]> = {
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

const TONE_SYMBOLS: Record<number, string> = {
  1: "ˉ",
  2: "ˊ",
  3: "ˇ",
  4: "ˋ",
  5: "˙",
};

const APICAL_I_INITIALS = new Set(["zh", "ch", "sh", "r", "z", "c", "s"]);

function parsePinyinSyllable(input: string) {
  // Unmarked pinyin from our converter represents neutral tone.
  let tone = 5;

  let syllable = input
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü");

  syllable = syllable.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (character) => {
    const match = ACCENTED_VOWELS[character];

    if (!match) return character;

    tone = match[1];
    return match[0];
  });

  const numericTone = syllable.match(/[1-5]$/);

  if (numericTone) {
    tone = Number(numericTone[0]);
    syllable = syllable.slice(0, -1);
  }

  return {
    syllable,
    tone,
  };
}

function normalizeZeroInitial(syllable: string) {
  const replacements: Record<string, string> = {
    yi: "i",
    ya: "ia",
    ye: "ie",
    yao: "iao",
    you: "iu",
    yan: "ian",
    yin: "in",
    yang: "iang",
    ying: "ing",
    yong: "iong",

    wu: "u",
    wa: "ua",
    wo: "uo",
    wai: "uai",
    wei: "ui",
    wan: "uan",
    wen: "un",
    wang: "uang",
    weng: "ong",

    yu: "ü",
    yue: "üe",
    yuan: "üan",
    yun: "ün",
  };

  return replacements[syllable] ?? syllable;
}

function convertSyllable(input: string) {
  const parsed = parsePinyinSyllable(input);

  let syllable = normalizeZeroInitial(parsed.syllable);
  let initialPinyin = "";
  let initialZhuyin = "";

  for (const [pinyin, zhuyin] of INITIALS) {
    if (!syllable.startsWith(pinyin)) continue;

    initialPinyin = pinyin;
    initialZhuyin = zhuyin;
    syllable = syllable.slice(pinyin.length);
    break;
  }

  // j/q/x + u are actually ㄩ sounds in standard Mandarin.
  if (["j", "q", "x"].includes(initialPinyin)) {
    if (syllable === "u") syllable = "ü";
    if (syllable === "ue") syllable = "üe";
    if (syllable === "uan") syllable = "üan";
    if (syllable === "un") syllable = "ün";
  }

  // zhi, chi, shi, ri, zi, ci and si do not add ㄧ.
  if (syllable === "i" && APICAL_I_INITIALS.has(initialPinyin)) {
    syllable = "";
  }

  const finalZhuyin = syllable ? FINALS[syllable] : "";

  if (syllable && !finalZhuyin) {
    return input;
  }

  const base = `${initialZhuyin}${finalZhuyin}`;

  if (!base) return input;

  return `${base}${TONE_SYMBOLS[parsed.tone] ?? ""}`;
}

export function pinyinToZhuyin(pinyin: string) {
  return pinyin
    .trim()
    .normalize("NFC")
    .split(/\s+/)
    .map(convertSyllable)
    .filter(Boolean)
    .join("");
}
