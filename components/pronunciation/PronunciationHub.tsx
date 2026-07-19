"use client";

import Link from "next/link";
import { ChevronRight, Volume2 } from "lucide-react";

export default function PronunciationHub() {
  return (
    <Link
      href="/pronunciation"
      className="flex items-center justify-between rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm transition hover:bg-neutral-50"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100">
          <Volume2 size={21} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Daily practice
          </p>

          <h2 className="mt-1 text-xl font-bold">
            Pronunciation Lab
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Practice English sounds and 注音.
          </p>
        </div>
      </div>

      <ChevronRight
        size={21}
        className="shrink-0 text-neutral-500"
      />
    </Link>
  );
}
