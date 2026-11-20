import { describe, expect, it } from "vitest";

import { japaneseInTraditional, toTraditionalForms } from "@/lib/japanese/traditional";
import { bridgeFor } from "@/lib/kanjiBridge";
import { hanjaFor, isHanjaOf } from "@/lib/korean/hanja";
import { HANJA_WORDS } from "@/lib/korean/hanjaWords";

/* =========================================================
   The kanji bridge (Chi, 2026-11-16: 漢字橋樑)

   A Korean word's hanja are shown only when every syllable is a reading
   of its character, and a Japanese word's Traditional forms only from
   one-to-one pairs. Both are checked here, the generated table included.
   ========================================================= */

describe("isHanjaOf", () => {
  it.each([
    ["도서관", "圖書館"],
    ["학교", "學校"],
    ["역사", "歷史"], // 력 at the start of a word is 역
    ["노인", "老人"], // 로 → 노
    ["여자", "女子"], // 녀 → 여
    ["비율", "比率"], // 률 after a vowel is 율
    ["확률", "確率"], // and stays 률 after a consonant
    ["천진난만", "天真爛漫"], // an idiom's second word starts afresh
    ["일석이조", "一石二鳥"],
  ])("%s is %s", (korean, hanja) => {
    expect(isHanjaOf(korean, hanja)).toBe(true);
  });

  it.each([
    ["사과", "蘋果"], // the same fruit, a native word
    ["병원", "醫院"], // Korean says 病院
    ["학교", "學"], // a syllable short
    ["학교", "學生"],
  ])("%s is not %s", (korean, hanja) => {
    expect(isHanjaOf(korean, hanja)).toBe(false);
  });

  it("finds the first candidate that checks out", () => {
    expect(hanjaFor("경험", ["體驗", "經驗"])).toBe("經驗");
    expect(hanjaFor("경험", [null, undefined, ""])).toBeNull();
  });
});

describe("the generated table", () => {
  const pairs = [...HANJA_WORDS.matchAll(/([가-힣]+)(\p{Script=Han}+)/gu)].map(([, korean, hanja]) => [korean, hanja]);

  it("is all Korean-then-hanja runs", () => {
    expect(pairs.map(([korean, hanja]) => korean + hanja).join("")).toBe(HANJA_WORDS);
    expect(pairs.length).toBeGreaterThan(1000);
  });

  it("holds only pairs that check out", () => {
    const wrong = pairs.filter(([korean, hanja]) => !isHanjaOf(korean, hanja));
    expect(wrong).toEqual([]);
  });
});

describe("Japanese in Traditional forms", () => {
  it("maps the simplified kanji, one to one", () => {
    expect(toTraditionalForms("経験図書館学生駅鉄道読書薬戦争写真")).toBe("經驗圖書館學生驛鐵道讀書藥戰爭寫真");
  });

  it("says nothing for a word already in Traditional forms, or without kanji", () => {
    expect(japaneseInTraditional("日本")).toBeNull();
    expect(japaneseInTraditional("先生")).toBeNull();
    expect(japaneseInTraditional("ひらがな")).toBeNull();
  });

  it("leaves the merged characters alone", () => {
    // 予 stands for both 預 and 豫; 台 for 台 and 臺.
    expect(toTraditionalForms("予定")).toBe("予定");
    expect(toTraditionalForms("台風")).toBe("台風");
  });
});

describe("bridgeFor", () => {
  it("gives a Korean word its hanja, from the table or a sibling", () => {
    expect(bridgeFor({ text: "도서관", language: "ko" }, [])).toEqual({ kind: "hanja", text: "圖書館" });
    expect(bridgeFor({ text: "전공", language: "ko" }, [{ text: "專攻", language: "zh-TW" }])).toEqual({ kind: "hanja", text: "專攻" });
    expect(bridgeFor({ text: "사과", language: "ko" }, [{ text: "蘋果", language: "zh-TW" }])).toBeNull();
  });

  it("gives a Japanese word its Traditional forms, unless the card shows them", () => {
    expect(bridgeFor({ text: "経験", language: "ja" }, [{ text: "experience", language: "en" }])).toEqual({ kind: "traditional", text: "經驗" });
    expect(bridgeFor({ text: "経験", language: "ja" }, [{ text: "經驗", language: "zh-TW" }])).toBeNull();
  });

  it("is never given to another language", () => {
    expect(bridgeFor({ text: "圖書館", language: "zh-TW" }, [])).toBeNull();
  });
});
