import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getLearningLanguages } from "@/lib/languages";

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

/* =========================================================
   The Swift copy of the language table has to agree with this one

   The widget extension cannot read lib/languages.ts, so
   Shared/YumiWidgetLanguage.swift keeps the same five rows by hand. That is
   a deliberate choice over generating the file — the table changes about
   once a year — and it is only safe with something comparing the two.

   Written after the widget shipped a bopomofo glyph on Spanish cards and
   told VoiceOver they were Traditional Chinese, which no test could see
   because nothing on the TypeScript side had an opinion about Swift.
   ========================================================= */

describe("the widget's Swift language table", () => {
  const swift = readFileSync(
    join(process.cwd(), "native/apple/ExchangeNotesApple/Shared/YumiWidgetLanguage.swift"),
    "utf8",
  );

  /** `case "es": return "Es"` inside the named function. */
  function swiftCases(functionName: string): Record<string, string> {
    const body = swift.slice(swift.indexOf(`func ${functionName}(`));
    const end = body.indexOf("\n    }");
    const cases: Record<string, string> = {};

    for (const match of body.slice(0, end).matchAll(
      /case "([a-zA-Z-]+)": return "([^"]*)"/g,
    )) {
      cases[match[1]] = match[2];
    }

    return cases;
  }

  it("carries every language the app teaches, and no others", () => {
    const taught = getLearningLanguages().map((language) => language.code).sort();
    expect(Object.keys(swiftCases("badge")).sort()).toEqual(taught);
    expect(Object.keys(swiftCases("speechTag")).sort()).toEqual(taught);
  });

  it("uses the same badge and voice for each as the app does", () => {
    const badges = swiftCases("badge");
    const speechTags = swiftCases("speechTag");

    for (const language of getLearningLanguages()) {
      expect(badges[language.code]).toBe(language.badge);
      expect(speechTags[language.code]).toBe(language.speechTag);
    }
  });

  it("names each language the same way in each interface language", () => {
    for (const language of getLearningLanguages()) {
      // The Swift table is keyed by content code, then interface language.
      const row = swift.slice(swift.indexOf(`        "${language.code}": [`));
      const entries = row.slice(0, row.indexOf("],"));

      for (const [interfaceLanguage, expected] of Object.entries(language.name)) {
        expect(entries).toContain(`"${interfaceLanguage}": "${expected}"`);
      }
    }
  });
});
