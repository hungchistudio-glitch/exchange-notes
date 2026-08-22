"use client";

import { ReactNode, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import {
  getLanguage,
  getLearningLanguages,
  type LanguageCode,
} from "@/lib/languages";

/*
 * The languages this app can currently teach, read from the table rather than
 * typed out. Narrower than the table on purpose: the profile columns still
 * hold the old two-value encoding, so a pair they cannot store would fail on
 * save instead of in the picker. Widening that column widens this list.
 */
const LANGUAGE_OPTIONS: Array<{
  value: LanguageCode;
  label: string;
  badge: string;
}> = getLearningLanguages().map((meta) => ({
  value: meta.code,
  label: meta.endonym,
  badge: meta.badge,
}));

type ProfileLanguageSettingsButtonProps = {
  rowTitle: string;
  rowDescription: string;
  sheetTitle: string;
  sheetDescription: string;
  icon: ReactNode;
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
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
    getLanguage(value).endonym;

  function handleSelect(next: LanguageCode) {
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
