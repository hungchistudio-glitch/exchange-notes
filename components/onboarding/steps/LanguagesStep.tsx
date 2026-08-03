"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import type { AppLanguage } from "@/lib/types/app";

type LanguagesStepProps = {
  nativeLanguage: AppLanguage;
  learningLanguage: AppLanguage;
  onChangeNativeLanguage: (value: AppLanguage) => void;
  onChangeLearningLanguage: (value: AppLanguage) => void;
  onContinue: () => void;
};

const LANGUAGE_OPTIONS: Array<{ value: AppLanguage; label: string; badge: string }> = [
  { value: "english", label: "English", badge: "En" },
  { value: "traditional-chinese", label: "繁體中文", badge: "中" },
];

const OPPOSITE_LANGUAGE: Record<AppLanguage, AppLanguage> = {
  english: "traditional-chinese",
  "traditional-chinese": "english",
};

export default function LanguagesStep({
  nativeLanguage,
  learningLanguage,
  onChangeNativeLanguage,
  onChangeLearningLanguage,
  onContinue,
}: LanguagesStepProps) {
  const { t } = useTranslation();
  const copy = t.onboarding.languages;

  // Only two languages exist app-wide, so native and learning can never be
  // equal — picking a value that collides with the other field flips that
  // field to the remaining language instead, exactly like the Settings
  // page fix (never lets the DB's "must differ" check get tripped).
  function handlePickNative(value: AppLanguage) {
    onChangeNativeLanguage(value);
    if (value === learningLanguage) {
      onChangeLearningLanguage(OPPOSITE_LANGUAGE[value]);
    }
  }

  function handlePickLearning(value: AppLanguage) {
    onChangeLearningLanguage(value);
    if (value === nativeLanguage) {
      onChangeNativeLanguage(OPPOSITE_LANGUAGE[value]);
    }
  }

  const learningLabel = learningLanguage === "traditional-chinese" ? "繁體中文" : "English";
  const nativeLabel = nativeLanguage === "traditional-chinese" ? "繁體中文" : "English";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-black">
          {copy.title}
        </h1>

        <div className="mt-7">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-black/40">
            {copy.nativeLabel}
          </p>
          <p className="mt-1 text-[13px] leading-5 text-black/45">
            {copy.nativeDescription}
          </p>

          <div className="mt-3 space-y-2.5">
            {LANGUAGE_OPTIONS.map((option) => (
              <SettingsChoiceCard
                key={option.value}
                selected={nativeLanguage === option.value}
                badge={<span className="text-[15px]">{option.badge}</span>}
                title={option.label}
                onClick={() => handlePickNative(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="mt-7">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-black/40">
            {copy.learningLabel}
          </p>
          <p className="mt-1 text-[13px] leading-5 text-black/45">
            {copy.learningDescription}
          </p>

          <div className="mt-3 space-y-2.5">
            {LANGUAGE_OPTIONS.map((option) => (
              <SettingsChoiceCard
                key={option.value}
                selected={learningLanguage === option.value}
                badge={<span className="text-[15px]">{option.badge}</span>}
                title={option.label}
                onClick={() => handlePickLearning(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-black/[0.035] px-4 py-3.5">
          <p className="text-[13px] leading-6 text-black/60">
            {copy.previewPrimary.replace("{language}", learningLabel)}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-black/45">
            {copy.previewSecondary.replace("{language}", nativeLabel)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-6 flex h-13 min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-black px-6 text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
      >
        {t.onboarding.continue}
      </button>
    </div>
  );
}
