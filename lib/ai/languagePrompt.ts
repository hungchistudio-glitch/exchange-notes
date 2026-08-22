import {
  getLanguage,
  getLanguageName,
  type LanguageCode,
} from "@/lib/languages";

/**
 * Language names as the prompts refer to them.
 *
 * Always the English name, because the prompts themselves are written in
 * English — the model is being told which languages to work in, not being
 * addressed in one of them. That is a different question from the app's
 * interface language and must not be tied to it.
 */
export function promptLanguageName(code: LanguageCode): string {
  return getLanguageName(code, "english");
}

/**
 * The pair, as prose — "English and Traditional Chinese".
 *
 * The separator is a parameter because the prompts do not agree on one, and
 * they should not be quietly made to: each was written and tested as it
 * reads, and "English / Traditional Chinese" is not the same token sequence
 * as "English and Traditional Chinese".
 */
export function promptLanguagePair(
  first: LanguageCode,
  second: LanguageCode,
  separator = "and",
): string {
  return `${promptLanguageName(first)} ${separator} ${promptLanguageName(second)}`;
}

/**
 * A script rule, included only when one of the target languages has one.
 *
 * The rules stay written where they are used rather than being unified here.
 * Each was tuned against a specific failure — a menu photographed in
 * Simplified, a model quietly answering in Simplified inside a vocabulary
 * meaning — and their strength is not interchangeable. This decides only
 * whether a rule belongs in the prompt at all, which is the part that has to
 * become conditional: telling a model working in Spanish and French never to
 * write a Simplified character is noise at best, and at worst it is the
 * sentence that makes it start thinking about Chinese.
 *
 * Returns an empty string when no target language needs the rule, so callers
 * can interpolate it unconditionally.
 */
export function whenScriptRuleApplies(
  codes: readonly LanguageCode[],
  rule: string,
): string {
  const applies = codes.some(
    (code) => getLanguage(code).requiresTraditionalNormalization,
  );

  return applies ? rule : "";
}

/**
 * A note binding language-named output fields to the languages actually
 * asked for, emitted only when the two disagree.
 *
 * The schemas still call their two sides "english" and "chinese", and a model
 * follows a field name over prose: asked for Spanish and French into fields
 * named english/chinese, it returns English and Chinese — Simplified Chinese,
 * at that, since none of the Traditional rules apply any more either. The
 * prompt has to say outright that the names are historical.
 *
 * Empty when the pair is the one the field names describe, so the prompt the
 * app sends today is unchanged. This disappears when the fields are renamed.
 */
export function whenFieldNamesMislead(
  [first, second]: readonly [LanguageCode, LanguageCode],
  note: string,
): string {
  return first === "en" && second === "zh-TW" ? "" : note;
}
