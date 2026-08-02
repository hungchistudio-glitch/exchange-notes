import { pinyin } from "pinyin-pro";
import { p2z } from "pinyin-to-zhuyin";
import { toPinyin } from "@/lib/pinyin";

export type PronunciationData = {
  english: string | null;
  pinyin: string | null;
  zhuyin: string | null;
};

type GetPronunciationDataInput = {
  english?: string | null;
  chinese?: string | null;
};

export function getPronunciationData({
  english,
  chinese,
}: GetPronunciationDataInput): PronunciationData {
  const trimmedChinese = chinese?.trim() ?? "";
  const hasChinese = /[\u4e00-\u9fff]/.test(trimmedChinese);

  let pinyinText: string | null = null;
  let zhuyinText: string | null = null;

  if (hasChinese) {
    pinyinText = toPinyin(trimmedChinese);

    try {
      const numberedPinyin = pinyin(trimmedChinese, {
        toneType: "num",
        type: "string",
      });
      zhuyinText = p2z(numberedPinyin, { tonemarks: true });
    } catch (error) {
      console.error("Failed to convert pinyin to zhuyin:", error);
      zhuyinText = null;
    }
  }

  return {
    english: english?.trim() || null,
    pinyin: pinyinText,
    zhuyin: zhuyinText,
  };
}
