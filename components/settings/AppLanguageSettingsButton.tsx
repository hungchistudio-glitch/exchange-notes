"use client";

import { Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<InterfaceLanguage | null>(null);

  const { t, language } = useTranslation();
  const copy = t.settings.appLanguage;

  /*
   * Which selection the app is currently honouring.
   *
   * A dictionary is a network fetch, and a reader deciding between five
   * languages will tap more than one before the first has landed. Without a
   * token the last *answer* won: tap Español, tap Français, and if Spanish's
   * dictionary happens to resolve second the app switches to Spanish — a
   * language the reader had already moved off, chosen by whichever request
   * the network was slower about.
   *
   * The id names the request, so a reply can be checked against the question
   * still being asked. Anything older is dropped on arrival.
   */
  const latestSelection = useRef(0);

  // Only for the two setState calls below; the switch itself is deliberately
  // not cancelled on unmount — see handleSelect.
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  async function handleSelect(value: InterfaceLanguage) {
    /*
     * Re-choosing the language the app is already in cancels a switch that
     * has not landed yet. It is the only way back from a mistaken tap while
     * a dictionary is in flight, and without the token bump the cancelled
     * language would arrive a moment later and apply itself anyway.
     */
    if (value === language) {
      latestSelection.current += 1;
      setLoadError(false);
      setPending(null);
      return;
    }

    // Already working on exactly this. Tapping it again is not a new
    // request, and restarting one would only move the finish line.
    if (value === pending) return;

    const selection = (latestSelection.current += 1);

    setLoadError(false);
    setPending(value);

    try {
      await loadTranslations(value);

      if (latestSelection.current !== selection) return;

      /*
       * Applied even if this screen has since been left. The reader asked
       * for French and the dictionary is here; cancelling on unmount would
       * mean a tap followed by a swipe back silently did nothing, which is
       * worse than the app simply being in French when they arrive.
       */
      setInterfaceLanguage(value);
    } catch (error) {
      if (latestSelection.current !== selection) return;

      if (mounted.current) setLoadError(true);
      console.error("Could not load the selected interface language.", error);
    } finally {
      if (latestSelection.current === selection && mounted.current) {
        setPending(null);
      }
    }
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
    setLoadError(false);
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
              busy={pending === option.value}
              badge={<span className="text-[0.9375rem]">{option.badge}</span>}
              title={option.label}
              description={copy.descriptions[option.value]}
              onClick={() => void handleSelect(option.value)}
            />
          ))}
          {loadError ? (
            <p role="alert" className="text-xs font-medium text-red-600">
              {copy.loadError}
            </p>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
