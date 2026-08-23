"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import AudioButton from "@/components/pronunciation/lab/AudioButton";
import LabScreen from "@/components/pronunciation/lab/LabScreen";
import RhythmPhraseView from "@/components/pronunciation/lab/RhythmPhraseView";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { LabEmpty } from "@/components/pronunciation/lab/StateViews";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import usePronunciationPlayback from "@/hooks/pronunciation/usePronunciationPlayback";
import useReducedMotion from "@/hooks/useReducedMotion";
import useTranslation from "@/hooks/i18n/useTranslation";
import { phraseAudio } from "@/lib/pronunciation/lab/audio";
import { lessonProgressKey } from "@/lib/pronunciation/lab/progress";
import { localize } from "@/lib/pronunciation/localizedText";
import type { RhythmPhrase } from "@/lib/pronunciation/lab/types";
import type { YumiAnimationState } from "@/lib/pronunciation/yumiRig";

/** One notated beat, at a comfortable speaking tempo. */
const BEAT_MS = 420;

export default function RhythmModule() {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.pronunciation.lab;

  const { pack, recordAttempt } = usePronunciationLab();
  const { phaseFor, play } = usePronunciationPlayback();
  const reducedMotion = useReducedMotion();

  const [activePhraseId, setActivePhraseId] = useState<string | null>(null);
  const [beatIndex, setBeatIndex] = useState(-1);
  const [coachState, setCoachState] = useState<YumiAnimationState>("idle");

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearBeats = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => clearBeats, [clearBeats]);

  /**
   * Walks the highlight along the phrase as it is *written*.
   *
   * This is a metronome over the notation, not a measurement of the audio —
   * there is no forced aligner here and pretending otherwise would be the
   * same dishonesty as an invented score. It reads as one because the
   * notation is what the lesson is teaching: where the weight falls and how
   * long each syllable is held.
   */
  const runBeats = useCallback(
    (phrase: RhythmPhrase) => {
      clearBeats();

      if (reducedMotion) {
        setBeatIndex(-1);
        return;
      }

      let elapsed = 0;

      phrase.beats.forEach((beat, index) => {
        timersRef.current.push(
          setTimeout(() => setBeatIndex(index), elapsed),
        );
        elapsed += BEAT_MS * (beat.length ?? 1);
      });

      timersRef.current.push(setTimeout(() => setBeatIndex(-1), elapsed + 300));
    },
    [clearBeats, reducedMotion],
  );

  const playPhrase = useCallback(
    (lessonId: string, phrase: RhythmPhrase) => {
      setActivePhraseId(phrase.id);
      setCoachState("demonstrating");
      play(phrase.id, phraseAudio(phrase, pack.language));
      runBeats(phrase);

      void recordAttempt({
        unitId: lessonProgressKey(lessonId),
        module: "rhythm",
        // Listening through a phrase is practice, not a test — recorded as
        // an attempt with no verdict attached to it.
        outcome: "correct",
      });
    },
    [pack.language, play, recordAttempt, runBeats],
  );

  if (pack.lessons.length === 0) {
    return (
      <LabScreen
        title={copy.rhythm.title}
        eyebrow={pack.displayName}
        backHref="/pronunciation"
        backLabel={copy.backToLab}
      >
        <LabEmpty title={copy.rhythm.empty} />
      </LabScreen>
    );
  }

  return (
    <LabScreen
      title={copy.rhythm.title}
      eyebrow={pack.displayName}
      subtitle={copy.rhythm.subtitle}
      backHref="/pronunciation"
      backLabel={copy.backToLab}
    >
      <div className="space-y-5 pb-8">
        <YumiCoach pack={pack} state={coachState} size={92} />

        {pack.lessons.map((lesson) => (
          <section
            key={lesson.id}
            className="rounded-[26px] border border-black/[0.06] bg-white p-5"
          >
            <h2 className="font-cjk text-lg font-bold tracking-[-0.02em]">
              {localize(lesson.title, interfaceLanguage)}
            </h2>

            {lesson.rule ? (
              <div className="mt-3 rounded-2xl bg-surface p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  {copy.rhythm.rule}
                </p>
                <p className="font-cjk mt-1.5 text-sm leading-6 text-ink-strong">
                  {localize(lesson.rule, interfaceLanguage)}
                </p>
              </div>
            ) : null}

            <ul className="mt-4 space-y-4">
              {lesson.phrases.map((phrase) => (
                <li key={phrase.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-cjk truncate text-[15px] font-semibold">
                        {phrase.text}
                      </p>
                      {phrase.meaning ? (
                        <p className="font-cjk mt-0.5 truncate text-xs text-ink-faint">
                          {localize(phrase.meaning, interfaceLanguage)}
                        </p>
                      ) : null}
                    </div>

                    <AudioButton
                      label={phrase.text}
                      failedLabel={t.pronunciation.cards.playbackFailed}
                      phase={phaseFor(phrase.id)}
                      onClick={() => playPhrase(lesson.id, phrase)}
                    />
                  </div>

                  <div className="mt-2">
                    <RhythmPhraseView
                      phrase={phrase}
                      language={lesson.language}
                      activeIndex={activePhraseId === phrase.id ? beatIndex : -1}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </LabScreen>
  );
}
