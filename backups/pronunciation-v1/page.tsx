"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
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

type LabMode = "english" | "zhuyin";

function speak(text: string, language: "en-US" | "zh-TW") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 0.82;

  window.speechSynthesis.speak(utterance);
}

function EnglishSoundPanel({ sound }: { sound: EnglishSound }) {
  return (
    <article className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-xl font-semibold text-white">
            {sound.symbol}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              {sound.category}
            </p>

            <h2 className="mt-1 text-lg font-semibold text-neutral-950">
              {sound.title}
            </h2>

            <p className="mt-1 font-mono text-sm text-neutral-500">
              {sound.ipa}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => speak(sound.examples[0], "en-US")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white transition hover:bg-neutral-100"
          aria-label={`Play ${sound.title}`}
        >
          <Volume2 size={19} />
        </button>
      </div>

      <p className="mt-5 text-sm leading-6 text-neutral-600">
        {sound.description}
      </p>

      <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Mouth position
        </p>

        <p className="mt-2 text-sm leading-6 text-neutral-700">
          {sound.mouthTip}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {sound.examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => speak(example, "en-US")}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
          >
            <Volume2 size={14} />
            {example}
          </button>
        ))}
      </div>
    </article>
  );
}

function ZhuyinSoundPanel({ sound }: { sound: ZhuyinSound }) {
  return (
    <article className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-2xl font-semibold text-white">
            {sound.symbol}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              {sound.category}
            </p>

            <h2 className="mt-1 text-lg font-semibold text-neutral-950">
              {sound.title}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => speak(sound.examples[0].word, "zh-TW")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white transition hover:bg-neutral-100"
          aria-label={`播放 ${sound.symbol}`}
        >
          <Volume2 size={19} />
        </button>
      </div>

      <p className="mt-5 text-sm leading-6 text-neutral-600">
        {sound.description}
      </p>

      <div className="mt-5 space-y-2">
        {sound.examples.map((example) => (
          <button
            key={`${sound.id}-${example.word}`}
            type="button"
            onClick={() => speak(example.word, "zh-TW")}
            className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 text-left transition hover:border-neutral-400 hover:bg-neutral-50"
          >
            <span>
              <span className="block font-medium text-neutral-900">
                {example.word}
              </span>

              <span className="mt-1 block text-sm text-neutral-500">
                {example.zhuyin}
              </span>
            </span>

            <Volume2 size={17} className="shrink-0 text-neutral-500" />
          </button>
        ))}
      </div>
    </article>
  );
}

export default function PronunciationPage() {
  const [mode, setMode] = useState<LabMode>("english");
  const [category, setCategory] = useState<string>("all");

  const filteredEnglishSounds = useMemo(() => {
    if (category === "all") {
      return englishSounds;
    }

    return englishSounds.filter(
      (sound) => sound.category === category,
    );
  }, [category]);

  const filteredZhuyinSounds = useMemo(() => {
    if (category === "all") {
      return zhuyinSounds;
    }

    return zhuyinSounds.filter(
      (sound) => sound.category === category,
    );
  }, [category]);

  function changeMode(nextMode: LabMode) {
    setMode(nextMode);
    setCategory("all");
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 pb-28 pt-5 text-neutral-950">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <Link
            href="/home"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-200"
            aria-label="Back to home"
          >
            <ArrowLeft size={21} />
          </Link>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Learn every sound
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Pronunciation Lab
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
              Listen carefully, study the mouth position, and repeat each
              sound using practical English and Traditional Chinese examples.
            </p>
          </div>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-neutral-200 p-1">
          <button
            type="button"
            onClick={() => changeMode("english")}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === "english"
                ? "bg-white text-black shadow-sm"
                : "text-neutral-500"
            }`}
          >
            <BookOpen size={17} />
            English Sounds
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
            <Languages size={17} />
            Zhuyin Sounds
          </button>
        </section>

        {mode === "english" ? (
          <section className="mt-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: "all", label: "All sounds" },
                { id: "vowel", label: "Vowels" },
                { id: "consonant", label: "Consonants" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    category === item.id
                      ? "bg-black text-white"
                      : "border border-neutral-200 bg-white text-neutral-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {filteredEnglishSounds.map((sound) => (
                <EnglishSoundPanel key={sound.id} sound={sound} />
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: "all", label: "全部" },
                { id: "initial", label: "聲母" },
                { id: "medial", label: "介音" },
                { id: "final", label: "韻母" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    category === item.id
                      ? "bg-black text-white"
                      : "border border-neutral-200 bg-white text-neutral-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {filteredZhuyinSounds.map((sound) => (
                <ZhuyinSoundPanel key={sound.id} sound={sound} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
