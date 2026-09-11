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
 * The gloss is the profile's native language. That makes each of the 20
 * directed learning → native combinations real throughout generation and
 * rendering; changing the interface language changes controls and copy, not
 * the meaning of an already-selected learning pair.
 *
 * ── When the two would be the same ─────────────────────────────────────
 *
 * A malformed profile may contain the same value in both slots. The interface
 * language is then a recovery fallback, followed by another supported
 * language. Valid profiles never take this path.
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
