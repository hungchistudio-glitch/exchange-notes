import {
  DETECTION_CONFIDENCE_FLOOR,
  detectLanguage,
  type LanguageDetection,
} from "@/lib/languageDetection";
import {
  LANGUAGE_CODES,
  isLanguageCode,
  type LanguageCode,
} from "@/lib/languages";
import type { LexiconEntry, LexiconLanguages } from "@/lib/lexicon/types";

/* =========================================================
   What language is this, and who gets to say

   The bug this module exists to end: the lookup schema used to allow only
   the two languages the reader had set, so a French word typed by someone
   studying English could not come back as French. Not "rarely did" —
   could not. The model was handed a two-item enum and picked the closer of
   two wrong answers, and the word went into the library filed as English
   forever, because a saved word keeps the language it was born with.

   Three parties have an opinion and they are ranked:

     1. The reader, if they picked one. Ends the question.
     2. The model, which has read the word and knows what it means.
     3. The detector (lib/languageDetection.ts), which has only seen how it
        is spelled.

   The detector runs first anyway — not to decide, but to hint the model and
   to notice afterwards when the model's answer contradicts strong spelling
   evidence. That contradiction is the one case worth interrupting the reader
   for.
   ========================================================= */

/** Detection at least this strong is worth contradicting a model over. */
const STRONG_DETECTION = 0.8;

export type LexiconRouting = {
  /** Best guess before the dictionary has spoken. */
  detected: LanguageDetection;
  /** What the model should be told to prefer, absent better evidence. */
  preferred: LanguageCode;
  /**
   * The language the reader asked the card to lead in, if they asked.
   *
   * Not "what language did I type" — that question answers itself and the
   * reader rarely cares. What they reach for the control to say is "show me
   * this word in Italian", and the gloss stays whatever they read the app in.
   */
  chosenHead: LanguageCode | null;
  /** The reader's three roles, carried through to the settling step. */
  roles: LanguageRoles;
};

/**
 * A language different from `language`, preferring ones the reader reads.
 *
 * A card needs two sides and the same text twice is not two — the database
 * refuses such a row outright. Rather than fail a save, the gloss moves to
 * whichever other language the reader actually reads.
 */
export function otherLanguage(
  language: LanguageCode,
  pair: readonly [LanguageCode, LanguageCode],
): LanguageCode {
  return (
    pair.find((code) => code !== language) ??
    LANGUAGE_CODES.find((code) => code !== language) ??
    "en"
  );
}

/**
 * The three languages that decide what a lookup should answer with.
 *
 * `native` is here for one case and it is not a small one — see
 * resolveCardLanguages.
 */
export type LanguageRoles = {
  learning: LanguageCode;
  support: LanguageCode;
  native?: LanguageCode | null;
};

/** Whether the reader can already read this language without help. */
function isReadable(code: LanguageCode, roles: LanguageRoles): boolean {
  return code === roles.support || code === roles.native;
}

/**
 * Which two languages a card should hold, given what the reader typed.
 *
 * ── The question is not always the same question ───────────────────────
 *
 * Two different intentions arrive through one field, and telling them apart
 * is the whole of this function:
 *
 *   "What is this in the language I am studying?"
 *        — asked by typing a word in a language you already read.
 *
 *   "What does this mean?"
 *        — asked by typing a word you met in the wild, in a language you do
 *          not read.
 *
 * The tell is whether the reader can read the language they typed in. Someone
 * studying French who types 爸爸 is not asking what 爸爸 means; they know. They
 * are asking for *papa*. Someone studying Italian who types "tondre" off a
 * French street sign is asking the opposite, and answering with *falciare*
 * would be answering a question they did not ask.
 *
 * This used to gloss everything into the support language, which got the
 * second case right and the first case badly wrong: a French learner looking
 * up a Chinese word was handed a Chinese headword glossed in English, with no
 * French anywhere on the card.
 */
export function resolveCardLanguages(
  queryLanguage: LanguageCode,
  roles: LanguageRoles,
): { headLanguage: LanguageCode; glossLanguage: LanguageCode } {
  const { learning, support } = roles;

  // Already studying it: the word is the headword, glossed in what they read.
  if (queryLanguage === learning) {
    return {
      headLanguage: learning,
      glossLanguage:
        support === learning
          ? otherLanguage(learning, [learning, support])
          : support,
    };
  }

  /*
   * A language they read. The card becomes the app's ordinary card: the
   * language being studied on top, the language they read the app in
   * underneath — the same hierarchy as every saved word, every review card
   * and every Discover story (see hooks/useDisplayLanguages.ts).
   *
   * The gloss is the support language rather than the language they happened
   * to type in, so the answer to 爸爸 and the answer to "dad" are the same
   * card. What they typed is still on screen, in the field above it.
   */
  if (isReadable(queryLanguage, roles)) {
    return {
      headLanguage: learning,
      glossLanguage:
        support === learning ? queryLanguage : support,
    };
  }

  /*
   * A language they met and cannot read — a street sign, a menu, a friend's
   * message. Here the word keeps its own identity and the answer is what it
   * means, because "what is this in French" is not the question. This is the
   * case the brief is explicit about: a reader studying English who types
   * *tondre* gets French back, not "mow".
   */
  return {
    headLanguage: queryLanguage,
    glossLanguage:
      support === queryLanguage
        ? otherLanguage(queryLanguage, [learning, support])
        : support,
  };
}

/**
 * What to ask the dictionary, before the dictionary has answered.
 *
 * `preferred` is a hint and nothing more. It leans on the language being
 * studied — that is what a learner looks up most of the time — but only
 * where the spelling does not say otherwise. A word that looks strongly like
 * one language overrides the setting, which is the whole point: the reader
 * standing in France while studying Italian still gets French back.
 */
export function routeQuery(
  query: string,
  roles: LanguageRoles,
  chosenHead?: LanguageCode | null,
): LexiconRouting {
  const detected = detectLanguage(query);

  const preferred =
    detected.language && detected.confidence >= DETECTION_CONFIDENCE_FLOOR
      ? detected.language
      : roles.learning;

  return {
    detected,
    preferred,
    chosenHead: isLanguageCode(chosenHead) ? chosenHead : null,
    roles,
  };
}

/**
 * The settled answer, once the dictionary has spoken.
 *
 * The model outranks the detector because it has read the word rather than
 * only looked at it — but not silently. Where the detector was strongly sure
 * and the model disagrees, the result is marked ambiguous so the screen can
 * offer the choice. Those two disagreeing is rare and it is exactly the case
 * where guessing costs the reader a permanently mislabelled card.
 */
export function settleLanguages(
  routing: LexiconRouting,
  entry: LexiconEntry | null,
): LexiconLanguages {
  const { detected, chosenHead, roles } = routing;

  const reportedHead = isLanguageCode(entry?.termLanguage)
    ? entry.termLanguage
    : null;

  /*
   * What the reader typed, which is a different question from what the card
   * leads with. The model answers it directly; older cached entries do not
   * carry it, so the headword stands in — which is what it was before the
   * two could differ.
   */
  const reportedQuery = isLanguageCode(entry?.queryLanguage)
    ? entry.queryLanguage
    : reportedHead;

  /*
   * The reader asked for a language, and the request is honoured — but the
   * badge still names what is *on the card*, not what was asked for.
   *
   * Those came apart once and it was the worst kind of wrong: the flag read
   * EN while the headword read "vecchio amico". A label that describes a
   * request rather than the thing it labels is not a label, it is a claim,
   * and the reader has no way to tell which one they are looking at. So the
   * model's own answer wins here exactly as it does everywhere else; if it
   * declines the request, the badge says so and the reader can see their tap
   * did not take.
   *
   * The gloss is the support language — the one they read the app in — which
   * is the half of the card they never have to choose. Asking someone to pick
   * both sides to change one of them is two questions where there was one.
   */
  if (chosenHead) {
    const head = reportedHead ?? chosenHead;

    return {
      sourceLanguage: head,
      queryLanguage: reportedQuery ?? detected.language ?? chosenHead,
      glossLanguage: isLanguageCode(entry?.translationLanguage)
        ? entry.translationLanguage
        : roles.support === head
          ? otherLanguage(head, [roles.learning, roles.support])
          : roles.support,
      confidence: 1,
      ambiguous: false,
      candidates: LANGUAGE_CODES,
      chosen: true,
    };
  }

  if (reportedHead && reportedQuery) {
    const contradicted =
      detected.language !== null &&
      detected.language !== reportedQuery &&
      detected.confidence >= STRONG_DETECTION;

    return {
      sourceLanguage: reportedHead,
      queryLanguage: reportedQuery,
      glossLanguage: isLanguageCode(entry?.translationLanguage)
        ? entry.translationLanguage
        : resolveCardLanguages(reportedQuery, roles).glossLanguage,
      // A model that names a language it was free to choose from all five is
      // worth more than a spelling heuristic, but never as much as a reader.
      confidence: contradicted ? 0.5 : 0.9,
      ambiguous: contradicted,
      candidates: contradicted
        ? [reportedHead, detected.language as LanguageCode]
        : detected.candidates,
      chosen: false,
    };
  }

  /*
   * No dictionary answer at all — offline, or the lookup failed. The
   * detector is all there is, and it is allowed to be honest about that.
   */
  const queryLanguage = detected.language ?? routing.preferred;
  const { headLanguage, glossLanguage } = resolveCardLanguages(
    queryLanguage,
    roles,
  );

  return {
    /*
     * The headword stays the reader's own text here. With nothing to
     * translate with, promoting the card to the learning language would name
     * a word this path cannot produce.
     */
    sourceLanguage: queryLanguage,
    queryLanguage,
    glossLanguage:
      glossLanguage === queryLanguage ? headLanguage : glossLanguage,
    confidence: detected.confidence,
    ambiguous: detected.ambiguous,
    candidates: detected.candidates,
    chosen: false,
  };
}
