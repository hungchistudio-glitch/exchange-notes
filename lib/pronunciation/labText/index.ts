import type { InterfaceLanguage } from "@/lib/appPreferences";

/* =========================================================
   The Lab's teaching text in the other interface languages

   The packs are written in English and Traditional Chinese (and some in a
   third language). Spanish, French, Italian, Japanese and Korean readers
   get the rest from a table per language, keyed by the English (Chi,
   2026-11-16: 說明教學也要補齊七種語言). The tables are kept out of the
   packs so that the Lab and the review page, which import every pack,
   do not carry five more languages for every reader. Each table is
   fetched the first time a reader with that interface opens something
   that teaches (hooks/useLabText.ts), and localize() reads it from then on.
   ========================================================= */

type Table = Readonly<Record<string, string>>;

const LOADERS: Partial<Record<InterfaceLanguage, () => Promise<{ default: Table }>>> = {
  spanish: () => import("./es"),
  french: () => import("./fr"),
  italian: () => import("./it"),
  japanese: () => import("./ja"),
  korean: () => import("./ko"),
};

const tables: Partial<Record<InterfaceLanguage, Table>> = {};
const pending = new Map<InterfaceLanguage, Promise<void>>();
const listeners = new Set<() => void>();
let version = 0;

/** The text for these English words in this language, once its table is here. */
export function labTextFor(language: InterfaceLanguage, english: string): string | undefined {
  return tables[language]?.[english];
}

/** Whether this language's table is here, or has none to fetch. */
export function hasLabText(language: InterfaceLanguage): boolean {
  return Boolean(tables[language]) || !LOADERS[language];
}

/** Fetches this language's table once; every later call is the same promise. */
export function loadLabText(language: InterfaceLanguage): Promise<void> {
  const load = LOADERS[language];
  if (!load || tables[language]) return Promise.resolve();
  const existing = pending.get(language);
  if (existing) return existing;
  const loading = load()
    .then((module) => {
      tables[language] = module.default;
      version += 1;
      for (const listener of listeners) listener();
    })
    .catch(() => {
      /* Offline, say: English stays, and the next screen asks again. */
      pending.delete(language);
    });
  pending.set(language, loading);
  return loading;
}

export function subscribeToLabText(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Changes each time a table arrives, so a screen showing English redraws. */
export const getLabTextVersion = () => version;
export const getServerLabTextVersion = () => 0;
