"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Languages } from "lucide-react";

import SpeakerButton from "@/components/foundation/audio/SpeakerButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  englishSounds,
  type EnglishSound,
} from "@/lib/pronunciation/englishSounds";
import {
  zhuyinSounds,
  type ZhuyinSound,
} from "@/lib/pronunciation/zhuyinSounds";
import { speakText, stopSpeech } from "@/lib/pronunciation/playback";

type LabMode = "english" | "zhuyin";
type Category =
  | "all"
  | "vowel"
  | "consonant"
  | "initial"
  | "medial"
  | "final";

const englishFilterIds: Category[] = [
  "all",
  "vowel",
  "consonant",
];

const zhuyinFilterIds: Category[] = [
  "all",
  "initial",
  "medial",
  "final",
];

function formatLabel(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, value),
    template,
  );
}

function EnglishCard({
  sound,
  categoryLabel,
  howToSayIt,
  playSoundLabel,
  playWordLabel,
}: {
  sound: EnglishSound;
  categoryLabel: string;
  howToSayIt: string;
  playSoundLabel: string;
  playWordLabel: string;
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
              {categoryLabel}
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
          label={formatLabel(playSoundLabel, {
            symbol: sound.symbol,
          })}
          onClick={() =>
            speakText(sound.soundText, "en-US")
          }
        />
      </div>

      <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {howToSayIt}
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
            <span className="font-medium">{example}</span>

            <SpeakerButton
              label={formatLabel(playWordLabel, {
                word: example,
              })}
              onClick={() => speakText(example, "en-US")}
            />
          </div>
        ))}
      </div>
    </article>
  );
}

function ZhuyinCard({
  sound,
  categoryLabel,
  pronunciationMethod,
  playSoundLabel,
  playWordLabel,
  commonMistakeLabel,
  correctLabel,
  incorrectLabel,
}: {
  sound: ZhuyinSound;
  categoryLabel: string;
  pronunciationMethod: string;
  playSoundLabel: string;
  playWordLabel: string;
  commonMistakeLabel: string;
  correctLabel: string;
  incorrectLabel: string;
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
              {categoryLabel}
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              {sound.title}
            </h2>
          </div>
        </div>

        <SpeakerButton
          label={formatLabel(playSoundLabel, {
            symbol: sound.symbol,
          })}
          onClick={() =>
            speakText(sound.soundText, "zh-TW")
          }
        />
      </div>

      <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {pronunciationMethod}
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
              <p className="font-medium">{example.word}</p>

              <p className="mt-1 text-sm text-neutral-500">
                {example.zhuyin}
              </p>
            </div>

            <SpeakerButton
              label={formatLabel(playWordLabel, {
                word: example.word,
              })}
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
            {commonMistakeLabel}: {sound.symbol} vs{" "}
            {sound.commonMistake.confusedWith}
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-200">
            {sound.commonMistake.explanation}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-neutral-400">
                {correctLabel}: {sound.symbol}
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
                  label={formatLabel(playWordLabel, {
                    word: sound.commonMistake.pair.correct.word,
                  })}
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
                {incorrectLabel}:{" "}
                {sound.commonMistake.confusedWith}
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
                  label={formatLabel(playWordLabel, {
                    word: sound.commonMistake.pair.confused.word,
                  })}
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
  const { t } = useTranslation();

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

  const filterLabels: Record<Category, string> = {
    all: t.pronunciation.filters.all,
    vowel: t.pronunciation.filters.vowels,
    consonant: t.pronunciation.filters.consonants,
    initial: t.pronunciation.filters.initial,
    medial: t.pronunciation.filters.medial,
    final: t.pronunciation.filters.final,
  };

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
            aria-label={t.pronunciation.backHome}
            title={t.pronunciation.backHome}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-200"
          >
            <ArrowLeft size={21} />
          </Link>

          <div className="mt-5">
            <h1 className="text-3xl font-bold tracking-tight">
              {t.pronunciation.title}
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              {t.pronunciation.subtitle}
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
            {t.pronunciation.modes.english}
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
            {t.pronunciation.modes.zhuyin}
          </button>
        </section>

        <section className="mt-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(mode === "english"
              ? englishFilterIds
              : zhuyinFilterIds
            ).map((filterId) => (
              <button
                key={filterId}
                type="button"
                onClick={() => {
                  stopSpeech();
                  setCategory(filterId);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  category === filterId
                    ? "bg-black text-white"
                    : "border border-neutral-200 bg-white text-neutral-600"
                }`}
              >
                {filterLabels[filterId]}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {mode === "english"
              ? englishResults.map((sound) => (
                  <EnglishCard
                    key={sound.id}
                    sound={sound}
                    categoryLabel={
                      filterLabels[sound.category]
                    }
                    howToSayIt={
                      t.pronunciation.cards.howToSayIt
                    }
                    playSoundLabel={
                      t.pronunciation.cards.playSound
                    }
                    playWordLabel={
                      t.pronunciation.cards.playWord
                    }
                  />
                ))
              : zhuyinResults.map((sound) => (
                  <ZhuyinCard
                    key={sound.id}
                    sound={sound}
                    categoryLabel={
                      filterLabels[sound.category]
                    }
                    pronunciationMethod={
                      t.pronunciation.cards
                        .pronunciationMethod
                    }
                    playSoundLabel={
                      t.pronunciation.cards.playSound
                    }
                    playWordLabel={
                      t.pronunciation.cards.playWord
                    }
                    commonMistakeLabel={
                      t.pronunciation.cards.commonMistake
                    }
                    correctLabel={
                      t.pronunciation.cards.correct
                    }
                    incorrectLabel={
                      t.pronunciation.cards.incorrect
                    }
                  />
                ))}
          </div>
        </section>
      </div>
    </main>
  );
}
