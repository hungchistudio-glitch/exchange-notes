export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Replaces `{key}` placeholders in an i18n template string with the given
 * values, e.g. insertValues("Hi {name}", { name: "Chi" }) -> "Hi Chi".
 * Previously duplicated verbatim in friends/page.tsx, LearningPartnerCard.tsx,
 * and ReviewSession.tsx — consolidated here so future i18n templating logic
 * has one place to live.
 */
/**
 * Normalizes free-typed input into a valid Exchange ID as the user types:
 * lowercase, strip a leading "@", drop anything that isn't a-z/0-9/underscore,
 * cap at 24 characters. Previously duplicated verbatim in EditProfileSheet.tsx
 * and NameStep.tsx (onboarding).
 */
export function normalizeExchangeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export function insertValues(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}
