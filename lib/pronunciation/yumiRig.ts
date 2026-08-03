// Yumi's articulation rig — a lightweight, honest approximation of the
// "PhoneticFeatures → YumiRigDefinition" pipeline from the Yumi
// pronunciation-system design brief.
//
// Scope note (read this before extending): the brief describes a full
// audio-timeline-driven rig where a linguist/native-speaker review process
// hand-annotates millisecond-accurate mouth/tongue/contact/airflow events
// against real recorded audio. We don't have measured audio (Browser TTS
// timing is not reproducible frame-to-frame, and there's no forced-aligner
// in this project), so instead this derives ONE static target pose per
// sound from its phonetic features, and the animation timeline
// (YUMI_TIMING below) interpolates idle → target → idle using fixed
// durations rather than per-audio events. That's a reasonable, honest
// approximation for a first pass — not a substitute for the real
// audio-synced system if this ever needs to be that precise.

export type Manner =
  | "stop"
  | "fricative"
  | "affricate"
  | "nasal"
  | "approximant"
  | "lateral"
  | "vowel";

export type Place =
  | "bilabial"
  | "labiodental"
  | "dental"
  | "alveolar"
  | "postalveolar"
  | "retroflex"
  | "palatal"
  | "velar"
  | "glottal"
  | "none";

export type LipRounding =
  | "unrounded"
  | "slightly_rounded"
  | "rounded"
  | "strongly_rounded";

export type TongueRegion =
  | "tip"
  | "blade"
  | "front"
  | "middle"
  | "back"
  | "root"
  | "neutral";

export type ContactZone =
  | "upper_lip"
  | "lower_lip"
  | "upper_teeth"
  | "lower_teeth"
  | "alveolar_ridge"
  | "postalveolar_zone"
  | "hard_palate"
  | "soft_palate"
  | "velum"
  | "none";

export interface PhoneticFeatures {
  manner: Manner;
  place: Place;
  voiced: boolean;
  aspirated: boolean;
  nasal: boolean;
  lipRounding: LipRounding;
  /** 0 (closed) – 1 (wide open) */
  jawOpening: number;
  tongueRegion: TongueRegion;
  /** 0 (low) – 1 (high) */
  tongueHeight: number;
  /** 0 (back) – 1 (front) */
  tongueFrontness: number;
  contactZone: ContactZone;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface MouthRig {
  jawOpen: number;
  lipRoundness: number;
  lipSpread: number;
  lipClosure: number;
}

export interface TongueRig {
  tip: Point2D;
  blade: Point2D;
  middle: Point2D;
  back: Point2D;
  root: Point2D;
  activeRegion: TongueRegion;
}

export interface AirflowRig {
  enabled: boolean;
  path: "oral_center" | "oral_side" | "nasal" | "burst" | "friction";
  intensity: number;
}

export interface VoicingRig {
  voiced: boolean;
  amplitude: number;
}

export interface ContactRig {
  zone: ContactZone;
  intensity: number;
}

export interface YumiRigPose {
  mouth: MouthRig;
  tongue: TongueRig;
  airflow: AirflowRig;
  voicing: VoicingRig;
  contact: ContactRig;
}

export type YumiAnimationState =
  | "entering"
  | "idle"
  | "preparing"
  | "articulating"
  | "holding"
  | "releasing"
  | "completed"
  | "recording"
  | "comparing"
  | "error"
  | "exiting";

// Fixed durations since we have no measured per-audio timeline to drive
// off of — see the scope note at the top of this file.
export const YUMI_TIMING = {
  prepareMs: 250,
  tongueMoveMs: 350,
  contactPulseMs: 180,
  releaseMs: 260,
  returnToIdleMs: 450,
} as const;

// Neutral resting pose — mouth gently closed, tongue relaxed in the
// middle of the mouth, no airflow, no voicing, no contact highlight.
export const YUMI_IDLE_POSE: YumiRigPose = {
  mouth: { jawOpen: 0.12, lipRoundness: 0.15, lipSpread: 0.1, lipClosure: 0.2 },
  tongue: {
    tip: { x: 0.86, y: 0.55 },
    blade: { x: 0.68, y: 0.52 },
    middle: { x: 0.5, y: 0.5 },
    back: { x: 0.32, y: 0.5 },
    root: { x: 0.16, y: 0.52 },
    activeRegion: "neutral",
  },
  airflow: { enabled: false, path: "oral_center", intensity: 0 },
  voicing: { voiced: false, amplitude: 0 },
  contact: { zone: "none", intensity: 0 },
};

const ROUNDING_TO_VALUE: Record<LipRounding, number> = {
  unrounded: 0,
  slightly_rounded: 0.35,
  rounded: 0.7,
  strongly_rounded: 1,
};

// Where each contact zone sits along the mouth's tip→root axis (x) and
// how close to the "roof" of the mouth (y, smaller = higher) — used both
// to place the contact pulse and to pull the nearest tongue control point
// toward it.
const CONTACT_POSITION: Record<ContactZone, Point2D> = {
  upper_lip: { x: 0.95, y: 0.32 },
  lower_lip: { x: 0.95, y: 0.68 },
  upper_teeth: { x: 0.9, y: 0.36 },
  lower_teeth: { x: 0.9, y: 0.64 },
  alveolar_ridge: { x: 0.78, y: 0.34 },
  postalveolar_zone: { x: 0.68, y: 0.32 },
  hard_palate: { x: 0.55, y: 0.28 },
  soft_palate: { x: 0.38, y: 0.28 },
  velum: { x: 0.3, y: 0.3 },
  none: { x: 0.5, y: 0.5 },
};

const AIRFLOW_BY_MANNER: Record<Manner, AirflowRig["path"]> = {
  stop: "burst",
  fricative: "friction",
  affricate: "friction",
  nasal: "nasal",
  approximant: "oral_center",
  lateral: "oral_side",
  vowel: "oral_center",
};

// Restricted to the keys TongueRig actually has a Point2D for — "front" and
// "neutral" are valid *descriptive* regions (see TongueRegion/activeRegion
// above) but aren't points on their own, so contact nudging maps them onto
// the nearest real control point (front → blade, the part of the tongue
// that actually approaches the hard palate).
type TonguePointKey = "tip" | "blade" | "middle" | "back" | "root";

function pointKeyForContact(zone: ContactZone): TonguePointKey | null {
  switch (zone) {
    case "upper_lip":
    case "lower_lip":
    case "upper_teeth":
    case "lower_teeth":
    case "alveolar_ridge":
      return "tip";
    case "postalveolar_zone":
    case "hard_palate":
      return "blade";
    case "soft_palate":
    case "velum":
      return "back";
    default:
      return null;
  }
}

// Derives ONE target rig pose from a sound's phonetic features. Consonants
// pull the nearest tongue control point toward their contact zone;
// vowels/approximants shape the whole tongue body by height/frontness
// instead (no discrete contact point).
export function deriveRigPose(features: PhoneticFeatures): YumiRigPose {
  const jawOpen = features.jawOpening;
  const lipRoundness = ROUNDING_TO_VALUE[features.lipRounding];
  const lipSpread = features.lipRounding === "unrounded" ? 0.5 : 0.1;
  const lipClosure =
    features.place === "bilabial" && features.manner !== "vowel" ? 0.95 : 0.1;

  const hasContact = features.contactZone !== "none";
  const contactPoint = CONTACT_POSITION[features.contactZone];

  // Base tongue shape from height/frontness (0-1 → mouth-cavity
  // coordinates), then nudge the region nearest the contact zone toward
  // the actual contact point so the tongue visibly "touches" there.
  const baseY = 0.75 - features.tongueHeight * 0.55;
  const frontBias = features.tongueFrontness;

  const base: TongueRig = {
    root: { x: 0.16, y: baseY + 0.04 },
    back: { x: 0.32, y: baseY + (1 - frontBias) * -0.06 },
    middle: { x: 0.5, y: baseY },
    blade: { x: 0.68, y: baseY + frontBias * -0.06 },
    tip: { x: 0.86, y: baseY + frontBias * -0.08 },
    // Was `hasContact ? regionForContact(contactZone) : "neutral"` — tied
    // to whether the sound reaches full contact, so approximants (r/w/y),
    // which are defined by a distinctive tongue position but never
    // actually touch anything, fell back to "neutral" and lost their
    // shape entirely. features.tongueRegion is already hand-labeled per
    // sound (and already agrees with regionForContact() for every sound
    // that DOES have contact — alveolar → tip, velar → back, postalveolar
    // → blade, etc.), so it's a strictly more accurate, simpler source:
    // every sound gets a meaningful active region, contact or not.
    activeRegion: features.tongueRegion,
  };

  const pointKey = hasContact ? pointKeyForContact(features.contactZone) : null;
  const tongue: TongueRig = pointKey
    ? { ...base, [pointKey]: contactPoint }
    : base;

  return {
    mouth: { jawOpen, lipRoundness, lipSpread, lipClosure },
    tongue,
    airflow: {
      enabled: features.manner !== "vowel" || jawOpen > 0,
      path: AIRFLOW_BY_MANNER[features.manner],
      intensity: features.aspirated ? 0.9 : features.manner === "vowel" ? 0.25 : 0.55,
    },
    voicing: { voiced: features.voiced, amplitude: features.voiced ? 0.8 : 0 },
    contact: { zone: features.contactZone, intensity: hasContact ? 0.9 : 0 },
  };
}
