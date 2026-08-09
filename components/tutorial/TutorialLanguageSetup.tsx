"use client";

import { useState } from "react";

import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { setInterfaceLanguage } from "@/lib/appPreferences";
import { createClient } from "@/lib/supabase/client";
import type { AppLanguage } from "@/lib/types/app";

const OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: "english", label: "English" },
  { value: "traditional-chinese", label: "繁體中文" },
];

type ChoiceRowProps = {
  label: string;
  value: AppLanguage;
  onSelect: (value: AppLanguage) => void;
  disabled?: boolean;
};

function ChoiceRow({ label, value, onSelect, disabled }: ChoiceRowProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
        {label}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
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
        value={interfaceLanguage}
        onSelect={setInterfaceLanguage}
      />

      <ChoiceRow
        label={copy.learningLabel}
        value={learningLanguage}
        onSelect={(value) => void handleLearningChange(value)}
        disabled={saving}
      />

      {error ? (
        <p role="alert" className="text-[12.5px] font-medium text-red-600">
          {error}
        </p>
      ) : (
        <p className="text-[12.5px] leading-6 text-black/35">{copy.note}</p>
      )}
    </div>
  );
}
