"use client";

import Link from "next/link";
import { ChevronRight, Languages, Volume2 } from "lucide-react";

export default function PronunciationHub() {
  return (
    <section className="rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm">

      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Daily Practice
        </p>

        <h2 className="mt-2 text-2xl font-bold">
          Pronunciation Lab
        </h2>

        <p className="mt-2 text-sm text-neutral-500">
          Practice English pronunciation and Traditional Chinese Zhuyin every day.
        </p>
      </div>

      <div className="space-y-3">

        <Link
          href="/pronunciation"
          className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4 transition hover:bg-neutral-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-neutral-100 p-3">
              <Volume2 size={20}/>
            </div>

            <div>
              <div className="font-semibold">
                English Sounds
              </div>

              <div className="text-sm text-neutral-500">
                IPA • Mouth Position • Examples
              </div>
            </div>
          </div>

          <ChevronRight size={20}/>
        </Link>

        <Link
          href="/pronunciation"
          className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4 transition hover:bg-neutral-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-neutral-100 p-3">
              <Languages size={20}/>
            </div>

            <div>
              <div className="font-semibold">
                Zhuyin Sounds
              </div>

              <div className="text-sm text-neutral-500">
                注音 • 嘴型 • 單字練習
              </div>
            </div>
          </div>

          <ChevronRight size={20}/>
        </Link>

      </div>

    </section>
  );
}
