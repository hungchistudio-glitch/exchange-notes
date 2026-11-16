import { describe, expect, it } from "vitest";

import { alignFurigana, kanaToRomaji, parseAnnotatedFurigana, stripAnnotatedFurigana, toHiragana } from "@/lib/japanese/kana";
import { koreanIpa, romanizeKorean } from "@/lib/korean/romanize";
import { detectLanguage } from "@/lib/languageDetection";
import { matchKey } from "@/lib/lexicon/normalize";
import { detectNoteLanguage } from "@/lib/notes/languageDetection";
import { getPhonetics } from "@/lib/pronunciation";

/* =========================================================
   Japanese and Korean readings (Chi, 2026-11-16)

   Korean is read by rule, after the sound changes between syllables; a
   reading that spelled each block on its own would teach the wrong word.
   Japanese furigana sits over kanji only, and romaji is made from kana.
   ========================================================= */

describe("Korean, as it is said", () => {
  it.each([
    ["한국어", "hangugeo", "/han.ɡu.ɡʌ/"],
    ["감사합니다", "gamsahamnida", "/kam.sa.ham.ni.da/"],
    ["같이", "gachi", "/ka.tɕʰi/"],
    ["좋다", "jota", "/tɕo.tʰa/"],
    ["신라", "silla", "/ɕil.la/"],
    ["정류장", "jeongnyujang", "/tɕʌŋ.nju.dʑaŋ/"],
    ["음악", "eumak", "/ɯ.mak̚/"],
    ["학교", "hakgyo", "/hak̚.k͈jo/"],
    ["읽어요", "ilgeoyo", "/il.ɡʌ.jo/"],
    ["없어요", "eopseoyo", "/ʌp̚.s͈ʌ.jo/"],
    ["백리", "baengni", "/peŋ.ni/"],
    ["빨리", "ppalli", "/p͈al.li/"],
  ])("%s is %s, %s", (word, rr, ipa) => {
    expect(romanizeKorean(word)).toBe(rr);
    expect(koreanIpa(word)).toBe(ipa);
  });

  it("keeps words apart and leaves what is not Hangul alone", () => {
    expect(romanizeKorean("안녕하세요 Yumi")).toBe("annyeonghaseyo Yumi");
    expect(koreanIpa("Yumi")).toBeNull();
  });

  it("is what every Korean word card prints, with nothing to fetch", () => {
    expect(getPhonetics("도서관", "ko")).toEqual({ rr: "doseogwan", ipa: "/to.sʌ.ɡwan/" });
  });
});

describe("Japanese kana and romaji", () => {
  it.each([
    ["がっこう", "gakkou"],
    ["コーヒー", "koohii"],
    ["ほんや", "hon'ya"],
    ["まっちゃ", "matcha"],
    ["しんぶん", "shinbun"],
    ["ふじさん", "fujisan"],
    ["ジェット", "jetto"],
  ])("%s is %s", (kana, romaji) => {
    expect(kanaToRomaji(kana)).toBe(romaji);
  });

  it("turns katakana into hiragana and nothing else", () => {
    expect(toHiragana("カタカナ と ひらがな")).toBe("かたかな と ひらがな");
  });

  it("reads kana on its own, and leaves kanji to a lookup", () => {
    expect(getPhonetics("すし", "ja")).toEqual({ kana: "すし", romaji: "sushi" });
    expect(getPhonetics("寿司", "ja")).toEqual({});
  });
});

describe("furigana", () => {
  it("lays a reading over the kanji it belongs to, never over kana", () => {
    expect(alignFurigana("食べる", "たべる")).toEqual([{ text: "食", ruby: "た" }, { text: "べる" }]);
    expect(alignFurigana("取り扱い", "とりあつかい")).toEqual([
      { text: "取", ruby: "と" },
      { text: "り" },
      { text: "扱", ruby: "あつか" },
      { text: "い" },
    ]);
    expect(alignFurigana("お茶", "おちゃ")).toEqual([{ text: "お" }, { text: "茶", ruby: "ちゃ" }]);
  });

  it("gives a word with no kanji no furigana at all", () => {
    expect(alignFurigana("すし", "すし")).toEqual([{ text: "すし" }]);
  });

  it("puts the whole reading over the whole word when the two do not line up", () => {
    expect(alignFurigana("今日は", "こんにちわ")).toEqual([{ text: "今日は", ruby: "こんにちわ" }]);
  });

  it("reads text written with its readings inline", () => {
    const annotated = "{友達|ともだち}と{遊|あそ}ぶ。";
    expect(parseAnnotatedFurigana(annotated)).toEqual([
      { text: "友達", ruby: "ともだち" },
      { text: "と" },
      { text: "遊", ruby: "あそ" },
      { text: "ぶ。" },
    ]);
    expect(stripAnnotatedFurigana(annotated)).toBe("友達と遊ぶ。");
  });
});

describe("telling Japanese and Korean apart", () => {
  it("knows Korean by its script and Japanese by its kana", () => {
    expect(detectLanguage("감사합니다").language).toBe("ko");
    expect(detectLanguage("ありがとう").language).toBe("ja");
    expect(detectLanguage("日本語を勉強する").language).toBe("ja");
  });

  it("asks only a reader who has both Chinese and Japanese, when there is no kana", () => {
    expect(detectLanguage("学校", ["ja", "zh-TW"]).ambiguous).toBe(true);
    expect(detectLanguage("學校").ambiguous).toBe(false);
    expect(detectLanguage("学校", ["ja", "en"]).language).toBe("ja");
  });

  it("files a note by its script", () => {
    expect(detectNoteLanguage("오늘 날씨가 좋네요")).toBe("ko");
    expect(detectNoteLanguage("今日はいい天気ですね")).toBe("ja");
    expect(detectNoteLanguage("今天天氣很好")).toBe("zh-TW");
  });

  it("never folds a kana's voicing mark away as if it were an accent", () => {
    expect(matchKey("ガラス")).not.toBe(matchKey("カラス"));
    expect(matchKey("Café")).toBe(matchKey("cafe"));
  });
});
