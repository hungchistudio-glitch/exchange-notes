const DEFAULT_FAST_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_STRONG_MODEL = "gemini-3.5-flash";

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
