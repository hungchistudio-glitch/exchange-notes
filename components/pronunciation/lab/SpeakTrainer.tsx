"use client";

import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AudioButton, { AudioGlyph } from "@/components/pronunciation/lab/AudioButton";
import ScoreBreakdown from "@/components/pronunciation/lab/ScoreBreakdown";
import StatusMessage from "@/components/foundation/feedback/StatusMessage";
import usePronunciationPlayback from "@/hooks/pronunciation/usePronunciationPlayback";
import useRecorder from "@/hooks/pronunciation/useRecorder";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { LanguageCode } from "@/lib/languages";
import {
  resolveAnalyzer,
  type PronunciationAnalysisResult,
  type PronunciationAnalyzer,
} from "@/lib/pronunciation/lab/analyzer";
import type { AudioSource, PlaybackSpeed } from "@/lib/pronunciation/lab/audio";
import type { ScoreDimension, TrainingItemOutcome } from "@/lib/pronunciation/lab/types";
import type { YumiAnimationState } from "@/lib/pronunciation/yumiRig";

export type SpeakTrainerProps = {
  language: LanguageCode;
  /** What the learner is asked to say. */
  targetText: string;
  /** How to hear it said properly. */
  nativeSource: AudioSource;
  dimensions: readonly ScoreDimension[];
  /** Told what happened, so a session can record the attempt. */
  onAttempt?: (outcome: TrainingItemOutcome, score?: number, analyzerId?: string) => void;
  /** Lets the surrounding screen drive Yumi from the trainer's state. */
  onCoachStateChange?: (state: YumiAnimationState) => void;
};

/**
 * Listen → record → compare → feedback.
 *
 * Two things happen while the learner speaks, and they are independent on
 * purpose. The recorder captures a clip so the two versions can be played
 * back-to-back — which teaches most, needs no analysis, and works on every
 * device. The analyzer listens separately and reports what it can measure.
 * When the analyzer is unavailable or hears nothing, the compare half still
 * works and the score half honestly says nothing.
 *
 * No recording is uploaded or stored by this app. The clip is an object URL
 * inside this tab, revoked by useRecorder when it is replaced or the screen
 * goes away.
 */
export default function SpeakTrainer({
  language,
  targetText,
  nativeSource,
  dimensions,
  onAttempt,
  onCoachStateChange,
}: SpeakTrainerProps) {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab.speak;

  const {
    state: recorderState,
    start: startCapture,
    stop: stopCapture,
    discard,
  } = useRecorder();

  const {
    phaseFor,
    play,
    playSteps,
    stop: stopPlayback,
  } = usePronunciationPlayback();

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PronunciationAnalysisResult | null>(null);

  const analyzerRef = useRef<PronunciationAnalyzer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  /**
   * Resolved on first use rather than at render.
   *
   * Which analyzer exists is a fact about the browser, so it cannot be
   * decided during a render that also happens on the server — and it is
   * only ever needed inside an event handler, where asking is free.
   */
  const getAnalyzer = useCallback((): PronunciationAnalyzer => {
    analyzerRef.current ??= resolveAnalyzer();
    return analyzerRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      analyzerRef.current?.cancel();
    };
  }, []);

  /*
   * A new target is a new attempt.
   *
   * Without this, moving to the next item in a session shows the previous
   * word's score against the new word — the single most misleading thing
   * this screen could do.
   */
  useEffect(() => {
    abortRef.current?.abort();
    analyzerRef.current?.cancel();
    discard();

    // Deferred out of the effect body: a synchronous write here cascades a
    // second render before the first has painted, which is what the
    // set-state-in-effect rule is about. A microtask still lands before the
    // browser draws.
    queueMicrotask(() => {
      setResult(null);
      setAnalyzing(false);
    });
  }, [targetText, language, discard]);

  const isPlaying =
    phaseFor("native") === "playing" || phaseFor("native") === "loading";

  const coachState: YumiAnimationState = analyzing
    ? "analyzing"
    : recorderState.status === "recording"
      ? "recording"
      : recorderState.status === "requesting"
        ? "waiting"
        : result
          ? result.verdict === "correct"
            ? "correct"
            : result.verdict === "almost"
              ? "almost"
              : result.verdict === "incorrect"
                ? "incorrect"
                : "waiting"
          : isPlaying
            ? "demonstrating"
            : "listening";

  useEffect(() => {
    onCoachStateChange?.(coachState);
  }, [coachState, onCoachStateChange]);

  const playNative = useCallback(
    (speed: PlaybackSpeed = "native") => {
      play("native", nativeSource, speed);
    },
    [nativeSource, play],
  );

  const clipSource = useMemo<AudioSource | null>(
    () =>
      recorderState.clipUrl
        ? {
            kind: "recorded",
            src: recorderState.clipUrl,
            language,
            // Empty on purpose: there is nothing to fall back to. A failed
            // playback of your own recording must not quietly become a
            // synthesised voice saying the word correctly.
            text: "",
          }
        : null,
    [recorderState.clipUrl, language],
  );

  const startRecording = useCallback(async () => {
    stopPlayback();
    setResult(null);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    await startCapture();

    const analyzer = getAnalyzer();
    if (!analyzer.isAvailable()) return;

    setAnalyzing(true);

    const analysis = await analyzer.analyze({
      language,
      targetText,
      dimensions,
      signal: controller.signal,
    });

    if (!mountedRef.current || controller.signal.aborted) return;

    setAnalyzing(false);
    setResult(analysis);

    const outcome: TrainingItemOutcome =
      analysis.verdict === "unknown" ? "skipped" : analysis.verdict;

    onAttempt?.(outcome, analysis.overall ?? undefined, analyzer.id);
  }, [
    language,
    targetText,
    dimensions,
    onAttempt,
    getAnalyzer,
    startCapture,
    stopPlayback,
  ]);

  const recording = recorderState.status === "recording";
  const requesting = recorderState.status === "requesting";

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-black/[0.06] bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          {copy.listenFirst}
        </p>

        <p className="font-cjk mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em]">
          {targetText}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AudioButton
            label={copy.playNative}
            failedLabel={t.pronunciation.cards.playbackFailed}
            phase={phaseFor("native")}
            onClick={() => playNative("native")}
          />

          <button
            type="button"
            onClick={() => playNative("slow")}
            className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink-soft transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {t.pronunciation.lab.detail.slowSpeed}
          </button>
        </div>
      </section>

      {recorderState.status === "unsupported" ? (
        <StatusMessage tone="info">
          <span className="font-semibold">{copy.unsupported}</span>{" "}
          <span className="font-cjk">{copy.unsupportedHelp}</span>
        </StatusMessage>
      ) : (
        <section className="rounded-3xl border border-black/[0.06] bg-white p-5">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => (recording ? stopCapture() : void startRecording())}
              disabled={requesting}
              aria-label={recording ? copy.stop : copy.record}
              className={[
                "flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-200 motion-reduce:transition-none",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black",
                recording
                  ? "scale-105 bg-red-600 text-white shadow-[0_0_0_8px_rgba(220,38,38,0.14)]"
                  : "bg-black text-white active:scale-95",
                requesting ? "opacity-60" : "",
              ].join(" ")}
            >
              {recording ? (
                <Square size={22} strokeWidth={2} fill="currentColor" aria-hidden="true" />
              ) : (
                <Mic size={24} strokeWidth={1.9} aria-hidden="true" />
              )}
            </button>

            <p className="text-[13px] font-medium text-ink-soft" aria-live="polite">
              {recording
                ? copy.recording
                : analyzing
                  ? copy.analyzing
                  : recorderState.status === "recorded"
                    ? copy.retry
                    : copy.record}
            </p>
          </div>

          {recorderState.status === "denied" ? (
            <StatusMessage tone="danger" className="mt-4">
              <span className="font-semibold">{copy.permissionDenied}</span>{" "}
              <span className="font-cjk">{copy.permissionHelp}</span>
            </StatusMessage>
          ) : null}

          {recorderState.status === "failed" ? (
            <StatusMessage tone="danger" className="mt-4">
              {recorderState.error === "no-audio" ? copy.noAudio : copy.failed}
            </StatusMessage>
          ) : null}
        </section>
      )}

      {clipSource ? (
        <section className="rounded-3xl border border-black/[0.06] bg-white p-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {copy.compare}
          </h3>

          {/*
            Native and You, adjacent and equally weighted. Hearing the two
            in immediate succession is the part of this screen that teaches
            most, and it needs no analyzer, no network and no permission
            beyond the one already granted.
          */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => playNative("native")}
              aria-label={copy.playNative}
              className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3 py-3 transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {copy.native}
              </span>
              <AudioGlyph phase={phaseFor("native")} size="sm" />
            </button>

            <button
              type="button"
              onClick={() => play("you", clipSource)}
              aria-label={copy.playYours}
              className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3 py-3 transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {copy.you}
              </span>
              <AudioGlyph phase={phaseFor("you")} size="sm" />
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              playSteps("ab", [
                { source: nativeSource, gapMs: 320 },
                { source: clipSource, gapMs: 320 },
                { source: nativeSource, gapMs: 320 },
                { source: clipSource },
              ])
            }
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-line bg-white text-[13px] font-semibold text-ink-strong transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {copy.native} → {copy.you} → {copy.native} → {copy.you}
          </button>
        </section>
      ) : null}

      {result ? <ScoreBreakdown result={result} dimensions={dimensions} /> : null}
    </div>
  );
}
