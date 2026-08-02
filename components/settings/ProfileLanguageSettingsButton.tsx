"use client";

import { ReactNode, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import type { AppLanguage } from "@/lib/types/app";

const LANGUAGE_OPTIONS: Array<{
  value: AppLanguage;
  label: string;
  badge: string;
}> = [
  { value: "english", label: "English", badge: "En" },
  { value: "traditional-chinese", label: "繁體中文", badge: "中" },
];

type ProfileLanguageSettingsButtonProps = {
  rowTitle: string;
  rowDescription: string;
  sheetTitle: string;
  sheetDescription: string;
  icon: ReactNode;
  value: AppLanguage;
  onChange: (value: AppLanguage) => void;
};

export default function ProfileLanguageSettingsButton({
  rowTitle,
  rowDescription,
  sheetTitle,
  sheetDescription,
  icon,
  value,
  onChange,
}: ProfileLanguageSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  const currentLabel =
    value === "traditional-chinese" ? "繁體中文" : "English";

  function handleSelect(next: AppLanguage) {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <SettingsRow
        title={rowTitle}
        description={rowDescription}
        value={currentLabel}
        icon={icon}
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={sheetTitle}
        description={sheetDescription}
      >
        <div className="space-y-3">
          {LANGUAGE_OPTIONS.map((option) => (
            <SettingsChoiceCard
              key={option.value}
              selected={value === option.value}
              badge={<span className="text-[15px]">{option.badge}</span>}
              title={option.label}
              onClick={() => handleSelect(option.value)}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
