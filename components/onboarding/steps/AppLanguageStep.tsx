"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import { setInterfaceLanguage, type InterfaceLanguage } from "@/lib/appPreferences";
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

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-black">
          {copy.title}
        </h1>

        <p className="mt-2 text-[15px] leading-6 text-ink-soft">
          {copy.subtitle}
        </p>

        <div className="mt-8 space-y-3">
          {LANGUAGE_OPTIONS.map((option) => (
            <SettingsChoiceCard
              key={option.value}
              selected={language === option.value}
              badge={<span className="text-[15px]">{option.badge}</span>}
              title={option.label}
              onClick={() => setInterfaceLanguage(option.value)}
            />
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-ink-faint">{copy.note}</p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-8 flex h-13 min-h-12 w-full items-center justify-center rounded-full bg-black px-6 text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
      >
        {t.onboarding.continue}
      </button>
    </div>
  );
}
