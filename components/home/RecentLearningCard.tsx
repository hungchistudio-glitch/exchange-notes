import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";

type RecentLearningItem = {
  articleId: string;
  title: string;
  category: string;
};

type RecentLearningCardProps = {
  items: RecentLearningItem[];
};

export default function RecentLearningCard({ items }: RecentLearningCardProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-[30px] bg-white p-5 shadow-[0_10px_35px_rgba(0,0,0,0.045)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">
            Recent learning
          </p>

          <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">
            Continue where you left off.
          </h2>
        </div>

        <Link
          href="/discover"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f2eb] text-black/65"
          aria-label="Open Discover"
        >
          <ArrowRight size={17} strokeWidth={1.8} />
        </Link>
      </div>

      <div className="mt-5 space-y-2.5">
        {items.map((item) => (
          <Link
            key={item.articleId}
            href="/discover"
            className="flex items-center gap-3 rounded-[20px] bg-[#f8f6f1] p-4 transition-transform active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black/60">
              <Newspaper size={15} strokeWidth={1.8} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/30">
                {item.category}
              </p>

              <p className="mt-1 truncate text-[14px] font-semibold">
                {item.title}
              </p>
            </div>

            <ArrowRight size={15} className="shrink-0 text-black/30" />
          </Link>
        ))}
      </div>
    </section>
  );
}
