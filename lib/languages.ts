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

/**
 * The BCP-47 tags handed to speechSynthesis, as a closed union so a caller
 * cannot ask for a language the app has no voice strategy for.
 */
export type SpeechTag = "en-US" | "zh-TW" | "es-ES" | "fr-FR" | "it-IT";

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
  speechTag: SpeechTag;

  /**
   * Tag fragments that still count as this language when no voice carries its
   * exact tag, tried in order before falling back to every voice sharing the
   * primary subtag.
   *
   * Empty for most languages, where a different region is an accent. Chinese
   * is why this exists: zh-CN and zh-HK voices match the "zh" prefix but read
   * Traditional text with Mandarin or Cantonese pronunciation, which a zh-TW
   * learner hears as a mispronunciation rather than an accent.
   */
  voiceTagFallbacks: readonly string[];

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

  /**
   * Whether the app can currently teach this language — prompts, speech and
   * phonetics all present.
   *
   * Independent of `availableAsInterface`, and French and Italian are why:
   * both are learnable now that the Pronunciation Lab has real packs for
   * them, and neither has a TranslationDictionary. You can study French in
   * an app that does not speak French to you, which is the whole point of
   * keeping the two axes apart.
   */
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
      spanish: "Inglés",
      french: "Anglais",
      italian: "Inglese",
    },
    endonym: "English",
    badge: "En",
    speechTag: "en-US",
    voiceTagFallbacks: [],
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
      spanish: "Chino tradicional",
      french: "Chinois traditionnel",
      italian: "Cinese tradizionale",
    },
    endonym: "繁體中文",
    badge: "中",
    speechTag: "zh-TW",
    voiceTagFallbacks: ["tw", "hant"],
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
      spanish: "Español",
      french: "Espagnol",
      italian: "Spagnolo",
    },
    endonym: "Español",
    badge: "Es",
    speechTag: "es-ES",
    voiceTagFallbacks: [],
    htmlLang: "es",
    direction: "ltr",
    fontVariable: "--font-latin",
    phonetics: ["ipa"],
    requiresTraditionalNormalization: false,
    availableAsInterface: true,
    availableAsLearning: true,
  },
  fr: {
    code: "fr",
    name: {
      english: "French",
      "traditional-chinese": "法文",
      spanish: "Francés",
      french: "Français",
      italian: "Francese",
    },
    endonym: "Français",
    badge: "Fr",
    speechTag: "fr-FR",
    voiceTagFallbacks: [],
    htmlLang: "fr",
    direction: "ltr",
    fontVariable: "--font-latin",
    phonetics: ["ipa"],
    requiresTraditionalNormalization: false,
    availableAsInterface: true,
    availableAsLearning: true,
  },
  it: {
    code: "it",
    name: {
      english: "Italian",
      "traditional-chinese": "義大利文",
      spanish: "Italiano",
      french: "Italien",
      italian: "Italiano",
    },
    endonym: "Italiano",
    badge: "It",
    speechTag: "it-IT",
    voiceTagFallbacks: [],
    htmlLang: "it",
    direction: "ltr",
    fontVariable: "--font-latin",
    phonetics: ["ipa"],
    requiresTraditionalNormalization: false,
    availableAsInterface: true,
    availableAsLearning: true,
  },
};

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

/**
 * A value in each language it exists in.
 *
 * The shape that replaces paired fields named after languages —
 * englishExample/chineseExample, englishTitle/chineseTitle. Those names put
 * the language in the schema, which meant a third language needed a third
 * field and a fourth needed a fourth, and nothing could hold Spanish at all.
 *
 * Partial, and meaningfully so: a missing key is "this text does not exist in
 * that language", which a renderer should skip rather than draw empty. An
 * entry never holds a placeholder for a language that has no answer.
 */
export type ByLanguage<T = string> = Partial<Record<LanguageCode, T>>;

/**
 * Reads a language-keyed value, preferring the first language that has one.
 *
 * Callers pass the order they want to show, so the same record renders
 * "learning language first" on one screen and "native first" on another
 * without either of them knowing which languages those are.
 */
export function pickLanguage<T>(
  value: ByLanguage<T> | undefined,
  order: readonly LanguageCode[],
): T | undefined {
  if (!value) return undefined;
  for (const code of order) {
    const found = value[code];
    if (found !== undefined && found !== "") return found;
  }
  return undefined;
}

/**
 * The two languages to actually show for a piece of content.
 *
 * Prefers the reader's own pair and falls back to whatever the content
 * carries. Content is not always in the reader's languages: Daily News is one
 * shared pool generated in one pairing, and a word card arrives in the
 * languages its sender was using. Indexing such content by the reader's pair
 * and taking the miss at face value renders an empty card — which is worse
 * than showing it in the languages it is actually in.
 *
 * Returns at most two, in preference order, and never invents a language the
 * content does not have.
 */
export function resolveDisplayPair(
  available: ByLanguage,
  preferred: readonly LanguageCode[],
): readonly LanguageCode[] {
  /*
   * Only ever the languages asked for.
   *
   * This used to append whatever else the content happened to carry, on the
   * reasoning that showing a card in *some* language beats showing a blank
   * one. That reasoning is wrong, and it is the bug a reader hits the day
   * they switch: the shared news pool was mostly English, so switching to
   * Italian changed the setting and changed nothing on screen — every card
   * fell straight back through the empty Italian slot into English and led
   * in it, which reads as the switch having silently failed.
   *
   * A language nobody selected is not a fallback, it is a wrong answer.
   * Returning fewer than two — or none — is the honest result, and it is
   * what lets a caller filter the item out or say plainly that it is not
   * available yet, instead of quietly showing the wrong thing.
   */
  return preferred.filter((code) => available[code]?.trim());
}

/**
 * Whether a stored value is one of the interface languages.
 *
 * Lives here rather than in lib/appPreferences.ts so server code can
 * validate `app_preferences.interfaceLanguage` without importing a module
 * built around localStorage. Object.hasOwn, not `in`: the value comes out
 * of a JSON column, and `in` would accept "constructor".
 */
export function isInterfaceLanguageValue(
  value: unknown,
): value is InterfaceLanguage {
  return (
    typeof value === "string" &&
    Object.hasOwn(INTERFACE_LANGUAGE_CODE, value)
  );
}

/**
 * Which language glosses the one being learned.
 *
 * The single definition of the rule, shared by the client hook that renders
 * cards (hooks/useDisplayLanguages.ts) and the server helper that generates
 * them (lib/profile/languagePair.ts). They disagreed once — the screen
 * showed one pairing and the model was asked for another — and the only
 * reliable way for that not to happen again is for there to be one rule.
 *
 * The interface language wins: it is what the reader most recently said
 * they read comfortably, and it is visibly in effect everywhere else on
 * screen. "My language" is the tie-breaker for someone learning the
 * language the app is already in, and English or Chinese is the last
 * resort — a card needs two sides, and the same text twice is not two.
 */
export function resolveSupportLanguage(
  learning: LanguageCode,
  interfaceCode: LanguageCode | null | undefined,
  native: LanguageCode | null | undefined,
): LanguageCode {
  if (interfaceCode && interfaceCode !== learning) return interfaceCode;
  if (native && native !== learning) return native;

  return DEFAULT_LEARNING_PAIR.find((code) => code !== learning) ?? "en";
}

/**
 * Whether this content can lead in the language being learned.
 *
 * The one question a feed has to ask before showing something: the lead is
 * the learning language or there is nothing worth leading with.
 */
export function canLeadIn(
  available: ByLanguage,
  learningLanguage: LanguageCode,
): boolean {
  return Boolean(available[learningLanguage]?.trim());
}

/** Drops empty and absent entries, so a record never carries blank strings. */
export function compactByLanguage(value: ByLanguage): ByLanguage {
  const out: ByLanguage = {};
  for (const code of LANGUAGE_CODES) {
    const text = value[code];
    if (typeof text === "string" && text.trim()) out[code] = text;
  }
  return out;
}

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

/**
 * Whether this language's writing is something a learner has to decode
 * rather than sound out.
 *
 * Answered from the phonetic systems the language carries: pinyin and zhuyin
 * exist precisely because the script does not tell you how to say the word,
 * while IPA is an aid for a script you can already read aloud. It is the
 * difference between meeting a language on a page and meeting it in the air.
 */
export function isUnreadableScript(code: LanguageCode): boolean {
  return LANGUAGES[code].phonetics.some(
    (system) => system === "pinyin" || system === "zhuyin",
  );
}

export function hasPhonetics(
  code: LanguageCode,
  system: PhoneticSystem,
): boolean {
  return LANGUAGES[code].phonetics.includes(system);
}

/** Every speech tag the app knows, in table order. */
export const SPEECH_TAGS = LANGUAGE_CODES.map(
  (code) => LANGUAGES[code].speechTag,
);

const BY_SPEECH_TAG = new Map<string, LanguageMetadata>(
  LANGUAGE_CODES.map((code) => [LANGUAGES[code].speechTag, LANGUAGES[code]]),
);

/**
 * The language a speech tag belongs to.
 *
 * Speech tags carry a region ("en-US") while language codes mostly do not
 * ("en"), so the two are not interchangeable even though zh-TW happens to be
 * spelled the same in both.
 */
export function getLanguageBySpeechTag(tag: SpeechTag): LanguageMetadata {
  const language = BY_SPEECH_TAG.get(tag);
  if (!language) throw new Error(`Unknown speech tag: ${tag}`);
  return language;
}

/**
 * Whether Simplified-to-Traditional normalization applies to any language the
 * app can currently teach.
 *
 * Asked of the whole set rather than one language for the places that work
 * across a user's saved material: their words can be Chinese from an earlier
 * pairing regardless of what they are studying today.
 */
/**
 * The pair the app has always taught, and what a prompt assumes when its
 * caller does not yet know the user's own pair.
 *
 * Written down once so the assumption is greppable. Every use of it is a
 * place that still needs the real pair threaded through.
 */
export const DEFAULT_LEARNING_PAIR: readonly [LanguageCode, LanguageCode] = [
  "en",
  "zh-TW",
];

export function anyLearningLanguageNeedsTraditional(): boolean {
  return getLearningLanguages().some(
    (language) => language.requiresTraditionalNormalization,
  );
}

/**
 * Whether text reported under a BCP-47 tag needs Simplified-to-Traditional
 * normalization. Matches on the primary subtag, so "zh", "zh-CN" and
 * "zh-Hant-TW" all resolve to Chinese.
 */
export function tagNeedsTraditionalNormalization(tag: string): boolean {
  const primary = tag.toLowerCase().split("-")[0];

  return LANGUAGE_CODES.some((code) => {
    const language = LANGUAGES[code];
    return (
      language.requiresTraditionalNormalization &&
      language.code.toLowerCase().split("-")[0] === primary
    );
  });
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
 * Reads a language out of a database column, in whichever encoding it holds.
 *
 * Both are live: the columns still mostly carry the prose values, and the
 * allowlist now also admits codes. A caller that assumes one encoding will
 * silently mis-read rows written under the other, so every read of
 * native_language / learning_language should come through here. Returns null
 * for an empty column or an unrecognised value rather than guessing.
 */
export function readLanguageCode(value: unknown): LanguageCode | null {
  if (typeof value !== "string" || !value) return null;
  if (isLanguageCode(value)) return value;
  if (value === "english" || value === "traditional-chinese") {
    return LEGACY_TO_CODE[value];
  }
  return null;
}

/**
 * A language from anything that names one.
 *
 * Wider than readLanguageCode on purpose, and used at a different edge.
 * readLanguageCode reads a database column and should not accept a speech
 * tag; this reads a URL the Scriptable widget built on someone's phone,
 * which sends "en-US" and "zh-TW" — a speech tag and a language code that
 * happen to look alike. Accepts a code, a legacy prose value, a speech tag,
 * or a bare primary subtag, and returns null for anything else rather than
 * guessing.
 */
export function resolveLanguageCode(value: unknown): LanguageCode | null {
  const direct = readLanguageCode(value);
  if (direct) return direct;

  if (typeof value !== "string" || !value) return null;

  const normalized = value.toLowerCase().replace("_", "-");

  const byTag = LANGUAGE_CODES.find(
    (code) => LANGUAGES[code].speechTag.toLowerCase() === normalized,
  );
  if (byTag) return byTag;

  /*
   * Last resort: the primary subtag. "en-GB" is English even though no row
   * carries that tag. Chinese is deliberately reached through its own row
   * rather than this branch — "zh" alone does not say Traditional, and the
   * table order means the first zh row wins, which is the one we want.
   */
  const primary = normalized.split("-")[0];
  return (
    LANGUAGE_CODES.find(
      (code) => code.toLowerCase().split("-")[0] === primary,
    ) ?? null
  );
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
    spanish: "es",
    french: "fr",
    italian: "it",
  };

/**
 * Everything about an interface language, via its code.
 *
 * The interface axis keeps its own spelled-out values ("english", "spanish")
 * rather than moving to BCP-47 with the learning axis. They are stored in
 * localStorage and in profiles.app_preferences on every account, and changing
 * the encoding of a setting that is already written down buys nothing here —
 * the two axes were separated precisely so one of them could stay put.
 */
export function getInterfaceLanguageMeta(
  language: InterfaceLanguage,
): LanguageMetadata {
  return LANGUAGES[INTERFACE_LANGUAGE_CODE[language]];
}
