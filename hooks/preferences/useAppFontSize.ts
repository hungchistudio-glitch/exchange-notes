"use client";

import { useAppFontSizeValue } from "@/contexts/DevicePreferencesContext";

/**
 * The reader's font size, for the one screen that displays it as a choice.
 *
 * Everything else in the app gets it for free: it is the root font size, and
 * app/layout.tsx renders it onto <html> from the same cookie the server read.
 */
export default function useAppFontSize() {
  return useAppFontSizeValue();
}
