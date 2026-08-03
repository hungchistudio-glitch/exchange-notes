"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import OnboardingMurph from "@/components/onboarding/OnboardingMurph";

type WelcomeStepProps = {
  onContinue: () => void;
};

export default function WelcomeStep({ onContinue }: WelcomeStepProps) {
  const { t } = useTranslation();
  const copy = t.onboarding.welcome;

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <OnboardingMurph className="h-40 w-40" />

      <h1 className="mt-6 text-[26px] font-bold tracking-[-0.03em] text-black">
        {copy.title}
      </h1>

      <p className="mt-2.5 max-w-xs text-[15px] leading-6 text-black/50">
        {copy.subtitle}
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="mt-10 flex h-13 min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-black px-6 text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
      >
        {copy.cta}
      </button>
    </div>
  );
}
