import type { ArticulationStep, ArticulationTimeline, StageKind } from "./articulationTimeline";
import type { PhoneticFeatures } from "./yumiRig";

/* =========================================================
   What to say about a moment

   Each moment of the timeline is shown with a line on what is happening,
   where in the mouth, and up to three things to watch — the details and
   cautions a learner misses by ear (Chi, 2026-10-19: "每個階段旁附注意
   事項"). They are derived from the sound's features and its place in the
   word, never written per word, so every language and every word gets
   them: a Spanish /p/ is told not to puff, an English one at the start of
   a stressed syllable is told to, and a Mandarin third tone is told when
   it only dips.

   Returns keys; the screen turns them into the reader's language
   (t.pronunciation.lab.timeline).
   ========================================================= */

export type PlaceKey =
  | "bilabial"
  | "labiodental"
  | "dental"
  | "alveolar"
  | "postalveolar"
  | "retroflex"
  | "palatal"
  | "velar"
  | "uvular"
  | "glottal";

export type ShapeKey = "vowel" | "nasal" | "lateral" | "approximant";

export type NoteKey =
  | "unaspirated"
  | "aspirated"
  | "voicedClosure"
  | "voiced"
  | "voiceless"
  | "geminate"
  | "longVowel"
  | "shortVowel"
  | "reduced"
  | "rounded"
  | "spread"
  | "nasalVowel"
  | "nasalAir"
  | "lateral"
  | "noTouch"
  | "retroflexTip"
  | "apical"
  | "dentalTip"
  | "uvular"
  | "glide"
  | "tapOnce"
  | "trillRelax"
  | "glottalStop"
  | "linked"
  | "finalStop"
  | "stressed"
  | "tone1"
  | "tone2"
  | "tone3"
  | "tone4"
  | "tone5"
  | "halfThird"
  | "sandhi";

export type MomentDescription = {
  kind: StageKind;
  /** The sound, as written. */
  symbol: string;
  /** For a "shape" moment: which kind of sound is being held. */
  shape?: ShapeKey;
  /** Where it is made; null for a vowel, which is described by `vowel`. */
  place: PlaceKey | null;
  vowel?: { height: "close" | "mid" | "open"; backness: "front" | "central" | "back" };
  /** At most three, most important first. */
  notes: NoteKey[];
};

const MAX_NOTES = 3;
/** Languages whose voiceless stops never puff — where learners over-puff. */
const UNASPIRATED_LANGUAGES = new Set(["es", "fr", "it"]);
/** Languages whose voiced stops buzz from the closure on. */
const PREVOICED_LANGUAGES = new Set(["es", "fr", "it"]);

function placeOf(features: PhoneticFeatures): PlaceKey | null {
  if (features.manner === "vowel") return null;
  if (features.place === "none") return null;
  /* Uvulars are drawn as the back of the velum (phones.ts). */
  if (features.contactZone === "soft_palate" && features.tongueFrontness <= 0.06) return "uvular";
  return features.place;
}

function vowelOf(features: PhoneticFeatures): MomentDescription["vowel"] {
  return {
    height: features.tongueHeight >= 0.7 ? "close" : features.tongueHeight >= 0.4 ? "mid" : "open",
    backness: features.tongueFrontness >= 0.65 ? "front" : features.tongueFrontness >= 0.35 ? "central" : "back",
  };
}

function shapeOf(features: PhoneticFeatures): ShapeKey {
  switch (features.manner) {
    case "nasal":
      return "nasal";
    case "lateral":
      return "lateral";
    case "approximant":
      return "approximant";
    default:
      return "vowel";
  }
}

/** Whether this is the first moment of its sound — notes about the whole
 *  sound (doubled, linked) are said once, on its first moment. */
function firstOfPhone(timeline: ArticulationTimeline, step: ArticulationStep): boolean {
  return timeline.steps.find((candidate) => candidate.phone === step.phone) === step;
}

export function describeMoment(
  timeline: ArticulationTimeline,
  step: ArticulationStep,
  language: string,
): MomentDescription | null {
  if (step.kind === "pause" || step.phone < 0) {
    return { kind: "pause", symbol: "", place: null, notes: [] };
  }

  const phone = timeline.utterance.phones[step.phone];
  if (!phone) return null;
  const f = phone.features;
  const syllable = timeline.utterance.syllables[phone.syllable];
  const timing = timeline.syllables[phone.syllable];
  const multiSyllable = timeline.utterance.syllables.length > 1;
  const notes: NoteKey[] = [];
  const first = firstOfPhone(timeline, step);
  const lastOfWord = (() => {
    const next = timeline.utterance.phones[step.phone + 1];
    return !next || next.wordStart;
  })();

  /* Tone is the first thing to watch in a Mandarin syllable, on every one
     of its moments: it is carried by the whole syllable. */
  if (syllable?.tone !== undefined && f.voiced && step.kind !== "closure") {
    if (timing?.sandhi) notes.push("sandhi");
    else if (timing?.halfThird) notes.push("halfThird");
    else notes.push(`tone${timing?.spokenTone ?? syllable.tone}` as NoteKey);
  }

  if (first && phone.linked) notes.push("linked");

  switch (step.kind) {
    case "closure":
      if (phone.geminate) notes.push("geminate");
      if (f.voiced && PREVOICED_LANGUAGES.has(language)) notes.push("voicedClosure");
      if (language === "en" && lastOfWord && f.manner === "stop") notes.push("finalStop");
      break;
    case "burst":
      if (!f.aspirated && !f.voiced && f.manner === "stop") {
        if (UNASPIRATED_LANGUAGES.has(language) || language === "zh-TW") notes.push("unaspirated");
      }
      break;
    case "aspiration":
      notes.push("aspirated");
      break;
    case "friction":
      if (phone.geminate) notes.push("geminate");
      if (f.place === "dental") notes.push("dentalTip");
      if (placeOf(f) === "uvular") notes.push("uvular");
      if (f.place === "retroflex") notes.push("retroflexTip");
      if (f.place !== "glottal" && f.manner === "fricative") notes.push(f.voiced ? "voiced" : "voiceless");
      break;
    case "tap":
      notes.push("tapOnce");
      break;
    case "trill":
      notes.push("trillRelax");
      if (phone.geminate || phone.long) notes.push("geminate");
      break;
    case "glottal":
      notes.push("glottalStop");
      break;
    case "glide":
      notes.push("glide");
      if (f.lipRounding === "rounded" || f.lipRounding === "strongly_rounded") notes.push("rounded");
      break;
    case "shape": {
      const apical = phone.symbol.includes("̩") && f.manner === "approximant";
      if (apical) {
        notes.push("apical");
        break;
      }
      if (f.manner === "nasal") {
        notes.push("nasalAir");
        if (phone.geminate) notes.push("geminate");
        break;
      }
      if (f.manner === "lateral") {
        notes.push("lateral");
        if (phone.geminate) notes.push("geminate");
        break;
      }
      if (f.manner === "approximant") {
        notes.push("noTouch");
        if (f.place === "retroflex" || f.tongueRegion === "tip") notes.push("retroflexTip");
        if (f.lipRounding === "rounded" || f.lipRounding === "strongly_rounded") notes.push("rounded");
        break;
      }
      /* A vowel. */
      if (phone.long) notes.push("longVowel");
      if (f.nasal) notes.push("nasalVowel");
      if (syllable?.stress === 2 && multiSyllable && syllable.tone === undefined) notes.push("stressed");
      if (syllable?.stress === 0 && ["ə", "ɐ", "ɨ", "ᵻ"].includes(phone.symbol)) notes.push("reduced");
      if (f.lipRounding === "rounded" || f.lipRounding === "strongly_rounded") notes.push("rounded");
      else if (f.tongueFrontness >= 0.8 && f.tongueHeight >= 0.7) notes.push("spread");
      if (f.tongueRegion === "tip") notes.push("retroflexTip");
      break;
    }
  }

  return {
    kind: step.kind,
    /* Long is part of the sound: /iː/, and Italian's doubled /tː/. */
    symbol: phone.long ? `${phone.symbol}ː` : phone.symbol,
    shape: step.kind === "shape" ? shapeOf(f) : undefined,
    place: placeOf(f),
    vowel: f.manner === "vowel" ? vowelOf(f) : undefined,
    notes: [...new Set(notes)].slice(0, MAX_NOTES),
  };
}
