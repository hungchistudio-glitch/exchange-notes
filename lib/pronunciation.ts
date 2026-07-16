import { getChinesePronunciationOverride } from "@/lib/chineseDictionary";
import { getLocalEnglishPronunciation } from "@/lib/localPronunciation";
import { toPinyin } from "@/lib/pinyin";
import { pinyinToZhuyin } from "@/lib/zhuyin";

export type PronunciationData = {
  english: string;
  pinyin: string;
  zhuyin: string;
};

function normalizePronunciation(value?: string | null) {
  return value?.trim() ?? "";
}

export function getPronunciationData({
  english,
  chinese,
}: {
  english?: string | null;
  chinese?: string | null;
}): PronunciationData {
  const englishText = normalizePronunciation(english);
  const chineseText = normalizePronunciation(chinese);

  const override = chineseText
    ? getChinesePronunciationOverride(chineseText)
    : null;

  const pinyin =
    override?.pinyin ??
    (chineseText ? normalizePronunciation(toPinyin(chineseText)) : "");

  const zhuyin =
    override?.zhuyin ??
    (pinyin ? pinyinToZhuyin(pinyin).replace(/\s+/g, "") : "");

  return {
    english: englishText ? getLocalEnglishPronunciation(englishText) : "",
    pinyin,
    zhuyin,
  };
}
