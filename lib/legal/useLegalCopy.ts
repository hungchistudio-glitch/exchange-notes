"use client";

import { useEffect, useState } from "react";

import type { InterfaceLanguage } from "@/lib/appPreferences";

import { getLegalCopy, loadLegalCopy, type LegalCopy } from "./index";

export type InitialLegalCopy = { language: InterfaceLanguage; copy: LegalCopy };

/**
 * The privacy policy and terms in the reader's language.
 *
 * The server page hands over the copy for the language it rendered in, so
 * the documents are in the HTML a crawler or a slow phone receives — which
 * matters for these two pages in particular: they are what Google's brand
 * review reads. A language picked afterwards loads its own chunk, and until
 * it arrives the last one stays on screen rather than a blank page.
 *
 * `language` is null on pages that show neither document.
 */
export function useLegalCopy(
  language: InterfaceLanguage | null,
  initial?: InitialLegalCopy,
): LegalCopy | null {
  const [loaded, setLoaded] = useState<InitialLegalCopy | null>(initial ?? null);

  const ready = language
    ? getLegalCopy(language) ?? (loaded?.language === language ? loaded.copy : null)
    : null;

  useEffect(() => {
    if (!language || ready) return;
    let live = true;
    loadLegalCopy(language)
      .then((copy) => {
        if (live) setLoaded({ language, copy });
      })
      .catch((error) => console.error("Could not load the legal documents.", error));
    return () => {
      live = false;
    };
  }, [language, ready]);

  if (!language) return null;
  return ready ?? loaded?.copy ?? null;
}
