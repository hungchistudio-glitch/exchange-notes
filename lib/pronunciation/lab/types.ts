import type { LanguageCode } from "@/lib/languages";
import type { LocalizedText } from "@/lib/pronunciation/localizedText";
import type { PhoneticFeatures } from "@/lib/pronunciation/yumiRig";

/* =========================================================
   The Pronunciation Lab's data model

   One engine, N languages. Everything below is language-agnostic: a
   language becomes teachable by contributing a PronunciationLanguagePack
   (lib/pronunciation/lab/packs/*), never by adding a branch to a screen.

   The test this model is built to pass: adding Japanese should mean a new
   pack file, a registry row and translations — not a change to any type
   here and not a change to any component that reads them.
   ========================================================= */

/**
 * What kind of thing a unit teaches.
 *
 * Deliberately wider than "phoneme": Chinese teaches symbols (zhuyin) and
 * tones, English teaches letters as often as sounds, and Italian's real
 * lesson is consonant *length*. Forcing all of those through "phoneme"
 * would mean every screen re-deriving what it is actually looking at.
 */
export type PronunciationCategory =
  | "phoneme"
  | "grapheme"
  | "syllable"
  | "tone"
  | "stress"
  | "rhythm"
  | "intonation"
  | "connected-speech"
  | "minimal-pair";

/** The six first-level modules. Universal; what they contain is not. */
export type PronunciationModuleId =
  | "sounds"
  | "listen"
  | "speak"
  | "words"
  | "rhythm"
  | "review";
/**
 * How well a unit is known.
 *
 * Four states rather than vocabulary's three ("new" | "learning" |
 * "mastered"): a sound spends a long, visible stretch getting better before
 * it is right, and collapsing that into "learning" hides the only progress
 * a learner can actually feel. Mapped onto the vocabulary states at the one
 * place the two meet (lib/pronunciation/lab/words.ts).
 */
export type PronunciationMastery =
  | "new"
  | "learning"
  | "improving"
  | "mastered";
/* =========================================================
   Units
   ========================================================= */

/** An example word or phrase for a unit. */
export type PronunciationExample = {
  /** The example itself, in the language being learned. */
  text: string;
  /** What it means, in whichever interface languages it was written for. */
  meaning?: LocalizedText;
  /**
   * The example's own phonetic spelling in whatever system the language
   * uses — zhuyin for Chinese, IPA for the rest. Absent means the language
   * offers none, which a renderer should skip rather than draw empty.
   */
  phonetic?: string;
  /**
   * The substring of `text` (or of `phonetic`, for a language whose script
   * does not spell the sound) where the target sound actually lives.
   *
   * Authored rather than searched for. Spelling-to-sound is irregular in
   * exactly the languages this matters for, and a wrong highlight teaches
   * the wrong thing more confidently than no highlight does.
   */
  highlight?: string;
  /** Pre-recorded audio, when it exists. TTS covers the rest. */
  audio?: string;
};

/** Prose articulation notes. Every field optional; render only what exists. */
export type ArticulationNotes = {
  tongue?: LocalizedText;
  lips?: LocalizedText;
  jaw?: LocalizedText;
  airflow?: LocalizedText;
  voicing?: LocalizedText;
  resonance?: LocalizedText;
};

/** A short labelled teaching point, shown as a row under a sound. */
export type GuidancePoint = { label: LocalizedText; text: LocalizedText };

/** A contrast a learner is likely to get wrong, and why. */
export type CommonMistake = {
  /** What it tends to come out as, written in the learner's target language. */
  confusedWith: string;
  explanation: LocalizedText;
};

/**
 * One teachable unit of pronunciation.
 *
 * `symbol` is what the learner sees on the tile and `phoneticRepresentation`
 * is the notation underneath it — for English those are "B" and "/b/", for
 * Chinese "ㄅ" and "b", for a tone "ˊ" and "35". Only `symbol` is required,
 * because only `symbol` is true of every writing system.
 */
export type PronunciationUnit = {
  /** Unique within its pack. Namespaced by pack id at the registry edge. */
  id: string;
  language: LanguageCode;
  category: PronunciationCategory;

  /** The glyph or letters shown large on the tile. */
  symbol: string;
  /** A longer name, when the symbol alone is not self-explanatory. */
  displayLabel?: LocalizedText;
  /** How the language's own script writes it, if that differs from `symbol`. */
  nativeRepresentation?: string;
  /** IPA, pinyin, a tone contour — whatever this language annotates with. */
  phoneticRepresentation?: string;

  /**
   * Text handed to speech synthesis for this unit's own sound.
   *
   * A real word wherever possible: TTS reads bare symbols unpredictably, and
   * for zhuyin the standard teaching syllable ("ㄅ" → 玻) is what a Taiwanese
   * classroom actually says out loud.
   */
  speechText?: string;
  /** Pre-recorded audio for the unit itself. */
  audio?: string;

  description?: LocalizedText;
  /** 2-3 short points shown by default, above the fold. */
  guidance?: GuidancePoint[];
  /** The fuller explanation, behind "more guidance". */
  tip?: LocalizedText;

  articulation?: ArticulationNotes;
  /**
   * Structured articulation, for Yumi's mouth and tongue.
   *
   * Absent for units that are not a single articulated sound — a tone, a
   * stress pattern, a rhythm rule. Yumi still has states for those; she just
   * has no mouth shape to hold.
   */
  features?: PhoneticFeatures;

  examples: PronunciationExample[];
  commonMistake?: CommonMistake;

  /** 1 (easiest) – 5. Used to order a first pass through a category. */
  difficulty: number;

  /**
   * Which group this unit belongs to inside its pack, e.g. "vowels",
   * "initials", "nasal-vowels". Free-form per language; the pack's
   * `categories` list is what turns these into a labelled, ordered UI.
   */
  group: string;

  tags?: string[];
  /**
   * Which regional pronunciation this unit describes, when the language has
   * more than one worth naming. Absent means "true across the language".
   */
  dialect?: string;
};

/** A named, ordered group of units inside a pack. */
export type PronunciationCategoryGroup = {
  id: string;
  label: LocalizedText;
  description?: LocalizedText;
  /** Which of the six modules this group belongs under. Defaults to sounds. */
  module?: Extract<PronunciationModuleId, "sounds" | "rhythm">;

  /**
   * Whether a saved word containing one of this group's units counts as
   * practice for it. Defaults to true.
   *
   * False for a group that indexes the writing system rather than the sound
   * inventory — English's A–Z, where nearly every word contains most of the
   * letters and "this word drills the letter E" says nothing. Chinese's
   * zhuyin symbols look the same shape but are the opposite case: each one
   * is a distinct sound, so a word containing ㄈ really is ㄈ practice.
   *
   * Declared by the pack rather than guessed from the symbol, because the
   * two are indistinguishable from outside the language.
   */
  matchesWords?: boolean;
};

/* =========================================================
   Minimal pairs
   ========================================================= */

export type MinimalPairExample = {
  /** Which unit id this side of the pair demonstrates. */
  unitId: string;
  text: string;
  meaning?: LocalizedText;
  phonetic?: string;
  audio?: string;
};

export type MinimalPairSet = {
  id: string;
  language: LanguageCode;
  /** The units being contrasted, e.g. ["r", "rr"]. */
  targets: string[];
  label: LocalizedText;
  /** Why these two are worth telling apart. */
  hint?: LocalizedText;
  /** Each entry is one contrasting pair drawn from `targets`. */
  examples: MinimalPairExample[][];
};

/* =========================================================
   Rhythm, stress, tone, liaison — one shape for all of them
   ========================================================= */

/**
 * How a syllable connects to the one after it.
 *
 * Named for what the languages themselves call it, because they are not the
 * same phenomenon: French liaison sounds a letter that is otherwise silent,
 * enchaînement re-syllabifies one that was already sounded, and Spanish
 * linking merges vowels across a word boundary.
 */
export type SyllableLink = "liaison" | "enchainement" | "linking";

export type SyllableBeat = {
  text: string;
  /** 0 unstressed, 0.5 secondary, 1 primary. */
  stress: number;
  /** Relative duration in beats. Italian geminates are the reason: 2. */
  length?: number;
  /** Mandarin tone. 5 is the neutral tone, not a fifth tone. */
  tone?: 1 | 2 | 3 | 4 | 5;
  /** Set on the syllable the link starts from. */
  linkToNext?: SyllableLink;
  /** Written but not pronounced — French final consonants, Italian h. */
  silent?: boolean;
};

export type RhythmPhrase = {
  id: string;
  /** The phrase as written. */
  text: string;
  meaning?: LocalizedText;
  beats: SyllableBeat[];
  /** What TTS should say, when it differs from `text`. */
  speechText?: string;
  audio?: string;
};

export type PronunciationLessonKind =
  | "stress"
  | "rhythm"
  | "intonation"
  | "connected-speech"
  | "tone";

export type PronunciationLesson = {
  id: string;
  language: LanguageCode;
  kind: PronunciationLessonKind;
  title: LocalizedText;
  description?: LocalizedText;
  /** The rule, stated in one or two sentences. */
  rule?: LocalizedText;
  phrases: RhythmPhrase[];
  difficulty: number;
};

/* =========================================================
   Scoring
   ========================================================= */

/**
 * A thing a pronunciation attempt can be scored on.
 *
 * A pack declares only the dimensions that are meaningful for its language —
 * tone for Chinese, consonant length for Italian, nasality and liaison for
 * French. A dimension being listed is a claim about the language, not a
 * promise that any analyzer can currently measure it: see
 * PronunciationAnalysisResult, where an unmeasured dimension is reported as
 * absent and the UI says so rather than inventing a number.
 */
export type ScoreDimension =
  | "sound"
  | "vowel"
  | "consonant"
  | "consonantLength"
  | "stress"
  | "rhythm"
  | "fluency"
  | "tone"
  | "pitch"
  | "nasal"
  | "liaison"
  | "melody";

/* =========================================================
   Yumi calibration
   ========================================================= */

/**
 * The instrument Yumi wears while coaching this language.
 *
 * Differences here are differences in the *phonetics being measured* — a
 * tone contour, a nasal resonance, a length gate. Explicitly not costume,
 * flags or any other national decoration: Yumi is a piece of laboratory
 * equipment that has been calibrated, not a mascot in fancy dress.
 */
export type YumiInstrument =
  | "phoneme-waveform"
  | "tone-contour"
  | "syllable-pulse"
  | "nasal-resonance"
  | "consonant-length";

export type YumiPronunciationCalibration = {
  instrument: YumiInstrument;
  /** Reads out as the instrument's name in the calibration line. */
  label: LocalizedText;

  /**
   * How far Yumi's mouth overshoots its resting shape while demonstrating.
   *
   * Declared here because it is a fact about the language, not about the
   * screen: Mandarin consonants distinguish themselves mostly by tongue
   * placement rather than mouth shape, so the default emphasis reads as
   * barely-there movement. Omit it and the rig's own default applies.
   */
  mouthEmphasis?: number;
};

/* =========================================================
   The pack
   ========================================================= */

export type WritingSystemInfo = {
  /** "alphabet", "bopomofo", … — a value, not a sentence. */
  type: string;
  label: LocalizedText;
};

export type PronunciationLanguagePack = {
  language: LanguageCode;
  /** The language's own name for itself. Display name comes from LANGUAGES. */
  displayName: string;

  writingSystem?: WritingSystemInfo;

  /** Ordered groups. Their `module` decides which screen renders them. */
  categories: PronunciationCategoryGroup[];
  units: PronunciationUnit[];

  minimalPairs: MinimalPairSet[];
  lessons: PronunciationLesson[];

  /** Dimensions worth showing for this language, in display order. */
  scoreDimensions: readonly ScoreDimension[];

  yumiCalibration: YumiPronunciationCalibration;

  /**
   * The regional pronunciation this pack teaches, when the language has more
   * than one. Recorded so a future dialect switch has something to switch
   * away from; there is deliberately no picker yet.
   */
  defaultDialect?: string;
  /** Dialects the content is aware of, including the default. */
  dialects?: readonly string[];
};

/* =========================================================
   Progress
   ========================================================= */

export type PronunciationProgress = {
  language: LanguageCode;
  unitId: string;

  /** 0-100, or absent where nothing has measured it. Never a placeholder. */
  listeningScore?: number;
  speakingScore?: number;
  accuracyScore?: number;

  attempts: number;
  correctAttempts: number;

  mastery: PronunciationMastery;
  lastPracticedAt?: string;
};

/** Progress for one language, indexed by unit id. */
export type ProgressByUnit = Record<string, PronunciationProgress>;

/* =========================================================
   Training sessions
   ========================================================= */

export type TrainingItemKind =
  | "sound"
  | "minimal-pair"
  | "word"
  | "rhythm"
  | "speak";

export type TrainingItem = {
  id: string;
  kind: TrainingItemKind;
  /** The unit, pair, lesson or vocabulary row this item is about. */
  targetId: string;
  /** Which module screen can render it. */
  module: PronunciationModuleId;
  label: string;
  /** Roughly how long this item takes, in seconds. Used for the plan header. */
  estimatedSeconds: number;
};

export type TrainingItemOutcome = "correct" | "almost" | "incorrect" | "skipped";

export type TrainingItemResult = {
  itemId: string;
  outcome: TrainingItemOutcome;
  /** 0-100 where something measured it. Absent otherwise — never invented. */
  score?: number;
  attempts: number;
};

export type PronunciationTrainingSession = {
  id: string;
  language: LanguageCode;
  items: TrainingItem[];
  /** Index into `items`. Equal to items.length once the session is done. */
  index: number;
  results: TrainingItemResult[];
  startedAt: string;
  completedAt?: string;
};
