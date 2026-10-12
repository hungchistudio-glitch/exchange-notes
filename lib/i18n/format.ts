/**
 * Fills `{name}` placeholders in a translated string.
 *
 * Dictionary strings carry placeholders rather than being assembled from
 * fragments, because word order is not the same in every language — a
 * sentence built by concatenating "of" between two numbers is a sentence
 * that can only be English. The translator moves the placeholder; the
 * caller passes the same values either way.
 *
 * An unmatched placeholder is left as written rather than blanked, so a
 * missing value shows up as `{count}` in the UI instead of disappearing
 * into a gap nobody notices.
 */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/**
 * The form of a counted phrase that this language uses for this number.
 *
 * English picks the singular for 1 and nothing else; French picks it for 0
 * and 1, and Chinese has no plural at all. Asking `count === 1` writes
 * "0 mots" in French, so the choice goes through the language's own rule.
 * Only "one" takes the singular template; every other category ("many" for a
 * French million included) takes the plural one.
 *
 * Takes the locale rather than the interface language so this file stays
 * free of imports (tests/routeImportWeight).
 */
export function plural(
  count: number,
  locale: string,
  one: string,
  other: string,
  values: Record<string, string | number> = {},
): string {
  let category: string;

  try {
    category = new Intl.PluralRules(locale).select(count);
  } catch {
    category = count === 1 ? "one" : "other";
  }

  return fill(category === "one" ? one : other, { count, ...values });
}

/**
 * When something comes back, in the reader's own clock and language: a time
 * today, or a weekday and time when it is not today.
 *
 * Lives beside `fill` (moved from components/lexicon/LexiconResults.tsx) so
 * the camera can say when Google's AI is likely back without importing a
 * screen — or adding a module to Home's graph (tests/routeImportWeight).
 */
export function formatResetTime(at: number, locale: string, now = Date.now()) {
  const when = new Date(at);
  const today = new Date(now);
  const sameDay = when.toDateString() === today.toDateString();

  try {
    return new Intl.DateTimeFormat(
      locale,
      sameDay
        ? { hour: "numeric", minute: "2-digit" }
        : { weekday: "short", hour: "numeric", minute: "2-digit" },
    ).format(when);
  } catch {
    return when.toLocaleTimeString();
  }
}
