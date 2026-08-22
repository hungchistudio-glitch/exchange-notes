import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_LEARNING_PAIR,
  readLanguageCode,
  type LanguageCode,
} from "@/lib/languages";

/**
 * The two languages a request should work in: what the user is learning
 * first, what they already speak second.
 *
 * That order is the answer to "which side is the headword", and it is the
 * same answer everywhere — the prompts put their first language in the
 * field a word card leads with, and a learner leads with the language they
 * are acquiring. It used to be "English, then Chinese", which happened to
 * agree for one of the two pairings the app supported and was never a rule.
 *
 * Falls back to the pair the app has always taught rather than failing: a
 * profile can be mid-onboarding, and a captured photo is worth a card in
 * some language more than it is worth an error.
 */
export async function readLearningPair(
  supabase: SupabaseClient,
  userId: string,
): Promise<readonly [LanguageCode, LanguageCode]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("native_language, learning_language")
      .eq("id", userId)
      .maybeSingle();

    if (error) return DEFAULT_LEARNING_PAIR;

    return toLearningPair(data?.learning_language, data?.native_language);
  } catch {
    return DEFAULT_LEARNING_PAIR;
  }
}

/**
 * The same rule, for callers that already hold the two columns.
 *
 * A pair of one language is not a pair — the database forbids it, but a row
 * written before that constraint existed, or a half-filled profile, can still
 * produce one. Rather than sending a prompt asking for a translation from a
 * language into itself, the second slot falls back to a different language.
 */
export function toLearningPair(
  learning: unknown,
  native: unknown,
): readonly [LanguageCode, LanguageCode] {
  const learningCode = readLanguageCode(learning) ?? DEFAULT_LEARNING_PAIR[0];
  const nativeCode = readLanguageCode(native);

  if (nativeCode && nativeCode !== learningCode) {
    return [learningCode, nativeCode];
  }

  const fallbackNative = DEFAULT_LEARNING_PAIR.find(
    (code) => code !== learningCode,
  );

  return [learningCode, fallbackNative ?? DEFAULT_LEARNING_PAIR[1]];
}
