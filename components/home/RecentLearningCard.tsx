import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Newspaper,
  Sparkles,
} from "lucide-react";

import { Surface } from "@/components/ui";

type RecentLearningItem = {
  articleId: string;
  title: string;
  category: string;
};

type RecentLearningCardProps = {
  items: RecentLearningItem[];
};

export default function RecentLearningCard({
  items,
}: RecentLearningCardProps) {
  if (items.length === 0) return null;

  return (
    <Surface
      tone="default"
      padding="lg"
      className="overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className="
              flex
              size-12
              shrink-0
              items-center
              justify-center
              rounded-[18px]
              bg-[#E7EEE4]
              text-[#4C6144]
            "
          >
            <BookOpen size={21} strokeWidth={1.9} />
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6E8663]">
                Recent learning
              </p>

              <Sparkles
                aria-hidden="true"
                size={13}
                strokeWidth={1.9}
                className="text-[#6E8663]"
              />
            </div>

            <h2 className="mt-2 text-[23px] font-semibold leading-tight tracking-[-0.035em] text-[#2F312D]">
              Continue where you left off.
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#666A63]">
              Return to your recently saved reading.
            </p>
          </div>
        </div>

        <Link
          href="/discover"
          aria-label="Open Discover"
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
            bg-[#F4F7F2]
            text-[#5E7555]
            transition
            hover:border-[#B7C9AB]
            hover:bg-[#E7EEE4]
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

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <Link
            key={item.articleId}
            href="/discover"
            className="
              en-focus-ring
              group
              flex
              items-center
              gap-4
              rounded-[20px]
              border
              border-[#E3E3DC]
              bg-[#F8F8F4]
              p-4
              transition
              duration-200
              hover:-translate-y-0.5
              hover:border-[#D2DEC9]
              hover:bg-[#F4F7F2]
              hover:shadow-[0_10px_24px_rgba(60,70,50,0.07)]
              active:translate-y-0
              active:scale-[0.99]
            "
          >
            <span
              className="
                flex
                size-11
                shrink-0
                items-center
                justify-center
                rounded-[16px]
                bg-white
                text-[#6E8663]
                shadow-sm
                transition
                group-hover:bg-[#E7EEE4]
              "
            >
              <Newspaper size={18} strokeWidth={1.8} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#888B84]">
                {item.category}
              </p>

              <p className="mt-1.5 truncate text-[15px] font-semibold tracking-[-0.015em] text-[#2F312D]">
                {item.title}
              </p>

              <p className="mt-1 text-xs text-[#777A73]">
                Continue reading
              </p>
            </div>

            <ArrowRight
              size={17}
              strokeWidth={1.9}
              className="
                shrink-0
                text-[#9A9D95]
                transition
                group-hover:translate-x-0.5
                group-hover:text-[#5E7555]
              "
            />
          </Link>
        ))}
      </div>

      <div className="mt-5 border-t border-[#E7E8E2] pt-4">
        <Link
          href="/discover"
          className="
            en-focus-ring
            inline-flex
            items-center
            gap-2
            rounded-xl
            text-sm
            font-semibold
            text-[#5E7555]
            transition
            hover:text-[#394A35]
          "
        >
          Browse all learning content

          <ArrowRight size={15} strokeWidth={2} />
        </Link>
      </div>
    </Surface>
  );
}
