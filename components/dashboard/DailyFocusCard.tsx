import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type DailyFocusCardProps = {
  due: number;
  retention: number;
  accuracy: number;
  loading?: boolean;
};

type MetricProps = {
  label: string;
  value: string;
};

function Metric({ label, value }: MetricProps) {
  return (
    <div className="border-t border-white/10 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38">
        {label}
      </p>

      <p className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.04em] text-white">
        {value}
      </p>
    </div>
  );
}

export default function DailyFocusCard({
  due,
  retention,
  accuracy,
  loading = false,
}: DailyFocusCardProps) {
  const hasReviews = due > 0;

  return (
    <article className="overflow-hidden rounded-[26px] bg-black p-5 text-white sm:p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/38">
            Daily focus
          </p>

          <h2 className="mt-3 max-w-[240px] text-[30px] font-semibold leading-[1.05] tracking-[-0.045em]">
            {loading
              ? "Preparing today’s session"
              : hasReviews
                ? `${due} ${due === 1 ? "word is" : "words are"} ready`
                : "You’re caught up"}
          </h2>
        </div>

        <span className="flex h-11 min-w-11 items-center justify-center rounded-full border border-white/15 text-sm font-semibold">
          {loading ? "—" : due}
        </span>
      </div>

      <p className="mt-4 max-w-sm text-sm leading-6 text-white/48">
        {loading
          ? "Loading your latest learning progress."
          : hasReviews
            ? "Review the words due today to keep your memory strong."
            : "There are no scheduled reviews right now. Add or explore new vocabulary."}
      </p>

      <div className="mt-7 grid grid-cols-2 gap-x-5">
        <Metric
          label="Retention"
          value={loading ? "—" : `${retention}%`}
        />

        <Metric
          label="Accuracy"
          value={loading ? "—" : `${accuracy}%`}
        />
      </div>

      <Link
        href={hasReviews ? "/review" : "/vocabulary"}
        className="group mt-2 flex items-center justify-between border-t border-white/10 pt-5"
      >
        <span className="text-sm font-semibold">
          {hasReviews ? "Continue review" : "Explore vocabulary"}
        </span>

        <ArrowUpRight
          size={17}
          strokeWidth={1.8}
          className="text-white/45 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
        />
      </Link>
    </article>
  );
}
