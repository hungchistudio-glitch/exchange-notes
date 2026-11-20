import { describe, expect, it } from "vitest";

import { koreanPronounced } from "@/lib/korean/romanize";

/* The bracketed Hangul a Korean dictionary prints, made by the same rules
   as RR and IPA (lib/korean/romanize.ts). */
describe("koreanPronounced", () => {
  it.each([
    ["한국어", "한구거"],
    ["감사합니다", "감사함니다"],
    ["같이", "가치"],
    ["좋다", "조타"],
    ["음악", "으막"],
    ["학교", "학꾜"],
    ["신라", "실라"],
    ["정류장", "정뉴장"],
    ["옷", "옫"],
    ["읽어요", "일거요"],
    ["먹었어요", "머거써요"],
  ])("%s → [%s]", (written, said) => {
    expect(koreanPronounced(written)).toBe(said);
  });

  it("says nothing when the word is said as it is spelt", () => {
    expect(koreanPronounced("가다")).toBeNull();
    expect(koreanPronounced("사람")).toBeNull();
    expect(koreanPronounced("library")).toBeNull();
  });

  it("keeps the spaces and punctuation of a phrase", () => {
    expect(koreanPronounced("한국어 공부, 좋아요")).toBe("한구거 공부, 조아요");
  });
});
