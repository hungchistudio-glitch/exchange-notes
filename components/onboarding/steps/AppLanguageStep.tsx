"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import { setInterfaceLanguage, type InterfaceLanguage } from "@/lib/appPreferences";
import { loadTranslations } from "@/lib/i18n";
import {
  INTERFACE_LANGUAGE_CODE,
  getInterfaceLanguageMeta,
} from "@/lib/languages";

type AppLanguageStepProps = {
  onContinue: () => void;
};

/*
 * Read from the language table, like the Settings picker is. Typed out here,
 * this list was the reason a language could ship a full dictionary and still
 * be unreachable for anyone signing up.
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

export default function AppLanguageStep({ onContinue }: AppLanguageStepProps) {
  const { t, language } = useTranslation();
  const copy = t.onboarding.appLanguage;

  async function selectLanguage(value: InterfaceLanguage) {
    if (value === language) return;

    await loadTranslations(value);
    setInterfaceLanguage(value);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <h1 className="text-[1.5rem] font-bold tracking-[-0.03em] text-black">
          {copy.title}
        </h1>

        <p className="mt-2 text-[0.9375rem] leading-6 text-ink-soft">
          {copy.subtitle}
        </p>

        <div className="mt-8 space-y-3">
          {LANGUAGE_OPTIONS.map((option) => (
            <SettingsChoiceCard
              key={option.value}
              selected={language === option.value}
              badge={<span className="text-[0.9375rem]">{option.badge}</span>}
              title={option.label}
              onClick={() => void selectLanguage(option.value)}
            />
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-ink-faint">{copy.note}</p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-8 flex h-13 min-h-12 w-full items-center justify-center rounded-full bg-black px-6 text-[0.9375rem] font-semibold text-white transition-all active:scale-[0.98]"
      >
        {t.onboarding.continue}
      </button>
    </div>
  );
}
