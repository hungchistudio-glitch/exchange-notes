"use client";

import { Orbit } from "lucide-react";
import { useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { InterfaceMode } from "@/lib/appPreferences";

export default function InterfaceModeSettingsButton() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { interfaceMode, setInterfaceMode } = useInterfaceMode();
  const copy = t.settings.interfaceMode;

  const options: Array<{
    value: InterfaceMode;
    badge: string;
    title: string;
    description: string;
  }> = [
    {
      value: "standard",
      badge: "◎",
      title: copy.standardTitle,
      description: copy.standardDescription,
    },
    {
      value: "yumi-cosmic",
      badge: "✦",
      title: copy.cosmicTitle,
      description: copy.cosmicDescription,
    },
  ];

  const currentLabel =
    interfaceMode === "yumi-cosmic" ? copy.cosmicTitle : copy.standardTitle;

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={currentLabel}
        tone="emerald"
        icon={<Orbit size={17} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.sheetTitle}
        description={copy.sheetDescription}
      >
        <div className="space-y-3">
          {options.map((option) => (
            <SettingsChoiceCard
              key={option.value}
              selected={interfaceMode === option.value}
              badge={<span className="text-[15px]">{option.badge}</span>}
              title={option.title}
              description={option.description}
              onClick={() => setInterfaceMode(option.value)}
            />
          ))}
        </div>

        {/*
          Said plainly, and on the screen where the choice is made. The one
          question a second interface raises is whether it is a second copy of
          everything, and the answer — that it is not — is worth more here
          than any amount of description of how the deck looks.
        */}
        <p className="mt-4 text-xs leading-5 text-black/45">
          {copy.sharedDataNote}
        </p>
      </BottomSheet>
    </>
  );
}
