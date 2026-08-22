import {
  promptLanguageName,
  promptLanguagePair,
  whenFieldNamesMislead,
  whenScriptRuleApplies,
} from "@/lib/ai/languagePrompt";
import type { LanguageCode } from "@/lib/languages";

/**
 * A typed lookup, which may arrive in either of the user's languages.
 *
 * `first` is the side a result is normalised towards when the input is
 * already in the other — the app's "headword" side.
 */
export function buildClassifyTextPrompt(
  query: string,
  [first, second]: readonly [LanguageCode, LanguageCode],
) {
  const firstName = promptLanguageName(first);
  const secondName = promptLanguageName(second);

  const fieldNote = whenFieldNamesMislead(
    [first, second],
    `\n\nThe output fields are named "englishName", "chineseName" and their
example counterparts for historical reasons; those names do not describe this
request. "englishName" and every "english" field hold the ${firstName} side,
"chineseName" and every "chinese" field hold the ${secondName} side. Answer
only in the two languages named above.`,
  );

  const scriptRule = whenScriptRuleApplies(
    [first, second],
    "\n- Use Traditional Chinese, never Simplified Chinese.",
  );

  return `
The user typed this into an ${promptLanguagePair(first, second)} language-learning
app: ${JSON.stringify(query)}

It may be an ${firstName} word/phrase, a ${secondName} word/phrase, or a
misspelling of either. Identify what it most likely means and return the
requested fields.

Rules:${scriptRule}
- If the input is already ${secondName}, treat it as the source word
  and translate it into ${firstName}.
- If uncertain what was meant, make your best guess and use low confidence.
- Keep both examples natural, short, and semantically equivalent.${fieldNote}
  `.trim();
}
