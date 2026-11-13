"use client";

import { useEffect } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import useCosmicMode from "@/hooks/useCosmicMode";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";

type PocketBridge = {
  webkit?: {
    messageHandlers?: {
      yumiPocketPreferences?: { postMessage: (body: unknown) => void };
    };
  };
};

/**
 * Hands the iPhone app what Yumi Pocket Lookup's widget needs to look like
 * the app: the mode, the interface language and the learning pair
 * (Chi, 2026-11-12). The native side (ExchangeNotesWebView.swift) accepts
 * it only from this origin's main frame, validates it
 * (PocketPreferences.swift) and writes it to the App Group, reloading the
 * widget only when something changed.
 *
 * Presentation only: never an account identifier, a word, a cookie or a
 * token. In a browser there is no bridge and this does nothing.
 */
export default function PocketPreferencesSync() {
  const { language } = useTranslation();
  const cosmic = useCosmicMode();
  const { pair } = useDisplayLanguages();
  const [learning, translation] = pair;

  useEffect(() => {
    const sync = () => {
      (window as typeof window & PocketBridge).webkit?.messageHandlers?.yumiPocketPreferences?.postMessage({
        version: 1,
        appMode: cosmic ? "cosmic" : "standard",
        interfaceLanguage: language,
        learningLanguageCode: learning,
        translationLanguageCode: translation,
      });
    };
    sync();
    // Again when the native side is ready, and as the app comes and goes.
    window.addEventListener("exchange-notes-native-ready", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("exchange-notes-native-ready", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [cosmic, language, learning, translation]);

  return null;
}
