import { LANGUAGE_CODES, LANGUAGES, type LanguageCode } from "@/lib/languages";

/* =========================================================
   Guessing a language, and admitting when it is a guess

   This is the *last* thing consulted about what language a saved word is in
   — see resolveLanguageIdentity in lib/vocabulary/languageIdentity.ts for the
   order. It runs only when nothing else knows: a word pasted in with no
   creation context behind it.

   It is deliberately a small pile of evidence rather than a model. A word is
   often one token, and one token is not enough to be sure of anything — the
   valuable output here is not "Italian" but "Italian, and not confidently",
   which is what lets the app ask instead of quietly filing "solo" under the
   wrong language forever.

   Nothing here writes anything. The caller decides what a given confidence
   is worth.
   ========================================================= */

export type LanguageDetection = {
  /** The best guess, or null when there is no evidence for any language. */
  language: LanguageCode | null;

  /**
   * How much the evidence backs `language`, 0–1.
   *
   * Two things pull it down and they are different: evidence that points at
   * more than one language (the word is genuinely shared), and hardly any
   * evidence at all (the word is too short or too plain to carry a signal).
   * Both mean "do not act on this alone", which is why they end up in one
   * number rather than two flags.
   */
  confidence: number;

  /**
   * Languages worth offering the reader, best first.
   *
   * Only ever languages something in the text actually pointed at, except
   * when nothing did — then it is every language the text could plausibly be,
   * which is what a picker needs to show.
   */
  candidates: readonly LanguageCode[];

  /** Whether the caller should ask rather than decide. */
  ambiguous: boolean;
};

/**
 * Below this, a detection is not worth acting on unasked.
 *
 * Chosen against the words that break naive detection — "solo", "no",
 * "menu", "radio", "taxi", "hotel" — all of which score under it, and the
 * ordinary words of each language, which clear it.
 */
export const DETECTION_CONFIDENCE_FLOOR = 0.6;

/**
 * How much total evidence counts as "enough to be sure".
 *
 * Without this a single weak signal in an otherwise blank word would read as
 * certainty: one point of evidence for Italian and none for anything else is
 * a ratio of 1.0, and a ratio of 1.0 on one point of evidence is a coin toss
 * wearing a suit.
 */
const EVIDENCE_SATURATION = 6;

type Scores = Record<LanguageCode, number>;

function emptyScores(): Scores {
  return { en: 0, "zh-TW": 0, es: 0, fr: 0, it: 0 };
}

/*
 * Characters that only one or two of these languages write.
 *
 * The most reliable signal there is, because it is about the writing system
 * rather than about vocabulary: a word containing "ñ" is Spanish no matter
 * what it means.
 */
const CHARACTER_EVIDENCE: ReadonlyArray<
  readonly [RegExp, Partial<Record<LanguageCode, number>>]
> = [
  [/[ñ¿¡]/u, { es: 7 }],
  [/[çœ]/u, { fr: 7 }],
  // Circumflex and diaeresis: French writes them, Italian and Spanish do not.
  [/[âêîôûëï]/u, { fr: 6 }],
  // Acute on anything but "e": Spanish, not Italian, and not French.
  [/[áíóú]/u, { es: 5 }],
  [/ü/u, { es: 2, fr: 2 }],
  [/é/u, { fr: 3, es: 2, it: 2 }],
  [/[àèìòù]/u, { it: 3, fr: 2 }],
  /*
   * A stressed final vowel is Italian's signature — città, perché, così,
   * più — and almost nothing else here ends that way.
   */
  [/[àèéìòóù](?=\b|$)/u, { it: 4 }],
  /*
   * Letters Italian's own alphabet does not contain. Present in loanwords,
   * which is exactly why this subtracts rather than deciding: "taxi" is a
   * word in all four, and should not be ruled Italian-impossible.
   */
  [/[kwxy]/u, { en: 2, it: -3 }],
];

/*
 * Letter sequences that sit differently in each language.
 *
 * Weaker than the character evidence and more of it, so a longer word
 * accumulates a real signal while a short one stays honestly uncertain.
 */
const SEQUENCE_EVIDENCE: ReadonlyArray<
  readonly [RegExp, Partial<Record<LanguageCode, number>>]
> = [
  [/gli|gn[aeiou]|sci|sce|cch|ggi|zz|cq/u, { it: 3 }],
  [/eau|oux|aux|eux|ill|ouv|oeu|aî/u, { fr: 3 }],
  [/ll|rr|j[aou]/u, { es: 2 }],
  [/th|wh|ck|sh|gh|kn/u, { en: 3 }],
  [/oo|ea[rtd]|ow/u, { en: 2 }],
  [/qu[ei]/u, { fr: 1, es: 1, it: 1 }],
];

/*
 * Word endings. Matched against whole tokens, so "-are" fires on "mangiare"
 * and not inside "hare".
 */
const SUFFIX_EVIDENCE: ReadonlyArray<
  readonly [RegExp, Partial<Record<LanguageCode, number>>]
> = [
  [/(ing|ness|ful|less|ship|able|edly)$/u, { en: 5 }],
  [/(ción|dades?|idad|ando|iendo|ísimo)$/u, { es: 5 }],
  [/(zione|issimo|mento|etto|ezza|aggio|glio|gno)$/u, { it: 5 }],
  [/(ement|ance|eux|euse|aise|ait|ais|oir|eur)$/u, { fr: 5 }],
  [/(tion|sion)$/u, { en: 2, fr: 2 }],
  [/(mente)$/u, { es: 3, it: 3 }],
  // The Italian infinitive. Distinctive enough to carry a word on its own:
  // no other language here ends a verb in -are.
  [/(are|ere|ire)$/u, { it: 5 }],
  /*
   * The French infinitive in -re, which must not be spelled as a bare "re$"
   * — that ending is shared with every Italian -are/-ere/-ire verb, and a
   * rule that fires on both is a rule that separates neither.
   */
  [/[bcdfgptvz]re$/u, { fr: 4 }],
  [/(ar|er|ir)$/u, { es: 2 }],
  [/(er|ir)$/u, { fr: 2 }],
  [/(ly|ed)$/u, { en: 2 }],
];

/*
 * The words a sentence cannot avoid.
 *
 * Whole-token matches only, and the overlaps are the point: "la" scores for
 * Spanish, French and Italian equally, so it raises everyone's total and
 * separates nobody — which is the truth about the word "la".
 */
const FUNCTION_WORDS: Record<LanguageCode, ReadonlySet<string>> = {
  en: new Set([
    "the", "a", "an", "and", "or", "to", "of", "is", "are", "was", "were",
    "in", "on", "at", "with", "for", "that", "this", "it", "he", "she",
    "you", "we", "they", "not", "no", "be", "have", "has", "do", "does",
    "from", "but", "very", "my", "your", "his", "her", "their",
  ]),
  "zh-TW": new Set(),
  es: new Set([
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del",
    "y", "o", "que", "es", "son", "en", "con", "para", "por", "no", "se",
    "su", "muy", "pero", "como", "al", "lo", "mi", "tu", "yo", "ella",
    "nosotros", "ustedes", "está", "están",
  ]),
  fr: new Set([
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "que",
    "est", "sont", "dans", "avec", "pour", "par", "ne", "pas", "se",
    "très", "mais", "comme", "je", "tu", "il", "elle", "nous", "vous",
    "au", "aux", "ce", "cette", "mon", "ton", "son", "qui",
  ]),
  it: new Set([
    "il", "lo", "la", "i", "gli", "le", "un", "una", "uno", "di", "del",
    "della", "e", "o", "che", "è", "sono", "in", "con", "per", "da",
    "non", "no", "si", "molto", "ma", "come", "io", "tu", "lui", "lei",
    "noi", "voi", "al", "nel", "mio", "tuo", "suo",
  ]),
};

/** Languages whose writing this detector reaches by evidence rather than script. */
const LATIN_LANGUAGES: readonly LanguageCode[] = LANGUAGE_CODES.filter(
  (code) => LANGUAGES[code].fontVariable === "--font-latin",
);

/** Languages this detector recognises by script alone. */
const CJK_LANGUAGES: readonly LanguageCode[] = LANGUAGE_CODES.filter(
  (code) => LANGUAGES[code].fontVariable === "--font-cjk",
);

function addEvidence(
  scores: Scores,
  weights: Partial<Record<LanguageCode, number>>,
  allowed: ReadonlySet<LanguageCode>,
): number {
  let positive = 0;

  for (const code of LANGUAGE_CODES) {
    const weight = weights[code];
    if (weight === undefined) continue;

    scores[code] += weight;

    /*
     * Only evidence for a language the caller would accept counts towards
     * the mass. A French suffix is not a reason to be confident about a word
     * the caller has already said is either Italian or Chinese.
     */
    if (weight > 0 && allowed.has(code)) {
      positive = Math.max(positive, weight);
    }
  }

  return positive;
}

/**
 * The language a piece of text is most likely written in.
 *
 * `among` narrows the answer to a set the caller already knows it must be
 * within — a menu scanned in a known pair, say. Narrowing changes the
 * confidence too, and correctly so: "solo" is a coin toss between four
 * languages and settled between two.
 */
export function detectLanguage(
  text: string,
  among: readonly LanguageCode[] = LANGUAGE_CODES,
): LanguageDetection {
  const allowed = new Set(among.length > 0 ? among : LANGUAGE_CODES);

  const trimmed = text?.trim() ?? "";

  if (!trimmed) {
    return {
      language: null,
      confidence: 0,
      candidates: [...allowed],
      ambiguous: true,
    };
  }

  /*
   * Script first, and it ends the question.
   *
   * Han characters are not evidence to be weighed against a French suffix;
   * they are a different writing system, and no amount of Latin-alphabet
   * scoring should be able to outvote them.
   */
  if (/\p{Script=Han}/u.test(trimmed)) {
    const chinese = CJK_LANGUAGES.filter((code) => allowed.has(code));

    if (chinese.length > 0) {
      return {
        language: chinese[0],
        confidence: chinese.length === 1 ? 0.99 : 0.8,
        candidates: chinese,
        ambiguous: chinese.length > 1,
      };
    }
  }

  const lowered = trimmed.toLocaleLowerCase("en-US");
  const tokens = lowered.split(/[^\p{Letter}'’-]+/u).filter(Boolean);

  const scores = emptyScores();
  let evidence = 0;

  for (const [pattern, weights] of CHARACTER_EVIDENCE) {
    if (pattern.test(lowered)) evidence += addEvidence(scores, weights, allowed);
  }

  for (const [pattern, weights] of SEQUENCE_EVIDENCE) {
    if (pattern.test(lowered)) evidence += addEvidence(scores, weights, allowed);
  }

  for (const token of tokens) {
    for (const [pattern, weights] of SUFFIX_EVIDENCE) {
      if (pattern.test(token)) {
        evidence += addEvidence(scores, weights, allowed);
      }
    }

    for (const code of LATIN_LANGUAGES) {
      if (FUNCTION_WORDS[code].has(token)) {
        evidence += addEvidence(scores, { [code]: 4 }, allowed);
      }
    }
  }

  const ranked = [...allowed]
    .filter((code) => LATIN_LANGUAGES.includes(code))
    .sort((a, b) => scores[b] - scores[a]);

  const withEvidence = ranked.filter((code) => scores[code] > 0);

  if (withEvidence.length === 0 || evidence === 0) {
    return {
      language: null,
      confidence: 0,
      candidates: ranked.length > 0 ? ranked : [...allowed],
      ambiguous: true,
    };
  }

  const best = withEvidence[0];
  const total = withEvidence.reduce((sum, code) => sum + scores[code], 0);

  /*
   * Two independent doubts, multiplied.
   *
   * The share says how much of the evidence points one way; the mass says
   * how much evidence there was to point with. A word needs both to be
   * acted on unasked — a lone weak hint and a four-way tie are equally
   * poor reasons to file someone's word under a language forever.
   */
  const share = scores[best] / total;
  const mass = Math.min(1, evidence / EVIDENCE_SATURATION);
  const confidence = Math.round(share * mass * 100) / 100;

  const runnerUp = withEvidence[1];
  const contested =
    runnerUp !== undefined && scores[runnerUp] >= scores[best] * 0.75;

  return {
    language: best,
    confidence,
    /*
     * Everything with evidence when the answer is contested, so the picker
     * can offer the real alternatives; otherwise the whole allowed set, so a
     * reader correcting a confident-but-wrong guess is not limited to the
     * languages that happened to score.
     */
    candidates: contested ? withEvidence : ranked,
    ambiguous: contested || confidence < DETECTION_CONFIDENCE_FLOOR,
  };
}
