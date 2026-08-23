import english from "@/lib/i18n/en";
import spanish from "@/lib/i18n/es";
import french from "@/lib/i18n/fr";
import italian from "@/lib/i18n/it";
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
  spanish,
  french,
  italian,
};

export function getTranslations(
  language: TranslationLanguage,
): TranslationDictionary {
  return DICTIONARIES[language];
}

export {
  english,
  spanish,
  french,
  italian,
  traditionalChinese,
};

export type {
  TranslationDictionary,
  TranslationLanguage,
};
