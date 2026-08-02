"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import Screen from "@/components/foundation/layout/Screen";
import {
  englishSounds,
  type EnglishCategory,
} from "@/lib/pronunciation/englishSounds";
import {
  zhuyinSounds,
  type ZhuyinCategory,
} from "@/lib/pronunciation/zhuyinSounds";
import { speak } from "@/lib/speech";

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M4 9.5h3.2L11 6v12l-3.8-3.5H4v-5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 9a3.5 3.5 0 010 6" strokeLinecap="round" />
    </svg>
  );
}

type Mode = "english" | "zhuyin";

const ENGLISH_FILTERS: { value: "all" | EnglishCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "vowel", label: "Vowels" },
  { value: "consonant", label: "Consonants" },
];

const ZHUYIN_FILTERS: { value: "all" | ZhuyinCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "initial", label: "Initials" },
  { value: "medial", label: "Medials" },
  { value: "final", label: "Finals" },
];

function zhuyinCategoryLabel(category: ZhuyinCategory) {
  if (category === "initial") return "Initials";
  if (category === "medial") return "Medials";
  return "Finals";
}

export default function PronunciationLabPage() {
  const [mode, setMode] = useState<Mode>("english");
  const [englishFilter, setEnglishFilter] = useState<"all" | EnglishCategory>(
    "all",
  );
  const [zhuyinFilter, setZhuyinFilter] = useState<"all" | ZhuyinCategory>(
    "all",
  );

  const filteredEnglish = useMemo(
    () =>
      englishSounds.filter(
        (sound) => englishFilter === "all" || sound.category === englishFilter,
      ),
    [englishFilter],
  );

  const filteredZhuyin = useMemo(
    () =>
      zhuyinSounds.filter(
        (sound) => zhuyinFilter === "all" || sound.category === zhuyinFilter,
      ),
    [zhuyinFilter],
  );

  return (
    <Screen>
      <div
        className="px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
      >
        <Link
          href="/"
          aria-label="Back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.04]"
        >
          <BackIcon />
        </Link>

        <h1 className="mt-3 text-[26px] font-bold tracking-[-0.02em]">
          Pronunciation Lab
        </h1>
        <p className="mt-1 text-black/50">
          Tap any speaker to hear the pronunciation.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-line bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("english")}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
              mode === "english" ? "bg-black text-white" : "text-black/50"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setMode("zhuyin")}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
              mode === "zhuyin" ? "bg-black text-white" : "text-black/50"
            }`}
          >
            Zhuyin
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(mode === "english" ? ENGLISH_FILTERS : ZHUYIN_FILTERS).map(
            (filter) => {
              const active =
                mode === "english"
                  ? englishFilter === filter.value
                  : zhuyinFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    mode === "english"
                      ? setEnglishFilter(filter.value as "all" | EnglishCategory)
                      : setZhuyinFilter(filter.value as "all" | ZhuyinCategory)
                  }
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-line bg-white text-black/60"
                  }`}
                >
                  {filter.label}
                </button>
              );
            },
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
        {mode === "english"
          ? filteredEnglish.map((sound) => (
              <div
                key={sound.id}
                className="rounded-[24px] border border-line bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-base font-bold text-white">
                      {sound.symbol}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">
                        {sound.category === "vowel" ? "Vowels" : "Consonants"}
                      </p>
                      <p className="font-bold">{sound.title}</p>
                      <p className="text-xs text-black/40">{sound.ipa}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => speak(sound.soundText, "en-US")}
                    aria-label={`Listen to ${sound.title}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line"
                  >
                    <SpeakerIcon />
                  </button>
                </div>

                <div className="mt-4 rounded-2xl bg-surface p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40">
                    How to say it
                  </p>
                  <p className="mt-1 text-sm leading-6 text-black/70">
                    {sound.tip}
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {sound.examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => speak(example, "en-US")}
                      className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-2.5 text-left text-sm font-medium"
                    >
                      {example}
                      <SpeakerIcon />
                    </button>
                  ))}
                </div>
              </div>
            ))
          : filteredZhuyin.map((sound) => (
              <div
                key={sound.id}
                className="rounded-[24px] border border-line bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-base font-bold text-white">
                      {sound.symbol}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">
                        {zhuyinCategoryLabel(sound.category)}
                      </p>
                      <p className="font-bold">{sound.title}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => speak(sound.soundText, "zh-TW")}
                    aria-label={`Listen to ${sound.title}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line"
                  >
                    <SpeakerIcon />
                  </button>
                </div>

                <div className="mt-4 rounded-2xl bg-surface p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40">
                    Pronunciation guide
                  </p>
                  <p className="mt-1 text-sm leading-6 text-black/70">
                    {sound.tip}
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {sound.examples.map((example) => (
                    <button
                      key={example.word}
                      type="button"
                      onClick={() => speak(example.word, "zh-TW")}
                      className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-2.5 text-left text-sm font-medium"
                    >
                      <span>
                        {example.word}
                        <span className="ml-2 text-xs text-black/40">
                          {example.zhuyin}
                        </span>
                      </span>
                      <SpeakerIcon />
                    </button>
                  ))}
                </div>

                {sound.commonMistake && (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
                      Common pronunciation trap: {sound.symbol} vs{" "}
                      {sound.commonMistake.confusedWith}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      {sound.commonMistake.explanation}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-white px-3 py-2 text-xs">
                        <p className="font-semibold text-emerald-700">
                          Correct: {sound.symbol}
                        </p>
                        <p className="mt-0.5">
                          {sound.commonMistake.pair.correct.word}{" "}
                          {sound.commonMistake.pair.correct.zhuyin}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 text-xs">
                        <p className="font-semibold text-red-700">
                          Common mistake: {sound.commonMistake.confusedWith}
                        </p>
                        <p className="mt-0.5">
                          {sound.commonMistake.pair.confused.word}{" "}
                          {sound.commonMistake.pair.confused.zhuyin}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
      </div>
    </Screen>
  );
}
