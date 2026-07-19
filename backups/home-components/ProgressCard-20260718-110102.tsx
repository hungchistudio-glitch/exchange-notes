import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import AppCard from "@/components/ui/AppCard";

type ProgressCardProps = {
  current: number;
  goal: number;
};

export default function ProgressCard({ current, goal }: ProgressCardProps) {
  const safeGoal = Math.max(goal, 1);
  const progress = Math.min((current / safeGoal) * 100, 100);
  const remaining = Math.max(goal - current, 0);

  return (
    <AppCard className="overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="app-section-label">Today&apos;s goal</p>
          <p className="mt-3 text-[30px] font-semibold tracking-[-0.045em]">
            {current}
            <span className="text-black/24"> / {goal}</span>
          </p>
          <p className="mt-1 text-[13px] text-black/45">
            {remaining === 0 ? "Goal complete" : `${remaining} words remaining`}
          </p>
        </div>

        <Link
          href="/vocabulary"
          className="app-button app-button--ghost app-button--icon"
          aria-label="Open vocabulary"
        >
          <ArrowUpRight size={17} strokeWidth={1.9} />
        </Link>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/[0.07]">
        <div
          className="h-full rounded-full bg-black transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </AppCard>
  );
}
