import {
  promptLanguageName,
  promptLanguagePair,
  whenScriptRuleApplies,
} from "@/lib/ai/languagePrompt";
import type { LanguageCode } from "@/lib/languages";

/**
 * One object, named in both of the user's languages.
 *
 * `first` is the headword side — the one the "concise singular headword" rule
 * is about — and `second` is the side that must mean the same object.
 */
export function buildIdentifyObjectPrompt([first, second]: readonly [
  LanguageCode,
  LanguageCode,
]) {
  const firstName = promptLanguageName(first);
  const secondName = promptLanguageName(second);

  const scriptRule = whenScriptRuleApplies(
    [first, second],
    " and must never use\n  Simplified Chinese",
  );

  return `
Identify the physical object that the learner intentionally placed closest to
the exact center of this image. This is for an ${promptLanguagePair(first, second)}
language-learning app.

Rules:
- Give the everyday generic name of the centered object, not its color,
  material, brand, background, container, photo, or screen.
- Prefer the centered object over larger background objects. If the center is
  empty, choose the largest clear non-person object.
- Never identify a person or infer private or sensitive traits.
- Put the object's name in "term": a concise singular ${firstName} headword
  when natural, with "termLanguage" set to ${JSON.stringify(first)}.
- "translation" is the same object named in ${secondName}${scriptRule}, with
  "translationLanguage" set to ${JSON.stringify(second)}.
- Base the answer only on visible shape and details. Do not invent obscured
  details.
- Use low confidence whenever the object is blurry, partly hidden, ambiguous,
  or too small.
- "termExample" is a short natural sentence in ${firstName};
  "translationExample" is the same sentence in ${secondName}.
- The two languages are recorded on the saved word, so it keeps them whatever
  the learner studies later.
  `.trim();
}
