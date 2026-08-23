"use client";

import { useInterfaceLanguageValue } from "@/contexts/InterfaceLanguageContext";

/**
 * The interface language, as every screen in the app reads it.
 *
 * The value comes from a provider seeded with the cookie the server rendered
 * from, rather than being read out of localStorage during the render. That
 * distinction is the whole reason this file is one line: reading storage here
 * meant the server and the browser could not agree on what language the app
 * was in, and every translated string in the tree became a hydration
 * mismatch. See contexts/InterfaceLanguageContext.tsx.
 */
export default function useInterfaceLanguage() {
  return useInterfaceLanguageValue();
}
