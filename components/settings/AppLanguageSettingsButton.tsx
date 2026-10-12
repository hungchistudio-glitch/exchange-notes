"use client";

import { Languages } from "lucide-react";
import { useState } from "react";

import SettingsRow from "@/components/foundation/rows/SettingsRow";
import AppLanguageSheet, { prefetchAppLanguages } from "@/components/settings/AppLanguageSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getInterfaceLanguageMeta } from "@/lib/languages";

/*
 * The display language's row in Settings. The sheet it opens is shared with
 * the shop's language key (AppLanguageSheet), so the two are one setting.
 */
export default function AppLanguageSettingsButton() {
  const [open, setOpen] = useState(false);
  const { t, language } = useTranslation();
  const copy = t.settings.appLanguage;

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
    prefetchAppLanguages(language);
    setOpen(true);
  }

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={getInterfaceLanguageMeta(language).endonym}
        icon={<Languages size={17} strokeWidth={1.8} />}
        onClick={openPicker}
      />

      <AppLanguageSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
