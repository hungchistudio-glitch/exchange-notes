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

/*
 * ── The reserve, from 2026-09-28 ────────────────────────────────────────
 *
 * Every free-tier quota here is per model, and so is every capacity spike.
 * From 14:00 UTC on the 28th the three models above were out at once —
 * gemini-3.6-flash spent for the day, both lite models answering 503 "high
 * demand" on every request — and every word lookup in the app fell back to
 * the offline dictionary, which for anything but English and Chinese is no
 * translation at all. Chi's report was "翻譯完全無法使用".
 *
 * Probed from production at 16:04 UTC, in the middle of it:
 *
 *   gemini-3.7-flash        answered, 4127 ms
 *   gemma-4-26b-a4b-it      400 in 199 ms: "Thinking level is not supported"
 *   gemma-4-31b-it          400 in 146 ms: same
 *   gemini-3.1-flash-lite   503    gemini-3.8-flash   503
 *   gemini-3-flash-preview  504 after 11 s
 *
 * The Gemma answers are not refusals of the request, only of the one
 * option this app sends every model; they are served apart from Gemini, on
 * their own free allowance. generateJson now asks Gemma the way Gemma is
 * asked (no thinking level, JSON by instruction). All three go at the end
 * of every list: they cost nothing on a good day, because nothing reaches
 * them, and on a day like this one they are the difference between a
 * translation and none.
 *
 * ── gemini-3.8-flash, from 2026-10-10 ───────────────────────────────────
 *
 * Google deprecated gemini-3.7-flash on 2026-10-09 and redirects every
 * request for it to gemini-3.8-flash, so the reserve has been 3.8 since
 * then in all but name. Naming it directly changes nothing that is served
 * today, and keeps the reserve the day the redirect is withdrawn, when the
 * old name would only 404. Same catalogue entry shape (generateContent,
 * countTokens, cached content, batch); asked the same way as 3.7 was.
 */
export const DEFAULT_RESERVE_MODELS = [
  "gemini-3.8-flash",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
] as const;

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
/*
 * ── Text: the alias first, from 2026-09-27 ─────────────────────────────
 *
 * gemini-3.6-flash led this list on the strength of four clean rounds on
 * 2026-09-24. In production since, it has done the one expensive thing in
 * the table: hung. ai_call_log, 25–27 September — word lookups and
 * phonetics timing out at 13.5–14.5s with DEADLINE_EXCEEDED, and on the
 * free tier its twenty requests *a day* (GenerateRequestsPerDay…, not per
 * minute) are gone by the afternoon. A French lookup on the 27th waited the
 * full 13.5s on it, then gemini-flash-lite-latest answered in 1,044ms.
 *
 * Text requests are extractions and translations with a schema; the lite
 * alias does them well and answers fast. The strong model moves to second,
 * where lib/ai/hedge.ts asks it alongside rather than after when the first
 * is slow. Vision keeps the strong model first: reading a photograph is
 * where it earns its place.
 */
/*
 * ── GEMINI_MODEL is the strong slot, not the front of the line ──────────
 *
 * Production sets GEMINI_MODEL (a sensitive variable, so its value cannot
 * be read back), and it used to lead this list, ahead of the alias. Whatever
 * it names, that put it in front of the reorder above — and if it names the
 * strong model, the reorder never reached production at all. Every route
 * that reads GEMINI_MODEL directly uses it as "the strong model", so that is
 * where it stands here too: second. GEMINI_TEXT_MODEL remains the override
 * for the front of the text list.
 */
export function getTextModelCandidates() {
  return uniqueModels([
    process.env.GEMINI_TEXT_MODEL,
    DEFAULT_ALIAS_LITE_MODEL,
    process.env.GEMINI_MODEL,
    DEFAULT_STRONG_MODEL,
    process.env.GEMINI_FALLBACK_MODEL,
    DEFAULT_FAST_MODEL,
    ...DEFAULT_RESERVE_MODELS,
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
    ...DEFAULT_RESERVE_MODELS,
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
    ...DEFAULT_RESERVE_MODELS,
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
