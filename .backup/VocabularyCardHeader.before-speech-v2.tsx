"use client";

import { ArrowUpRight } from "lucide-react";
import AppBadge from "@/components/ui/AppBadge";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: "＋ New",
  learning: "● Learning",
  mastered: "✓ Mastered",
};

function statusTone(status: VocabularyStatus) {
  if (status === "mastered") return "success" as const;
  if (status === "learning") return "warning" as const;
  return "neutral" as const;
}

type Props = {
  item: VocabularyItem;
  onOpen: () => void;
};

export default function VocabularyCardHeader({
  item,
  onOpen,
}: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">

        <div className="flex flex-wrap items-center gap-2">
          <AppBadge tone={statusTone(item.status)}>
            {STATUS_LABELS[item.status]}
          </AppBadge>

          {item.part_of_speech && (
            <AppBadge>{item.part_of_speech}</AppBadge>
          )}
        </div>

        <h2 className="mt-5 break-words text-[34px] font-bold leading-[1.05] tracking-[-0.055em]">
          {item.word}
        </h2>

        <PronunciationBlock
          english={item.word}
          chinese={item.translation}
          showEnglish
          className="mt-4"
        />

        <h3 className="mt-5 text-[24px] font-semibold">
          {item.translation}
        </h3>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
        aria-label="More actions"
      >
        <ArrowUpRight size={17} />
      </button>
    </div>
  );
}
