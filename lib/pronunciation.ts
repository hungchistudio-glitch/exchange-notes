import { getLocalEnglishPronunciation } from "@/lib/localPronunciation";
import { toPinyin } from "@/lib/pinyin";
import { pinyinToZhuyin } from "@/lib/zhuyin";

export type PronunciationData = {
  english: string;
  pinyin: string;
  zhuyin: string;
};

export function getPronunciationData({
  english,
  chinese,
}: {
  english?: string | null;
  chinese?: string | null;
}): PronunciationData {
  const englishText = english?.trim() ?? "";
  const chineseText = chinese?.trim() ?? "";

  const pinyin = chineseText ? (toPinyin(chineseText) ?? "").trim() : "";

  const zhuyin = pinyin ? pinyinToZhuyin(pinyin).trim() : "";

  return {
    english: englishText ? getLocalEnglishPronunciation(englishText) : "",
    pinyin,
    zhuyin,
  };
}
