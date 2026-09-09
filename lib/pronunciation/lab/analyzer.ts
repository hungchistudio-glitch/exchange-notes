import { getLanguage, type LanguageCode } from "@/lib/languages";
import {
  getRecognitionConstructor,
  type SpeechRecognitionLike,
} from "@/lib/speechRecognition";

import type { ScoreDimension } from "./types";

/* =========================================================
   Pronunciation analysis

   The rule this file exists to enforce: a score is a measurement or it is
   absent. There is no third option, and in particular there is no
   plausible-looking number stood in for one.

   That is not caution — a fabricated 87% is worse than no score at all. It
   tells a learner their /r/ is nearly right when nothing listened to their
   /r/, and the whole point of the Lab is to be the thing that does listen.
   So every dimension a pack declares is reported as either `measured` with
   a number behind it, or `unmeasured` with a reason, and the UI renders the
   second as "not analyzed" rather than as zero.

   Swapping in a real acoustic backend later — Azure, Google, a custom model
   — means writing one more object with this shape and registering it. No
   screen changes.
   ========================================================= */

/** Where the audio goes to be analysed. Shown to the user, not just logged. */
export type AnalysisProcessing = "on-device" | "cloud";

export type PronunciationAnalysisInput = {
  language: LanguageCode;
  /** What the learner was asked to say. */
  targetText: string;
  /** Dimensions the language cares about. An analyzer answers what it can. */
  dimensions: readonly ScoreDimension[];
  /** Aborts a run the user has navigated away from. */
  signal?: AbortSignal;
};

export type DimensionResult =
  | { measured: true; score: number }
  | { measured: false; reason: "unsupported" | "inconclusive" };

export type AnalysisVerdict = "correct" | "almost" | "incorrect" | "unknown";

export type PronunciationAnalysisResult = {
  /** What the analyzer believed it heard. Absent when it heard nothing. */
  transcript?: string;
  /**
   * A single headline number, or null when nothing was measured.
   *
   * The mean of the measured dimensions only. Unmeasured ones are not
   * counted as zero, which would drag every score down to a number that
   * describes the analyzer rather than the learner.
   */
  overall: number | null;
  dimensions: Partial<Record<ScoreDimension, DimensionResult>>;
  verdict: AnalysisVerdict;
  processing: AnalysisProcessing;
  /** Set when the attempt could not be analysed at all. */
  failure?: "no-speech" | "not-supported" | "permission" | "aborted" | "failed";
};

export interface PronunciationAnalyzer {
  readonly id: string;
  readonly processing: AnalysisProcessing;
  /** Whether this analyzer can run in the current browser, right now. */
  isAvailable(): boolean;
  analyze(
    input: PronunciationAnalysisInput,
  ): Promise<PronunciationAnalysisResult>;
  /** Stops a run in progress. Safe to call when nothing is running. */
  cancel(): void;
}

/* =========================================================
   Comparing what was said to what was asked for
   ========================================================= */

/**
 * Strips everything that is not part of how a word sounds.
 *
 * Punctuation, case and accents come off; Chinese and Japanese text is left
 * alone because its characters are the units being compared. Spanish and
 * French accents are removed on purpose — a recogniser's transcript
 * capitalises and accents inconsistently, and "cafe" for "café" is a
 * transcription difference, not a pronunciation error.
 */
export function normalizeForComparison(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance, two rows at a time. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];

    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
    }

    previous = current;
  }

  return previous[b.length];
}

/**
 * How close two utterances are, 0–1.
 *
 * Character-level rather than word-level because most of what the Lab asks
 * for is a single word, and because for Chinese the characters *are* the
 * comparison. A whole-word match check would score "perro" against "pero"
 * the same as it scores "perro" against "gato".
 */
export function textSimilarity(spoken: string, target: string): number {
  const a = normalizeForComparison(spoken);
  const b = normalizeForComparison(target);

  if (!a || !b) return 0;
  if (a === b) return 1;

  const distance = editDistance(a, b);
  return Math.max(0, 1 - distance / Math.max(a.length, b.length));
}

const CORRECT_AT = 0.9;
const ALMOST_AT = 0.65;

export function verdictForSimilarity(similarity: number): AnalysisVerdict {
  if (similarity >= CORRECT_AT) return "correct";
  if (similarity >= ALMOST_AT) return "almost";
  return "incorrect";
}

/* =========================================================
   The browser recogniser
   ========================================================= */

/** How long to wait for a result before giving up on the attempt. */
const RECOGNITION_TIMEOUT_MS = 8000;

function unmeasured(
  dimensions: readonly ScoreDimension[],
  reason: "unsupported" | "inconclusive",
): Partial<Record<ScoreDimension, DimensionResult>> {
  const result: Partial<Record<ScoreDimension, DimensionResult>> = {};
  for (const dimension of dimensions) {
    result[dimension] = { measured: false, reason };
  }
  return result;
}

/**
 * The analyzer that ships today.
 *
 * It listens through the browser's own speech recogniser and compares what
 * came back to what was asked for. That comparison is a real measurement of
 * one real thing: whether the word you said is recognisable as the word you
 * meant. It is reported as the `sound` dimension and nothing else.
 *
 * What it cannot do is measure stress placement, tone contour, nasality,
 * consonant length or fluency — a transcript carries none of that. Those
 * come back unmeasured, every time, for every language. That will look
 * sparse next to an app that shows four dials; the four dials would be
 * decoration.
 *
 * Privacy: on Chrome and Safari this sends audio to the platform's own
 * speech service, which is why `processing` says "cloud" — the Speak screen
 * shows that rather than leaving it in a comment. Nothing is stored by this
 * app: no recording leaves the tab except through the browser's recogniser,
 * and none is uploaded anywhere by us.
 */
export function createSpeechRecognitionAnalyzer(): PronunciationAnalyzer {
  let active: SpeechRecognitionLike | null = null;

  function teardown() {
    if (!active) return;
    active.onresult = null;
    active.onerror = null;
    active.onend = null;
    try {
      active.abort();
    } catch {
      // Aborting a recogniser that has already stopped throws on some
      // builds. Nothing to recover from — it is already in the state we want.
    }
    active = null;
  }

  return {
    id: "browser-speech-recognition",
    processing: "cloud",

    isAvailable() {
      return getRecognitionConstructor() !== null;
    },

    cancel() {
      teardown();
    },

    analyze(input) {
      const Recognition = getRecognitionConstructor();

      if (!Recognition) {
        return Promise.resolve({
          overall: null,
          dimensions: unmeasured(input.dimensions, "unsupported"),
          verdict: "unknown" as const,
          processing: "cloud" as const,
          failure: "not-supported" as const,
        });
      }

      teardown();

      return new Promise<PronunciationAnalysisResult>((resolve) => {
        const recognition = new Recognition();
        active = recognition;

        let settled = false;
        let best: { transcript: string; confidence: number } | null = null;

        const timer = setTimeout(() => {
          finish();
        }, RECOGNITION_TIMEOUT_MS);

        function settle(result: PronunciationAnalysisResult) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          input.signal?.removeEventListener("abort", handleAbort);
          teardown();
          resolve(result);
        }

        function finish(failure?: PronunciationAnalysisResult["failure"]) {
          if (!best) {
            settle({
              overall: null,
              dimensions: unmeasured(input.dimensions, "inconclusive"),
              verdict: "unknown",
              processing: "cloud",
              failure: failure ?? "no-speech",
            });
            return;
          }

          const similarity = textSimilarity(best.transcript, input.targetText);
          const score = Math.round(similarity * 100);

          /*
           * `sound` is measured; everything the pack asked for beyond it is
           * not. Written this way round on purpose — the union, not the
           * intersection — so a screen showing a language's own dimensions
           * always has an entry for each and never silently omits one.
           */
          const dimensions: Partial<Record<ScoreDimension, DimensionResult>> = {
            ...unmeasured(input.dimensions, "unsupported"),
            sound: { measured: true, score },
          };

          settle({
            transcript: best.transcript,
            overall: score,
            dimensions,
            verdict: verdictForSimilarity(similarity),
            processing: "cloud",
          });
        }

        function handleAbort() {
          settle({
            overall: null,
            dimensions: unmeasured(input.dimensions, "inconclusive"),
            verdict: "unknown",
            processing: "cloud",
            failure: "aborted",
          });
        }

        input.signal?.addEventListener("abort", handleAbort, { once: true });

        recognition.lang = getLanguage(input.language).speechTag;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 3;

        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];

            /*
             * Every alternative is considered, and the closest to the target
             * wins rather than the recogniser's own first choice.
             *
             * Not generosity — the opposite. The recogniser ranks by what is
             * a likely thing to say, so asked for "perro" it will happily
             * return "pero" as its top guess because "pero" is a far more
             * common word. Judging the learner on that would report a
             * mispronunciation they did not make. If the correct word is
             * anywhere in the alternatives, it was recognisable.
             */
            for (let j = 0; j < result.length; j += 1) {
              const alternative = result[j];
              if (!alternative?.transcript) continue;

              const candidate = {
                transcript: alternative.transcript.trim(),
                confidence: alternative.confidence ?? 0,
              };

              if (
                !best ||
                textSimilarity(candidate.transcript, input.targetText) >
                  textSimilarity(best.transcript, input.targetText)
              ) {
                best = candidate;
              }
            }
          }
        };

        recognition.onerror = (event) => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            settle({
              overall: null,
              dimensions: unmeasured(input.dimensions, "inconclusive"),
              verdict: "unknown",
              processing: "cloud",
              failure: "permission",
            });
            return;
          }

          if (event.error === "aborted") {
            handleAbort();
            return;
          }

          finish(event.error === "no-speech" ? "no-speech" : "failed");
        };

        recognition.onend = () => finish();

        try {
          recognition.start();
        } catch {
          settle({
            overall: null,
            dimensions: unmeasured(input.dimensions, "inconclusive"),
            verdict: "unknown",
            processing: "cloud",
            failure: "failed",
          });
        }
      });
    },
  };
}

/**
 * What is used where no recogniser exists.
 *
 * Reports nothing rather than guessing, which is the whole contract. The
 * Speak screen still works around it — record, play back, compare against
 * the native audio by ear — because that was always the part that teaches
 * most, and it needs no analysis at all.
 */
export function createUnavailableAnalyzer(): PronunciationAnalyzer {
  return {
    id: "unavailable",
    processing: "on-device",
    isAvailable: () => false,
    cancel: () => {},
    analyze: (input) =>
      Promise.resolve({
        overall: null,
        dimensions: unmeasured(input.dimensions, "unsupported"),
        verdict: "unknown",
        processing: "on-device",
        failure: "not-supported",
      }),
  };
}

/**
 * The analyzer for this browser.
 *
 * One place to change when a real acoustic backend arrives, and the only
 * place that knows which implementation is in use.
 */
export function resolveAnalyzer(): PronunciationAnalyzer {
  const recogniser = createSpeechRecognitionAnalyzer();
  return recogniser.isAvailable() ? recogniser : createUnavailableAnalyzer();
}
