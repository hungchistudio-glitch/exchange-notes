"use client";

import { LoaderCircle } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";
import OnboardingMurph from "@/components/onboarding/OnboardingMurph";
import type { AppLanguage } from "@/lib/types/app";

type ConfirmStepProps = {
  displayName: string;
  nativeLanguage: AppLanguage;
  learningLanguage: AppLanguage;
  completing: boolean;
  error: string;
  onStart: () => void;
};

export default function ConfirmStep({
  displayName,
  nativeLanguage,
  learningLanguage,
  completing,
  error,
  onStart,
}: ConfirmStepProps) {
  const { t, language } = useTranslation();
  const copy = t.onboarding.confirm;

  const appLanguageLabel = language === "traditional-chinese" ? "繁體中文" : "English";
  const nativeLabel = nativeLanguage === "traditional-chinese" ? "繁體中文" : "English";
  const learningLabel = learningLanguage === "traditional-chinese" ? "繁體中文" : "English";

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <OnboardingMurph mood="proud" className="h-32 w-32" />

        <h1 className="mt-5 text-[24px] font-bold tracking-[-0.03em] text-black">
          {copy.title}
        </h1>

        <div className="mt-7 w-full max-w-xs space-y-0 divide-y divide-black/[0.06] rounded-2xl bg-black/[0.03] px-4">
          <SummaryRow label={copy.nameLabel} value={displayName || "—"} />
          <SummaryRow label={copy.appLanguageLabel} value={appLanguageLabel} />
          <SummaryRow label={copy.nativeLabelSummary} value={nativeLabel} />
          <SummaryRow label={copy.learningLabelSummary} value={learningLabel} />
        </div>

        <p className="mt-4 max-w-xs text-xs leading-5 text-black/40">{copy.note}</p>

        {error ? (
          <p className="mt-4 max-w-xs text-xs leading-5 text-red-600">{error}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={completing}
        className="mt-8 flex h-13 min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-black px-6 text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
      >
        {completing ? <LoaderCircle size={16} className="animate-spin" /> : null}
        {copy.cta}
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-[13px] text-black/45">{label}</span>
      <span className="truncate text-[14px] font-semibold text-black">{value}</span>
    </div>
  );
}
