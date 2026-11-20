import { describe, expect, it } from "vitest";

import { lemmaCandidates } from "@/lib/lexicon/inflection";

/* =========================================================
   The dictionary form of a Japanese or Korean word, guessed (2026-11-16)

   A reader copies the form in front of them — 食べました, 먹었어요 — and
   the dictionary holds 食べる and 먹다. These are the forms the guesser has
   to reach; it may offer wrong ones beside them, which cost nothing because
   a guess counts only when the dictionary has it.
   ========================================================= */

const japanese: Array<[typed: string, dictionary: string]> = [
  ["食べました", "食べる"],
  ["食べません", "食べる"],
  ["食べて", "食べる"],
  ["食べた", "食べる"],
  ["食べない", "食べる"],
  ["食べたい", "食べる"],
  ["書きます", "書く"],
  ["書いて", "書く"],
  ["書いた", "書く"],
  ["書かない", "書く"],
  ["書いています", "書く"],
  ["飲みました", "飲む"],
  ["飲んで", "飲む"],
  ["飲んだ", "飲む"],
  ["泳いで", "泳ぐ"],
  ["買った", "買う"],
  ["待って", "待つ"],
  ["帰りました", "帰る"],
  ["行って", "行く"],
  ["話して", "話す"],
  ["遊んだ", "遊ぶ"],
  ["勉強しました", "勉強する"],
  ["勉強して", "勉強する"],
  ["勉強します", "勉強"],
  ["来ました", "来る"],
  ["見た", "見る"],
  ["高かった", "高い"],
  ["高くない", "高い"],
  ["高くて", "高い"],
  ["高かったです", "高い"],
  ["学生です", "学生"],
  ["静かでした", "静か"],
  ["本を", "本"],
  ["学校で", "学校"],
  ["しました", "する"],
];

const korean: Array<[typed: string, dictionary: string]> = [
  ["먹어요", "먹다"],
  ["먹었어요", "먹다"],
  ["먹습니다", "먹다"],
  ["먹었습니다", "먹다"],
  ["먹었다", "먹다"],
  ["먹고", "먹다"],
  ["먹는", "먹다"],
  ["먹어서", "먹다"],
  ["좋아요", "좋다"],
  ["가요", "가다"],
  ["갔어요", "가다"],
  ["갑니다", "가다"],
  ["가세요", "가다"],
  ["가서", "가다"],
  ["읽으세요", "읽다"],
  ["와요", "오다"],
  ["왔어요", "오다"],
  ["봐요", "보다"],
  ["줘요", "주다"],
  ["배워요", "배우다"],
  ["마셔요", "마시다"],
  ["마셨어요", "마시다"],
  ["돼요", "되다"],
  ["써요", "쓰다"],
  ["바빠요", "바쁘다"],
  ["보내요", "보내다"],
  ["공부해요", "공부하다"],
  ["공부했어요", "공부하다"],
  ["공부합니다", "공부하다"],
  ["공부해서", "공부하다"],
  ["학생이에요", "학생"],
  ["의사예요", "의사"],
  ["학생입니다", "학생"],
  ["책을", "책"],
  ["학교에서", "학교"],
  ["친구가", "친구"],
  ["학생들이", "학생"],
];

describe("lemmaCandidates for Japanese", () => {
  it.each(japanese)("%s → %s", (typed, dictionary) => {
    expect(lemmaCandidates(typed, "ja")).toContain(dictionary);
  });
});

describe("lemmaCandidates for Korean", () => {
  it.each(korean)("%s → %s", (typed, dictionary) => {
    expect(lemmaCandidates(typed, "ko")).toContain(dictionary);
  });
});

describe("what it never offers", () => {
  it("never returns the word itself or a lone kana", () => {
    for (const [typed] of japanese) {
      const found = lemmaCandidates(typed, "ja");
      expect(found).not.toContain(typed);
      expect(found.some((candidate) => /^[ぁ-ゖ]$/.test(candidate))).toBe(false);
    }
  });

  it("leaves a dictionary form alone enough to look it up as typed", () => {
    // findCoreWord asks for the typed form first; these only matter if it is missing.
    expect(lemmaCandidates("먹다", "ko")).not.toContain("먹다");
    expect(lemmaCandidates("本", "ja")).toEqual([]);
  });

  it("keeps the other languages' rules as they were", () => {
    expect(lemmaCandidates("shoes", "en")).toContain("shoe");
    expect(lemmaCandidates("is", "en")).toEqual([]);
  });
});
