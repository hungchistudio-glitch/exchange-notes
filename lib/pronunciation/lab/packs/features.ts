import type {
  ContactZone,
  LipRounding,
  Manner,
  PhoneticFeatures,
  Place,
  TongueRegion,
} from "@/lib/pronunciation/yumiRig";

/* =========================================================
   Feature constructors

   PhoneticFeatures has twelve fields and every sound in every pack needs
   all of them, so written out longhand a pack is mostly punctuation. These
   two helpers carry the defaults that are true of a whole class of sound —
   a vowel has no contact zone, a consonant's voicing is the field that
   distinguishes half the pairs in any language — and take only what the
   individual sound actually differs by.

   They are pure sugar over the same struct. Nothing downstream knows they
   exist, and a sound that does not fit either shape can still be written
   out in full.
   ========================================================= */

type VowelSpec = {
  /** 0 (low) – 1 (high). */
  height: number;
  /** 0 (back) – 1 (front). */
  frontness: number;
  rounding?: LipRounding;
  /** 0 (closed) – 1 (wide open). Derived from height when omitted. */
  jaw?: number;
  nasal?: boolean;
};

/**
 * A vowel: shaped by the whole tongue body, touching nothing.
 *
 * Jaw opening is derived from height by default because the two really are
 * the same gesture seen from opposite ends — a high vowel is a closed jaw.
 * Passing `jaw` explicitly is for the handful of vowels where they come
 * apart, like English /æ/, which is low but opener than its height implies.
 */
export function vowel(spec: VowelSpec): PhoneticFeatures {
  return {
    manner: "vowel",
    place: "none",
    voiced: true,
    aspirated: false,
    nasal: spec.nasal ?? false,
    lipRounding: spec.rounding ?? "unrounded",
    jawOpening: spec.jaw ?? Math.max(0.08, 0.95 - spec.height * 0.8),
    tongueRegion: spec.frontness >= 0.6 ? "front" : spec.frontness <= 0.4 ? "back" : "middle",
    tongueHeight: spec.height,
    tongueFrontness: spec.frontness,
    contactZone: "none",
  };
}

type ConsonantSpec = {
  manner: Manner;
  place: Place;
  voiced: boolean;
  aspirated?: boolean;
  nasal?: boolean;
  rounding?: LipRounding;
  jaw?: number;
  tongue?: TongueRegion;
  height?: number;
  frontness?: number;
  contact?: ContactZone;
};

/** Where each place of articulation puts the tongue when nothing says otherwise. */
const DEFAULT_CONTACT: Record<Place, ContactZone> = {
  bilabial: "lower_lip",
  labiodental: "lower_lip",
  dental: "upper_teeth",
  alveolar: "alveolar_ridge",
  postalveolar: "postalveolar_zone",
  retroflex: "postalveolar_zone",
  palatal: "hard_palate",
  velar: "velum",
  glottal: "none",
  none: "none",
};

const DEFAULT_REGION: Record<Place, TongueRegion> = {
  bilabial: "neutral",
  labiodental: "neutral",
  dental: "tip",
  alveolar: "tip",
  postalveolar: "blade",
  retroflex: "tip",
  palatal: "front",
  velar: "back",
  glottal: "root",
  none: "neutral",
};

/**
 * A consonant: defined by where it obstructs, so contact zone and tongue
 * region follow from `place` unless a sound genuinely departs from it.
 *
 * An approximant is the case that departs: English /r/ is alveolar in the
 * sense of "the tongue aims there", but it never arrives, so it passes
 * `contact: "none"` and keeps its region.
 */
export function consonant(spec: ConsonantSpec): PhoneticFeatures {
  return {
    manner: spec.manner,
    place: spec.place,
    voiced: spec.voiced,
    aspirated: spec.aspirated ?? false,
    nasal: spec.nasal ?? spec.manner === "nasal",
    lipRounding: spec.rounding ?? "unrounded",
    jawOpening: spec.jaw ?? (spec.place === "bilabial" ? 0.06 : 0.15),
    tongueRegion: spec.tongue ?? DEFAULT_REGION[spec.place],
    tongueHeight: spec.height ?? 0.55,
    tongueFrontness: spec.frontness ?? (spec.place === "velar" ? 0.15 : 0.65),
    contactZone: spec.contact ?? DEFAULT_CONTACT[spec.place],
  };
}
