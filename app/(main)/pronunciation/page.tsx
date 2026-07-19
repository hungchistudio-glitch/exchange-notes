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
  playAudio,
  speakText,
  stopSpeech,
} from "@/lib/pronunciation/playback";

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
  variant = "light",
}: {
  label: string;
  onClick: () => void;
  variant?: "light" | "dark";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
        variant === "dark"
          ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
          : "border-neutral-200 bg-white hover:bg-neutral-100"
      }`}
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

        {/* 這顆喇叭永遠播放 sound.anchor（獨立示範詞），
            跟下方例字的發音是不同的內容，不會混淆。 */}
        <SpeakerButton
          label={`Play the ${sound.symbol} sound`}
          onClick={() =>
            speakText(sound.soundText, "en-US")
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
  const categoryLabel =
    sound.category === "initial"
      ? "聲母"
      : sound.category === "medial"
        ? "介音"
        : "韻母";

  return (
    <article className="rounded-[26px] border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-2xl font-bold text-white">
            {sound.symbol}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              {categoryLabel}
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              {sound.title}
            </h2>
          </div>
        </div>

        {/* 這顆喇叭永遠播放 sound.soundText（呼讀音，如「佛」），
            跟下方例字的發音是不同的內容，不會混淆。 */}
        <SpeakerButton
          label={`播放注音 ${sound.symbol}`}
          onClick={() =>
            speakText(sound.soundText, "zh-TW")
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

      {sound.commonMistake && (
        <div className="mt-4 rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            常見發音陷阱：{sound.symbol} vs {sound.commonMistake.confusedWith}
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-200">
            {sound.commonMistake.explanation}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-neutral-400">
                正確：{sound.symbol}
              </p>

              <div className="mt-1 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-white">
                    {sound.commonMistake.pair.correct.word}
                  </p>

                  <p className="text-xs text-neutral-400">
                    {sound.commonMistake.pair.correct.zhuyin}
                  </p>
                </div>

                <SpeakerButton
                  variant="dark"
                  label={`播放${sound.commonMistake.pair.correct.word}`}
                  onClick={() =>
                    speakText(
                      sound.commonMistake!.pair.correct.word,
                      "zh-TW",
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-neutral-400">
                常見誤發：{sound.commonMistake.confusedWith}
              </p>

              <div className="mt-1 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-white">
                    {sound.commonMistake.pair.confused.word}
                  </p>

                  <p className="text-xs text-neutral-400">
                    {sound.commonMistake.pair.confused.zhuyin}
                  </p>
                </div>

                <SpeakerButton
                  variant="dark"
                  label={`播放${sound.commonMistake.pair.confused.word}`}
                  onClick={() =>
                    speakText(
                      sound.commonMistake!.pair.confused.word,
                      "zh-TW",
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
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
