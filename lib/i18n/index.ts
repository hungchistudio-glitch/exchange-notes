import english from "@/lib/i18n/en";
import traditionalChinese from "@/lib/i18n/zh-TW";
import type {
  TranslationDictionary,
  TranslationLanguage,
} from "@/lib/i18n/types";

const DICTIONARIES: Record<
  TranslationLanguage,
  TranslationDictionary
> = {
  english,
  "traditional-chinese": traditionalChinese,
};

export function getTranslations(
  language: TranslationLanguage,
): TranslationDictionary {
  return DICTIONARIES[language];
}

export {
  english,
  traditionalChinese,
};

export type {
  TranslationDictionary,
  TranslationLanguage,
};
