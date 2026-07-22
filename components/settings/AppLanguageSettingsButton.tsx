"use client";

import { Languages } from "lucide-react";
import { useState } from "react";

import {
  BottomSheet,
  SettingsRow,
} from "@/components/foundation";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import {
  getLanguageLabel,
  getSettingsCopy,
} from "@/components/settings/settingsCopy";
import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
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
  const language = useInterfaceLanguage();
  const copy = getSettingsCopy(language);

  function handleSelect(value: InterfaceLanguage) {
    setInterfaceLanguage(value);
  }

  function getOptionDescription(
    value: InterfaceLanguage,
  ) {
    return value === "english"
      ? copy.appLanguage.englishDescription
      : copy.appLanguage.traditionalChineseDescription;
  }

  return (
    <>
      <SettingsRow
        title={copy.appLanguage.rowTitle}
        description={copy.appLanguage.rowDescription}
        value={getLanguageLabel(language)}
        icon={
          <Languages
            size={17}
            strokeWidth={1.8}
          />
        }
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.appLanguage.sheetTitle}
        description={
          copy.appLanguage.sheetDescription
        }
      >
        <div className="space-y-3">
          {LANGUAGE_OPTIONS.map((option) => (
            <SettingsChoiceCard
              key={option.value}
              selected={language === option.value}
              badge={
                <span className="text-[15px]">
                  {option.badge}
                </span>
              }
              title={option.label}
              description={getOptionDescription(
                option.value,
              )}
              onClick={() =>
                handleSelect(option.value)
              }
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
