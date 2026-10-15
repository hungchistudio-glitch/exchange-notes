import type { InterfaceLanguage } from "@/lib/appPreferences";

import type { LegalCopy } from "./types";

export type { LegalCopy, LegalDocument, LegalSection } from "./types";

/*
 * The day the current privacy policy and terms took effect.
 *
 * One date for both documents and every language, so they can never drift
 * apart. Change it whenever either document changes in substance, and tell
 * readers before it takes effect when the change matters to them (the
 * policy promises that).
 */
export const LEGAL_EFFECTIVE_DATE = "2026-10-15";

/* Five literal imports, so the bundler makes five chunks rather than one. */
const LOADERS: Record<InterfaceLanguage, () => Promise<{ default: LegalCopy }>> = {
  english: () => import("@/lib/legal/en"),
  "traditional-chinese": () => import("@/lib/legal/zh-TW"),
  spanish: () => import("@/lib/legal/es"),
  french: () => import("@/lib/legal/fr"),
  italian: () => import("@/lib/legal/it"),
};

const cache = new Map<InterfaceLanguage, LegalCopy>();

export async function loadLegalCopy(language: InterfaceLanguage): Promise<LegalCopy> {
  const cached = cache.get(language);
  if (cached) return cached;
  const copy = (await (LOADERS[language] ?? LOADERS.english)()).default;
  cache.set(language, copy);
  return copy;
}

/** Already loaded, or null. Never starts a load. */
export function getLegalCopy(language: InterfaceLanguage): LegalCopy | null {
  return cache.get(language) ?? null;
}

/** "Effective 15 October 2026", in the page's own language. */
export function formatEffective(copy: LegalCopy, htmlLang: string): string {
  const [year, month, day] = LEGAL_EFFECTIVE_DATE.split("-").map(Number);
  const date = new Intl.DateTimeFormat(htmlLang, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return copy.effective.replace("{date}", date);
}
