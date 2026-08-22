"use client";

import { useState } from "react";

import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { setInterfaceLanguage } from "@/lib/appPreferences";
import { createClient } from "@/lib/supabase/client";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import {
  INTERFACE_LANGUAGE_CODE,
  getInterfaceLanguages,
  getLearningLanguages,
  toAppLanguage,
  toLanguageCode,
} from "@/lib/languages";
import type { AppLanguage } from "@/lib/types/app";

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
const LEARNING_OPTIONS: ReadonlyArray<{ value: AppLanguage; label: string }> =
  getLearningLanguages()
    .map((meta) => ({ value: toAppLanguage(meta.code), label: meta.endonym }))
    .filter((option): option is { value: AppLanguage; label: string } =>
      option.value !== null,
    );

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

      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onSelect(option.value)}
              className={`min-h-12 rounded-2xl border px-4 text-[15px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-50 ${
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
  const { t } = useTranslation();
  const copy = t.tutorial.steps.setup;

  const interfaceLanguage = useInterfaceLanguage();
  const { learningLanguage, refresh } = useLearningLanguageContext();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleLearningChange(next: AppLanguage) {
    if (saving || next === learningLanguage) return;

    setSaving(true);
    setError("");

    /*
     * Only two languages exist, and the database rejects a profile whose
     * native and learning language match (check constraint 23514). So the
     * other field always flips in the same update rather than being left to
     * collide — the same rule the profile screen follows.
     */
    const nextNative: AppLanguage =
      next === "english" ? "traditional-chinese" : "english";

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
    <div className="mt-7 space-y-5">
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
