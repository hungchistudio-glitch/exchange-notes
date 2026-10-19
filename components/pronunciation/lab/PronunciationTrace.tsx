"use client";

import { useMemo, type CSSProperties } from "react";

import type { ArticulationTimeline } from "@/lib/pronunciation/articulationTimeline";
import type { YumiInstrument } from "@/lib/pronunciation/lab/types";
import {
  TRACE,
  phoneSpans,
  pitchSegments,
  syllableSpans,
  traceMarks,
  xAt,
} from "@/lib/pronunciation/traceGeometry";

import styles from "./PronunciationTrace.module.css";

type PronunciationTraceProps = {
  timeline: ArticulationTimeline;
  /** The language's own instrument: which part of the trace it leans on. */
  instrument: YumiInstrument;
  /** The moment being shown — live while playing, chosen while studying. */
  active: number | null;
  playing: boolean;
  /** How far into the audio the animation joined it, for the playhead. */
  offset: number;
  /** Changes with every playback, to restart the playhead. */
  playbackKey: number | null;
  /** Phones a sound card is about. */
  focus: ReadonlySet<number>;
  onSelectPhone: (phone: number) => void;
  /** Accessible names: the trace, and one sound in it. */
  label: string;
  phoneLabel: (symbol: string) => string;
};

/**
 * The word being said, drawn as it happens (lib/pronunciation/traceGeometry.ts).
 *
 * Each language still has its instrument — the one feature its sounds turn
 * on — but now as an emphasis on the real trace rather than a picture of
 * its own: Mandarin's pitch line is drawn heavier, Italian's held closures,
 * French nasal resonance, Spanish syllable beats, English sound by sound.
 *
 * Every sound is a button: tapping one stops on it, and Yumi shows its
 * moments one at a time.
 */
export default function PronunciationTrace({
  timeline,
  instrument,
  active,
  playing,
  offset,
  playbackKey,
  focus,
  onSelectPhone,
  label,
  phoneLabel,
}: PronunciationTraceProps) {
  const marks = useMemo(() => traceMarks(timeline), [timeline]);
  const pitch = useMemo(() => pitchSegments(timeline), [timeline]);
  const phones = useMemo(() => phoneSpans(timeline), [timeline]);
  const syllables = useMemo(() => syllableSpans(timeline), [timeline]);
  const tonal = timeline.utterance.syllables.some((syllable) => syllable.tone !== undefined);
  const multi = timeline.utterance.syllables.length > 1;

  const activeStep = active !== null ? timeline.steps[active] : undefined;
  const activePhone = activeStep?.phone ?? -1;

  /* Joining an animation already under way — a transcription that came
     back after the audio started: start it as far in as the audio is. */
  const sweep = {
    "--trace-ms": `${Math.round(timeline.duration)}ms`,
    "--trace-delay": `${-Math.round(Math.max(0, offset))}ms`,
    "--trace-span": `${TRACE.right - TRACE.left}px`,
  } as CSSProperties;

  const { baseline: b, amplitude: A } = TRACE;
  const markTop = b - A - 4;
  const markHeight = A * 2 + 8;

  return (
    <div className={styles.trace} data-instrument={instrument} data-playing={playing ? "true" : "false"}>
      <svg viewBox={`0 0 ${TRACE.width} ${TRACE.height}`} className={styles.svg} role="img" aria-label={label}>
        {/* The sound a sound card is about, behind everything. */}
        {phones
          .filter((span) => focus.has(span.index))
          .map((span) => (
            <rect
              key={`focus-${span.index}`}
              className={styles.focus}
              x={span.x0 - 1}
              y={markTop}
              width={Math.max(3, span.x1 - span.x0 + 2)}
              height={markHeight}
              rx="4"
            />
          ))}

        {activeStep ? (
          <rect
            className={styles.activeMoment}
            x={xAt(timeline, activeStep.start) - 1}
            y={markTop}
            width={Math.max(3, xAt(timeline, activeStep.start + activeStep.duration) - xAt(timeline, activeStep.start) + 2)}
            height={markHeight}
            rx="3"
          />
        ) : null}

        <line className={styles.axis} x1={TRACE.left} y1={b} x2={TRACE.right} y2={b} />

        {pitch.map((d, index) => (
          <path key={`pitch-${index}`} className={styles.pitch} d={d} />
        ))}

        {marks.map((mark, index) => (
          <path
            key={`${mark.step}-${index}`}
            d={mark.d}
            className={`${styles.mark} ${styles[mark.className] ?? ""}`}
            data-past={playing && active !== null && mark.step <= active ? "true" : undefined}
            data-kind={mark.kind}
          />
        ))}

        {/* Syllables: a tick between them, a dot on the stressed one. */}
        {syllables.slice(1).map((span) => (
          <line key={`tick-${span.index}`} className={styles.tick} x1={span.x0} y1={b + A + 4} x2={span.x0} y2={b + A + 9} />
        ))}
        {!tonal && multi
          ? syllables
              .filter((span) => timeline.utterance.syllables[span.index]?.stress === 2)
              .map((span) => (
                <circle key={`stress-${span.index}`} className={styles.stress} cx={(span.x0 + span.x1) / 2} cy={b + A + 7} r="2.2" />
              ))
          : null}

        {/* Mandarin is labelled by syllable, in zhuyin; the rest by sound. */}
        {(tonal ? syllables : phones).map((span) => {
          const width = span.x1 - span.x0;
          if (width < 7) return null;
          const current = tonal
            ? activeStep?.syllable === span.index
            : activePhone === span.index;
          return (
            <text
              key={`label-${span.index}`}
              className={`${styles.label} ${current ? styles.labelActive : ""}`}
              x={(span.x0 + span.x1) / 2}
              y={TRACE.labelY}
              textAnchor="middle"
            >
              {span.label}
            </text>
          );
        })}

        {playing ? (
          <g key={`playhead-${playbackKey ?? 0}`} className={styles.playhead} style={sweep}>
            <line x1={TRACE.left} y1={TRACE.pitchTop - 4} x2={TRACE.left} y2={b + A + 10} />
          </g>
        ) : null}
      </svg>

      {/* One button per sound, over its stretch of the trace. */}
      <div className={styles.targets}>
        {phones.map((span) => (
          <button
            key={`target-${span.index}`}
            type="button"
            className={styles.target}
            style={{
              left: `${(span.x0 / TRACE.width) * 100}%`,
              width: `${(Math.max(4, span.x1 - span.x0) / TRACE.width) * 100}%`,
            }}
            aria-label={phoneLabel(span.label)}
            aria-pressed={activePhone === span.index}
            onClick={() => onSelectPhone(span.index)}
          />
        ))}
      </div>
    </div>
  );
}
