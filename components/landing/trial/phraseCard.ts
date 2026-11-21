import type { TranslationDictionary } from "@/lib/i18n/types";
import type { Kept } from "@/lib/landing/trialNotebook";
import { trialPhraseFor } from "@/lib/landing/trialPhrases";

type Journey = TranslationDictionary["landing"]["hero"]["journey"];

/**
 * The hero's phrase as a notebook card: the same card whether it is kept
 * from the first screen, the trial or Yumi's film. `where` and `why` are the
 * reader's own words when the trial has them, the journey's otherwise.
 */
export function phraseCardFor(journey: Journey, where?: string, why?: string): Kept {
  return {
    id: "phrase",
    text: journey.phrase,
    lang: journey.phraseLang,
    speech: trialPhraseFor(journey.phraseLang).speech,
    reading: journey.reading,
    meaning: journey.understand.meaning,
    equivalent: journey.understand.equivalent,
    where: where ?? journey.keep.where,
    why: why ?? journey.keep.why,
  };
}
