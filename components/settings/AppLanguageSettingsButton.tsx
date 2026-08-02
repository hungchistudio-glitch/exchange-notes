"use client";

import { Languages } from "lucide-react";
import { useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  setInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";

const LANGUAGE_OPTIONS: Array<{
  value: InterfaceLanguage;
  label: string;
  badge: string;
}> = [
  { value: "english", label: "English", badge: "En" },
  { value: "traditional-chinese", label: "繁體中文", badge: "中" },
];

export default function AppLanguageSettingsButton() {
  const [open, setOpen] = useState(false);
  const { t, language } = useTranslation();
  const copy = t.settings.appLanguage;

  function handleSelect(value: InterfaceLanguage) {
    setInterfaceLanguage(value);
  }

  function getOptionDescription(value: InterfaceLanguage) {
    return value === "english"
      ? copy.englishDescription
      : copy.traditionalChineseDescription;
  }

  const currentLabel =
    language === "traditional-chinese" ? "繁體中文" : "English";

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={currentLabel}
        tone="emerald"
        icon={<Languages size={17} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.sheetTitle}
        description={copy.sheetDescription}
      >
        <div className="space-y-3">
          {LANGUAGE_OPTIONS.map((option) => (
            <SettingsChoiceCard
              key={option.value}
              selected={language === option.value}
              badge={<span className="text-[15px]">{option.badge}</span>}
              title={option.label}
              description={getOptionDescription(option.value)}
              onClick={() => handleSelect(option.value)}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
