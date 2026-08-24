"use client";

import { use } from "react";

import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import {
  getTranslations,
  loadTranslations,
  type TranslationDictionary,
  type TranslationLanguage,
} from "@/lib/i18n";

type TranslationResult = {
  language: TranslationLanguage;
  isTraditionalChinese: boolean;
  t: TranslationDictionary;
};

/**
 * The app's own language, and the strings to say it in.
 *
 * Synchronous, as it has always been: every one of its call sites reads
 * `t.something.else` in the middle of a render and none of them handle a
 * loading state. What changed underneath is that the five dictionaries are
 * no longer all in the bundle — see lib/i18n/index.ts — so this reads the
 * one the reader needs out of a cache instead of off a static import.
 *
 * `use()` is the fallback for the one render where that cache is cold. On
 * the server it makes Next await the import before rendering, so the HTML
 * still goes out fully translated; in the browser it happens during
 * hydration, where React holds the server's own markup until the promise
 * settles — the screen does not change, it becomes interactive a moment
 * later. Every render after that reads the cache and never suspends.
 */
export default function useTranslation(): TranslationResult {
  const language = useInterfaceLanguage();

  const cached = getTranslations(language);
  const t = cached ?? use(loadTranslations(language));

  return {
    language,
    isTraditionalChinese: language === "traditional-chinese",
    t,
  };
}
