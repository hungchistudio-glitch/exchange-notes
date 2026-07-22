"use client";

import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import {
  getTranslations,
  type TranslationDictionary,
  type TranslationLanguage,
} from "@/lib/i18n";

type TranslationResult = {
  language: TranslationLanguage;
  isTraditionalChinese: boolean;
  t: TranslationDictionary;
};

export default function useTranslation(): TranslationResult {
  const language = useInterfaceLanguage();

  return {
    language,
    isTraditionalChinese:
      language === "traditional-chinese",
    t: getTranslations(language),
  };
}
