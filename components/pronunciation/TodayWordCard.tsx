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
import {
  speakText,
  stopSpeech,
} from "@/lib/pronunciation/playback";
import { getPronunciationData } from "@/lib/pronunciation";

import useTranslation from "@/hooks/i18n/useTranslation";

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
  const { t } = useTranslation();
  const { lesson, loading } = useTodayLesson();

  const [pronunciation, setPronunciation] =
    useState<PronunciationResult | null>(null);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (!lesson) {
      setPronunciation(null);
      return;
    }

    let active = true;

    const english = lesson.item.word?.trim() ?? "";
    const chinese = lesson.item.translation?.trim() ?? "";

    if (!english || !chinese) {
      setPronunciation(null);
      return;
    }

    async function loadPronunciation() {
      setPronunciation(null);

      const result = await getPronunciation(
        english,
        chinese,
      );

      if (!active || !result) return;

      setPronunciation(result);
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

  const localizedReasonLabel =
    reasonLabel === "Continue learning"
      ? t.home.todayWord.continueLearning
      : reasonLabel;

  const word = item.word?.trim() || "Untitled word";

  const translation =
    item.translation?.trim() || "No translation yet";

  const localPronunciation = getPronunciationData({
    english: word,
    chinese: translation,
  });

  const example = item.example_sentence?.trim();

  const translatedExample =
    item.translated_example?.trim();

  const englishPronunciation =
    pronunciation?.englishPronunciation?.trim() ||
    localPronunciation.english;

  const zhuyin =
    pronunciation?.zhuyin?.trim() ||
    localPronunciation.zhuyin;

  return (
    <section className="rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            {t.home.todayWord.title}
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {word}
          </h2>
        </div>

        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
          {localizedReasonLabel}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => speakText(word, "en-US")}
          className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 text-left transition hover:bg-neutral-50"
        >
          <div>
            <div className="text-sm text-neutral-500">
              {t.home.todayWord.englishPronunciation}
            </div>

            <div className="font-semibold">
              {englishPronunciation || "Tap to listen"}
            </div>
          </div>

          <Volume2 size={18} />
        </button>

        <button
          type="button"
          onClick={() => speakText(translation, "zh-TW")}
          className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 text-left transition hover:bg-neutral-50"
        >
          <div>
            <div className="text-sm text-neutral-500">
              {t.home.todayWord.zhuyin}
            </div>

            <div className="font-zhuyin font-semibold tracking-[0.02em]">
              {zhuyin || translation}
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
            {t.home.todayWord.example}
          </p>

          <div className="mt-3 space-y-2">
            {example && (
              <div className="flex items-start justify-between gap-4 rounded-xl bg-white px-4 py-3">
                <p className="min-w-0 font-medium leading-6 text-neutral-900">
                  {example}
                </p>

                <button
                  type="button"
                  onClick={() => speakText(example, "en-US")}
                  aria-label="Play English example"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 transition hover:bg-neutral-100 active:scale-95"
                >
                  <Volume2 size={16} />
                </button>
              </div>
            )}

            {translatedExample && (
              <div className="flex items-start justify-between gap-4 rounded-xl bg-white px-4 py-3">
                <p className="min-w-0 text-sm leading-6 text-neutral-600">
                  {translatedExample}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    speakText(translatedExample, "zh-TW")
                  }
                  aria-label="播放中文例句"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 transition hover:bg-neutral-100 active:scale-95"
                >
                  <Volume2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Link
        href={`/vocabulary/${item.id}?from=home`}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        <BookOpen size={16} />
        {t.home.todayWord.continueLearning}
      </Link>
    </section>
  );
}
