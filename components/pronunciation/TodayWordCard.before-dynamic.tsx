"use client";

import Link from "next/link";
import { Volume2, BookOpen } from "lucide-react";

function speak(text: string, lang: "en-US" | "zh-TW") {
  if (typeof window === "undefined") return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.82;

  window.speechSynthesis.speak(utterance);
}

export default function TodayWordCard() {
  const word = {
    english: "Carhartt",
    pronunciation: "KAR-hart",
    zhuyin: "ㄎㄚˇ ㄏㄚ ㄊㄜˋ",
    chinese: "卡哈特",
    example: "I bought a new Carhartt jacket.",
  };

  return (
    <section className="rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm">

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        Today's Word
      </p>

      <h2 className="mt-2 text-3xl font-bold">
        {word.english}
      </h2>

      <div className="mt-6 space-y-3">

        <button
          onClick={() => speak(word.english, "en-US")}
          className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
        >
          <div>
            <div className="text-sm text-neutral-500">
              English Pronunciation
            </div>

            <div className="font-semibold">
              {word.pronunciation}
            </div>
          </div>

          <Volume2 size={18}/>
        </button>

        <button
          onClick={() => speak(word.chinese, "zh-TW")}
          className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
        >
          <div>
            <div className="text-sm text-neutral-500">
              Zhuyin
            </div>

            <div className="font-semibold">
              {word.zhuyin}
            </div>
          </div>

          <Volume2 size={18}/>
        </button>

      </div>

      <div className="mt-5">
        <div className="font-medium">
          {word.chinese}
        </div>

        <p className="mt-2 text-neutral-600">
          {word.example}
        </p>
      </div>

      <Link
        href="/vocabulary"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
      >
        <BookOpen size={16}/>
        Learn More
      </Link>

    </section>
  );
}
