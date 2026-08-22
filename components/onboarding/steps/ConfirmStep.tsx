"use client";

import { LoaderCircle } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";
import OnboardingYumi from "@/components/onboarding/OnboardingYumi";
import type { AppLanguage } from "@/lib/types/app";
import {
  getInterfaceLanguageMeta,
  getLanguage,
  toLanguageCode,
} from "@/lib/languages";

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

  /*
   * Three labels, two axes. The first is the language the app is being read
   * in — which is now a set of three, so a ternary against Chinese answered
   * "English" for a Spanish reader. The other two are the pair being learned.
   * Each is named in its own language, from the table.
   */
  const appLanguageLabel = getInterfaceLanguageMeta(language).endonym;
  const nativeLabel = getLanguage(toLanguageCode(nativeLanguage)).endonym;
  const learningLabel = getLanguage(toLanguageCode(learningLanguage)).endonym;

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <OnboardingYumi mood="proud" className="h-32 w-32" />

        <h1 className="mt-5 text-[24px] font-bold tracking-[-0.03em] text-black">
          {copy.title}
        </h1>

        <div className="mt-7 w-full max-w-xs space-y-0 divide-y divide-black/[0.06] rounded-2xl bg-black/[0.03] px-4">
          <SummaryRow label={copy.nameLabel} value={displayName || "—"} />
          <SummaryRow label={copy.appLanguageLabel} value={appLanguageLabel} />
          <SummaryRow label={copy.nativeLabelSummary} value={nativeLabel} />
          <SummaryRow label={copy.learningLabelSummary} value={learningLabel} />
        </div>

        <p className="mt-4 max-w-xs text-xs leading-5 text-ink-faint">{copy.note}</p>

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
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span className="truncate text-[14px] font-semibold text-black">{value}</span>
    </div>
  );
}
