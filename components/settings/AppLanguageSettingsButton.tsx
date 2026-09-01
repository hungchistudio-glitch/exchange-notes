"use client";

import { Languages } from "lucide-react";
import { useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import { loadTranslations, prefetchTranslations } from "@/lib/i18n";
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

  async function handleSelect(value: InterfaceLanguage) {
    if (value === language) return;

    await loadTranslations(value);
    setInterfaceLanguage(value);
  }

  /*
   * The dictionaries this sheet is about to offer, fetched as it opens.
   *
   * Changing the app's language is a synchronous, in-place re-render — every
   * screen turns over in the same commit — and that only holds while the
   * dictionary is already here. Warming them on idle instead would download
   * four languages for every reader, almost all of whom never open this
   * sheet at all; warming them here costs those bytes only to someone who
   * has just said they are thinking about it, and the sheet's own opening
   * animation covers the fetch.
   */
  function openPicker() {
    prefetchTranslations(language);
    setOpen(true);
  }

  const currentLabel = getInterfaceLanguageMeta(language).endonym;

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={currentLabel}
        icon={<Languages size={17} strokeWidth={1.8} />}
        onClick={openPicker}
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
              badge={<span className="text-[0.9375rem]">{option.badge}</span>}
              title={option.label}
              description={copy.descriptions[option.value]}
              onClick={() => void handleSelect(option.value)}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
