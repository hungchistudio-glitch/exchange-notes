"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Volume2,
} from "lucide-react";

import { useTodayLesson } from "@/hooks/useTodayLesson";
import {
  getPronunciation,
  type PronunciationResult,
} from "@/lib/pronunciation/getPronunciation";

function speak(text: string, lang: "en-US" | "zh-TW") {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.82;

  window.speechSynthesis.speak(utterance);
}

function LoadingCard() {
  return (
    <section className="animate-pulse rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="h-3 w-24 rounded bg-neutral-200" />
      <div className="mt-4 h-9 w-44 rounded bg-neutral-200" />

      <div className="mt-6 space-y-3">
        <div className="h-16 rounded-2xl bg-neutral-100" />
        <div className="h-16 rounded-2xl bg-neutral-100" />
      </div>

      <div className="mt-5 h-5 w-28 rounded bg-neutral-200" />
      <div className="mt-3 h-4 w-full rounded bg-neutral-100" />
    </section>
  );
}

function EmptyCard() {
  return (
    <section className="rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        Today&apos;s Word
      </p>

      <h2 className="mt-3 text-2xl font-bold">
        Start your first lesson
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600">
        Add a vocabulary word and Exchange Notes will choose a daily
        lesson for you.
      </p>

      <Link
        href="/vocabulary/new"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
      >
        <Plus size={16} />
        Add a word
      </Link>
    </section>
  );
}

export default function TodayWordCard() {
  const { lesson, loading } = useTodayLesson();

  const [pronunciation, setPronunciation] =
    useState<PronunciationResult | null>(null);

  const [pronunciationLoading, setPronunciationLoading] =
    useState(false);

  useEffect(() => {
    if (!lesson) {
      setPronunciation(null);
      setPronunciationLoading(false);
      return;
    }

    let active = true;

    const english = lesson.item.word?.trim() ?? "";
    const chinese = lesson.item.translation?.trim() ?? "";

    if (!english || !chinese) {
      setPronunciation(null);
      setPronunciationLoading(false);
      return;
    }

    async function loadPronunciation() {
      setPronunciation(null);
      setPronunciationLoading(true);

      const result = await getPronunciation(
        english,
        chinese,
      );

      if (!active) return;

      setPronunciation(result);
      setPronunciationLoading(false);
    }

    loadPronunciation();

    return () => {
      active = false;
    };
  }, [lesson]);

  if (loading) {
    return <LoadingCard />;
  }

  if (!lesson) {
    return <EmptyCard />;
  }

  const { item, reasonLabel } = lesson;

  const word = item.word?.trim() || "Untitled word";

  const translation =
    item.translation?.trim() || "No translation yet";

  const example = item.example_sentence?.trim();

  const translatedExample =
    item.translated_example?.trim();

  const englishPronunciation =
    pronunciation?.englishPronunciation?.trim();

  const zhuyin = pronunciation?.zhuyin?.trim();

  return (
    <section className="rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Today&apos;s Word
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {word}
          </h2>
        </div>

        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
          {reasonLabel}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => speak(word, "en-US")}
          className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 text-left transition hover:bg-neutral-50"
        >
          <div>
            <div className="text-sm text-neutral-500">
              English pronunciation
            </div>

            <div className="font-semibold">
              {pronunciationLoading
                ? "Loading pronunciation..."
                : englishPronunciation || "Tap to listen"}
            </div>
          </div>

          <Volume2 size={18} />
        </button>

        <button
          type="button"
          onClick={() => speak(translation, "zh-TW")}
          className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 text-left transition hover:bg-neutral-50"
        >
          <div>
            <div className="text-sm text-neutral-500">
              Zhuyin
            </div>

            <div className="font-semibold">
              {pronunciationLoading
                ? "Loading Zhuyin..."
                : zhuyin || translation}
            </div>

            {zhuyin && (
              <div className="mt-1 text-sm text-neutral-500">
                {translation}
              </div>
            )}
          </div>

          <Volume2 size={18} />
        </button>
      </div>

      {(example || translatedExample) && (
        <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Example
          </p>

          {example && (
            <p className="mt-2 font-medium text-neutral-900">
              {example}
            </p>
          )}

          {translatedExample && (
            <p className="mt-1 text-sm leading-6 text-neutral-600">
              {translatedExample}
            </p>
          )}
        </div>
      )}

      <Link
        href={`/vocabulary/${item.id}`}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        <BookOpen size={16} />
        Learn more
      </Link>
    </section>
  );
}
