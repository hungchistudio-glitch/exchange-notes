"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { getVocabularyInsights } from "@/lib/vocabulary/getVocabularyInsights";
import type { VocabularyItem } from "@/lib/types/app";

type Props = {
  item: VocabularyItem;
};

export default function VocabularyLearningStats({
  item,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const insights = getVocabularyInsights(item);

  const rows = [
    {
      label: "Accuracy",
      value: `${insights.accuracy}%`,
    },
    {
      label: "Reviews",
      value: insights.reviewCount,
    },
    {
      label: "Next review",
      value: insights.nextReviewLabel,
    },
  ];

  return (
    <section className="mt-6 border-t border-black/[0.06] pt-1">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-4 py-3 text-left outline-none transition-opacity hover:opacity-65 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      >
        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-black/40">
          Learning progress
        </span>

        <ChevronDown
          size={17}
          strokeWidth={1.8}
          className={`shrink-0 text-black/45 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          expanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <dl className="border-t border-black/[0.05] pb-1 pt-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex min-h-11 items-center justify-between gap-6 py-2"
              >
                <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-black/35">
                  {row.label}
                </dt>

                <dd className="font-sans text-[14px] font-medium tracking-[-0.015em] text-black/80">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
