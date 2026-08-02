"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import Link from "next/link";
import { ChevronRight, Volume2 } from "lucide-react";

export default function PronunciationHub() {
  const { t } = useTranslation();

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
            {t.home.pronunciation.eyebrow}
          </p>

          <h2 className="mt-1 text-xl font-bold">
            {t.home.pronunciation.title}
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            {t.home.pronunciation.description}
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
