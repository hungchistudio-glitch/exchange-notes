import {
  DEFAULT_LEARNING_PAIR,
  LANGUAGE_CODES,
  readLanguageCode,
  type LanguageCode,
} from "@/lib/languages";
import { createServiceClient } from "@/lib/supabase/service";

/*
 * How many languages one batch of cards will carry.
 *
 * Daily News is a shared pool: twelve cards a day for everybody, generated
 * once. That is exactly the case where covering more languages is worth the
 * output, because the cost is paid once and divided by every reader — unlike
 * a menu scan, where each extra language is latency a single person waits
 * through for a language they are not reading.
 *
 * Every language an account actually uses now fits, which was not true when
 * this was four: the default pair is always forced in, so four left two
 * discretionary slots, and a reader who switched to a fifth language got a
 * feed that had never heard of it. Since the cap only ever bound the
 * languages people had chosen, and there are only ever as many of those as
 * the table has rows, the honest ceiling is the table itself.
 *
 * It is still a cap rather than "all of them" for the day the table grows
 * past what one call can carry — and lib/dailyNews.ts shrinks the batch as
 * this number rises, so the output per request stays where it was.
 */
const MAX_LANGUAGES = LANGUAGE_CODES.length;

/**
 * The languages the pool actually needs to be written in.
 *
 * Read from the accounts rather than assumed, because the pool used to be
 * generated in one hardcoded pair and was therefore English and Chinese for
 * a Spanish learner too — the one place where switching language changed
 * nothing at all, because the content had never been asked to change.
 *
 * Both sides of every profile count: a card is read in the language being
 * learned and understood in the language already spoken, so a pool missing
 * either half is only half useful to that reader.
 *
 * The default pair is always included and always first. It is what the
 * existing pool is written in, and the fallback for a reader whose own
 * languages a given card does not carry.
 */
export async function getDailyNewsLanguages(): Promise<LanguageCode[]> {
  const languages: LanguageCode[] = [...DEFAULT_LEARNING_PAIR];

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("learning_language, native_language")
      .not("learning_language", "is", null);

    if (error || !data) return languages;

    // Most-used first, so the cap keeps the languages the most readers have
    // rather than whichever rows came back first.
    const counts = new Map<LanguageCode, number>();

    for (const row of data as Array<Record<string, unknown>>) {
      for (const value of [row.learning_language, row.native_language]) {
        const code = readLanguageCode(value);
        if (!code) continue;
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }

    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code);

    for (const code of ranked) {
      if (languages.length >= MAX_LANGUAGES) break;
      if (!languages.includes(code)) languages.push(code);
    }

    return languages;
  } catch {
    // A pool in the languages it has always been written in is worth more
    // than no pool at all.
    return languages;
  }
}
