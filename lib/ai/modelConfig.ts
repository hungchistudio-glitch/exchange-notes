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
/*
 * ── Measured on 2026-09-24, against the catalogue this key can see ─────
 *
 * /api/diagnostics/gemini?catalogue lists fifty models, and ?models= probes
 * any three of them with the same call shape the app makes. Four rounds
 * across half an hour, production, the same request each time:
 *
 *   gemini-3.6-flash           4/4   746, 955, 1094, 1260 ms
 *   gemini-flash-lite-latest   4/4   619, 664, 2993, 5571 ms
 *   gemini-3.5-flash-lite      2/3   583, 583 ms — and one 504 at 11101 ms
 *   gemini-3.7-flash           1/2   4422 ms    — and one 503 at   762 ms
 *   gemini-3.8-flash           0/1              — 503 at   666 ms
 *   gemini-flash-latest        0/1              — 503 at   248 ms
 *   gemini-3.1-flash-lite      0/1              — 503 at   310 ms
 *   gemini-2.5-flash-lite      0/1              — 404 at   102 ms, retired
 *
 * ── What that actually says ────────────────────────────────────────────
 *
 * Not "which model is best". Which *failure* is affordable. Every refusal
 * above comes back in a tenth to three quarters of a second — a busy model,
 * a retired one — and a candidate list absorbs those without a reader
 * noticing. There is exactly one expensive failure in the table, the 504
 * DEADLINE_EXCEEDED at eleven seconds, and it is the whole reason this app
 * looked broken for a week.
 *
 * So flash-lite is not dead, which is what it looked like from inside the
 * app. It is intermittent, and when it is unwell it hangs rather than
 * refusing. That is a fine third choice and a terrible second one.
 *
 * ── Why an alias in the middle ─────────────────────────────────────────
 *
 * Four model names were pinned into this file between 18 and 23 September
 * and every one of them went stale or went quiet. `gemini-flash-lite-latest`
 * cannot go stale: Google repoints it. It answered four times out of four
 * here, and it is the one entry in this list that will not need a commit
 * the next time a version number moves.
 */
export const DEFAULT_FAST_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_STRONG_MODEL = "gemini-3.6-flash";
/** The alias, so at least one entry in every list cannot go stale. */
export const DEFAULT_ALIAS_LITE_MODEL = "gemini-flash-lite-latest";

function uniqueModels(values: Array<string | undefined>) {
  return [
    ...new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

/*
 * Three deep, in the order the measurements above put them.
 *
 * It was two, and the second entry was the one model in the table that
 * hangs — which is the same as having no fallback at all, on a free tier
 * whose twenty requests a minute the first entry runs out of regularly.
 *
 * Three is affordable now for the reason the table gives: every failure but
 * the hang costs under a second, so reaching the third candidate is cheap
 * whenever the first two are merely busy. When the first one hangs instead,
 * the budget arithmetic in each route cuts the chain short on its own — and
 * lib/ai/modelRequest.ts puts a model that hung into cooldown, so the next
 * request starts at the second entry rather than paying for the lesson
 * twice.
 *
 * The environment can still override either end without touching this file.
 */
export function getTextModelCandidates() {
  return uniqueModels([
    process.env.GEMINI_TEXT_MODEL,
    process.env.GEMINI_MODEL,
    DEFAULT_STRONG_MODEL,
    process.env.GEMINI_FALLBACK_MODEL,
    DEFAULT_ALIAS_LITE_MODEL,
    DEFAULT_FAST_MODEL,
  ]);
}

export function getVisionModelCandidates() {
  return uniqueModels([
    process.env.GEMINI_VISION_MODEL,
    process.env.GEMINI_MODEL,
    DEFAULT_STRONG_MODEL,
    process.env.GEMINI_FALLBACK_MODEL,
    DEFAULT_ALIAS_LITE_MODEL,
    DEFAULT_FAST_MODEL,
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
    DEFAULT_ALIAS_LITE_MODEL,
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
