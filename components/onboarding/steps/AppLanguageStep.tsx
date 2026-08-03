"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import { setInterfaceLanguage, type InterfaceLanguage } from "@/lib/appPreferences";

type AppLanguageStepProps = {
  onContinue: () => void;
};

const LANGUAGE_OPTIONS: Array<{
  value: InterfaceLanguage;
  label: string;
  badge: string;
}> = [
  { value: "english", label: "English", badge: "En" },
  { value: "traditional-chinese", label: "繁體中文", badge: "中" },
];

export default function AppLanguageStep({ onContinue }: AppLanguageStepProps) {
  const { t, language } = useTranslation();
  const copy = t.onboarding.appLanguage;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-black">
          {copy.title}
        </h1>

        <p className="mt-2 text-[15px] leading-6 text-black/50">
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

        <p className="mt-4 text-xs leading-5 text-black/35">{copy.note}</p>
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
