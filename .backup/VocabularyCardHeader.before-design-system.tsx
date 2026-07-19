"use client";

import { ArrowUpRight } from "lucide-react";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import AppBadge from "@/components/ui/AppBadge";
import VocabularySpeechButton from "@/components/vocabulary/ui/VocabularySpeechButton";
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

        <div className="mt-5 flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-[34px] font-bold leading-[1.05] tracking-[-0.055em] text-neutral-950">
            {item.word}
          </h2>

          <VocabularySpeechButton
            text={item.word}
            language="en-US"
            label={`Play ${item.word}`}
            size="sm"
          />
        </div>

        <PronunciationBlock
          english={item.word}
          chinese={item.translation}
          showEnglish
          className="mt-3"
        />

        <div className="mt-5 flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-[24px] font-semibold leading-tight text-neutral-950">
            {item.translation}
          </h3>

          <VocabularySpeechButton
            text={item.translation}
            language="zh-TW"
            label={`播放 ${item.translation}`}
            size="sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpen();
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 active:scale-95"
        aria-label="Open word details"
      >
        <ArrowUpRight size={17} />
      </button>
    </div>
  );
}
