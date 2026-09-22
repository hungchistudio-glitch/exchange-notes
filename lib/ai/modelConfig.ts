/*
 * The two models this app asks for, and why these two.
 *
 * `gemini-3.5-flash` was the strong default and it does not answer. Measured
 * on production 2026-09-22 against /api/classify-text: 14003ms, 14007ms and
 * 14003ms against a 14000ms ceiling — three for three, to the millisecond,
 * which is not a slow reply but no reply. `gemini-3.1-flash-lite` was the
 * fast default and returned a genuine 503 in the same window. Both are the
 * older entries on Google's current list.
 *
 * `gemini-3.5-flash-lite` is the one measurement this app actually has of a
 * model that works: 1405ms and 8527ms, two lookups, two answers, same key,
 * same call shape. So it is the fast default.
 *
 * `gemini-3.6-flash` is the strong default on the strength of Google's own
 * listing rather than a measurement here — it is a current stable multimodal
 * Flash, where the model it replaces is documented as the legacy baseline.
 * It is a fallback everywhere except the menu scanner, which wants the
 * stronger reader first and says why below.
 *
 * These are the only two model names in the app. They were not, which is how
 * this happened: the same dead string was copied into five routes that each
 * had their own `|| "gemini-3.5-flash"`, so fixing the candidate list fixed
 * none of them.
 */
export const DEFAULT_FAST_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_STRONG_MODEL = "gemini-3.6-flash";

function uniqueModels(values: Array<string | undefined>) {
  return [
    ...new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

export function getTextModelCandidates() {
  return uniqueModels([
    process.env.GEMINI_TEXT_MODEL,
    process.env.GEMINI_MODEL,
    DEFAULT_FAST_MODEL,
    process.env.GEMINI_FALLBACK_MODEL,
    DEFAULT_STRONG_MODEL,
  ]);
}

export function getVisionModelCandidates() {
  return uniqueModels([
    process.env.GEMINI_VISION_MODEL,
    process.env.GEMINI_MODEL,
    DEFAULT_FAST_MODEL,
    process.env.GEMINI_FALLBACK_MODEL,
    DEFAULT_STRONG_MODEL,
  ]);
}

/*
 * Menus invert the usual order: the strong model first, the fast one only as
 * a fallback.
 *
 * Everything else this app sends to vision is one object in the middle of a
 * frame, where flash-lite is both enough and quicker. A menu is forty lines
 * of small type photographed from a metre away, and the difference between
 * the two models is whether the prices come back attached to the right
 * dishes — which is the one thing the feature cannot be wrong about.
 */
export function getMenuModelCandidates() {
  return uniqueModels([
    process.env.GEMINI_MENU_MODEL,
    process.env.GEMINI_VISION_MODEL,
    DEFAULT_STRONG_MODEL,
    DEFAULT_FAST_MODEL,
  ]);
}

export function readBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}
