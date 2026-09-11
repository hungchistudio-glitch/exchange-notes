import { describe, expect, it } from "vitest";

import {
  SUPPORTED_PROFILE_LANGUAGE_PAIRS,
  type LanguageCode,
} from "@/lib/languages";
import {
  SCRIPTABLE_YUMI_SCHEMA_VERSION,
  normalizeYumiWidgetPayload,
  parseScriptableYumiWidgetSnapshot,
} from "@/lib/scriptable/widgetPayload";

const text: Record<LanguageCode, string> = {
  en: "hello",
  "zh-TW": "你好",
  es: "hola",
  fr: "bonjour",
  it: "ciao",
};

function genericPayload(primary: LanguageCode, secondary: LanguageCode) {
  return {
    cookieCount: 1,
    cookieGoal: 3,
    primaryText: text[primary],
    secondaryText: text[secondary],
    primaryLanguage: primary,
    secondaryLanguage: secondary,
    primaryPronunciation: `/${primary}/`,
    secondaryPronunciation: `/${secondary}/`,
    englishWord: primary === "en" ? text.en : secondary === "en" ? text.en : "",
    traditionalChineseWord:
      primary === "zh-TW"
        ? text["zh-TW"]
        : secondary === "zh-TW"
          ? text["zh-TW"]
          : "",
    pinyin: "",
    zhuyin: "",
    words: [
      {
        id: `${primary}-${secondary}`,
        primaryText: text[primary],
        secondaryText: text[secondary],
        primaryLanguage: primary,
        secondaryLanguage: secondary,
        primaryPronunciation: `/${primary}/`,
        secondaryPronunciation: `/${secondary}/`,
        englishWord:
          primary === "en" ? text.en : secondary === "en" ? text.en : "",
        traditionalChineseWord:
          primary === "zh-TW"
            ? text["zh-TW"]
            : secondary === "zh-TW"
              ? text["zh-TW"]
              : "",
        pinyin: "",
        zhuyin: "",
      },
    ],
    interfaceLanguage: "italian",
    learningLanguage:
      primary === "zh-TW" ? "traditional-chinese" : "english",
    moodKey: "curious",
    localizedText: {
      headline: "Yumi",
      hint: "",
      emptyWord: "",
      cookieUnit: "",
    },
  };
}

describe("Yumi widget five-language payload", () => {
  it("preserves every directed pair without relabelling it English/Chinese", () => {
    expect(SUPPORTED_PROFILE_LANGUAGE_PAIRS).toHaveLength(20);

    for (const [primary, secondary] of SUPPORTED_PROFILE_LANGUAGE_PAIRS) {
      const normalized = normalizeYumiWidgetPayload(
        genericPayload(primary, secondary),
      );

      expect(normalized?.primaryLanguage).toBe(primary);
      expect(normalized?.secondaryLanguage).toBe(secondary);
      expect(normalized?.primaryText).toBe(text[primary]);
      expect(normalized?.secondaryText).toBe(text[secondary]);
      expect(normalized?.words[0]).toMatchObject({
        primaryLanguage: primary,
        secondaryLanguage: secondary,
        primaryText: text[primary],
        secondaryText: text[secondary],
      });
    }
  });

  it("upgrades a schema-v1 English/Chinese snapshot", () => {
    const parsed = parseScriptableYumiWidgetSnapshot({
      schemaVersion: 1,
      updatedAt: "2026-09-11T12:00:00.000Z",
      payload: {
        cookieCount: 2,
        cookieGoal: 3,
        englishWord: "hello",
        traditionalChineseWord: "你好",
        pinyin: "nǐ hǎo",
        zhuyin: "ㄋㄧˇ ㄏㄠˇ",
        words: [
          {
            id: "legacy",
            englishWord: "hello",
            traditionalChineseWord: "你好",
            pinyin: "nǐ hǎo",
            zhuyin: "ㄋㄧˇ ㄏㄠˇ",
          },
        ],
        interfaceLanguage: "traditional-chinese",
        learningLanguage: "english",
        moodKey: "happy",
        localizedText: {
          headline: "Yumi",
          hint: "",
          emptyWord: "",
          cookieUnit: "",
        },
      },
    });

    expect(parsed?.schemaVersion).toBe(SCRIPTABLE_YUMI_SCHEMA_VERSION);
    expect(parsed?.payload.words[0]).toMatchObject({
      primaryText: "hello",
      secondaryText: "你好",
      primaryLanguage: "en",
      secondaryLanguage: "zh-TW",
    });
  });

  it("rejects a malformed pair with the same language on both sides", () => {
    expect(
      normalizeYumiWidgetPayload({
        ...genericPayload("es", "fr"),
        secondaryLanguage: "es",
      }),
    ).toBeNull();
  });
});
