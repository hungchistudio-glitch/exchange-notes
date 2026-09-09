"use client";

import { useMemo } from "react";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import {
  INTERFACE_LANGUAGE_CODE,
  resolveSupportLanguage,
  type LanguageCode,
} from "@/lib/languages";

export type DisplayLanguages = {
  /** The language being learned. Leads every card, every time it is there. */
  learningLanguage: LanguageCode;
  /** The language it is glossed in. Never equal to the language being learned. */
  supportLanguage: LanguageCode;
  /** The two above, in that order, for helpers that take a preference list. */
  pair: readonly [LanguageCode, LanguageCode];
};

/**
 * The two languages any piece of content may be shown in — and the only two.
 *
 * ── Which language plays which part ────────────────────────────────────
 *
 * The lead is the language being learned. That is the whole point of the
 * setting: a card that does not lead in it is a card that did not notice
 * the switch.
 *
 * The gloss is the interface language. It used to be the separate "my
 * language" setting, which is defensible — but it meant someone reading a
 * French interface could still be glossed in English, from a setting they
 * had changed months ago and forgotten, with nothing on screen explaining
 * why. The language you chose to read the app in is the language you have
 * most recently said you read comfortably, and it is the one visibly in
 * effect everywhere else.
 *
 * "My language" still exists and still matters — it is what the model is
 * told to translate *from* when a word is first saved, and it is the
 * tie-breaker below. It simply no longer decides what a rendered card says.
 *
 * ── When the two would be the same ─────────────────────────────────────
 *
 * Learning Italian with the app in Italian leaves nothing to gloss with, so
 * the fallback is "my language", then English. A card needs two sides;
 * showing the same text twice is not one of them.
 *
 * ── What is deliberately absent ────────────────────────────────────────
 *
 * A third language. Whatever else a row happens to carry, these two are the
 * only ones any screen may render — no falling back to whatever the content
 * happens to have, which is how a reader who had switched to Italian kept
 * being shown English.
 */
export default function useDisplayLanguages(): DisplayLanguages {
  const { learningLanguage, nativeLanguage } = useLearningLanguageContext();
  const interfaceLanguage = useInterfaceLanguage();

  return useMemo(() => {
    const supportLanguage = resolveSupportLanguage(
      learningLanguage,
      INTERFACE_LANGUAGE_CODE[interfaceLanguage],
      nativeLanguage,
    );

    return {
      learningLanguage,
      supportLanguage,
      pair: [learningLanguage, supportLanguage] as const,
    };
  }, [interfaceLanguage, learningLanguage, nativeLanguage]);
}
