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
};

const APICAL_I_INITIALS = new Set(["zh", "ch", "sh", "r", "z", "c", "s"]);

function normalizeSyllable(value: string) {
  let tone = 1;

  // NFC ensures accented vowels such as a + combining acute
  // become the composed character á.
  let syllable = value.trim().toLowerCase().normalize("NFC");

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

  syllable = syllable.replace(/u:/g, "ü").replace(/v/g, "ü");

  return {
    syllable,
    tone,
  };
}

function normalizeZeroInitialSyllable(syllable: string) {
  if (syllable === "yi") return "i";
  if (syllable.startsWith("yi")) return syllable.replace(/^yi/, "i");

  if (syllable === "you") return "iu";
  if (syllable.startsWith("y")) return syllable.replace(/^y/, "i");

  if (syllable === "wu") return "u";
  if (syllable.startsWith("w")) return syllable.replace(/^w/, "u");

  return syllable;
}

function normalizeYuSyllable(syllable: string) {
  if (syllable === "yu") return "ü";
  if (syllable === "yue") return "üe";
  if (syllable === "yuan") return "üan";
  if (syllable === "yun") return "ün";

  return syllable;
}

function convertSyllable(value: string) {
  const normalized = normalizeSyllable(value);
  const rawSyllable = normalized.syllable;
  const tone = normalized.tone;

  if (!rawSyllable) return "";

  let syllable = normalizeYuSyllable(rawSyllable);
  let initialPinyin = "";
  let initialZhuyin = "";

  for (const [pinyin, zhuyin] of INITIALS) {
    if (syllable.startsWith(pinyin)) {
      initialPinyin = pinyin;
      initialZhuyin = zhuyin;
      syllable = syllable.slice(pinyin.length);
      break;
    }
  }

  if (!initialPinyin) {
    syllable = normalizeZeroInitialSyllable(syllable);
  }

  // j, q, x use ü sounds even though standard pinyin writes u.
  if (["j", "q", "x"].includes(initialPinyin)) {
    if (syllable === "u") syllable = "ü";
    if (syllable === "ue") syllable = "üe";
    if (syllable === "uan") syllable = "üan";
    if (syllable === "un") syllable = "ün";
  }

  // zhi, chi, shi, ri, zi, ci, si do not contain ㄧ in Zhuyin.
  if (syllable === "i" && APICAL_I_INITIALS.has(initialPinyin)) {
    syllable = "";
  }

  const finalZhuyin = syllable ? FINALS[syllable] : "";

  if (syllable && !finalZhuyin) {
    return value;
  }

  const base = `${initialZhuyin}${finalZhuyin}`;

  if (!base) return value;

  // Neutral tone dot is written before the syllable.
  if (tone === 5) {
    return `˙${base}`;
  }

  return `${base}${ZHUYIN_TONES[tone] ?? ""}`;
}

export function pinyinToZhuyin(pinyin: string) {
  return pinyin
    .trim()
    .normalize("NFC")
    .split(/\s+/)
    .map(convertSyllable)
    .filter(Boolean)
    .join(" ");
}
