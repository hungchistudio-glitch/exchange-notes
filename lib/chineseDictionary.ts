export type ChinesePronunciationEntry = {
  pinyin: string;
  zhuyin?: string;
};

/**
 * Phrase-level pronunciation overrides.
 *
 * Longer phrases take priority over individual characters.
 * Add entries here when a word has context-dependent pronunciation.
 */
const CHINESE_PRONUNCIATION_DICTIONARY: Record<
  string,
  ChinesePronunciationEntry
> = {
  // Current vocabulary
  量級: {
    pinyin: "liàng jí",
    zhuyin: "ㄌㄧㄤˋㄐㄧˊ",
  },
  相關的: {
    pinyin: "xiāng guān de",
    zhuyin: "ㄒㄧㄤˉㄍㄨㄢˉㄉㄜ˙",
  },
  蘭花: {
    pinyin: "lán huā",
    zhuyin: "ㄌㄢˊㄏㄨㄚˉ",
  },

  // Common polyphonic phrases
  重量級: {
    pinyin: "zhòng liàng jí",
    zhuyin: "ㄓㄨㄥˋㄌㄧㄤˋㄐㄧˊ",
  },
  重量: {
    pinyin: "zhòng liàng",
    zhuyin: "ㄓㄨㄥˋㄌㄧㄤˋ",
  },
  重複: {
    pinyin: "chóng fù",
    zhuyin: "ㄔㄨㄥˊㄈㄨˋ",
  },
  銀行: {
    pinyin: "yín háng",
    zhuyin: "ㄧㄣˊㄏㄤˊ",
  },
  行李: {
    pinyin: "xíng lǐ",
    zhuyin: "ㄒㄧㄥˊㄌㄧˇ",
  },
  行走: {
    pinyin: "xíng zǒu",
    zhuyin: "ㄒㄧㄥˊㄗㄡˇ",
  },
  校長: {
    pinyin: "xiào zhǎng",
    zhuyin: "ㄒㄧㄠˋㄓㄤˇ",
  },
  長大: {
    pinyin: "zhǎng dà",
    zhuyin: "ㄓㄤˇㄉㄚˋ",
  },
  長度: {
    pinyin: "cháng dù",
    zhuyin: "ㄔㄤˊㄉㄨˋ",
  },
  音樂: {
    pinyin: "yīn yuè",
    zhuyin: "ㄧㄣˉㄩㄝˋ",
  },
  快樂: {
    pinyin: "kuài lè",
    zhuyin: "ㄎㄨㄞˋㄌㄜˋ",
  },
  覺得: {
    pinyin: "jué de",
    zhuyin: "ㄐㄩㄝˊㄉㄜ˙",
  },
  睡覺: {
    pinyin: "shuì jiào",
    zhuyin: "ㄕㄨㄟˋㄐㄧㄠˋ",
  },
};

function normalizeChineseText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，。！？；：、,.!?;:()[\]{}"'「」『』]/g, "");
}

export function getChinesePronunciationOverride(
  value: string,
): ChinesePronunciationEntry | null {
  const normalized = normalizeChineseText(value);

  if (!normalized) return null;

  return CHINESE_PRONUNCIATION_DICTIONARY[normalized] ?? null;
}
