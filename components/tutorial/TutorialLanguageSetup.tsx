"use client";

import { useState } from "react";

import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { setInterfaceLanguage } from "@/lib/appPreferences";
import { createClient } from "@/lib/supabase/client";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import {
  DEFAULT_LEARNING_PAIR,
  INTERFACE_LANGUAGE_CODE,
  getInterfaceLanguages,
  getLearningLanguages,
  type LanguageCode,
} from "@/lib/languages";

/*
 * One row, two axes — which is exactly why it takes its options rather than
 * owning them.
 *
 * This component used to hold a single hardcoded list typed as AppLanguage
 * and hand it to both rows, which is the conflation the whole language split
 * was about: the app can be read in Spanish without Spanish being a language
 * anyone here is learning, and the two lists stopped being the same list the
 * moment that was true.
 */
type ChoiceRowProps<T extends string> = {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
};

const INTERFACE_OPTIONS: ReadonlyArray<{
  value: InterfaceLanguage;
  label: string;
}> = (
  Object.keys(INTERFACE_LANGUAGE_CODE) as InterfaceLanguage[]
).filter((language) =>
  getInterfaceLanguages().some(
    (meta) => meta.code === INTERFACE_LANGUAGE_CODE[language],
  ),
).map((language) => ({
  value: language,
  label: getInterfaceLanguages().find(
    (meta) => meta.code === INTERFACE_LANGUAGE_CODE[language],
  )!.endonym,
}));

/*
 * Only the languages the old two-value column can still express. Widening
 * that column is a separate migration; offering a pair it cannot store would
 * fail on save rather than in the picker.
 */
const LEARNING_OPTIONS: ReadonlyArray<{ value: LanguageCode; label: string }> =
  getLearningLanguages().map((meta) => ({
    value: meta.code,
    label: meta.endonym,
  }));

function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onSelect,
  disabled,
}: ChoiceRowProps<T>) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
        {label}
      </p>

      {/*
       * Pills that take the width of their own name, wrapped — not a two-column
       * grid.
       *
       * Five languages in two columns is three rows, twice over, and the two
       * rows plus this step's paragraph were taller than a 375px phone: the
       * footnote below could be scrolled to but was never on screen at the
       * moment the reader had to decide. Wrapped pills put the same five
       * choices in two rows, and they stay one tap each — the minimum height is
       * unchanged, only the wasted width is gone.
       */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onSelect(option.value)}
              className={`min-h-10 max-w-full rounded-[18px] border px-3.5 py-2 text-[14px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-50 ${
                active
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white text-black"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The one step of the tour that changes something rather than describing it.
 *
 * Interface language is a device preference and applies the moment it is
 * tapped — which is the point of putting this second: every screen after it,
 * including the rest of the tour, arrives in the language just chosen.
 */
export default function TutorialLanguageSetup() {
  /*
   * useTranslation last, for the reason spelled out in TutorialOverlay: it can
   * suspend on a cold dictionary, and this is the component whose own buttons
   * make the dictionary cold. Every hook that must survive that replay is
   * declared above it.
   */
  const interfaceLanguage = useInterfaceLanguage();
  const { learningLanguage, refresh } = useLearningLanguageContext();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { t } = useTranslation();
  const copy = t.tutorial.steps.setup;

  async function handleLearningChange(next: LanguageCode) {
    if (saving || next === learningLanguage) return;

    setSaving(true);
    setError("");

    /*
     * The database rejects a profile whose native and learning language match
     * (check constraint 23514), so the other field flips in the same update
     * rather than being left to collide — the same rule the profile screen
     * follows.
     *
     * "The other one" only means something while exactly two languages can be
     * learned. A third makes the native language a choice of its own rather
     * than the leftover, and this becomes a real picker.
     */
    const nextNative: LanguageCode =
      LEARNING_OPTIONS.find((option) => option.value !== next)?.value ??
      DEFAULT_LEARNING_PAIR[1];

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(copy.saveError);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          learning_language: next,
          native_language: nextNative,
        })
        .eq("id", user.id);

      if (updateError) {
        setError(copy.saveError);
        return;
      }

      await refresh();
    } catch {
      setError(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-3.5">
      <ChoiceRow
        label={copy.appLanguageLabel}
        options={INTERFACE_OPTIONS}
        value={interfaceLanguage}
        onSelect={setInterfaceLanguage}
      />

      <ChoiceRow
        label={copy.learningLabel}
        options={LEARNING_OPTIONS}
        value={learningLanguage}
        onSelect={(value) => void handleLearningChange(value)}
        disabled={saving}
      />

      {error ? (
        <p role="alert" className="text-[12.5px] font-medium text-red-600">
          {error}
        </p>
      ) : (
        <p className="text-[12.5px] leading-6 text-ink-faint">{copy.note}</p>
      )}
    </div>
  );
}
