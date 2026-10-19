import type { PhoneticFeatures } from "./yumiRig";

/* =========================================================
   A word, as the sounds that make it

   Yumi used to hold one mouth shape per sound and nothing per word: a word
   played with her mouth at rest, and a sound played as rest → shape → rest
   whatever kind of sound it was. To show where and how each sound happens
   in a word — the lips closing, the air held and let go, a vowel held
   long, the throat shutting for a glottal stop — she first needs the word
   as a sequence of sounds (Chi, 2026-10-19: "應該要完整像真實發音").

   This turns the transcriptions the app already has into that sequence:

     IPA     en, es, fr, it — from the built-in dictionary, the phonetics
             route, or a pack's examples ("/ˈɡrat.tsje/")
     zhuyin  zh-TW — "ㄍㄨㄥ ㄗㄨㄛˋ", tones and all

   and gives every sound the same PhoneticFeatures the sound cards use, so
   one rig draws all five languages. Prosody comes along per syllable:
   stress from ˈ and ˌ, tone from zhuyin's marks, length from ː and from
   doubled consonants.

   Approximate on purpose, and honest about it: a transcription says which
   sounds and in what order, not how many milliseconds each one lasts.
   articulationTimeline.ts estimates that part.
   ========================================================= */

export type Phone = {
  /** As written: "tʃ", "ã", "pʰ". */
  symbol: string;
  features: PhoneticFeatures;
  /** A long vowel (ː), or a consonant held long. */
  long: boolean;
  /** A doubled consonant: Italian "tt", held across the syllable break. */
  geminate: boolean;
  /** The moving second half of a diphthong, or a zhuyin medial. */
  glide: boolean;
  /** Index into the utterance's syllables. */
  syllable: number;
  /** First sound of a word after the first: a short pause comes before it. */
  wordStart: boolean;
  /** Joined to the sound before it across a word break (French liaison ‿). */
  linked: boolean;
};

export type Syllable = {
  /** 0 unstressed, 1 secondary, 2 primary. */
  stress: 0 | 1 | 2;
  /** Mandarin tone; 5 is the neutral tone. */
  tone?: 1 | 2 | 3 | 4 | 5;
  /** The syllable as written in the source transcription. */
  text: string;
};

export type Utterance = {
  phones: Phone[];
  syllables: Syllable[];
  /** How the pitch ends: a statement or a question-word question falls, a
   *  yes/no question rises. Absent: it falls. */
  intonation?: "fall" | "rise";
};

/* The words that open a question whose answer is not yes or no — the
   questions that fall at the end like statements, where yes/no ones rise. */
const QUESTION_WORDS: Record<string, readonly string[]> = {
  en: ["what", "where", "why", "who", "whom", "whose", "when", "how", "which"],
  es: ["qué", "dónde", "adónde", "cuándo", "cómo", "por qué", "quién", "quiénes", "cuál", "cuáles", "cuánto", "cuánta", "cuántos", "cuántas"],
  fr: ["où", "quand", "comment", "pourquoi", "qui", "que", "qu'", "quel", "quelle", "quels", "quelles", "combien"],
  it: ["dove", "quando", "come", "perché", "chi", "che", "cosa", "quale", "quali", "quanto", "quanta", "quanti", "quante"],
};

/**
 * How a sentence's pitch ends, from how it is written: a question mark
 * without a question word rises ("Are you coming?"), and everything else
 * falls ("Where are you going?", "I'm coming."). Mandarin carries its
 * questions in particles and tones, not in this, so it is left alone.
 */
export function intonationOf(text: string, language: string): Utterance["intonation"] {
  const trimmed = text.trim();
  if (language === "zh-TW" || !/[?？]$/.test(trimmed)) return "fall";
  const opening = trimmed.replace(/^[¿¡"“«\s]+/, "").toLocaleLowerCase();
  const words = QUESTION_WORDS[language] ?? [];
  const opensWith = (word: string) =>
    opening.startsWith(`${word} `) ||
    opening.startsWith(`${word}?`) ||
    /* French elides: "qu'est-ce que…". */
    (word.endsWith("'") && opening.startsWith(word));
  return words.some(opensWith) ? "fall" : "rise";
}

/* ── Features ───────────────────────────────────────────────────────────
   Built from manner and place, with the defaults the hand-written sound
   cards use for each place (englishSounds.ts, zhuyinSounds.ts), so a
   sound looks the same in a word as on its own card. */

type Place = PhoneticFeatures["place"];

const PLACE_DEFAULTS: Record<
  Place,
  Pick<
    PhoneticFeatures,
    "jawOpening" | "tongueRegion" | "tongueHeight" | "tongueFrontness" | "contactZone" | "lipRounding"
  >
> = {
  bilabial: { jawOpening: 0.06, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.5, contactZone: "lower_lip", lipRounding: "unrounded" },
  labiodental: { jawOpening: 0.15, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.6, contactZone: "lower_lip", lipRounding: "unrounded" },
  dental: { jawOpening: 0.2, tongueRegion: "tip", tongueHeight: 0.7, tongueFrontness: 0.95, contactZone: "upper_teeth", lipRounding: "unrounded" },
  alveolar: { jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge", lipRounding: "unrounded" },
  postalveolar: { jawOpening: 0.2, tongueRegion: "blade", tongueHeight: 0.7, tongueFrontness: 0.75, contactZone: "postalveolar_zone", lipRounding: "slightly_rounded" },
  retroflex: { jawOpening: 0.2, tongueRegion: "tip", tongueHeight: 0.72, tongueFrontness: 0.62, contactZone: "postalveolar_zone", lipRounding: "unrounded" },
  palatal: { jawOpening: 0.2, tongueRegion: "front", tongueHeight: 0.85, tongueFrontness: 0.8, contactZone: "hard_palate", lipRounding: "unrounded" },
  velar: { jawOpening: 0.15, tongueRegion: "back", tongueHeight: 0.75, tongueFrontness: 0.15, contactZone: "velum", lipRounding: "unrounded" },
  glottal: { jawOpening: 0.3, tongueRegion: "neutral", tongueHeight: 0.4, tongueFrontness: 0.5, contactZone: "none", lipRounding: "unrounded" },
  none: { jawOpening: 0.3, tongueRegion: "middle", tongueHeight: 0.5, tongueFrontness: 0.5, contactZone: "none", lipRounding: "unrounded" },
};

function consonant(
  manner: PhoneticFeatures["manner"],
  place: Place,
  voiced: boolean,
  extra: Partial<PhoneticFeatures> = {},
): PhoneticFeatures {
  const defaults = PLACE_DEFAULTS[place];
  return {
    manner,
    place,
    voiced,
    aspirated: false,
    nasal: manner === "nasal",
    ...defaults,
    /* Approximants shape the mouth without touching anything. */
    contactZone: manner === "approximant" ? "none" : defaults.contactZone,
    ...extra,
  };
}

function vowel(
  height: number,
  frontness: number,
  rounding: PhoneticFeatures["lipRounding"],
  extra: Partial<PhoneticFeatures> = {},
): PhoneticFeatures {
  return {
    manner: "vowel",
    place: "none",
    voiced: true,
    aspirated: false,
    nasal: false,
    lipRounding: rounding,
    /* The jaw opens as the tongue lowers: close vowels ~0.2, open ~0.9. */
    jawOpening: Math.round((0.15 + (1 - height) * 0.75) * 100) / 100,
    tongueRegion: "middle",
    tongueHeight: height,
    tongueFrontness: frontness,
    contactZone: "none",
    ...extra,
  };
}

/** Every base symbol the five languages' transcriptions use, and a few more
 *  a model's IPA tends to produce. Language-specific readings ("r") are
 *  resolved in symbolFeatures below. */
const IPA: Record<string, PhoneticFeatures> = {
  // Stops
  p: consonant("stop", "bilabial", false),
  b: consonant("stop", "bilabial", true),
  t: consonant("stop", "alveolar", false),
  d: consonant("stop", "alveolar", true),
  ʈ: consonant("stop", "retroflex", false),
  c: consonant("stop", "palatal", false),
  ɟ: consonant("stop", "palatal", true),
  k: consonant("stop", "velar", false),
  ɡ: consonant("stop", "velar", true),
  g: consonant("stop", "velar", true),
  q: consonant("stop", "velar", false, { tongueFrontness: 0.05, contactZone: "soft_palate" }),
  ʔ: consonant("stop", "glottal", false),
  // Nasals
  m: consonant("nasal", "bilabial", true),
  ɱ: consonant("nasal", "labiodental", true),
  n: consonant("nasal", "alveolar", true),
  ɳ: consonant("nasal", "retroflex", true),
  ɲ: consonant("nasal", "palatal", true),
  ŋ: consonant("nasal", "velar", true),
  ɴ: consonant("nasal", "velar", true, { tongueFrontness: 0.05, contactZone: "soft_palate" }),
  // Taps and trills
  ɾ: consonant("tap", "alveolar", true),
  ɽ: consonant("tap", "retroflex", true),
  r: consonant("trill", "alveolar", true),
  ʀ: consonant("trill", "velar", true, { tongueFrontness: 0.05, contactZone: "soft_palate" }),
  // Fricatives
  ɸ: consonant("fricative", "bilabial", false, { jawOpening: 0.1 }),
  β: consonant("fricative", "bilabial", true, { jawOpening: 0.1 }),
  f: consonant("fricative", "labiodental", false),
  v: consonant("fricative", "labiodental", true),
  θ: consonant("fricative", "dental", false),
  ð: consonant("fricative", "dental", true),
  s: consonant("fricative", "alveolar", false),
  z: consonant("fricative", "alveolar", true),
  ʃ: consonant("fricative", "postalveolar", false),
  ʒ: consonant("fricative", "postalveolar", true),
  ʂ: consonant("fricative", "retroflex", false),
  ʐ: consonant("fricative", "retroflex", true),
  ɕ: consonant("fricative", "palatal", false, { tongueRegion: "blade", tongueFrontness: 0.78 }),
  ʑ: consonant("fricative", "palatal", true, { tongueRegion: "blade", tongueFrontness: 0.78 }),
  ç: consonant("fricative", "palatal", false),
  ʝ: consonant("fricative", "palatal", true),
  x: consonant("fricative", "velar", false),
  ɣ: consonant("fricative", "velar", true),
  χ: consonant("fricative", "velar", false, { tongueFrontness: 0.05, contactZone: "soft_palate" }),
  ʁ: consonant("fricative", "velar", true, { tongueFrontness: 0.05, contactZone: "soft_palate" }),
  h: consonant("fricative", "glottal", false),
  ɦ: consonant("fricative", "glottal", true),
  // Laterals
  l: consonant("lateral", "alveolar", true),
  ɫ: consonant("lateral", "alveolar", true, { tongueRegion: "back", tongueFrontness: 0.35 }),
  ɭ: consonant("lateral", "retroflex", true),
  ʎ: consonant("lateral", "palatal", true),
  // Approximants
  j: consonant("approximant", "palatal", true, { tongueRegion: "front" }),
  w: consonant("approximant", "velar", true, { lipRounding: "strongly_rounded" }),
  ɥ: consonant("approximant", "palatal", true, { tongueRegion: "front", lipRounding: "strongly_rounded" }),
  ɹ: consonant("approximant", "alveolar", true, { tongueHeight: 0.6, tongueFrontness: 0.6, lipRounding: "slightly_rounded", jawOpening: 0.22 }),
  ɻ: consonant("approximant", "retroflex", true, { tongueHeight: 0.62, lipRounding: "unrounded" }),
  ʋ: consonant("approximant", "labiodental", true),
  ɰ: consonant("approximant", "velar", true),
  // Vowels — height 0 (open) … 1 (close), frontness 0 (back) … 1 (front)
  i: vowel(0.95, 0.95, "unrounded"),
  y: vowel(0.95, 0.9, "strongly_rounded"),
  ɪ: vowel(0.78, 0.82, "unrounded"),
  ʏ: vowel(0.78, 0.8, "rounded"),
  e: vowel(0.75, 0.88, "unrounded"),
  ø: vowel(0.75, 0.82, "rounded"),
  ɛ: vowel(0.55, 0.8, "unrounded"),
  œ: vowel(0.55, 0.75, "rounded"),
  æ: vowel(0.25, 0.75, "unrounded"),
  a: vowel(0.15, 0.6, "unrounded"),
  ɶ: vowel(0.15, 0.6, "rounded"),
  ɐ: vowel(0.3, 0.5, "unrounded"),
  ɑ: vowel(0.12, 0.15, "unrounded"),
  ɒ: vowel(0.15, 0.15, "slightly_rounded"),
  ʌ: vowel(0.42, 0.4, "unrounded"),
  ɔ: vowel(0.4, 0.2, "rounded"),
  ɤ: vowel(0.65, 0.3, "unrounded"),
  o: vowel(0.68, 0.18, "rounded"),
  ʊ: vowel(0.8, 0.2, "rounded"),
  u: vowel(0.9, 0.05, "strongly_rounded"),
  ɯ: vowel(0.9, 0.1, "unrounded"),
  ɨ: vowel(0.9, 0.5, "unrounded"),
  ʉ: vowel(0.9, 0.5, "rounded"),
  ɘ: vowel(0.7, 0.5, "unrounded"),
  ɵ: vowel(0.7, 0.5, "rounded"),
  ə: vowel(0.5, 0.5, "unrounded"),
  ɜ: vowel(0.5, 0.45, "unrounded"),
  ɞ: vowel(0.5, 0.45, "rounded"),
  ɚ: vowel(0.55, 0.5, "slightly_rounded", { tongueRegion: "tip" }),
  ɝ: vowel(0.55, 0.5, "slightly_rounded", { tongueRegion: "tip" }),
  ᵻ: vowel(0.85, 0.6, "unrounded"),
};

/* The single-character affricate ligatures some sources still use. */
const LIGATURES: Record<string, string> = { ʧ: "tʃ", ʤ: "dʒ", ʦ: "ts", ʣ: "dz", ʨ: "tɕ", ʥ: "dʑ" };

/* Two symbols, one sound: a closure released into friction. A tie bar
   always joins them; without one these are joined anyway, because that is
   how the five languages' data writes them. "ts" and "dz" are left apart
   in English, where "cats" is a /t/ then an /s/. */
const AFFRICATES: Record<string, PhoneticFeatures> = {
  tʃ: consonant("affricate", "postalveolar", false),
  dʒ: consonant("affricate", "postalveolar", true),
  ts: consonant("affricate", "alveolar", false),
  dz: consonant("affricate", "alveolar", true),
  tɕ: consonant("affricate", "palatal", false, { tongueRegion: "blade", tongueFrontness: 0.78 }),
  dʑ: consonant("affricate", "palatal", true, { tongueRegion: "blade", tongueFrontness: 0.78 }),
  ʈʂ: consonant("affricate", "retroflex", false),
  ɖʐ: consonant("affricate", "retroflex", true),
  pf: consonant("affricate", "labiodental", false),
};

const LANGUAGE_SPECIFIC: Partial<Record<string, Record<string, PhoneticFeatures>>> = {
  /* English data from the CMU dictionary writes its approximant r as "r". */
  en: { r: IPA.ɹ },
};

function symbolFeatures(symbol: string, language: string): PhoneticFeatures | undefined {
  return (
    LANGUAGE_SPECIFIC[language]?.[symbol] ??
    AFFRICATES[LIGATURES[symbol] ?? symbol] ??
    IPA[symbol]
  );
}

export function isVowel(features: PhoneticFeatures): boolean {
  return features.manner === "vowel";
}

/* ── IPA ────────────────────────────────────────────────────────────── */

const STRESS_PRIMARY = "ˈ";
const STRESS_SECONDARY = "ˌ";
const LONG = new Set(["ː", "ˑ", ":"]);
const TIE = new Set(["͡", "͜"]);
const NASALIZED = "̃";
const NON_SYLLABIC = "̯";
const SYLLABIC = "̩";
const ASPIRATED = "ʰ";
const RHOTIC = "˞";
const LABIALIZED = "ʷ";
const SYLLABLE_BREAK = new Set([".", "-"]);
const WORD_BREAK = new Set([" ", " "]);
const LIAISON = "‿";
/** The vowels a diphthong glides out on. Not ə: the app's English is
 *  American (CMU), where "anterior" is ri-ər, two syllables, not a
 *  centring diphthong. */
const OFFGLIDES = new Set(["ɪ", "i", "ʊ", "u", "y", "ʏ"]);
/** Marks that change nothing the animation can show. */
const IGNORED = new Set(["ʲ", "̪", "̥", "̚", "̆", "̈", "̠", "̟", "ˀ", "ʼ", "̹", "̜", "̝", "̞", "̘", "̙"]);

type Token = {
  symbol: string;
  features: PhoneticFeatures;
  long: boolean;
  syllabic: boolean;
  nonSyllabic: boolean;
  /* What came before it. */
  stress: 0 | 1 | 2 | null;
  syllableBreak: boolean;
  wordBreak: boolean;
  linked: boolean;
};

/**
 * The sounds in an IPA transcription, as written.
 *
 * Slashes and brackets are dropped; unknown symbols are skipped rather than
 * guessed at, so a stray character costs one sound, not the word.
 */
function tokenizeIpa(ipa: string, language: string): Token[] {
  const text = ipa.normalize("NFD").replace(/[/[\]()]/g, "").trim();
  const chars = [...text];
  const tokens: Token[] = [];

  let stress: Token["stress"] = null;
  let syllableBreak = false;
  let wordBreak = false;
  let linked = false;

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];

    if (char === STRESS_PRIMARY) {
      stress = 2;
      syllableBreak = tokens.length > 0;
      continue;
    }
    if (char === STRESS_SECONDARY) {
      stress = 1;
      syllableBreak = tokens.length > 0;
      continue;
    }
    if (SYLLABLE_BREAK.has(char)) {
      syllableBreak = tokens.length > 0;
      continue;
    }
    if (WORD_BREAK.has(char)) {
      if (tokens.length > 0) wordBreak = true;
      continue;
    }
    if (char === LIAISON) {
      linked = true;
      continue;
    }

    const previous = tokens.at(-1);

    if (LONG.has(char)) {
      if (previous) previous.long = true;
      continue;
    }
    if (char === NASALIZED) {
      if (previous) previous.features = { ...previous.features, nasal: true };
      continue;
    }
    if (char === ASPIRATED) {
      if (previous) previous.features = { ...previous.features, aspirated: true };
      continue;
    }
    if (char === NON_SYLLABIC) {
      if (previous) previous.nonSyllabic = true;
      continue;
    }
    if (char === SYLLABIC) {
      if (previous) previous.syllabic = true;
      continue;
    }
    if (char === RHOTIC) {
      if (previous) previous.features = { ...previous.features, tongueRegion: "tip" };
      continue;
    }
    if (char === LABIALIZED) {
      if (previous) previous.features = { ...previous.features, lipRounding: "rounded" };
      continue;
    }
    if (TIE.has(char) || IGNORED.has(char)) continue;

    /* Two-symbol affricates: a tie bar between them, or a pair the data
       always means as one sound. */
    const next = chars[index + 1];
    const afterTie = TIE.has(next ?? "") ? chars[index + 2] : undefined;
    const pair = afterTie ? char + afterTie : char + (next ?? "");
    const joins =
      AFFRICATES[pair] &&
      (afterTie !== undefined || !(language === "en" && (pair === "ts" || pair === "dz")));

    const symbol = joins ? pair : char;
    const features = symbolFeatures(symbol, language);
    if (!features) continue;

    tokens.push({
      symbol,
      features,
      long: false,
      syllabic: false,
      nonSyllabic: false,
      stress,
      syllableBreak,
      wordBreak,
      linked,
    });

    stress = null;
    syllableBreak = false;
    wordBreak = false;
    linked = false;
    if (joins) index += afterTie !== undefined ? 2 : 1;
  }

  return tokens;
}

/**
 * The sounds of an IPA transcription, with their syllables.
 *
 * Syllables come from the transcription's own breaks and stress marks when
 * it has them (Spanish and Italian data marks every one); otherwise each
 * vowel starts one, and a cluster between two vowels is split so that its
 * last consonant opens the next — close enough to put stress and timing on
 * the right vowel, which is all the animation needs of a syllable.
 */
export function parseIpa(ipa: string, language: string): Utterance {
  const tokens = tokenizeIpa(ipa, language);

  /* A doubled consonant is one long one: "t.t", "tt", "t.ts", "sː". */
  const merged: Token[] = [];
  for (const token of tokens) {
    const previous = merged.at(-1);
    const sameWord = !token.wordBreak;
    if (
      previous &&
      sameWord &&
      !isVowel(token.features) &&
      !isVowel(previous.features) &&
      (previous.symbol === token.symbol ||
        (AFFRICATES[token.symbol] && token.symbol.startsWith(previous.symbol)))
    ) {
      merged[merged.length - 1] = {
        ...token,
        long: true,
        stress: token.stress ?? previous.stress,
        syllableBreak: previous.syllableBreak || token.syllableBreak,
        wordBreak: previous.wordBreak,
        linked: previous.linked,
      };
      continue;
    }
    merged.push({ ...token });
  }

  /*
   * Which vowels are a syllable's nucleus. A vowel straight after a nucleus
   * in the same syllable is the glide out of it when it is one of the
   * sounds diphthongs end on — "aɪ", "oʊ", "eɪ" — and a nucleus of its own
   * otherwise, so "quiet" /ˈkwaɪət/ is two syllables, not one.
   */
  const nucleus: boolean[] = [];
  merged.forEach((token, index) => {
    if (token.syllabic) {
      nucleus.push(true);
      return;
    }
    if (!isVowel(token.features) || token.nonSyllabic) {
      nucleus.push(false);
      return;
    }
    const previous = merged[index - 1];
    const glidesOut =
      previous !== undefined &&
      nucleus[index - 1] &&
      isVowel(previous.features) &&
      !token.syllableBreak &&
      !token.wordBreak &&
      OFFGLIDES.has(token.symbol);
    nucleus.push(!glidesOut);
  });

  /*
   * Where each syllable starts: at a break or stress mark the
   * transcription gives between two nuclei, else at the last consonant
   * before the vowel, so a cluster between two vowels is split with its
   * last consonant opening the next syllable. Close enough to put stress
   * and timing on the right vowel, which is all the animation needs.
   */
  const starts = new Set<number>([0]);
  let lastNucleus = -1;
  merged.forEach((token, index) => {
    if (token.wordBreak) {
      starts.add(index);
      lastNucleus = -1;
    }
    if (!nucleus[index]) return;
    if (lastNucleus >= 0) {
      let marked = -1;
      for (let at = lastNucleus + 1; at <= index; at += 1) {
        const candidate = merged[at];
        if (candidate.syllableBreak || candidate.stress !== null || candidate.wordBreak) {
          marked = at;
        }
      }
      /* Never at a glide: the ɪ of "aɪ" belongs to the syllable it ends. */
      const consonantBefore = index - 1 > lastNucleus && !isVowel(merged[index - 1].features);
      starts.add(marked >= 0 ? marked : consonantBefore ? index - 1 : index);
    }
    lastNucleus = index;
  });

  const syllables: Syllable[] = [];
  const phones: Phone[] = [];
  let current = -1;

  merged.forEach((token, index) => {
    if (starts.has(index)) {
      current += 1;
      syllables.push({ stress: 0, text: "" });
    }
    const syllable = syllables[current];
    if (token.stress !== null && token.stress > syllable.stress) syllable.stress = token.stress;
    syllable.text += token.symbol;

    phones.push({
      symbol: token.symbol,
      features: token.features,
      long: token.long,
      geminate: token.long && !isVowel(token.features),
      glide: (isVowel(token.features) && !nucleus[index]) || token.nonSyllabic,
      syllable: current,
      wordStart: token.wordBreak,
      linked: token.linked,
    });
  });

  /* A transcription with no stress marks still has a beat: give it to the
     only syllable there is, or leave the word level (French has no word
     stress to mark, and the phrase-final lengthening is timing's job). */
  if (syllables.length === 1 && syllables[0].stress === 0) syllables[0].stress = 2;

  if (language === "en") aspirateEnglishStops(phones, syllables);

  return { phones, syllables };
}

/**
 * English p, t, k puff at the start of a stressed syllable or a word — the
 * "pin" that blows out a match where "spin" does not. Dictionaries leave
 * it unwritten because English speakers never notice it; a learner whose
 * own language has no puff, or puffs everywhere, needs to see where it is.
 */
function aspirateEnglishStops(phones: Phone[], syllables: Syllable[]) {
  phones.forEach((phone, index) => {
    const f = phone.features;
    if (f.manner !== "stop" || f.voiced || f.place === "glottal") return;
    const previous = phones[index - 1];
    const opensSyllable = !previous || previous.syllable !== phone.syllable;
    const opensWord = index === 0 || phone.wordStart;
    if (!opensSyllable) return;
    if (!opensWord && (syllables[phone.syllable]?.stress ?? 0) === 0) return;
    phones[index] = { ...phone, features: { ...f, aspirated: true } };
  });
}

/* ── Zhuyin ─────────────────────────────────────────────────────────── */

const ZHUYIN_INITIALS: Record<string, string> = {
  ㄅ: "p", ㄆ: "pʰ", ㄇ: "m", ㄈ: "f",
  ㄉ: "t", ㄊ: "tʰ", ㄋ: "n", ㄌ: "l",
  ㄍ: "k", ㄎ: "kʰ", ㄏ: "x",
  ㄐ: "tɕ", ㄑ: "tɕʰ", ㄒ: "ɕ",
  ㄓ: "ʈʂ", ㄔ: "ʈʂʰ", ㄕ: "ʂ", ㄖ: "ʐ",
  ㄗ: "ts", ㄘ: "tsʰ", ㄙ: "s",
};

/** The rime, as sounds, after any medial. Compound finals move: ㄞ is a
 *  vowel gliding to i, ㄢ a vowel closing onto n. */
const ZHUYIN_FINALS: Record<string, string[]> = {
  ㄚ: ["a"], ㄛ: ["o"], ㄜ: ["ɤ"], ㄝ: ["e"],
  ㄞ: ["a", "i̯"], ㄟ: ["e", "i̯"], ㄠ: ["ɑ", "u̯"], ㄡ: ["o", "u̯"],
  ㄢ: ["a", "n"], ㄣ: ["ə", "n"], ㄤ: ["ɑ", "ŋ"], ㄥ: ["ə", "ŋ"],
  ㄦ: ["ɚ"],
};

/** Medial + final pairs that sound unlike their parts. */
const ZHUYIN_COMBINED: Record<string, string[]> = {
  ㄧㄢ: ["j", "ɛ", "n"],
  ㄩㄢ: ["ɥ", "ɛ", "n"],
  ㄧㄣ: ["i", "n"],
  ㄩㄣ: ["y", "n"],
  ㄧㄥ: ["i", "ŋ"],
  ㄨㄥ: ["ʊ", "ŋ"],
  ㄩㄥ: ["j", "ʊ", "ŋ"],
  ㄨㄣ: ["w", "ə", "n"],
  ㄧㄡ: ["j", "o", "u̯"],
  ㄨㄟ: ["w", "e", "i̯"],
};

const ZHUYIN_MEDIAL_ALONE: Record<string, string> = { ㄧ: "i", ㄨ: "u", ㄩ: "y" };
const ZHUYIN_MEDIAL_GLIDE: Record<string, string> = { ㄧ: "j", ㄨ: "w", ㄩ: "ɥ" };

/** After these alone, the tongue stays where the initial put it and the
 *  voice carries on: 知 is ㄓ held and voiced, not ㄓ plus a vowel. */
const APICAL: Record<string, string> = {
  ㄓ: "ɻ", ㄔ: "ɻ", ㄕ: "ɻ", ㄖ: "ɻ",
  ㄗ: "ɹ", ㄘ: "ɹ", ㄙ: "ɹ",
};

const TONE_MARKS: Record<string, Syllable["tone"]> = { "ˊ": 2, "ˇ": 3, "ˋ": 4, "˙": 5 };

function zhuyinPhones(syllable: string): { sounds: string[]; tone: Syllable["tone"] } {
  let tone: Syllable["tone"] = 1;
  let body = "";
  for (const char of syllable) {
    if (TONE_MARKS[char]) tone = TONE_MARKS[char];
    else if (char !== "ˉ") body += char;
  }

  const sounds: string[] = [];
  let rest = body;
  const initial = rest[0] && ZHUYIN_INITIALS[rest[0]] ? rest[0] : "";
  if (initial) {
    sounds.push(ZHUYIN_INITIALS[initial]);
    rest = rest.slice(1);
  }

  if (!rest) {
    if (initial && APICAL[initial]) sounds.push(`${APICAL[initial]}̩`);
    return { sounds, tone };
  }

  const combined = ZHUYIN_COMBINED[rest];
  if (combined) return { sounds: [...sounds, ...combined], tone };

  const medial = ZHUYIN_MEDIAL_ALONE[rest[0]] ? rest[0] : "";
  if (medial) {
    rest = rest.slice(1);
    sounds.push(rest ? ZHUYIN_MEDIAL_GLIDE[medial] : ZHUYIN_MEDIAL_ALONE[medial]);
  }
  for (const char of rest) sounds.push(...(ZHUYIN_FINALS[char] ?? []));
  return { sounds, tone };
}

/**
 * The sounds of a zhuyin transcription: one syllable per space-separated
 * group, each with its tone, its initial, any medial, and its rime spelled
 * out as the movement it is.
 */
export function parseZhuyin(zhuyin: string): Utterance {
  const syllables: Syllable[] = [];
  const phones: Phone[] = [];

  const groups = zhuyin
    .normalize("NFC")
    .split(/[\s　,，、。]+/)
    .map((group) => group.trim())
    .filter(Boolean);

  for (const group of groups) {
    const { sounds, tone } = zhuyinPhones(group);
    if (!sounds.length) continue;
    const index = syllables.length;
    /* Mandarin has no word stress to mark; the neutral tone is the light
       one, and every other syllable carries its tone at full weight. */
    syllables.push({ stress: tone === 5 ? 0 : 2, tone, text: group });

    const parsed = parseIpa(sounds.join(""), "zh-TW").phones;
    parsed.forEach((phone, at) => {
      phones.push({
        ...phone,
        syllable: index,
        /* Every syllable after the first is its own character. */
        wordStart: false,
        geminate: false,
        long: false,
        glide: phone.glide || (at > 0 && ["j", "w", "ɥ"].includes(phone.symbol)),
      });
    });
  }

  return { phones, syllables };
}

/** Whether `text` is written in zhuyin. */
export function isZhuyin(text: string): boolean {
  return /[ㄅ-ㄩ]/.test(text);
}

/**
 * The sounds of a transcription in whichever system it is written in.
 * Null when there is nothing to animate.
 */
export function parseTranscription(text: string | undefined, language: string): Utterance | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const utterance = isZhuyin(trimmed) ? parseZhuyin(trimmed) : parseIpa(trimmed, language);
  return utterance.phones.length ? utterance : null;
}

/** One sound on its own, as a sound card demonstrates it. */
export function singlePhone(features: PhoneticFeatures, symbol: string): Utterance {
  return {
    phones: [
      {
        symbol,
        features,
        long: false,
        geminate: false,
        glide: false,
        syllable: 0,
        wordStart: false,
        linked: false,
      },
    ],
    syllables: [{ stress: 2, text: symbol }],
  };
}
