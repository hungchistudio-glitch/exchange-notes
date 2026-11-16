"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { InterfaceLanguage } from "@/lib/appPreferences";
import {
  getLabTextVersion,
  getServerLabTextVersion,
  loadLabText,
  subscribeToLabText,
} from "@/lib/pronunciation/labText";

/**
 * Fetches the Lab's teaching text in the reader's interface language, and
 * redraws the screen that calls it when the text arrives. Every component
 * that calls localize() calls this too, so none is left in English because
 * a parent above it was memoised.
 */
export default function useLabText(language: InterfaceLanguage): void {
  useSyncExternalStore(subscribeToLabText, getLabTextVersion, getServerLabTextVersion);
  useEffect(() => {
    void loadLabText(language);
  }, [language]);
}
