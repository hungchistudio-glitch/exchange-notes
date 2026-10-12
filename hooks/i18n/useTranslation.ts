"use client";

import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import {
  getTranslations,
  type TranslationDictionary,
  type TranslationLanguage,
} from "@/lib/i18n";
import { INTERFACE_LANGUAGE_CODE } from "@/lib/languages";

type TranslationResult = {
  language: TranslationLanguage;
  /**
   * The display language as a locale for Intl: dates, numbers, plurals and
   * language names follow the app's setting, not the phone's.
   */
  locale: string;
  isTraditionalChinese: boolean;
  t: TranslationDictionary;
};

/**
 * The app's own language, and the strings to say it in.
 *
 * Synchronous at all call sites. The server-provided active dictionary covers
 * the first client render; dictionaries chosen later are loaded before the
 * preference event is dispatched. No Promise is created during rendering —
 * React 19 explicitly rejects that pattern in Client Components.
 */
export default function useTranslation(): TranslationResult {
  const language = useInterfaceLanguage();
  const t = getTranslations(language);

  if (!t) {
    throw new Error(
      `Translations for ${language} were not loaded before the language changed.`,
    );
  }

  return {
    language,
    locale: INTERFACE_LANGUAGE_CODE[language],
    isTraditionalChinese: language === "traditional-chinese",
    t,
  };
}
