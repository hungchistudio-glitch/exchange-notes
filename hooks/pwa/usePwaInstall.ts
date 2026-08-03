"use client";

import { useCallback, useEffect, useState } from "react";

import { getRememberedInstalled, markAppInstalled } from "@/lib/pwaPreferences";

export type PwaPlatform = "ios" | "android" | "desktop" | "unknown";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;

  // iOS Safari never implemented the display-mode media query for this;
  // it exposes navigator.standalone instead — not in TS's lib.dom types.
  const nav = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
}

export default function usePwaInstall() {
  const [platform, setPlatform] = useState<PwaPlatform>("unknown");
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Deferred a tick: platform/standalone detection only makes sense
    // post-mount (server has no navigator/window at all), but setting
    // state synchronously at the top of an effect body still trips the
    // "avoid cascading renders" lint rule — queueMicrotask satisfies both
    // constraints without changing the effective timing (still resolves
    // before the next paint).
    queueMicrotask(() => {
      setPlatform(detectPlatform());
      setIsStandalone(detectStandalone() || getRememberedInstalled());
    });

    function handleBeforeInstallPrompt(event: Event) {
      // Chrome/Android would otherwise show its own mini-infobar
      // immediately — suppressing that lets our own card decide when to
      // offer installing instead.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      markAppInstalled();
      setIsStandalone(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (!deferredPrompt) return "unavailable";

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (choice.outcome === "accepted") {
      markAppInstalled();
      setIsStandalone(true);
    }

    return choice.outcome;
  }, [deferredPrompt]);

  return {
    platform,
    isStandalone,
    // Android/Chrome only fires beforeinstallprompt once its own
    // installability heuristics pass (manifest, service worker, HTTPS,
    // engagement) — this reflects that, not just "we're on Android".
    canPromptInstall: deferredPrompt !== null,
    promptInstall,
  };
}
