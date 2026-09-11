"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import {
  changeProfileLanguagePair,
  getLanguage,
  getLearningLanguages,
  type LanguageCode,
} from "@/lib/languages";

type LanguagesStepProps = {
  nativeLanguage: LanguageCode;
  learningLanguage: LanguageCode;
  onChangeNativeLanguage: (value: LanguageCode) => void;
  onChangeLearningLanguage: (value: LanguageCode) => void;
  onContinue: () => void;
};

/*
 * The languages this app can currently teach, read from the table rather than
 * typed out. Every two-distinct-language direction is supported and can be
 * stored directly as its BCP-47 code.
 */
const LANGUAGE_OPTIONS: Array<{
  value: LanguageCode;
  label: string;
  badge: string;
}> = getLearningLanguages().map((meta) => ({
  value: meta.code,
  label: meta.endonym,
  badge: meta.badge,
}));

export default function LanguagesStep({
  nativeLanguage,
  learningLanguage,
  onChangeNativeLanguage,
  onChangeLearningLanguage,
  onContinue,
}: LanguagesStepProps) {
  const { t } = useTranslation();
  const copy = t.onboarding.languages;

  function handlePickNative(value: LanguageCode) {
    const [nextLearning, nextNative] = changeProfileLanguagePair(
      [learningLanguage, nativeLanguage],
      "native",
      value,
    );
    onChangeNativeLanguage(nextNative);
    if (nextLearning !== learningLanguage) onChangeLearningLanguage(nextLearning);
  }

  function handlePickLearning(value: LanguageCode) {
    const [nextLearning, nextNative] = changeProfileLanguagePair(
      [learningLanguage, nativeLanguage],
      "learning",
      value,
    );
    onChangeLearningLanguage(nextLearning);
    if (nextNative !== nativeLanguage) onChangeNativeLanguage(nextNative);
  }

  const learningLabel = getLanguage(learningLanguage).endonym;
  const nativeLabel = getLanguage(nativeLanguage).endonym;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <h1 className="text-[1.5rem] font-bold tracking-[-0.03em] text-black">
          {copy.title}
        </h1>

        <div className="mt-7">
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {copy.nativeLabel}
          </p>
          <p className="mt-1 text-[0.8125rem] leading-5 text-ink-soft">
            {copy.nativeDescription}
          </p>

          <div className="mt-3 space-y-2.5">
            {LANGUAGE_OPTIONS.map((option) => (
              <SettingsChoiceCard
                key={option.value}
                selected={nativeLanguage === option.value}
                badge={<span className="text-[0.9375rem]">{option.badge}</span>}
                title={option.label}
                onClick={() => handlePickNative(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="mt-7">
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {copy.learningLabel}
          </p>
          <p className="mt-1 text-[0.8125rem] leading-5 text-ink-soft">
            {copy.learningDescription}
          </p>

          <div className="mt-3 space-y-2.5">
            {LANGUAGE_OPTIONS.map((option) => (
              <SettingsChoiceCard
                key={option.value}
                selected={learningLanguage === option.value}
                badge={<span className="text-[0.9375rem]">{option.badge}</span>}
                title={option.label}
                onClick={() => handlePickLearning(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-black/[0.035] px-4 py-3.5">
          <p className="text-[0.8125rem] leading-6 text-ink-soft">
            {copy.previewPrimary.replace("{language}", learningLabel)}
          </p>
          <p className="mt-1 text-[0.8125rem] leading-6 text-ink-soft">
            {copy.previewSecondary.replace("{language}", nativeLabel)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-6 flex h-13 min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-black px-6 text-[0.9375rem] font-semibold text-white transition-all active:scale-[0.98]"
      >
        {t.onboarding.continue}
      </button>
    </div>
  );
}
