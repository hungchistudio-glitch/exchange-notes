"use client";

import { Languages } from "lucide-react";
import { useState } from "react";

import { BottomSheet, SettingsRow } from "@/components/foundation";
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
  {
    value: "english",
    label: "English",
    badge: "En",
  },
  {
    value: "traditional-chinese",
    label: "繁體中文",
    badge: "中",
  },
];

export default function AppLanguageSettingsButton() {
  const [open, setOpen] = useState(false);
  const { language, t } = useTranslation();

  function handleSelect(value: InterfaceLanguage) {
    setInterfaceLanguage(value);
  }

  function getOptionDescription(value: InterfaceLanguage) {
    return value === "english"
      ? t.settings.appLanguage.englishDescription
      : t.settings.appLanguage.traditionalChineseDescription;
  }

  const languageLabel =
    language === "traditional-chinese" ? "繁體中文" : "English";

  return (
    <>
      <SettingsRow
        title={t.settings.appLanguage.rowTitle}
        description={t.settings.appLanguage.rowDescription}
        value={languageLabel}
        icon={<Languages size={17} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t.settings.appLanguage.sheetTitle}
        description={t.settings.appLanguage.sheetDescription}
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
