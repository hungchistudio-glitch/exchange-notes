"use client";

import { useSyncExternalStore } from "react";

import type { SpeechTag } from "@/lib/languages";

/* =========================================================
   The landing page's one notebook

   Three things on the page keep the hero's phrase: the first screen's
   card (three taps), the four-step trial under it, and scene 5 of
   Yumi's film, where the reader can keep the word she sees as she lands
   (Chi, 2026-11-21). They are one notebook, as the app has one library,
   so a phrase kept anywhere shows as kept everywhere, and the trial's
   review has it to bring back.

   Held in memory for the page's life only: nothing here leaves the page,
   which is what the trial promises ("Nothing you type here leaves this
   page").
   ========================================================= */

export type Kept = {
  id: "phrase" | "word";
  text: string;
  lang: string;
  speech: SpeechTag | null;
  reading?: string;
  meaning: string;
  equivalent?: string;
  where?: string;
  why?: string;
};

let notebook: Kept[] = [];
const listeners = new Set<() => void>();
const EMPTY: Kept[] = [];

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readNotebook(): Kept[] {
  return notebook;
}

/** The notebook, kept in step with every place on the page that writes it. */
export function useNotebook(): Kept[] {
  return useSyncExternalStore(subscribe, readNotebook, () => EMPTY);
}

/** Replaces the notebook; `next` sees the current one. */
export function setNotebook(next: Kept[] | ((current: Kept[]) => Kept[])) {
  const value = typeof next === "function" ? next(notebook) : next;
  if (value === notebook) return;
  notebook = value;
  emit();
}

/** Keeps the phrase, first in the notebook, in place of any earlier copy. */
export function keepPhrase(card: Kept) {
  setNotebook(current => [card, ...current.filter(item => item.id !== card.id)]);
}

/** For tests: a fresh page. */
export function resetNotebookForTests() {
  notebook = [];
  emit();
}
