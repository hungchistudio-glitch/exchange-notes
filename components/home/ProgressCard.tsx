import Link from "next/link";
import { ArrowRight } from "lucide-react";

type ProgressCardProps = {
  current: number;
  goal: number;
};

export default function ProgressCard({ current, goal }: ProgressCardProps) {
  const safeGoal = Math.max(goal, 1);
  const progress = Math.min((current / safeGoal) * 100, 100);

  return (
    <section className="rounded-[30px] bg-white p-5 shadow-[0_10px_35px_rgba(0,0,0,0.045)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">
            Today&apos;s progress
          </p>

          <p className="mt-3 text-[30px] font-semibold tracking-[-0.04em]">
            {current} / {goal} words
          </p>
        </div>

        <Link
          href="/vocabulary"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f2eb] text-black/65 transition-transform active:scale-95"
          aria-label="Open vocabulary"
        >
          <ArrowRight size={17} strokeWidth={1.8} />
        </Link>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#ece8df]">
        <div
          className="h-full rounded-full bg-black transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-[12px] text-black/40">
        Continue building today&apos;s vocabulary.
      </p>
    </section>
  );
}
