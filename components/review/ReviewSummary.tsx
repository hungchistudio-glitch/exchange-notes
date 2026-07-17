import Link from "next/link";
import { CheckCircle2, RotateCcw } from "lucide-react";
import AppCard from "@/components/ui/AppCard";

type ReviewSummaryProps = {
  reviewed: number;
  correct: number;
  mastered: number;
  onRestart: () => void;
};

export default function ReviewSummary({
  reviewed,
  correct,
  mastered,
  onRestart,
}: ReviewSummaryProps) {
  const accuracy = reviewed === 0 ? 0 : Math.round((correct / reviewed) * 100);

  return (
    <AppCard padding="lg" className="mt-8 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f0e7] text-[#3f6945]">
        <CheckCircle2 size={29} strokeWidth={1.8} />
      </span>
      <p className="app-eyebrow mt-6">Session complete</p>
      <h2 className="mt-2 text-[32px] font-semibold tracking-[-0.04em]">
        Nice work.
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-[14px] leading-6 text-black/45">
        Your review schedule has been updated based on how each word felt.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          [reviewed, "Reviewed"],
          [`${accuracy}%`, "Accuracy"],
          [mastered, "Mastered"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-[20px] bg-[#f5f2eb] px-3 py-5">
            <p className="text-[22px] font-semibold tracking-[-0.03em]">
              {value}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onRestart}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-black px-5 text-[13px] font-semibold text-white"
        >
          <RotateCcw size={16} strokeWidth={1.8} />
          Review again
        </button>
        <Link
          href="/vocabulary"
          className="flex min-h-[52px] items-center justify-center rounded-full bg-black/[0.06] px-5 text-[13px] font-semibold text-black/70"
        >
          Back to Vocabulary
        </Link>
      </div>
    </AppCard>
  );
}
