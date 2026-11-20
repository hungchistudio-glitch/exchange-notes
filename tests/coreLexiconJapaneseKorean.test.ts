import { describe, expect, it } from "vitest";

import { findCoreWord } from "@/lib/vocabulary/coreLexicon";

/* The offline dictionary answers the form a reader copied out of a sentence. */
describe("findCoreWord with a conjugated Japanese or Korean word", () => {
  it.each([
    ["食べました", "ja", "eat"],
    ["飲んで", "ja", "drink"],
    ["学校で", "ja", "school"],
    ["먹었어요", "ko", "eat"],
    ["마셔요", "ko", "drink"],
    ["학교에서", "ko", "school"],
  ] as const)("%s (%s) finds %s", (typed, language, english) => {
    expect(findCoreWord(typed, language)?.forms.en[0]).toBe(english);
  });
});
