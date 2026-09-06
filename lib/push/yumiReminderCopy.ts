import { type InterfaceLanguage } from "@/lib/appPreferences";
import {
  INTERFACE_LANGUAGE_CODE,
  type LanguageCode,
} from "@/lib/languages";
import { loadTranslations } from "@/lib/i18n";
import type { TranslationLanguage } from "@/lib/i18n/types";

/* =========================================================
   Yumi's reminder, in the two languages the reader actually has

   The push was one hardcoded string — "Yumi 想你了 · Yumi misses you" — sent
   to everybody. A reader whose interface is Spanish and who is learning
   Italian was reminded in neither of their languages.

   It is bilingual on purpose, and stays bilingual: the interface language so
   the reminder is understood, and the language being learned because a
   notification is a free moment of contact with it. This is a language app;
   the reminder to come back may as well teach a sentence.
   ========================================================= */

/** The two halves of a notification, already joined. */
export type YumiReminderCopy = {
  title: string;
  body: string;
};

/** How the two languages are joined, matching the original's shape. */
const SEPARATOR = " · ";

/*
 * Which interface language writes a given language's half.
 *
 * The two sets happen to be the same five, so every learning language has a
 * dictionary — but they are separate types and nothing guarantees they stay
 * aligned. Falling back to English is better than failing to remind anyone.
 */
const DICTIONARY_FOR: Record<LanguageCode, TranslationLanguage> = {
  en: "english",
  "zh-TW": "traditional-chinese",
  es: "spanish",
  fr: "french",
  it: "italian",
};

function dictionaryFor(code: LanguageCode): TranslationLanguage {
  return DICTIONARY_FOR[code] ?? "english";
}

/**
 * The reminder, written in the reader's interface language and the one they
 * are learning.
 *
 * The same language twice is written once. A reader learning English with an
 * English interface gets "Yumi misses you", not "Yumi misses you · Yumi
 * misses you", which is the kind of thing that only shows up on the one
 * account nobody tested with.
 */
export async function yumiReminderCopy(
  interfaceLanguage: InterfaceLanguage,
  learningLanguage: LanguageCode | null | undefined,
): Promise<YumiReminderCopy> {
  const interfaceCode = INTERFACE_LANGUAGE_CODE[interfaceLanguage] ?? "en";

  /* An account with no learning language yet reads in one language. */
  const codes: LanguageCode[] =
    learningLanguage && learningLanguage !== interfaceCode
      ? [interfaceCode, learningLanguage]
      : [interfaceCode];

  const dictionaries = await Promise.all(
    codes.map((code) => loadTranslations(dictionaryFor(code))),
  );

  const halves = dictionaries.map((dictionary) => ({
    title: dictionary.settings.yumiReminders.pushTitle,
    body: dictionary.settings.yumiReminders.pushBody,
  }));

  /*
   * Two dictionaries can still say the same thing — a language the app has
   * not translated differently, or a fallback that resolved both halves to
   * English. Comparing what came out is what catches that, rather than
   * trusting that two different codes mean two different sentences.
   */
  const titles = [...new Set(halves.map((half) => half.title))];
  const bodies = [...new Set(halves.map((half) => half.body))];

  return {
    title: titles.join(SEPARATOR),
    body: bodies.join(SEPARATOR),
  };
}
