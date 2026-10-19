import type { SyllableBeat } from "./lab/types";
import type { Phone, Syllable, Utterance } from "./phones";
import { YUMI_IDLE_POSE, deriveRigPose, type PhoneticFeatures, type YumiRigPose } from "./yumiRig";

/* =========================================================
   How a word unfolds in time

   phones.ts says which sounds a word has. This says what happens, moment
   by moment, while it is said — the part a learner cannot see in a
   transcription (Chi, 2026-10-19: "塞音閉合→憋住→爆開、長音拉長、短音
   快過、頓音停頓"):

     closure     lips or tongue shut; air held, nothing heard
     burst       released: a pop of air
     aspiration  a puff after the burst — the difference between ㄅ and ㄆ
     friction    air hissing through a narrow gap, as long as it lasts
     shape       a vowel, nasal, l or approximant held and voiced
     glide       moving through, out of a diphthong or into a medial
     tap         one quick flick of the tongue
     trill       the tongue fluttering in the airflow
     glottal     the throat shut for a moment: the sound stops dead
     pause       between words

   Durations are estimates: a transcription has no clock, and the voice is
   the browser's, whose timing differs by device. They are typical
   proportions, scaled afterwards to the real length of the audio once it
   has been heard (calibration.ts) — so where each moment falls is right
   relative to the others even when the first estimate of the whole is
   not.

   Prosody is part of the timeline because it is part of the sound: a
   stressed syllable is longer, a long vowel is held, a doubled consonant
   holds its closure, and Mandarin's tones are applied as spoken — two
   third tones in a row are said as a second and a third, and a third tone
   before another syllable only dips (我很好 groups as 我 + 很好: a dipping
   third, then 2 + 3).
   ========================================================= */

export type StageKind =
  | "closure"
  | "burst"
  | "aspiration"
  | "friction"
  | "shape"
  | "glide"
  | "tap"
  | "trill"
  | "glottal"
  | "pause";

export type ArticulationStep = {
  kind: StageKind;
  /** Index into the utterance's phones; -1 for a pause. */
  phone: number;
  /** Index into the utterance's syllables; -1 for a pause. */
  syllable: number;
  start: number;
  duration: number;
  pose: YumiRigPose;
  voiced: boolean;
  /** How much sound there is, 0–1 — the height the trace draws. */
  level: number;
};

export type SpokenTone = 1 | 2 | 3 | 4 | 5;

export type SyllableTiming = {
  start: number;
  end: number;
  /** The tone as said, after sandhi. */
  spokenTone?: SpokenTone;
  /** A third tone said as a second because another third follows it. */
  sandhi?: boolean;
  /** A third tone that only dips, because a syllable follows it. */
  halfThird?: boolean;
};

export type ArticulationTimeline = {
  utterance: Utterance;
  steps: ArticulationStep[];
  syllables: SyllableTiming[];
  duration: number;
};

/* ── Durations ──────────────────────────────────────────────────────────
   Typical values at an ordinary speaking rate, in milliseconds. What
   matters is their proportions: a closure is silent for longer than its
   burst lasts; a long vowel is about twice a short one; an Italian double
   consonant holds its closure about twice as long as a single one. */

const MS = {
  vowel: 100,
  glide: 60,
  closure: 70,
  burst: 24,
  aspiration: 60,
  friction: 95,
  affricateClosure: 50,
  affricateFriction: 70,
  nasal: 75,
  lateral: 70,
  approximant: 60,
  tap: 26,
  trillBeat: 28,
  glottal: 90,
  wordPause: 70,
} as const;

/** How much longer a long vowel or a doubled consonant is held. */
const LONG_FACTOR = 1.9;
const GEMINATE_FACTOR = 2.1;
/** A stressed vowel is longer; an unstressed one shorter. */
const STRESS_FACTOR: Record<Syllable["stress"], number> = { 0: 0.82, 1: 1.12, 2: 1.35 };
/** Reduced vowels are shorter still. */
const REDUCED = new Set(["ə", "ɐ", "ɨ", "ᵻ"]);
/** The last syllable of what is said is drawn out a little. */
const FINAL_LENGTHENING = 1.15;
/** Mandarin is timed by syllable; these are typical syllable lengths by tone. */
const MANDARIN_SYLLABLE_MS: Record<SpokenTone, number> = { 1: 290, 2: 300, 3: 360, 4: 260, 5: 160 };

/* ── Poses for each moment ─────────────────────────────────────────── */

/** Shut, with the air held behind the closure. */
function closurePose(features: PhoneticFeatures): YumiRigPose {
  const pose = deriveRigPose(features);
  return {
    ...pose,
    airflow: { ...pose.airflow, enabled: false, intensity: 0 },
    /* A voiced stop buzzes while still closed — what Spanish and French
       "b" do that an English or Chinese speaker's does not. */
    voicing: { voiced: features.voiced, amplitude: features.voiced ? 0.5 : 0 },
  };
}

/** Released: the contact lets go and the mouth starts to open. */
function releasePose(features: PhoneticFeatures, intensity: number, voiced: boolean): YumiRigPose {
  const pose = deriveRigPose(features);
  return {
    ...pose,
    mouth: {
      ...pose.mouth,
      jawOpen: Math.min(1, pose.mouth.jawOpen + 0.12),
      lipClosure: Math.min(pose.mouth.lipClosure, 0.2),
    },
    contact: { zone: features.contactZone, intensity: 0 },
    airflow: { enabled: true, path: "burst", intensity },
    voicing: { voiced, amplitude: voiced ? 0.8 : 0 },
  };
}

/** The throat shut: the mouth stays as it was, and everything stops. */
function glottalPose(previous: YumiRigPose | undefined): YumiRigPose {
  const base = previous ?? YUMI_IDLE_POSE;
  return {
    ...base,
    airflow: { ...base.airflow, enabled: false, intensity: 0 },
    voicing: { voiced: false, amplitude: 0 },
    contact: { zone: "none", intensity: 0 },
  };
}

/** How loud a voiced, open moment is: open vowels loudest, stressed louder. */
function sonority(features: PhoneticFeatures, stress: Syllable["stress"]): number {
  const base =
    features.manner === "vowel"
      ? 0.55 + features.jawOpening * 0.35
      : features.manner === "nasal"
        ? 0.42
        : 0.48;
  return Math.min(1, base * (stress === 2 ? 1.12 : stress === 1 ? 1 : 0.85));
}

/* ── Building it ───────────────────────────────────────────────────── */

type Draft = Omit<ArticulationStep, "start">;

function stagesForPhone(phone: Phone, index: number, stress: Syllable["stress"], previous: YumiRigPose | undefined): Draft[] {
  const f = phone.features;
  const base = { phone: index, syllable: phone.syllable };
  const hold = phone.geminate ? GEMINATE_FACTOR : 1;

  switch (f.manner) {
    case "stop": {
      if (f.place === "glottal") {
        return [{ ...base, kind: "glottal", duration: MS.glottal, pose: glottalPose(previous), voiced: false, level: 0 }];
      }
      const steps: Draft[] = [
        { ...base, kind: "closure", duration: MS.closure * hold, pose: closurePose(f), voiced: f.voiced, level: f.voiced ? 0.12 : 0 },
        { ...base, kind: "burst", duration: MS.burst, pose: releasePose(f, f.aspirated ? 0.75 : 0.5, f.voiced), voiced: f.voiced, level: 0.8 },
      ];
      if (f.aspirated) {
        steps.push({ ...base, kind: "aspiration", duration: MS.aspiration, pose: releasePose(f, 1, false), voiced: false, level: 0.42 });
      }
      return steps;
    }
    case "affricate": {
      const steps: Draft[] = [
        { ...base, kind: "closure", duration: MS.affricateClosure * hold, pose: closurePose(f), voiced: f.voiced, level: f.voiced ? 0.12 : 0 },
        { ...base, kind: "friction", duration: MS.affricateFriction, pose: deriveRigPose(f), voiced: f.voiced, level: f.voiced ? 0.42 : 0.34 },
      ];
      if (f.aspirated) {
        steps.push({ ...base, kind: "aspiration", duration: MS.aspiration, pose: releasePose(f, 1, false), voiced: false, level: 0.42 });
      }
      return steps;
    }
    case "fricative":
      return [{ ...base, kind: "friction", duration: MS.friction * hold * (phone.long && !phone.geminate ? LONG_FACTOR : 1), pose: deriveRigPose(f), voiced: f.voiced, level: f.voiced ? 0.42 : 0.34 }];
    case "tap":
      return [{ ...base, kind: "tap", duration: MS.tap, pose: deriveRigPose(f), voiced: true, level: 0.3 }];
    case "trill": {
      const beats = phone.geminate || phone.long ? 5 : 3;
      return [{ ...base, kind: "trill", duration: MS.trillBeat * beats, pose: deriveRigPose(f), voiced: f.voiced, level: 0.5 }];
    }
    case "nasal":
      return [{ ...base, kind: "shape", duration: MS.nasal * hold, pose: deriveRigPose(f), voiced: true, level: sonority(f, stress) }];
    case "lateral":
      return [{ ...base, kind: "shape", duration: MS.lateral * hold, pose: deriveRigPose(f), voiced: true, level: sonority(f, stress) }];
    case "approximant": {
      const syllabic = phone.symbol.includes("̩");
      return [{ ...base, kind: phone.glide ? "glide" : "shape", duration: syllabic ? MS.vowel * STRESS_FACTOR[stress] : phone.glide ? MS.glide : MS.approximant, pose: deriveRigPose(f), voiced: true, level: sonority(f, stress) }];
    }
    case "vowel": {
      if (phone.glide) {
        return [{ ...base, kind: "glide", duration: MS.glide, pose: deriveRigPose(f), voiced: true, level: sonority(f, stress) * 0.9 }];
      }
      const reduced = REDUCED.has(phone.symbol) && stress === 0 ? 0.75 : 1;
      return [{ ...base, kind: "shape", duration: MS.vowel * STRESS_FACTOR[stress] * reduced * (phone.long ? LONG_FACTOR : 1), pose: deriveRigPose(f), voiced: true, level: sonority(f, stress) }];
    }
  }
}

/**
 * Mandarin tones as said: 3 + 3 is said 2 + 3 (你好), and a third tone with
 * a syllable after it only dips. Applied right to left across a run of
 * thirds, as a run is said: 很好 is 2+3, and 我很好 pairs the last two
 * — 我 dips, 很好 is 2+3 — which is one of the two ways it is heard.
 */
function spokenTones(syllables: Syllable[]): Array<Pick<SyllableTiming, "spokenTone" | "sandhi" | "halfThird">> {
  const result = syllables.map((syllable) => ({
    spokenTone: syllable.tone as SpokenTone | undefined,
    sandhi: false,
    halfThird: false,
  }));
  for (let index = syllables.length - 2; index >= 0; index -= 1) {
    if (syllables[index].tone !== 3) continue;
    const next = result[index + 1];
    if (syllables[index + 1].tone === 3 && !next.sandhi) {
      result[index].spokenTone = 2;
      result[index].sandhi = true;
    } else if (next.spokenTone !== undefined) {
      result[index].halfThird = true;
    }
  }
  return result;
}

/** The timeline for an utterance, at an ordinary speaking rate. */
export function buildTimeline(utterance: Utterance): ArticulationTimeline {
  const { phones, syllables } = utterance;
  const drafts: Draft[] = [];
  const lastSyllable = syllables.length - 1;

  phones.forEach((phone, index) => {
    if (phone.wordStart && !phone.linked && drafts.length) {
      drafts.push({ kind: "pause", phone: -1, syllable: -1, duration: MS.wordPause, pose: YUMI_IDLE_POSE, voiced: false, level: 0 });
    }
    const stress = syllables[phone.syllable]?.stress ?? 0;
    const previous = drafts.at(-1)?.pose;
    const stages = stagesForPhone(phone, index, stress, previous);
    for (const stage of stages) {
      drafts.push(
        phone.syllable === lastSyllable && syllables.length > 1
          ? { ...stage, duration: stage.duration * FINAL_LENGTHENING }
          : stage,
      );
    }
  });

  /* Mandarin: each syllable's sounds share its tone's typical length. */
  const tones = spokenTones(syllables);
  if (syllables.some((syllable) => syllable.tone !== undefined)) {
    syllables.forEach((_, syllable) => {
      const own = drafts.filter((draft) => draft.syllable === syllable);
      const total = own.reduce((sum, draft) => sum + draft.duration, 0);
      const target = MANDARIN_SYLLABLE_MS[tones[syllable].spokenTone ?? 1];
      if (total > 0) for (const draft of own) draft.duration *= target / total;
    });
  }

  let clock = 0;
  const steps: ArticulationStep[] = drafts.map((draft) => {
    const step = { ...draft, start: clock };
    clock += draft.duration;
    return step;
  });

  const timings: SyllableTiming[] = syllables.map((_, syllable) => {
    const own = steps.filter((step) => step.syllable === syllable);
    const start = own[0]?.start ?? 0;
    const last = own.at(-1);
    return {
      start,
      end: last ? last.start + last.duration : start,
      ...tones[syllable],
    };
  });

  return { utterance, steps, syllables: timings, duration: clock };
}

/** The same timeline stretched or squeezed to `duration` milliseconds. */
export function scaleTimeline(timeline: ArticulationTimeline, duration: number): ArticulationTimeline {
  if (!(duration > 0) || !(timeline.duration > 0)) return timeline;
  const factor = duration / timeline.duration;
  return {
    ...timeline,
    duration,
    steps: timeline.steps.map((step) => ({ ...step, start: step.start * factor, duration: step.duration * factor })),
    syllables: timeline.syllables.map((syllable) => ({ ...syllable, start: syllable.start * factor, end: syllable.end * factor })),
  };
}

/** The step under `ms`, or null before the start and after the end. */
export function stepAt(timeline: ArticulationTimeline, ms: number): ArticulationStep | null {
  if (ms < 0 || ms >= timeline.duration) return null;
  let low = 0;
  let high = timeline.steps.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const step = timeline.steps[middle];
    if (ms < step.start) high = middle - 1;
    else if (ms >= step.start + step.duration) low = middle + 1;
    else return step;
  }
  return null;
}

/* ── Rhythm phrases ─────────────────────────────────────────────────────
   A Lab rhythm phrase carries its syllables' weight, length, tone and
   linking, hand-written, but not their sounds. Its timeline is one open
   vowel per syllable: the mouth opens wider on a stressed beat, holds a
   long one, and the trace carries the tones — the rhythm, which is what
   the phrase is there to teach. */

const BEAT_VOWEL: PhoneticFeatures = {
  manner: "vowel",
  place: "none",
  voiced: true,
  aspirated: false,
  nasal: false,
  lipRounding: "unrounded",
  jawOpening: 0.55,
  tongueRegion: "middle",
  tongueHeight: 0.4,
  tongueFrontness: 0.5,
  contactZone: "none",
};

export function utteranceFromBeats(beats: readonly SyllableBeat[]): Utterance {
  const syllables: Syllable[] = [];
  const phones: Phone[] = [];
  beats.forEach((beat, index) => {
    if (beat.silent) return;
    const syllable = syllables.length;
    syllables.push({
      stress: beat.stress >= 1 ? 2 : beat.stress >= 0.5 ? 1 : 0,
      tone: beat.tone,
      text: beat.text,
    });
    phones.push({
      symbol: beat.text,
      features: { ...BEAT_VOWEL, jawOpening: 0.3 + Math.min(1, beat.stress) * 0.45 },
      long: (beat.length ?? 1) >= 1.4,
      geminate: false,
      glide: false,
      syllable,
      wordStart: false,
      linked: index > 0 && beats[index - 1].linkToNext !== undefined,
    });
  });
  return { phones, syllables };
}

