"use client";

import { useCallback, useEffect, useState } from "react";

import AudioButton from "@/components/pronunciation/lab/AudioButton";
import LabScreen from "@/components/pronunciation/lab/LabScreen";
import { MasteryDot } from "@/components/pronunciation/lab/SoundTile";
import { LabEmpty } from "@/components/pronunciation/lab/StateViews";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import usePronunciationPlayback from "@/hooks/pronunciation/usePronunciationPlayback";
import { fill } from "@/lib/i18n/format";
import { heteronymsFor, type Heteronym, type HeteronymReading } from "@/lib/pronunciation/heteronyms";
import type { AudioSource } from "@/lib/pronunciation/lab/audio";
import { localize } from "@/lib/pronunciation/localizedText";
import type { YumiAnimationState } from "@/lib/pronunciation/yumiRig";

/* =========================================================
   One spelling, several readings — the Lab's seventh module

   Each listed word with its readings side by side; tapping one plays a
   phrase that can only be read that way, and Yumi goes through it over its
   trace, so the difference — a tone, a moved stress, an open or closed
   vowel — is seen as well as heard (Chi, 2026-10-19: "新模組：對照＋聽力
   測驗"). "Hear them in turn" plays them one after another to compare.

   Then "Listen and choose": a phrase is played without its text, and the
   reader says which reading it was. Each answer is a listening attempt on
   heteronym:<word>, filed under "listen" — the database's own module
   (AttemptModule) — so the word's mastery dot fills in as it is learned.
   ========================================================= */

const GAP_MS = 450;
/** Questions in a round. */
const ROUND = 5;

type Question = { heteronym: Heteronym; answer: number };

/** A round: different words, a random reading of each. */
function buildRound(words: readonly Heteronym[]): Question[] {
  const pool = [...words];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, ROUND).map((heteronym) => ({
    heteronym,
    answer: Math.floor(Math.random() * heteronym.readings.length),
  }));
}

function progressKey(heteronym: Heteronym): string {
  return `heteronym:${heteronym.word}`;
}

export default function ReadingsModule() {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.pronunciation.lab.readings;
  const { pack, progress, recordAttempt } = usePronunciationLab();
  const playback = usePronunciationPlayback();
  const words = heteronymsFor(pack.language);
  const [mode, setMode] = useState<"compare" | "quiz">("compare");

  /* The round, built after mount: it is random, and a client component
     still renders once on the server (see ListenModule). */
  const [round, setRound] = useState<Question[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setRound(buildRound(heteronymsFor(pack.language))));
  }, [pack.language]);

  const sourceFor = useCallback(
    (reading: HeteronymReading): AudioSource => ({
      kind: "speech",
      text: reading.example,
      language: pack.language,
      hint: { phonetic: reading.examplePhonetic },
    }),
    [pack.language],
  );

  const question = round?.[current];
  const finished = round !== null && current >= round.length;

  /* Played from the tap that asks for it: a voice started without one is
     refused on a phone. */
  const hear = (at: number) => {
    const asked = round?.[at];
    if (!asked) return;
    playback.play(`quiz-${at}`, sourceFor(asked.heteronym.readings[asked.answer]));
  };

  const answer = (index: number) => {
    if (!question || chosen !== null) return;
    setChosen(index);
    const correct = index === question.answer;
    if (correct) setScore((value) => value + 1);
    void recordAttempt({
      unitId: progressKey(question.heteronym),
      module: "listen",
      outcome: correct ? "correct" : "incorrect",
      // Right or wrong, not a percentage, as in Listen.
      listeningScore: correct ? 100 : 0,
    });
  };

  const next = () => {
    const following = current + 1;
    setCurrent(following);
    setChosen(null);
    hear(following);
  };

  const again = () => {
    const fresh = buildRound(words);
    setRound(fresh);
    setCurrent(0);
    setChosen(null);
    setScore(0);
    playback.play("quiz-0", sourceFor(fresh[0].heteronym.readings[fresh[0].answer]));
  };

  const coachState: YumiAnimationState =
    mode === "quiz" && question && chosen !== null
      ? chosen === question.answer
        ? "correct"
        : "incorrect"
      : mode === "quiz" && question
        ? "listening"
        : "idle";

  const tab = (value: "compare" | "quiz", label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => {
        setMode(value);
        if (value === "quiz" && round && !finished && chosen === null) hear(current);
      }}
      className={`font-cjk min-h-[40px] flex-1 rounded-full px-4 text-[0.8125rem] font-semibold transition-colors ${
        mode === value ? "bg-black text-white" : "text-ink-soft hover:text-black"
      }`}
    >
      {label}
    </button>
  );

  return (
    <LabScreen
      title={copy.title}
      eyebrow={pack.displayName}
      subtitle={copy.subtitle}
      backHref="/pronunciation"
      backLabel={t.pronunciation.lab.backToLab}
    >
      <div className="space-y-5 pb-8">
        <YumiCoach pack={pack} state={coachState} size={92} />

        {words.length > 0 ? (
          <div className="flex gap-1 rounded-full border border-line bg-white p-1">
            {tab("compare", copy.compare)}
            {tab("quiz", copy.quiz)}
          </div>
        ) : null}

        {words.length === 0 ? (
          <LabEmpty title={copy.empty} />
        ) : mode === "quiz" ? (
          finished ? (
            <section className="rounded-3xl border border-black/[0.06] bg-white p-5 text-center">
              <p className="font-cjk text-[1.0625rem] font-semibold">
                {fill(copy.result, { correct: score, total: round?.length ?? 0 })}
              </p>
              <button
                type="button"
                onClick={again}
                className="font-cjk mt-4 inline-flex min-h-[44px] items-center rounded-full bg-black px-6 text-sm font-semibold text-white"
              >
                {copy.again}
              </button>
            </section>
          ) : question ? (
            <section
              aria-label={copy.quiz}
              className="rounded-3xl border border-black/[0.06] bg-white p-5"
              data-quiz-question={current}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-cjk text-[0.9375rem] font-semibold">{copy.question}</p>
                <span className="text-xs text-ink-faint">
                  {current + 1} / {round?.length ?? 0}
                </span>
              </div>

              <AudioButton
                label={copy.listenAgain}
                failedLabel={t.pronunciation.cards.playbackFailed}
                phase={playback.phaseFor(`quiz-${current}`)}
                onClick={() => hear(current)}
                className="mt-3"
              />

              <ul className="mt-4 grid gap-2">
                {question.heteronym.readings.map((reading, index) => {
                  const revealed = chosen !== null;
                  const right = revealed && index === question.answer;
                  const wrong = revealed && index === chosen && index !== question.answer;
                  return (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => answer(index)}
                        disabled={revealed}
                        data-answer={right ? "right" : wrong ? "wrong" : undefined}
                        className={`flex min-h-[52px] w-full flex-wrap items-baseline gap-x-2 rounded-2xl px-4 py-3 text-left ring-1 transition-colors ${
                          right
                            ? "bg-emerald-50 ring-emerald-300"
                            : wrong
                              ? "bg-red-50 ring-red-200"
                              : "bg-surface ring-black/[0.05] hover:bg-black/[0.03]"
                        }`}
                      >
                        {reading.spelling ? (
                          <span className="font-semibold" lang={pack.language}>{reading.spelling}</span>
                        ) : null}
                        <span className={pack.language === "zh-TW" ? "font-zhuyin" : "font-phonetic"}>
                          {reading.phonetic}
                        </span>
                        <span className="font-cjk text-[0.8125rem] text-ink-soft">
                          {localize(reading.meaning, interfaceLanguage)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {chosen !== null ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
                  <p className="font-cjk text-[0.875rem] text-ink-strong">
                    {fill(chosen === question.answer ? copy.correct : copy.incorrect, {
                      example: question.heteronym.readings[question.answer].example,
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={next}
                    className="font-cjk inline-flex min-h-[44px] items-center rounded-full bg-black px-5 text-sm font-semibold text-white"
                  >
                    {copy.next}
                  </button>
                </div>
              ) : null}
            </section>
          ) : null
        ) : (
          <ul className="space-y-3">
            {words.map((heteronym) => {
              const mastery = progress[`heteronym:${heteronym.word}`]?.mastery ?? "new";
              const allKey = `all-${heteronym.word}`;
              return (
                <li key={heteronym.word} className="rounded-3xl border border-black/[0.06] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2">
                      <span className="text-[1.375rem] font-semibold" lang={pack.language}>
                        {heteronym.word}
                      </span>
                      <MasteryDot mastery={mastery} label={t.pronunciation.lab.mastery[mastery]} />
                      <span className="font-cjk text-xs text-ink-faint">
                        {fill(copy.count, { count: heteronym.readings.length })}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        playback.playSteps(
                          allKey,
                          heteronym.readings.map((reading) => ({ source: sourceFor(reading), gapMs: GAP_MS })),
                        )
                      }
                      className="font-cjk inline-flex min-h-[36px] items-center rounded-full border border-line px-3 text-[0.75rem] font-semibold text-ink-soft hover:text-black"
                    >
                      {copy.playAll}
                    </button>
                  </div>

                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {heteronym.readings.map((reading, index) => {
                      const key = `${heteronym.word}-${index}`;
                      return (
                        <li key={key} className="flex items-start gap-3 rounded-2xl bg-surface px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-x-2">
                              {reading.spelling ? (
                                <span className="font-semibold" lang={pack.language}>{reading.spelling}</span>
                              ) : null}
                              <span className={pack.language === "zh-TW" ? "font-zhuyin" : "font-phonetic"}>
                                {reading.phonetic}
                              </span>
                              {reading.pinyin ? (
                                <span className="font-phonetic text-xs text-ink-soft" lang="zh-Latn">{reading.pinyin}</span>
                              ) : null}
                            </p>
                            <p className="font-cjk mt-0.5 text-[0.8125rem] text-ink-soft">
                              {localize(reading.meaning, interfaceLanguage)}
                            </p>
                            <p className="mt-0.5 text-[0.8125rem] text-ink-faint" lang={pack.language}>
                              {reading.example}
                            </p>
                          </div>
                          <AudioButton
                            label={fill(t.pronunciation.heteronyms.play, { example: reading.example })}
                            failedLabel={t.pronunciation.cards.playbackFailed}
                            phase={playback.phaseFor(key)}
                            onClick={() => playback.play(key, sourceFor(reading))}
                            size="sm"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </LabScreen>
  );
}
