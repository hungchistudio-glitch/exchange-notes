"use client";

import { useEffect } from "react";

import {
  applyAppFontSize,
  applyInterfaceLanguage,
  getAppFontSize,
  getInterfaceLanguage,
  subscribeToAppFontSize,
  subscribeToInterfaceLanguage,
} from "@/lib/appPreferences";

export default function AppPreferencesBootstrap() {
  useEffect(() => {
    function applyCurrentPreferences() {
      applyAppFontSize(getAppFontSize());

      applyInterfaceLanguage(
        getInterfaceLanguage(),
      );
    }

    window.localStorage.removeItem(
      "exchange-notes-appearance",
    );

    document.documentElement.classList.remove(
      "dark",
    );

    document.documentElement.removeAttribute(
      "data-app-appearance",
    );

    document.documentElement.removeAttribute(
      "data-app-theme",
    );

    document.documentElement.style.colorScheme =
      "light";

    applyCurrentPreferences();

    const unsubscribeFontSize =
      subscribeToAppFontSize((fontSize) => {
        applyAppFontSize(fontSize);
      });

    const unsubscribeInterfaceLanguage =
      subscribeToInterfaceLanguage(
        (language) => {
          applyInterfaceLanguage(language);
        },
      );

    window.addEventListener(
      "pageshow",
      applyCurrentPreferences,
    );

    window.addEventListener(
      "focus",
      applyCurrentPreferences,
    );

    return () => {
      unsubscribeFontSize();
      unsubscribeInterfaceLanguage();

      window.removeEventListener(
        "pageshow",
        applyCurrentPreferences,
      );

      window.removeEventListener(
        "focus",
        applyCurrentPreferences,
      );
    };
  }, []);

  return null;
}
