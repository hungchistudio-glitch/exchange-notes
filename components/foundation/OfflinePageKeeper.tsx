"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { isOnline, isWeakSignal } from "@/hooks/useOnline";
import {
  APP_FONT_SIZE_COOKIE,
  DAILY_GOAL_COOKIE,
  INTERFACE_LANGUAGE_COOKIE,
  INTERFACE_MODE_COOKIE,
  INTERFACE_MODE_EVENT,
  readPreferenceCookie,
  subscribeToAppFontSize,
  subscribeToDailyGoalWords,
  subscribeToInterfaceLanguage,
} from "@/lib/appPreferences";

/*
 * Asks the service worker to keep pages for opening without a network
 * (Chi, 2026-11-10: "直接進 App"). Draws nothing.
 *
 * The worker keeps a page it serves as a document, but most pages here are
 * reached by a tab change, which never asks for one — so without this the
 * only page kept would be the one the app opened on. This names the main
 * tabs once per visit, and each page the reader goes to, and the worker
 * fetches what it has not kept within the day (public/sw.js, keepPages;
 * Chi: "每天最多一次").
 *
 * Only on a good signal, and late: the reader's own requests go first, and
 * on a weak one this would be competing with them.
 */
export const KEPT_PAGES = [
  "/home",
  "/vocabulary",
  "/review",
  "/notes",
  "/messages",
  "/discover",
  "/profile",
] as const;

const FIRST_DELAY_MS = 8_000;
const LATER_DELAY_MS = 2_000;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/*
 * What the server renders a page for, besides the account: the interface
 * language, mode, font size and daily goal come from cookies, the learning
 * pair from the profile. A kept page rendered for other values would open
 * in the old language or mode, so the worker keeps them again as soon as
 * any of these changes, rather than waiting for the day to pass.
 */
export function keptFor(learning: string, native: string): string {
  return JSON.stringify([
    readPreferenceCookie(INTERFACE_LANGUAGE_COOKIE),
    readPreferenceCookie(INTERFACE_MODE_COOKIE),
    readPreferenceCookie(APP_FONT_SIZE_COOKIE),
    readPreferenceCookie(DAILY_GOAL_COOKIE),
    learning,
    native,
  ]);
}

/*
 * The build files this page has loaded, those it loads on demand included,
 * so the worker can tell the ones in use from an old build's.
 */
function buildFilesInUse(): string[] {
  try {
    const files = new Set<string>();
    for (const entry of performance.getEntriesByType("resource")) {
      const { pathname, origin } = new URL(entry.name);
      if (origin === window.location.origin && pathname.startsWith("/_next/static/")) files.add(pathname);
    }
    return [...files];
  } catch {
    return [];
  }
}

export default function OfflinePageKeeper() {
  const pathname = usePathname();
  const { learningLanguage, nativeLanguage } = useLearningLanguageContext();
  /* What the main tabs were last asked for: null until the first time. */
  const askedForTabs = useRef<string | null>(null);
  /* Counts settings changes, so a change asks for the pages again. */
  const [settingsChanged, setSettingsChanged] = useState(0);

  useEffect(() => {
    const changed = () => setSettingsChanged((count) => count + 1);
    window.addEventListener(INTERFACE_MODE_EVENT, changed);
    const unsubscribes = [
      subscribeToInterfaceLanguage(changed),
      subscribeToAppFontSize(changed),
      subscribeToDailyGoalWords(changed),
    ];
    return () => {
      window.removeEventListener(INTERFACE_MODE_EVENT, changed);
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    const idleWindow = window as IdleWindow;
    let idle: number | null = null;

    const ask = () => {
      const worker = navigator.serviceWorker.controller;
      if (!worker || !isOnline() || isWeakSignal() || document.visibilityState !== "visible") return;

      // The main tabs once per visit, and again when the settings change.
      const renderedFor = keptFor(learningLanguage, nativeLanguage);
      const pages: string[] = [pathname];
      if (askedForTabs.current !== renderedFor) {
        askedForTabs.current = renderedFor;
        pages.push(...KEPT_PAGES.filter((page) => page !== pathname));
      }

      worker.postMessage({
        type: "keep-pages",
        keptFor: renderedFor,
        pages,
        used: buildFilesInUse(),
      });
    };

    const timer = window.setTimeout(() => {
      if (idleWindow.requestIdleCallback) idle = idleWindow.requestIdleCallback(ask, { timeout: 5_000 });
      else ask();
    }, askedForTabs.current === null ? FIRST_DELAY_MS : LATER_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      if (idle !== null) idleWindow.cancelIdleCallback?.(idle);
    };
  }, [pathname, learningLanguage, nativeLanguage, settingsChanged]);

  return null;
}
