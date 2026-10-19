import type { ArticulationTimeline, StageKind } from "./articulationTimeline";

/* =========================================================
   The pronunciation trace, as shapes

   What used to sit beside Yumi was a drawing per language — the same wave
   for every English word, the same tone curve for every Chinese one. It
   now draws the word being said (Chi, 2026-10-19: "改成真實發音軌跡"),
   left to right in time:

     pitch    along the top: a Mandarin syllable's tone as spoken, sandhi
              and all; elsewhere the rise on the stressed syllable and the
              fall at the end
     sound    along the middle, one mark per moment —
                voice      a band, as tall as the sound is loud
                closure    silence, with a bracket over the held part
                burst      a spike where it lets go
                friction   noise, as long as the hiss lasts
                aspiration noise that dies away
                tap, trill a notch; a run of small pulses
                glottal    a gap with ‖ in it
     labels   along the bottom: each sound, or each zhuyin syllable

   Pure geometry in viewBox units, so it is tested without a browser and
   drawn by components/pronunciation/lab/PronunciationTrace.tsx.
   ========================================================= */

export const TRACE = {
  width: 320,
  height: 132,
  left: 12,
  right: 308,
  pitchTop: 8,
  pitchBottom: 36,
  baseline: 74,
  amplitude: 22,
  labelY: 122,
} as const;

export type TraceMarkClass =
  | "voice"
  | "glide"
  | "nasal"
  | "silence"
  | "hold"
  | "voiceBar"
  | "burst"
  | "noise"
  | "tap"
  | "trill"
  | "glottal";

export type TraceMark = {
  step: number;
  kind: StageKind;
  className: TraceMarkClass;
  d: string;
};

export type TraceSpan = {
  index: number;
  x0: number;
  x1: number;
  label: string;
};

const round = (value: number) => Math.round(value * 10) / 10;

export function xAt(timeline: ArticulationTimeline, ms: number): number {
  const span = TRACE.right - TRACE.left;
  if (!(timeline.duration > 0)) return TRACE.left;
  return round(TRACE.left + (Math.min(Math.max(ms, 0), timeline.duration) / timeline.duration) * span);
}

/** Deterministic jitter, so the noise looks like noise but never changes. */
function jitter(index: number): number {
  const value = Math.sin(index * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function zigzag(x0: number, x1: number, amplitude: (t: number) => number, seed: number): string {
  const b = TRACE.baseline;
  const step = 2.4;
  let d = `M${round(x0)} ${b}`;
  let index = 0;
  for (let x = x0 + step / 2; x < x1; x += step) {
    const t = (x - x0) / Math.max(1, x1 - x0);
    const a = amplitude(t) * (0.55 + 0.45 * jitter(seed * 31 + index));
    d += ` L${round(x)} ${round(index % 2 === 0 ? b - a : b + a)}`;
    index += 1;
  }
  return `${d} L${round(x1)} ${b}`;
}

/** A held, voiced sound: up quickly, level, down quickly. */
function band(x0: number, x1: number, a: number): string {
  const b = TRACE.baseline;
  const r = Math.min(6, (x1 - x0) / 3);
  return [
    `M${round(x0)} ${b}`,
    `Q${round(x0)} ${round(b - a)} ${round(x0 + r)} ${round(b - a)}`,
    `L${round(x1 - r)} ${round(b - a)}`,
    `Q${round(x1)} ${round(b - a)} ${round(x1)} ${b}`,
    `Q${round(x1)} ${round(b + a)} ${round(x1 - r)} ${round(b + a)}`,
    `L${round(x0 + r)} ${round(b + a)}`,
    `Q${round(x0)} ${round(b + a)} ${round(x0)} ${b}Z`,
  ].join(" ");
}

/** A moving sound: a lens, thin at both ends. */
function lens(x0: number, x1: number, a: number): string {
  const b = TRACE.baseline;
  const m = (x0 + x1) / 2;
  return `M${round(x0)} ${b} Q${round(m)} ${round(b - a * 2)} ${round(x1)} ${b} Q${round(m)} ${round(b + a * 2)} ${round(x0)} ${b}Z`;
}

/** One mark per moment of the timeline. */
export function traceMarks(timeline: ArticulationTimeline): TraceMark[] {
  const b = TRACE.baseline;
  const A = TRACE.amplitude;
  const marks: TraceMark[] = [];

  timeline.steps.forEach((step, index) => {
    const x0 = xAt(timeline, step.start);
    const x1 = Math.max(x0 + 1, xAt(timeline, step.start + step.duration));
    const a = Math.max(2, step.level * A);
    const nasal = step.phone >= 0 && timeline.utterance.phones[step.phone]?.features.nasal;
    const push = (className: TraceMarkClass, d: string) => marks.push({ step: index, kind: step.kind, className, d });

    switch (step.kind) {
      case "shape":
        push(nasal ? "nasal" : "voice", band(x0, x1, a));
        break;
      case "glide":
        push("glide", lens(x0, x1, a / 2));
        break;
      case "closure":
        push("silence", `M${x0} ${b} L${x1} ${b}`);
        push("hold", `M${x0} ${b - 9} L${x0} ${b - 13} L${x1} ${b - 13} L${x1} ${b - 9}`);
        if (step.voiced) push("voiceBar", zigzag(x0, x1, () => 2.5, index));
        break;
      case "burst":
        push("burst", `M${x0} ${round(b - a)} L${x0} ${round(b + a)}`);
        break;
      case "aspiration":
        push("noise", zigzag(x0, x1, (t) => a * (1 - t * 0.85), index));
        break;
      case "friction":
        push("noise", zigzag(x0, x1, () => a, index));
        break;
      case "tap": {
        const m = round((x0 + x1) / 2);
        push("tap", `M${x0} ${b} L${m} ${b + 8} L${x1} ${b}`);
        break;
      }
      case "trill": {
        const beats = Math.max(3, Math.round((x1 - x0) / 6));
        const width = (x1 - x0) / beats;
        let d = `M${x0} ${b}`;
        for (let beat = 0; beat < beats; beat += 1) {
          const start = x0 + beat * width;
          d += ` Q${round(start + width / 2)} ${round(b - a)} ${round(start + width)} ${b}`;
        }
        push("trill", d);
        break;
      }
      case "glottal": {
        const m = (x0 + x1) / 2;
        push("silence", `M${x0} ${b} L${x1} ${b}`);
        push("glottal", `M${round(m - 2.5)} ${b - 12} L${round(m - 2.5)} ${b + 12} M${round(m + 2.5)} ${b - 12} L${round(m + 2.5)} ${b + 12}`);
        break;
      }
      case "pause":
        break;
    }
  });

  return marks;
}

/* ── Pitch ─────────────────────────────────────────────────────────── */

/** Mandarin tones in Chao's five levels, as spoken. */
const CONTOUR: Record<string, number[]> = {
  "1": [5, 5],
  "2": [3, 5],
  "3": [2, 1, 4],
  half3: [2, 1, 1],
  "4": [5, 1],
  "5": [3, 3],
};

function pitchY(level: number): number {
  return round(TRACE.pitchBottom - level * (TRACE.pitchBottom - TRACE.pitchTop));
}

/** A smooth line through points (Catmull-Rom, as Bézier curves). */
function smooth(points: Array<[number, number]>): string {
  if (!points.length) return "";
  let d = `M${points[0][0]} ${points[0][1]}`;
  if (points.length === 2) return `${d} L${points[1][0]} ${points[1][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** Where each syllable is voiced: pitch only exists where the voice does. */
function voicedSpan(timeline: ArticulationTimeline, syllable: number): [number, number] | null {
  const voiced = timeline.steps.filter(
    (step) => step.syllable === syllable && step.voiced && step.kind !== "closure",
  );
  if (!voiced.length) return null;
  const last = voiced[voiced.length - 1];
  return [voiced[0].start, last.start + last.duration];
}

/**
 * The pitch line, one segment per syllable.
 *
 * Mandarin draws each tone as said. Other languages draw what carries
 * their meaning: higher on the stressed syllable, falling at the end of a
 * statement — a rough intonation, labelled as pitch, not a measurement.
 */
export function pitchSegments(timeline: ArticulationTimeline): string[] {
  const { syllables } = timeline.utterance;
  const tonal = syllables.some((syllable) => syllable.tone !== undefined);
  const last = syllables.length - 1;

  return syllables.flatMap((syllable, index) => {
    const span = voicedSpan(timeline, index);
    if (!span) return [];
    const [x0, x1] = [xAt(timeline, span[0]), xAt(timeline, span[1])];
    const timing = timeline.syllables[index];

    let levels: number[];
    if (tonal) {
      const tone = timing?.halfThird ? "half3" : String(timing?.spokenTone ?? syllable.tone ?? 1);
      levels = (CONTOUR[tone] ?? CONTOUR["1"]).map((chao) => (chao - 1) / 4);
    } else {
      const height = syllable.stress === 2 ? 0.72 : syllable.stress === 1 ? 0.58 : 0.45;
      /* The end of what is said falls — or, in a yes/no question, rises. */
      const rising = timeline.utterance.intonation === "rise";
      levels =
        index === last
          ? rising
            ? [height * 0.85, 0.95]
            : [height, height * 0.45]
          : [height, height];
    }

    const points = levels.map(
      (level, at): [number, number] => [round(x0 + ((x1 - x0) * at) / (levels.length - 1)), pitchY(level)],
    );
    return [smooth(points)];
  });
}

/* ── Labels and tap targets ────────────────────────────────────────── */

/** Each sound's stretch of the trace, labelled with its symbol. */
export function phoneSpans(timeline: ArticulationTimeline): TraceSpan[] {
  return timeline.utterance.phones.flatMap((phone, index) => {
    const own = timeline.steps.filter((step) => step.phone === index);
    if (!own.length) return [];
    const last = own[own.length - 1];
    return [
      {
        index,
        x0: xAt(timeline, own[0].start),
        x1: xAt(timeline, last.start + last.duration),
        label: phone.long ? `${phone.symbol}ː` : phone.symbol,
      },
    ];
  });
}

/** Each syllable's stretch, labelled as written — zhuyin for Mandarin. */
export function syllableSpans(timeline: ArticulationTimeline): TraceSpan[] {
  return timeline.syllables.map((timing, index) => ({
    index,
    x0: xAt(timeline, timing.start),
    x1: xAt(timeline, timing.end),
    label: timeline.utterance.syllables[index]?.text ?? "",
  }));
}
