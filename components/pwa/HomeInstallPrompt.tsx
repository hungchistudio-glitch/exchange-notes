"use client";

import { useEffect, useState } from "react";

import InstallPromptCard from "@/components/pwa/InstallPromptCard";
import PwaInstallOverlay from "@/components/pwa/PwaInstallOverlay";
import usePwaInstall from "@/hooks/pwa/usePwaInstall";
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

  useEffect(() => {
    if (isStandalone) return;
    if (platform !== "ios" && !canPromptInstall) return;
    if (!shouldOfferInstallPrompt()) return;

    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [isStandalone, platform, canPromptInstall]);

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
