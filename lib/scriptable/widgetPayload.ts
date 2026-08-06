import type {
  YumiWidgetLanguage,
  YumiWidgetLocalizedText,
  YumiWidgetUpdatePayload,
  YumiWidgetWord,
} from "@/lib/widget/yumiWidgetBridge";

export const SCRIPTABLE_YUMI_SCHEMA_VERSION = 1 as const;
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

function normalizeLanguage(
  value: unknown,
  fallback: YumiWidgetLanguage,
): YumiWidgetLanguage {
  if (
    value === "english"
    || value === "traditional-chinese"
  ) {
    return value;
  }

  return fallback;
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

  if (
    !id
    || (!englishWord && !traditionalChineseWord)
  ) {
    return null;
  }

  return {
    id,
    englishWord,
    traditionalChineseWord,
    pinyin: cleanString(
      record.pinyin,
      MAX_PRONUNCIATION_LENGTH,
    ),
    zhuyin: cleanString(
      record.zhuyin,
      MAX_PRONUNCIATION_LENGTH,
    ),
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

  const words = (
    Array.isArray(record.words)
      ? record.words
      : []
  )
    .map(normalizeWord)
    .filter(
      (word): word is YumiWidgetWord =>
        word !== null,
    )
    .slice(0, SCRIPTABLE_YUMI_MAX_WORDS);

  const firstWord = words[0];

  return {
    cookieCount,
    cookieGoal,

    englishWord:
      cleanString(
        record.englishWord,
        MAX_WORD_LENGTH,
      )
      || firstWord?.englishWord
      || "",

    traditionalChineseWord:
      cleanString(
        record.traditionalChineseWord,
        MAX_WORD_LENGTH,
      )
      || firstWord?.traditionalChineseWord
      || "",

    pinyin:
      cleanString(
        record.pinyin,
        MAX_PRONUNCIATION_LENGTH,
      )
      || firstWord?.pinyin
      || "",

    zhuyin:
      cleanString(
        record.zhuyin,
        MAX_PRONUNCIATION_LENGTH,
      )
      || firstWord?.zhuyin
      || "",

    words,

    interfaceLanguage: normalizeLanguage(
      record.interfaceLanguage,
      "english",
    ),

    learningLanguage: normalizeLanguage(
      record.learningLanguage,
      "english",
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
    || record.schemaVersion
      !== SCRIPTABLE_YUMI_SCHEMA_VERSION
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
