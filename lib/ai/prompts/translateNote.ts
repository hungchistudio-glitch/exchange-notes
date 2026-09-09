import {
  promptLanguageName,
  promptLanguagePair,
  whenFieldNamesMislead,
  whenScriptRuleApplies,
} from "@/lib/ai/languagePrompt";
import type { LanguageCode } from "@/lib/languages";

/**
 * The note comes back in both of the user's languages.
 *
 * `first` and `second` are the pair, not a source and a target: the note may
 * already be in either or in a mix, and the job is to produce a clean version
 * of each side rather than to translate one direction.
 */
export function buildTranslateNotePrompt(
  text: string,
  [first, second]: readonly [LanguageCode, LanguageCode],
) {
  const firstName = promptLanguageName(first);
  const secondName = promptLanguageName(second);

  const fieldNote = whenFieldNamesMislead(
    [first, second],
    `\n\nThe output fields are named "english" and "chinese" for historical
reasons and those names do not describe this request. Put the ${firstName}
version in "english" and the ${secondName} version in "chinese". Answer only
in the two languages named above.`,
  );

  const scriptRule = whenScriptRuleApplies(
    [first, second],
    "\n- Use Traditional Chinese, never Simplified Chinese.",
  );

  return `
The user wrote this note in a bilingual ${promptLanguagePair(first, second, "/")}
language-learning app: "${text}"

It may be written in ${firstName}, in ${secondName}, or a mix of both.
Return both a natural ${firstName} version and a natural ${secondName}
version of the same note.

Rules:${scriptRule}
- If the note is already bilingual, keep each language's own wording
  rather than re-translating it from the other.
- Keep the tone and meaning as close to the original as possible.${fieldNote}
  `.trim();
}
