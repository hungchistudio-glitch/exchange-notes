"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Languages,
  Volume2,
} from "lucide-react";

import {
  englishSounds,
  type EnglishSound,
} from "@/lib/pronunciation/englishSounds";
import {
  zhuyinSounds,
  type ZhuyinSound,
} from "@/lib/pronunciation/zhuyinSounds";
import {
  speakText,
  stopSpeech,
} from "@/lib/pronunciation/speech";
import { playAudio } from "@/lib/pronunciation/playAudio";

type LabMode = "english" | "zhuyin";
type Category =
  | "all"
  | "vowel"
  | "consonant"
  | "initial"
  | "medial"
  | "final";

const englishFilters: Array<{
  id: Category;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "vowel", label: "Vowels" },
  { id: "consonant", label: "Consonants" },
];

const zhuyinFilters: Array<{
  id: Category;
  label: string;
}> = [
  { id: "all", label: "全部" },
  { id: "initial", label: "聲母" },
  { id: "medial", label: "介音" },
  { id: "final", label: "韻母" },
];

function SpeakerButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white transition hover:bg-neutral-100 active:scale-95"
    >
      <Volume2 size={17} />
    </button>
  );
}

function EnglishCard({
  sound,
}: {
  sound: EnglishSound;
}) {
  return (
    <article className="rounded-[26px] border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-lg font-bold text-white">
            {sound.symbol}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              {sound.category}
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              {sound.title}
            </h2>

            <p className="mt-1 font-mono text-sm text-neutral-500">
              {sound.ipa}
            </p>
          </div>
        </div>

        <SpeakerButton
          label={`Play ${sound.anchor}`}
          onClick={() =>
            speakText(sound.anchor, "en-US")
          }
        />
      </div>

      <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          How to say it
        </p>

        <p className="mt-2 text-sm leading-6 text-neutral-700">
          {sound.tip}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {sound.examples.map((example) => (
          <div
            key={`${sound.id}-${example}`}
            className="flex items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3"
          >
            <span className="font-medium">
              {example}
            </span>

            <SpeakerButton
              label={`Play ${example}`}
              onClick={() =>
                speakText(example, "en-US")
              }
            />
          </div>
        ))}
      </div>
    </article>
  );
}

function ZhuyinCard({
  sound,
}: {
  sound: ZhuyinSound;
}) {
  return (
    <article className="rounded-[26px] border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-2xl font-bold text-white">
            {sound.symbol}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              {sound.category === "initial"
                ? "聲母"
                : sound.category === "medial"
                  ? "介音"
                  : "韻母"}
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              {sound.title}
            </h2>
          </div>
        </div>

        <SpeakerButton
          label={`播放${sound.anchor}`}
          onClick={() =>
            speakText(sound.anchor, "zh-TW")
          }
        />
      </div>

      <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          發音方式
        </p>

        <p className="mt-2 text-sm leading-6 text-neutral-700">
          {sound.tip}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {sound.examples.map((example) => (
          <div
            key={`${sound.id}-${example.word}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 px-4 py-3"
          >
            <div>
              <p className="font-medium">
                {example.word}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                {example.zhuyin}
              </p>
            </div>

            <SpeakerButton
              label={`播放${example.word}`}
              onClick={() =>
                speakText(example.word, "zh-TW")
              }
            />
          </div>
        ))}
      </div>
    </article>
  );
}

export default function PronunciationPage() {
  const [mode, setMode] =
    useState<LabMode>("english");

  const [category, setCategory] =
    useState<Category>("all");

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const englishResults = useMemo(() => {
    if (category === "all") {
      return englishSounds;
    }

    return englishSounds.filter(
      (sound) => sound.category === category,
    );
  }, [category]);

  const zhuyinResults = useMemo(() => {
    if (category === "all") {
      return zhuyinSounds;
    }

    return zhuyinSounds.filter(
      (sound) => sound.category === category,
    );
  }, [category]);

  function changeMode(nextMode: LabMode) {
    stopSpeech();
    setMode(nextMode);
    setCategory("all");
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 pb-28 pt-5 text-neutral-950">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <Link
            href="/home"
            onClick={stopSpeech}
            aria-label="Back to home"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-200"
          >
            <ArrowLeft size={21} />
          </Link>

          <div className="mt-5">
            <h1 className="text-3xl font-bold tracking-tight">
              Pronunciation Lab
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              Tap any speaker to hear that word.
            </p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-neutral-200 p-1">
          <button
            type="button"
            onClick={() => changeMode("english")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === "english"
                ? "bg-white text-black shadow-sm"
                : "text-neutral-500"
            }`}
          >
            English
          </button>

          <button
            type="button"
            onClick={() => changeMode("zhuyin")}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === "zhuyin"
                ? "bg-white text-black shadow-sm"
                : "text-neutral-500"
            }`}
          >
            <Languages size={16} />
            注音
          </button>
        </section>

        <section className="mt-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(mode === "english"
              ? englishFilters
              : zhuyinFilters
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  stopSpeech();
                  setCategory(filter.id);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  category === filter.id
                    ? "bg-black text-white"
                    : "border border-neutral-200 bg-white text-neutral-600"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {mode === "english"
              ? englishResults.map((sound) => (
                  <EnglishCard
                    key={sound.id}
                    sound={sound}
                  />
                ))
              : zhuyinResults.map((sound) => (
                  <ZhuyinCard
                    key={sound.id}
                    sound={sound}
                  />
                ))}
          </div>
        </section>
      </div>
    </main>
  );
}
