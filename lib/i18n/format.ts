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
