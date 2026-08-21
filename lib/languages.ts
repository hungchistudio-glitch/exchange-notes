import type { InterfaceLanguage } from "@/lib/appPreferences";
import type { AppLanguage } from "@/lib/types/app";

/* =========================================================
   The two language axes

   This app has two independent language axes that happen to share the same
   two values today, which is exactly why they keep getting confused:

     - InterfaceLanguage (lib/appPreferences.ts) — what the app itself
       speaks. Adding one means shipping a whole TranslationDictionary;
       lib/i18n/types.ts forces it to be complete.

     - LanguageCode (below) — what the user is learning. Stored on
       profiles.native_language / learning_language.

   They will diverge: the interface may only ever ship in a few languages
   while the learning pair can be any combination. Nothing in this file may
   assume `LanguageCode extends InterfaceLanguage` or the reverse, and
   nothing should reintroduce an equation between them the way
   `TranslationLanguage = InterfaceLanguage` does for the interface axis.
   ========================================================= */

/**
 * The learning-language axis, as BCP-47 tags.
 *
 * BCP-47 rather than the prose names the database currently holds
 * ("english" / "traditional-chinese") because every platform API this
 * eventually feeds — speechSynthesis, `<html lang>`, Intl — already speaks
 * BCP-47, and every hand-rolled mapping between the two encodings is a
 * place to get it wrong.
 */
export type LanguageCode = "en" | "zh-TW" | "es" | "fr" | "it";

/**
 * A phonetic annotation system. Deliberately a closed union of the real
 * systems rather than a generalized "pronunciation guide" abstraction:
 * pinyin and zhuyin are Chinese-specific, and what Spanish/French/Italian
 * need is stress placement and liaison, not an analogue of pinyin.
 */
export type PhoneticSystem = "ipa" | "pinyin" | "zhuyin";

export type LanguageMetadata = {
  code: LanguageCode;

  /**
   * Display name, per interface language. A Record (not Partial) so adding
   * a third interface language fails the build here — one small, obvious
   * place — instead of silently rendering an English name inside a
   * fully-translated screen.
   */
  name: Record<InterfaceLanguage, string>;

  /** What speakers of the language call it, for language-picker rows. */
  endonym: string;

  /** Short glyph badge used by the language pickers. */
  badge: string;

  /**
   * BCP-47 tag handed to speechSynthesis. Separate from `htmlLang` on
   * purpose: Chinese wants the region-bearing "zh-TW" for voice selection
   * (see the voice-matching notes in lib/speech.ts) while the document
   * language is better expressed as the script subtag "zh-Hant".
   */
  speechTag: string;

  /** Value for `<html lang>` / `root.lang`. */
  htmlLang: string;

  /** Writing direction. Every language here is ltr; the field exists so a
   *  future rtl addition has a place to declare it rather than a special
   *  case somewhere in a component. */
  direction: "ltr" | "rtl";

  /**
   * CSS custom property carrying the font stack for this language's script,
   * as defined in app/globals.css. Latin text through the CJK stack (or the
   * reverse) is what produced the missing-glyph boxes those stacks were
   * added to fix, so callers should set the stack from here rather than
   * relying on `font-sans`.
   */
  fontVariable: "--font-latin" | "--font-cjk";

  /** Phonetic annotations available for this language, best-first. Empty
   *  means the app offers none and callers should render nothing rather
   *  than substituting something from another language. */
  phonetics: readonly PhoneticSystem[];

  /**
   * Whether text in this language needs Simplified→Traditional
   * normalization (lib/chinese/toTraditional.ts). True for zh-TW only —
   * this is a conditional call, not a step to generalize.
   */
  requiresTraditionalNormalization: boolean;

  /** Whether a complete TranslationDictionary ships for this language. */
  availableAsInterface: boolean;

  /** Whether the app can currently teach this language end-to-end —
   *  prompts, speech, phonetics all verified. */
  availableAsLearning: boolean;
};

/**
 * Every language the app knows about, including ones not yet shippable.
 * `availableAsInterface` / `availableAsLearning` are what gate the UI —
 * presence in this table only means the metadata has been written down.
 */
export const LANGUAGES: Record<LanguageCode, LanguageMetadata> = {
  en: {
    code: "en",
    name: {
      english: "English",
      "traditional-chinese": "英文",
    },
    endonym: "English",
    badge: "En",
    speechTag: "en-US",
    htmlLang: "en",
    direction: "ltr",
    fontVariable: "--font-latin",
    phonetics: ["ipa"],
    requiresTraditionalNormalization: false,
    availableAsInterface: true,
    availableAsLearning: true,
  },
  "zh-TW": {
    code: "zh-TW",
    name: {
      english: "Traditional Chinese",
      "traditional-chinese": "繁體中文",
    },
    endonym: "繁體中文",
    badge: "中",
    speechTag: "zh-TW",
    htmlLang: "zh-Hant",
    direction: "ltr",
    fontVariable: "--font-cjk",
    phonetics: ["pinyin", "zhuyin"],
    requiresTraditionalNormalization: true,
    availableAsInterface: true,
    availableAsLearning: true,
  },
  es: {
    code: "es",
    name: {
      english: "Spanish",
      "traditional-chinese": "西班牙文",
    },
    endonym: "Español",
    badge: "Es",
    speechTag: "es-ES",
    htmlLang: "es",
    direction: "ltr",
    fontVariable: "--font-latin",
    phonetics: ["ipa"],
    requiresTraditionalNormalization: false,
    availableAsInterface: false,
    availableAsLearning: false,
  },
  fr: {
    code: "fr",
    name: {
      english: "French",
      "traditional-chinese": "法文",
    },
    endonym: "Français",
    badge: "Fr",
    speechTag: "fr-FR",
    htmlLang: "fr",
    direction: "ltr",
    fontVariable: "--font-latin",
    phonetics: ["ipa"],
    requiresTraditionalNormalization: false,
    availableAsInterface: false,
    availableAsLearning: false,
  },
  it: {
    code: "it",
    name: {
      english: "Italian",
      "traditional-chinese": "義大利文",
    },
    endonym: "Italiano",
    badge: "It",
    speechTag: "it-IT",
    htmlLang: "it",
    direction: "ltr",
    fontVariable: "--font-latin",
    phonetics: ["ipa"],
    requiresTraditionalNormalization: false,
    availableAsInterface: false,
    availableAsLearning: false,
  },
};

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

export function isLanguageCode(value: unknown): value is LanguageCode {
  // Object.hasOwn, not `in`: this guard validates values arriving from the
  // database, localStorage and model output, and `in` walks the prototype
  // chain — "toString" and "constructor" would pass it, then index
  // LANGUAGES to a function instead of language metadata.
  return typeof value === "string" && Object.hasOwn(LANGUAGES, value);
}

export function getLanguage(code: LanguageCode): LanguageMetadata {
  return LANGUAGES[code];
}

/** The language's name as it should read inside `displayIn`'s interface. */
export function getLanguageName(
  code: LanguageCode,
  displayIn: InterfaceLanguage,
): string {
  return LANGUAGES[code].name[displayIn];
}

/** Languages the app can currently teach, for the learning-pair pickers. */
export function getLearningLanguages(): LanguageMetadata[] {
  return LANGUAGE_CODES.map(getLanguage).filter(
    (language) => language.availableAsLearning,
  );
}

/** Languages the app itself can be displayed in. */
export function getInterfaceLanguages(): LanguageMetadata[] {
  return LANGUAGE_CODES.map(getLanguage).filter(
    (language) => language.availableAsInterface,
  );
}

export function hasPhonetics(
  code: LanguageCode,
  system: PhoneticSystem,
): boolean {
  return LANGUAGES[code].phonetics.includes(system);
}

/* =========================================================
   Bridge to the legacy encoding

   profiles.native_language / learning_language still hold "english" /
   "traditional-chinese" under a CHECK constraint, and 60-odd call sites
   still compare against those strings. Until that column is widened to a
   language-code allowlist and backfilled, both encodings are live and
   every crossing between them goes through here.

   When the migration lands: backfill the column to LanguageCode, make
   AppLanguage a deprecated alias, then delete this section — the compiler
   will list every remaining caller.
   ========================================================= */

const LEGACY_TO_CODE: Record<AppLanguage, LanguageCode> = {
  english: "en",
  "traditional-chinese": "zh-TW",
};

const CODE_TO_LEGACY: Partial<Record<LanguageCode, AppLanguage>> = {
  en: "english",
  "zh-TW": "traditional-chinese",
};

/** Legacy stored value → language code. Total, and lossless. */
export function toLanguageCode(language: AppLanguage): LanguageCode {
  return LEGACY_TO_CODE[language];
}

/**
 * Language code → legacy stored value, or null for a language the old
 * encoding cannot express. Callers writing to profiles must handle the
 * null rather than coercing — silently storing the wrong language is worse
 * than refusing to store an unsupported one.
 */
export function toAppLanguage(code: LanguageCode): AppLanguage | null {
  return CODE_TO_LEGACY[code] ?? null;
}

/**
 * The language code matching an interface language.
 *
 * This is a lookup between the two axes, not evidence that they are the
 * same thing — it exists so display names and `<html lang>` can be read
 * from this table instead of being re-derived by a ternary at each site.
 */
export const INTERFACE_LANGUAGE_CODE: Record<InterfaceLanguage, LanguageCode> =
  {
    english: "en",
    "traditional-chinese": "zh-TW",
  };
