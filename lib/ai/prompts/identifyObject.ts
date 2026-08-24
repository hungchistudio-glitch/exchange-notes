import {
  promptLanguageName,
  promptLanguagePair,
  whenFieldNamesMislead,
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

  const fieldNote = whenFieldNamesMislead(
    [first, second],
    `\n\nThe output fields are named "englishName", "chineseName" and their
example counterparts for historical reasons; those names do not describe this
request. Every "english" field holds the ${firstName} side and every "chinese"
field holds the ${secondName} side. Answer only in the two languages named
above.`,
  );

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
- Use a concise singular ${firstName} headword when natural.
- The ${secondName} name must mean the same object${scriptRule}.
- Base the answer only on visible shape and details. Do not invent obscured
  details.
- Keep both example sentences short, natural, and semantically equivalent.
- Use low confidence whenever the object is blurry, partly hidden, ambiguous,
  or too small.
- Set "termLanguage" to ${JSON.stringify(first)} and "translationLanguage" to
  ${JSON.stringify(second)}. They record which language each named side is
  in, so the saved word keeps it whatever the learner studies later.${fieldNote}
  `.trim();
}
