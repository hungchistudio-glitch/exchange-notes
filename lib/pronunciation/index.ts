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

      // pinyin-pro marks neutral tone as "0" (e.g. "de0" for 的), but the
      // pinyin-to-zhuyin converter only recognizes "5" (or no digit) as
      // neutral tone. Left as "0", it doesn't get converted to the
      // light-dot prefix and instead leaks a literal "0" into the output
      // (e.g. "˙ㄉㄜ0" instead of "˙ㄉㄜ") for every neutral-tone
      // character — which is extremely common (的/了/嗎/呢/嗎/著...).
      const normalizedPinyin = numberedPinyin.replace(/0\b/g, "5");

      zhuyinText = p2z(normalizedPinyin, { tonemarks: true });
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
