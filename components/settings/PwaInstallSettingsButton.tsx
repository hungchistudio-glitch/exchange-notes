"use client";

import { Check, Download } from "lucide-react";
import { useState } from "react";

import SettingsRow from "@/components/foundation/rows/SettingsRow";
import InstallPromptCard from "@/components/pwa/InstallPromptCard";
import PwaInstallOverlay from "@/components/pwa/PwaInstallOverlay";
import useTranslation from "@/hooks/i18n/useTranslation";
import usePwaInstall from "@/hooks/pwa/usePwaInstall";

export default function PwaInstallSettingsButton() {
  const { t } = useTranslation();
  const copy = t.pwa;
  const { platform, isStandalone, canPromptInstall } = usePwaInstall();
  const [open, setOpen] = useState(false);

  // Nothing useful to offer here: not iOS (which always gets the manual
  // steps) and the browser hasn't decided this is installable either.
  if (!isStandalone && platform !== "ios" && !canPromptInstall) {
    return null;
  }

  return (
    <>
      <SettingsRow
        title={isStandalone ? copy.installedRowTitle : copy.settingsRowTitle}
        description={isStandalone ? undefined : copy.settingsRowDescription}
        icon={isStandalone ? <Check size={16} strokeWidth={2} /> : <Download size={16} strokeWidth={1.8} />}
        tone={isStandalone ? "emerald" : "neutral"}
        disabled={isStandalone}
        onClick={() => setOpen(true)}
      />

      <PwaInstallOverlay open={open} onClose={() => setOpen(false)}>
        <InstallPromptCard onDismiss={() => setOpen(false)} onInstalled={() => setOpen(false)} />
      </PwaInstallOverlay>
    </>
  );
}
