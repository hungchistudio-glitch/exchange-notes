"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  applyInterfaceLanguage,
  getInterfaceLanguage,
  subscribeToInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";

const InterfaceLanguageContext = createContext<InterfaceLanguage | null>(null);

/**
 * The interface language, seeded from the request.
 *
 * The language was read straight from localStorage before this existed, which
 * meant the server rendered English and the browser rendered the reader's own
 * language — a hydration mismatch on every translated string in the app.
 * React's answer to a mismatch that size is to discard the server's tree and
 * build the whole page again on the client, which is what the launch flash
 * actually was: not the opening animation, but the app behind it being
 * rebuilt in another language.
 *
 * `initialLanguage` comes from the cookie in app/layout.tsx, so it is the
 * value the HTML was rendered with — see getServerInterfaceLanguage.
 */
export function InterfaceLanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: InterfaceLanguage;
  children: ReactNode;
}) {
  /*
   * The third argument is the whole point.
   *
   * React uses it for the server render *and* for the hydrating render, then
   * switches to the client snapshot once hydration is done. Passing the value
   * the server actually used means hydration matches by construction; passing
   * getInterfaceLanguage — as this used to, from inside the hook — meant the
   * hydrating render read the browser's stored language and disagreed with
   * the HTML it was supposed to be attaching to.
   *
   * The two only differ now on a device whose cookie is missing but whose
   * localStorage remembers a language. That reader gets one correction after
   * hydration, and getInterfaceLanguage writes the cookie through as it
   * reads, so it happens once and never again.
   */
  const language = useSyncExternalStore(
    subscribeToInterfaceLanguage,
    getInterfaceLanguage,
    () => initialLanguage,
  );

  /*
   * Keeps <html lang> and the data attribute in step with the resolved value.
   * The server already renders both from the same cookie, so on the ordinary
   * path this changes nothing; it exists for the correction above and for a
   * language changed while the app is open.
   */
  useEffect(() => {
    applyInterfaceLanguage(language);
  }, [language]);

  return (
    <InterfaceLanguageContext.Provider value={language}>
      {children}
    </InterfaceLanguageContext.Provider>
  );
}

/**
 * Falls back to the store when there is no provider above.
 *
 * The provider sits in the root layout, so in the app there always is one.
 * The fallback is for tests, which render single components without the
 * document around them, and it is the pre-existing behaviour rather than
 * anything new.
 */
export function useInterfaceLanguageValue(): InterfaceLanguage {
  const fromProvider = useContext(InterfaceLanguageContext);

  const fromStore = useSyncExternalStore(
    subscribeToInterfaceLanguage,
    getInterfaceLanguage,
    getInterfaceLanguage,
  );

  return fromProvider ?? fromStore;
}
