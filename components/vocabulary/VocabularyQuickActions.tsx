"use client";

import Link from "next/link";
import { Brain, Camera, Plus } from "lucide-react";

type Props = {
  onAddWord: () => void;
};

const cardClass =
  "group min-w-0 rounded-[24px] border border-black/[0.06] bg-white p-5 text-left shadow-[0_4px_18px_rgba(0,0,0,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.07)] active:scale-[0.98]";

const iconClass =
  "mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.045] text-black transition group-hover:bg-black group-hover:text-white";

export default function VocabularyQuickActions({ onAddWord }: Props) {
  return (
    <section className="mb-7 grid grid-cols-3 gap-3">
      <Link href="/capture" className={cardClass}>
        <span className={iconClass}>
          <Camera size={18} strokeWidth={1.8} />
        </span>

        <div className="text-[14px] font-semibold tracking-[-0.01em]">
          Capture
        </div>

        <div className="mt-1.5 text-[11px] leading-4 text-black/40">
          Learn from photos
        </div>
      </Link>

      <button
        type="button"
        onClick={onAddWord}
        className={cardClass}
      >
        <span className={iconClass}>
          <Plus size={18} strokeWidth={1.9} />
        </span>

        <div className="text-[14px] font-semibold tracking-[-0.01em]">
          Add Word
        </div>

        <div className="mt-1.5 text-[11px] leading-4 text-black/40">
          AI or manual
        </div>
      </button>

      <Link href="/vocabulary/review" className={cardClass}>
        <span className={iconClass}>
          <Brain size={18} strokeWidth={1.8} />
        </span>

        <div className="text-[14px] font-semibold tracking-[-0.01em]">
          Review
        </div>

        <div className="mt-1.5 text-[11px] leading-4 text-black/40">
          Practice words
        </div>
      </Link>
    </section>
  );
}
