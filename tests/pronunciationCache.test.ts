import { describe, expect, it } from "vitest";

import { getPronunciationData } from "@/lib/pronunciation";

/* =========================================================
   The same word is only converted once

   Both halves of a Chinese reading are dictionary lookups over every
   character, and the callers are render paths that ask for the same few
   hundred words over and over — the cookie tray, a word list re-rendering,
   a card re-reading the word it is already showing. 0.056ms a call is
   nothing once and 17ms across a 300-word library, every render.

   Correctness first: a cache that returns the wrong reading is worse than
   no cache, so most of this is about the answers still being right.
   ========================================================= */

describe("pronunciation", () => {
  it("gives the same answer whether or not it was asked before", () => {
    const first = getPronunciationData({ chinese: "橋樑" });
    const second = getPronunciationData({ chinese: "橋樑" });

    expect(second.pinyin).toBe(first.pinyin);
    expect(second.zhuyin).toBe(first.zhuyin);
    expect(first.zhuyin).toMatch(/[ㄅ-ㄯ]/);
  });

  it("keeps different words apart", () => {
    const bridge = getPronunciationData({ chinese: "橋樑" });
    const apple = getPronunciationData({ chinese: "蘋果" });

    expect(bridge.zhuyin).not.toBe(apple.zhuyin);
    expect(bridge.pinyin).not.toBe(apple.pinyin);
  });

  it("does not let the english half leak between two calls for the same chinese", () => {
    // The cache is keyed on the Chinese text alone, because that is all the
    // conversion reads. The English half must still come back as passed.
    const a = getPronunciationData({ english: "bridge", chinese: "橋樑" });
    const b = getPronunciationData({ english: "span", chinese: "橋樑" });

    expect(a.english).toBe("bridge");
    expect(b.english).toBe("span");
    expect(b.zhuyin).toBe(a.zhuyin);
  });

  it("says nothing for text with no Chinese in it", () => {
    const latin = getPronunciationData({ chinese: "bridge" });

    expect(latin.pinyin).toBeNull();
    expect(latin.zhuyin).toBeNull();
  });

  it("still marks neutral tone with the light dot rather than leaking a digit", () => {
    // The regression the conversion was written for: pinyin-pro emits "de0"
    // and the zhuyin converter only understands "5", so an unnormalised
    // string used to render "˙ㄉㄜ0". Caching must not reintroduce it.
    const neutral = getPronunciationData({ chinese: "我的" });

    expect(neutral.zhuyin).not.toMatch(/\d/);
  });
});
