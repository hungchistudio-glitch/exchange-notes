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
import {
  INTERFACE_LANGUAGE_CODE,
  getInterfaceLanguageMeta,
} from "@/lib/languages";

/*
 * Built from the language table rather than typed out, so an interface
 * language appears here by shipping a dictionary and nothing else. Each is
 * labelled in its own language: someone looking for Spanish is looking for
 * "Español", not for whatever the app currently calls Spanish.
 */
const LANGUAGE_OPTIONS: Array<{
  value: InterfaceLanguage;
  label: string;
  badge: string;
}> = (Object.keys(INTERFACE_LANGUAGE_CODE) as InterfaceLanguage[])
  .filter((value) => getInterfaceLanguageMeta(value).availableAsInterface)
  .map((value) => {
    const meta = getInterfaceLanguageMeta(value);
    return { value, label: meta.endonym, badge: meta.badge };
  });

export default function AppLanguageSettingsButton() {
  const [open, setOpen] = useState(false);
  const { t, language } = useTranslation();
  const copy = t.settings.appLanguage;

  function handleSelect(value: InterfaceLanguage) {
    setInterfaceLanguage(value);
  }

  const currentLabel = getInterfaceLanguageMeta(language).endonym;

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={currentLabel}
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
              description={copy.descriptions[option.value]}
              onClick={() => handleSelect(option.value)}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
