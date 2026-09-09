"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  applyAppFontSize,
  applyInterfaceLanguage,
  getAppFontSize,
  getDailyGoalWords,
  getInterfaceLanguage,
  setInterfaceLanguage,
  subscribeToAppFontSize,
  subscribeToDailyGoalWords,
  subscribeToInterfaceLanguage,
  type AppFontSize,
  type DailyGoalWords,
  type InterfaceLanguage,
} from "@/lib/appPreferences";
import {
  getTranslations,
  loadTranslations,
  primeTranslations,
  type TranslationDictionary,
} from "@/lib/i18n";

/**
 * The preferences the document was rendered with.
 *
 * Not the current values — the values the server used. That distinction is
 * the entire point of this file. A component that reads a preference straight
 * out of localStorage during its render disagrees with the HTML it is
 * hydrating into, and React answers a mismatch by discarding the server's
 * tree and rebuilding the whole page on the client. Across a tree this size
 * that is a document repainting on every load, which is what the flash behind
 * the opening animation actually was.
 *
 * See lib/preferences/serverPreferences.ts for which preferences have to be
 * here and why.
 */
type DevicePreferences = {
  interfaceLanguage: InterfaceLanguage;
  interfaceTranslations: TranslationDictionary;
  appFontSize: AppFontSize;
  dailyGoalWords: DailyGoalWords;
};

const DevicePreferencesContext = createContext<DevicePreferences | null>(null);

export function DevicePreferencesProvider({
  initial,
  children,
}: {
  initial: DevicePreferences;
  children: ReactNode;
}) {
  const [primedInitial] = useState(() => {
    primeTranslations(initial.interfaceLanguage, initial.interfaceTranslations);
    return initial;
  });

  return (
    <DevicePreferencesContext.Provider value={primedInitial}>
      <PreferenceEffects />
      {children}
    </DevicePreferencesContext.Provider>
  );
}

/**
 * Keeps the root element's attributes in step with the resolved values.
 *
 * The server already renders both the language and the font size onto <html>
 * from the same cookies, so on the ordinary path this changes nothing. It
 * exists for the one-off correction on a device whose cookie is missing but
 * whose localStorage remembers a choice, and for a preference changed while
 * the app is open.
 */
function PreferenceEffects() {
  const language = useInterfaceLanguageValue();
  const fontSize = useAppFontSizeValue();

  useEffect(() => {
    const deviceLanguage = getInterfaceLanguage();
    if (deviceLanguage === language) return;

    let active = true;

    void loadTranslations(deviceLanguage)
      .then(() => {
        if (active) setInterfaceLanguage(deviceLanguage);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    applyInterfaceLanguage(language);
  }, [language]);

  useEffect(() => {
    applyAppFontSize(fontSize);
  }, [fontSize]);

  return null;
}

/**
 * Reads one preference: the server's value while hydrating, the device's
 * value afterwards.
 *
 * The third argument to useSyncExternalStore is what was wrong before. React
 * uses it for the server render *and* for the hydrating render, then switches
 * to the client snapshot once hydration is done. Passing the browser's own
 * getter there — which is what every one of these hooks used to do — meant
 * the hydrating render answered from localStorage while the HTML it was
 * attaching to had answered from a default.
 *
 * The two only differ now on a device whose cookie is missing but whose
 * localStorage remembers a choice. That reader gets one correction after
 * hydration, and the getters write the cookie through as they read, so it
 * happens once and never again.
 */
function usePreference<T>(
  subscribe: (listener: () => void) => () => void,
  read: () => T,
  seed: (preferences: DevicePreferences | null) => T,
): T {
  const preferences = useContext(DevicePreferencesContext);

  return useSyncExternalStore(subscribe, read, () => seed(preferences));
}

/*
 * Each falls back to reading the device directly when there is no provider
 * above. The provider sits in the root layout, so in the app there always is
 * one; the fallback is for tests, which render single components without the
 * document around them.
 */

export function useInterfaceLanguageValue(): InterfaceLanguage {
  const preferences = useContext(DevicePreferencesContext);

  return useSyncExternalStore(
    subscribeToInterfaceLanguage,
    () => {
      const deviceLanguage = getInterfaceLanguage();

      return getTranslations(deviceLanguage)
        ? deviceLanguage
        : (preferences?.interfaceLanguage ?? deviceLanguage);
    },
    () => preferences?.interfaceLanguage ?? getInterfaceLanguage(),
  );
}

export function useAppFontSizeValue(): AppFontSize {
  return usePreference(
    subscribeToAppFontSize,
    getAppFontSize,
    (preferences) => preferences?.appFontSize ?? getAppFontSize(),
  );
}

export function useDailyGoalWordsValue(): DailyGoalWords {
  return usePreference(
    subscribeToDailyGoalWords,
    getDailyGoalWords,
    (preferences) => preferences?.dailyGoalWords ?? getDailyGoalWords(),
  );
}
