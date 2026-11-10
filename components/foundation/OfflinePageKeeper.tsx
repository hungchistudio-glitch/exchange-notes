"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { isOnline, isWeakSignal } from "@/hooks/useOnline";

/*
 * Asks the service worker to keep pages for opening without a network
 * (Chi, 2026-11-10: "直接進 App"). Draws nothing.
 *
 * The worker keeps a page it serves as a document, but most pages here are
 * reached by a tab change, which never asks for one — so without this the
 * only page kept would be the one the app opened on. This names the main
 * tabs once per visit, and each page the reader goes to, and the worker
 * fetches what it does not have for this build (public/sw.js, keepPages).
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

export default function OfflinePageKeeper() {
  const pathname = usePathname();
  const askedForTabs = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    const idleWindow = window as IdleWindow;
    let idle: number | null = null;

    const ask = () => {
      const worker = navigator.serviceWorker.controller;
      if (!worker || !isOnline() || isWeakSignal() || document.visibilityState !== "visible") return;

      const pages: string[] = [pathname];
      if (!askedForTabs.current) {
        askedForTabs.current = true;
        pages.push(...KEPT_PAGES.filter((page) => page !== pathname));
      }

      worker.postMessage({
        type: "keep-pages",
        build: process.env.NEXT_PUBLIC_APP_VERSION || "local",
        pages,
      });
    };

    const timer = window.setTimeout(() => {
      if (idleWindow.requestIdleCallback) idle = idleWindow.requestIdleCallback(ask, { timeout: 5_000 });
      else ask();
    }, askedForTabs.current ? LATER_DELAY_MS : FIRST_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      if (idle !== null) idleWindow.cancelIdleCallback?.(idle);
    };
  }, [pathname]);

  return null;
}
