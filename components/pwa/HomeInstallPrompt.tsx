"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import InstallPromptCard from "@/components/pwa/InstallPromptCard";
import PwaInstallOverlay from "@/components/pwa/PwaInstallOverlay";
import usePwaInstall from "@/hooks/pwa/usePwaInstall";
import {
  isLaunching,
  isLaunchingOnServer,
  subscribeToLaunching,
} from "@/lib/launchState";
import {
  recordInstallPromptDismissed,
  shouldOfferInstallPrompt,
} from "@/lib/pwaPreferences";

// Shown once per snooze window on Home — covers both "just finished
// onboarding, this is their first Home visit" and "back for a second or
// third session" per the design brief, without needing to know which one
// this actually is.
export default function HomeInstallPrompt() {
  const { platform, isStandalone, canPromptInstall } = usePwaInstall();
  const [open, setOpen] = useState(false);

  /*
   * The wait starts when the reader arrives, not when this mounts.
   *
   * It mounts under the opening animation, which owns the screen for 2.8
   * seconds — so a 1.2s timer from mount opened this behind the overlay, and
   * the card was simply already there when the screen was handed over. The
   * delay exists so the prompt arrives a moment after Home does; that moment
   * is when the opening ends.
   */
  const launching = useSyncExternalStore(
    subscribeToLaunching,
    isLaunching,
    isLaunchingOnServer,
  );

  useEffect(() => {
    if (launching) return;
    if (isStandalone) return;
    if (platform !== "ios" && !canPromptInstall) return;
    if (!shouldOfferInstallPrompt()) return;

    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [launching, isStandalone, platform, canPromptInstall]);

  function handleClose() {
    recordInstallPromptDismissed();
    setOpen(false);
  }

  return (
    <PwaInstallOverlay open={open} onClose={handleClose}>
      <InstallPromptCard onDismiss={handleClose} onInstalled={() => setOpen(false)} />
    </PwaInstallOverlay>
  );
}
