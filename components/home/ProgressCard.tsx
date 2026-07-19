import Link from "next/link";
import {
  ArrowRight,
  Check,
  Target,
} from "lucide-react";

import {
  ProgressBar,
  Surface,
} from "@/components/ui";

type ProgressCardProps = {
  current: number;
  goal: number;
};

export default function ProgressCard({
  current,
  goal,
}: ProgressCardProps) {
  const safeCurrent = Math.max(current, 0);
  const safeGoal = Math.max(goal, 1);

  const displayedCurrent = Math.min(safeCurrent, safeGoal);
  const remaining = Math.max(goal - safeCurrent, 0);
  const complete = remaining === 0;

  return (
    <Surface
      tone={complete ? "forest" : "default"}
      padding="lg"
      className="overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={`
              flex
              size-12
              shrink-0
              items-center
              justify-center
              rounded-[18px]
              ${
                complete
                  ? "bg-[#DCE7D8] text-[#4C6144]"
                  : "bg-[#E7EEE4] text-[#5E7555]"
              }
            `}
          >
            {complete ? (
              <Check size={21} strokeWidth={2.1} />
            ) : (
              <Target size={21} strokeWidth={1.9} />
            )}
          </span>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6E8663]">
              Today&apos;s goal
            </p>

            <div className="mt-2 flex items-end gap-2">
              <p className="text-[32px] font-semibold leading-none tracking-[-0.05em] text-[#2F312D]">
                {safeCurrent}
              </p>

              <p className="pb-0.5 text-[15px] font-medium text-[#888B84]">
                / {goal}
              </p>
            </div>

            <p className="mt-2 text-sm leading-5 text-[#666A63]">
              {complete
                ? "Daily goal complete. Great work."
                : remaining === 1
                  ? "1 more word to reach your goal."
                  : `${remaining} more words to reach your goal.`}
            </p>
          </div>
        </div>

        <Link
          href="/vocabulary"
          aria-label="Open vocabulary"
          className="
            en-focus-ring
            group
            flex
            size-10
            shrink-0
            items-center
            justify-center
            rounded-2xl
            border
            border-[#D2DEC9]
            bg-white/75
            text-[#5E7555]
            transition
            hover:border-[#B7C9AB]
            hover:bg-white
            active:scale-[0.96]
          "
        >
          <ArrowRight
            size={18}
            strokeWidth={1.9}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="mt-6">
        <ProgressBar
          value={displayedCurrent}
          max={safeGoal}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#E7E8E2] pt-4">
        <p className="text-xs font-medium text-[#777A73]">
          Words added today
        </p>

        <p
          className={`
            rounded-full
            px-3
            py-1.5
            text-xs
            font-semibold
            ${
              complete
                ? "bg-[#DCE7D8] text-[#4C6144]"
                : "bg-[#F1F3EE] text-[#666A63]"
            }
          `}
        >
          {complete
            ? "Completed"
            : `${displayedCurrent} of ${goal}`}
        </p>
      </div>
    </Surface>
  );
}
