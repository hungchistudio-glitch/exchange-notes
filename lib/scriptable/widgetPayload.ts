import type {
  LegacyYumiWidgetLanguage,
  YumiWidgetLanguage,
  YumiWidgetLocalizedText,
  YumiWidgetUpdatePayload,
  YumiWidgetWord,
} from "@/lib/widget/yumiWidgetBridge";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import { isLanguageCode } from "@/lib/languages";

export const SCRIPTABLE_YUMI_SCHEMA_VERSION = 2 as const;
export const SCRIPTABLE_YUMI_MAX_WORDS = 12;

const MAX_WORD_ID_LENGTH = 128;
const MAX_WORD_LENGTH = 160;
const MAX_PRONUNCIATION_LENGTH = 240;
const MAX_MOOD_KEY_LENGTH = 64;
const MAX_LOCALIZED_TEXT_LENGTH = 500;
const MAX_COOKIE_GOAL = 100;

export type ScriptableYumiWidgetSnapshot = {
  schemaVersion: typeof SCRIPTABLE_YUMI_SCHEMA_VERSION;
  updatedAt: string;
  payload: YumiWidgetUpdatePayload;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    return null;
  }

  return value as UnknownRecord;
}

function cleanString(
  value: unknown,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function clampInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(minimum, Math.trunc(value)),
  );
}

function normalizeLegacyLanguage(
  value: unknown,
  fallback: LegacyYumiWidgetLanguage,
): LegacyYumiWidgetLanguage {
  if (
    value === "english"
    || value === "traditional-chinese"
  ) {
    return value;
  }

  return fallback;
}

function normalizeContentLanguage(
  value: unknown,
  fallback: YumiWidgetLanguage,
): YumiWidgetLanguage {
  return isLanguageCode(value) ? value : fallback;
}

function normalizeInterfaceLanguage(
  value: unknown,
): InterfaceLanguage {
  switch (value) {
    case "traditional-chinese":
    case "spanish":
    case "french":
    case "italian":
      return value;
    case "zh-TW":
      return "traditional-chinese";
    case "es":
      return "spanish";
    case "fr":
      return "french";
    case "it":
      return "italian";
    default:
      return "english";
  }
}

function normalizeLocalizedText(
  value: unknown,
): YumiWidgetLocalizedText {
  const record = asRecord(value);

  return {
    headline: cleanString(
      record?.headline,
      MAX_LOCALIZED_TEXT_LENGTH,
    ),
    hint: cleanString(
      record?.hint,
      MAX_LOCALIZED_TEXT_LENGTH,
    ),
    emptyWord: cleanString(
      record?.emptyWord,
      MAX_LOCALIZED_TEXT_LENGTH,
    ),
    cookieUnit: cleanString(
      record?.cookieUnit,
      MAX_LOCALIZED_TEXT_LENGTH,
    ),
  };
}

function normalizeWord(
  value: unknown,
  fallbackPrimaryLanguage: YumiWidgetLanguage,
  fallbackSecondaryLanguage: YumiWidgetLanguage,
): YumiWidgetWord | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const id = cleanString(
    record.id,
    MAX_WORD_ID_LENGTH,
  );

  const englishWord = cleanString(
    record.englishWord,
    MAX_WORD_LENGTH,
  );

  const traditionalChineseWord = cleanString(
    record.traditionalChineseWord,
    MAX_WORD_LENGTH,
  );

  const primaryLanguage = normalizeContentLanguage(
    record.primaryLanguage,
    fallbackPrimaryLanguage,
  );
  const secondaryLanguage = normalizeContentLanguage(
    record.secondaryLanguage,
    fallbackSecondaryLanguage,
  );
  const pinyin = cleanString(
    record.pinyin,
    MAX_PRONUNCIATION_LENGTH,
  );
  const zhuyin = cleanString(
    record.zhuyin,
    MAX_PRONUNCIATION_LENGTH,
  );
  const legacyText = (language: YumiWidgetLanguage) =>
    language === "zh-TW" ? traditionalChineseWord : englishWord;
  const legacyPronunciation = (language: YumiWidgetLanguage) =>
    language === "zh-TW" ? zhuyin || pinyin : "";
  const primaryText =
    cleanString(record.primaryText, MAX_WORD_LENGTH)
    || legacyText(primaryLanguage);
  const secondaryText =
    cleanString(record.secondaryText, MAX_WORD_LENGTH)
    || legacyText(secondaryLanguage);

  if (
    !id
    || (!primaryText && !secondaryText)
    || primaryLanguage === secondaryLanguage
  ) {
    return null;
  }

  return {
    id,
    primaryText,
    secondaryText,
    primaryLanguage,
    secondaryLanguage,
    primaryPronunciation:
      cleanString(record.primaryPronunciation, MAX_PRONUNCIATION_LENGTH)
      || legacyPronunciation(primaryLanguage),
    secondaryPronunciation:
      cleanString(record.secondaryPronunciation, MAX_PRONUNCIATION_LENGTH)
      || legacyPronunciation(secondaryLanguage),
    englishWord,
    traditionalChineseWord,
    pinyin,
    zhuyin,
  };
}

/**
 * Converts an unknown JSON value into the canonical Yumi Widget payload.
 *
 * This function is shared by future API routes and database readers so that
 * Scriptable never receives unchecked or unexpectedly large payload data.
 */
export function normalizeYumiWidgetPayload(
  value: unknown,
): YumiWidgetUpdatePayload | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const cookieGoal = clampInteger(
    record.cookieGoal,
    3,
    1,
    MAX_COOKIE_GOAL,
  );

  const cookieCount = clampInteger(
    record.cookieCount,
    0,
    0,
    cookieGoal,
  );

  const legacyLearningLanguage = normalizeLegacyLanguage(
    record.learningLanguage,
    "english",
  );
  const primaryLanguage = normalizeContentLanguage(
    record.primaryLanguage,
    legacyLearningLanguage === "traditional-chinese" ? "zh-TW" : "en",
  );
  const secondaryLanguage = normalizeContentLanguage(
    record.secondaryLanguage,
    primaryLanguage === "zh-TW" ? "en" : "zh-TW",
  );

  if (primaryLanguage === secondaryLanguage) return null;

  const words = (
    Array.isArray(record.words)
      ? record.words
      : []
  )
    .map((word) => normalizeWord(word, primaryLanguage, secondaryLanguage))
    .filter(
      (word): word is YumiWidgetWord =>
        word !== null,
    )
    .slice(0, SCRIPTABLE_YUMI_MAX_WORDS);

  const firstWord = words[0];
  const englishWord =
    cleanString(record.englishWord, MAX_WORD_LENGTH)
    || firstWord?.englishWord
    || "";
  const traditionalChineseWord =
    cleanString(record.traditionalChineseWord, MAX_WORD_LENGTH)
    || firstWord?.traditionalChineseWord
    || "";
  const pinyin =
    cleanString(record.pinyin, MAX_PRONUNCIATION_LENGTH)
    || firstWord?.pinyin
    || "";
  const zhuyin =
    cleanString(record.zhuyin, MAX_PRONUNCIATION_LENGTH)
    || firstWord?.zhuyin
    || "";
  const legacyText = (language: YumiWidgetLanguage) =>
    language === "zh-TW" ? traditionalChineseWord : englishWord;
  const legacyPronunciation = (language: YumiWidgetLanguage) =>
    language === "zh-TW" ? zhuyin || pinyin : "";

  return {
    cookieCount,
    cookieGoal,

    primaryText:
      cleanString(record.primaryText, MAX_WORD_LENGTH)
      || firstWord?.primaryText
      || legacyText(primaryLanguage),
    secondaryText:
      cleanString(record.secondaryText, MAX_WORD_LENGTH)
      || firstWord?.secondaryText
      || legacyText(secondaryLanguage),
    primaryLanguage,
    secondaryLanguage,
    primaryPronunciation:
      cleanString(record.primaryPronunciation, MAX_PRONUNCIATION_LENGTH)
      || firstWord?.primaryPronunciation
      || legacyPronunciation(primaryLanguage),
    secondaryPronunciation:
      cleanString(record.secondaryPronunciation, MAX_PRONUNCIATION_LENGTH)
      || firstWord?.secondaryPronunciation
      || legacyPronunciation(secondaryLanguage),

    englishWord,
    traditionalChineseWord,
    pinyin,
    zhuyin,

    words,

    interfaceLanguage: normalizeInterfaceLanguage(record.interfaceLanguage),

    learningLanguage: normalizeLegacyLanguage(
      record.learningLanguage,
      primaryLanguage === "zh-TW" ? "traditional-chinese" : "english",
    ),

    moodKey:
      cleanString(
        record.moodKey,
        MAX_MOOD_KEY_LENGTH,
      )
      || "waiting",

    localizedText: normalizeLocalizedText(
      record.localizedText,
    ),
  };
}

/**
 * Creates the versioned snapshot that will eventually be stored by the
 * authenticated Exchange Notes web session.
 */
export function createScriptableYumiWidgetSnapshot(
  payload: YumiWidgetUpdatePayload,
  now: Date = new Date(),
): ScriptableYumiWidgetSnapshot {
  const normalizedPayload =
    normalizeYumiWidgetPayload(payload);

  if (!normalizedPayload) {
    throw new TypeError(
      "Invalid Yumi Widget payload.",
    );
  }

  if (Number.isNaN(now.getTime())) {
    throw new TypeError(
      "Invalid snapshot timestamp.",
    );
  }

  return {
    schemaVersion:
      SCRIPTABLE_YUMI_SCHEMA_VERSION,
    updatedAt: now.toISOString(),
    payload: normalizedPayload,
  };
}

/**
 * Safely parses a snapshot read from JSON, Supabase or the Scriptable cache.
 */
export function parseScriptableYumiWidgetSnapshot(
  value: unknown,
): ScriptableYumiWidgetSnapshot | null {
  const record = asRecord(value);

  if (
    !record
    || (
      record.schemaVersion !== 1
      && record.schemaVersion !== SCRIPTABLE_YUMI_SCHEMA_VERSION
    )
  ) {
    return null;
  }

  const updatedAt = cleanString(
    record.updatedAt,
    64,
  );

  if (
    !updatedAt
    || Number.isNaN(Date.parse(updatedAt))
  ) {
    return null;
  }

  const payload = normalizeYumiWidgetPayload(
    record.payload,
  );

  if (!payload) {
    return null;
  }

  return {
    schemaVersion:
      SCRIPTABLE_YUMI_SCHEMA_VERSION,
    updatedAt,
    payload,
  };
}
