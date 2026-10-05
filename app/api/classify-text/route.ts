import { buildClassifyTextPrompt } from "@/lib/ai/prompts/classifyText";
import {
  LANGUAGE_CODES,
  isLanguageCode,
  type LanguageCode,
} from "@/lib/languages";
import { DETECTION_CONFIDENCE_FLOOR, detectLanguage } from "@/lib/languageDetection";
import { classifyQueryKind } from "@/lib/lexicon/queryKind";
import { normalizeQuery } from "@/lib/lexicon/normalize";
import { readLanguageRoles } from "@/lib/profile/languagePair";
import { GoogleGenAI } from "@google/genai";
import { after, NextResponse } from "next/server";

import { consumeDailyQuota, refundDailyQuota } from "@/lib/ai/dailyQuota";
import { recordAiFailure } from "@/lib/ai/callLog";
import { CORE_MAX_ATTEMPTS, firstAnswer } from "@/lib/ai/hedge";
import { dailyQuotaResetAt, healthyModels } from "@/lib/ai/modelHealth";
import { rememberIpa } from "@/lib/pronunciation/ipaSource";

import { createClient } from "@/lib/supabase/server";
import type { LanguageRoles } from "@/lib/lexicon/languageRouting";
import type { LexiconEntry, LexiconQueryKind } from "@/lib/lexicon/types";
import { isLexiconEntry } from "@/lib/lexicon/types";
import { lookupOffline } from "@/lib/vocabulary/offlineLookup";
import { builtinIpa } from "@/lib/pronunciation/builtinIpa";
import {
  readSharedLookupCache,
  writeSharedLookupCache,
} from "@/lib/vocabulary/sharedLookupCache";
import {
  getTextModelCandidates,
  readBoundedInteger,
} from "@/lib/ai/modelConfig";
/*
 * Shared, not re-declared.
 *
 * This route carried its own copies of getErrorStatus and isRateLimitError,
 * its own cooldown map and its own 6-second ceiling, and that is precisely
 * how it ended up as the one text route in the app that never worked: the
 * shared module's 15s and its cooldown rules were improved and this file
 * never heard about it.
 */
import {
  cooldownMsFor,
  generateJson,
  getErrorStatus,
  isRateLimitError,
  isTimeoutError,
  shouldCoolDown,
} from "@/lib/ai/modelRequest";

export const runtime = "nodejs";

/*
 * A ceiling of its own, rather than the platform default.
 *
 * Every model call under this route is bounded per attempt now (see
 * lib/ai/modelRequest.ts), so this is the backstop for the sum of them
 * rather than the thing a reader waits out.
 */
/*
 * 45, not 30.
 *
 * A total budget of 24 inside a limit of 30 left the auth call, the shared
 * cache read and the response to fit in six seconds, and on 2026-09-22 one
 * request did not: "Vercel Runtime Timeout Error: Task timed out after 30
 * seconds", which is a 504 and the one failure the client cannot even show a
 * degraded card for. The vision route has had 45 for the same reason.
 */
export const maxDuration = 45;
/*
 * Long enough for a sentence, because the app now accepts one.
 *
 * The shared cache's key column stops at 80 characters, so anything past
 * that skips it — a miss, not a wrong answer, and sentences are the queries
 * least likely to be asked twice by two different people anyway.
 */
const MAX_QUERY_LENGTH = 240;
const MEMORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MEMORY_CACHE_MAX_ITEMS = 500;
/*
 * What one lookup attempt may take.
 *
 * This was 6 seconds, and 6 seconds is not enough time for this particular
 * call: a structured result with fourteen required fields, a language enum
 * and `thinking_level: "low"`. The route's own logs say so — five requests
 * over the week to 2026-09-22, five failures, every one of them
 * `status: null`, which is this client aborting rather than Gemini
 * answering. Meanwhile /api/word-pronunciation makes the same shape of call
 * against the same key on the shared 15s budget and comes back most of the
 * time.
 *
 * A short ceiling does not make a lookup fast. It makes it fail slowly: two
 * candidates at 6 seconds is twelve seconds of waiting for a card that then
 * says it could not reach the dictionary. The ceiling that matters to a
 * reader is the total, which is what TOTAL_BUDGET_MS below is for.
 *
 * 14 rather than the vision path's 12 for the one difference that matters:
 * that call returns four short fields about a photo, this one returns
 * fourteen with a language enum.
 *
 * This route's own numbers, once it had a model that answers
 * (gemini-3.5-flash-lite, production, 2026-09-22):
 *
 *   1405ms   8527ms
 *
 * Which settles the original question better than the fix did. The slower of
 * those two is past the 6s ceiling this route used to have — so even on a
 * healthy model, one lookup in some fraction of them was always going to be
 * cut off and reported to the reader as "could not reach the dictionary".
 * The ceiling was wrong independently of the model being wrong.
 *
 * Do not tighten this on the strength of the 1405. Two samples is a range,
 * not a distribution, and the cost of being too tight here is the exact bug
 * that took two days to find.
 */
const REQUEST_TIMEOUT_MS = readBoundedInteger(
  process.env.TEXT_REQUEST_TIMEOUT_MS,
  14_000,
  2_000,
  20_000,
);

/*
 * What the whole lookup may take, across every candidate.
 *
 * The candidate list is the retry policy, and a retry that starts its own
 * full-length clock is how a bounded-per-attempt route runs past the
 * function's `maxDuration` anyway. Each attempt gets whatever is left, so a
 * model that fails fast — the 503 in these logs came back in well under a
 * second — still leaves the next one a real chance, and a model that burns
 * the whole ceiling leaves none, which is correct.
 *
 * 20 against a maxDuration of 45 leaves the auth call, the shared cache read
 * and the response the room that 24-against-30 did not.
 */
const TOTAL_BUDGET_MS = readBoundedInteger(
  process.env.TEXT_TOTAL_BUDGET_MS,
  20_000,
  5_000,
  30_000,
);

/*
 * Below this an attempt is a way of spending the rest of the budget on a
 * certain timeout. Four seconds is lib/ai/identifyObject.ts's floor and the
 * reason it gives holds here too: nothing has ever come back from this model
 * in under three.
 */
const MIN_ATTEMPT_MS = 4_000;

/*
 * When to ask the next model alongside a slow first one.
 *
 * Most answers from the lite alias arrive in under two seconds (1,044ms on
 * 2026-09-27; 619–5,571ms across four rounds on the 24th), so four seconds
 * rarely spends a second request — and caps a hang at about five.
 */
const HEDGE_AFTER_MS = readBoundedInteger(
  process.env.TEXT_HEDGE_AFTER_MS,
  4_000,
  1_500,
  12_000,
);

/*
 * Every supported language, every time.
 *
 * This enum used to hold exactly the two languages the reader had set, and
 * the comment above it argued — correctly, in its own terms — that
 * constraining the choice stops a model from spelling French three different
 * ways. What it also did was make a French answer unrepresentable for a
 * reader studying English, which is not a formatting problem but a wrong
 * answer the app then stored forever.
 *
 * The constraint stays; the set widens. Five codes is still a choice between
 * named things rather than a naming exercise.
 */
const LANGUAGE_ENUM = [...LANGUAGE_CODES];

function buildTextResultSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      term: { type: "string", minLength: 1, maxLength: 240 },
      translation: { type: "string", minLength: 1, maxLength: 240 },
      termLanguage: { type: "string", enum: LANGUAGE_ENUM },
      translationLanguage: { type: "string", enum: LANGUAGE_ENUM },
      /*
       * The language the reader's own text was in — which is not always the
       * headword's language. Asked for separately because "no, that was
       * Italian" is a correction about their text, and pinning the headword
       * would answer a question nobody asked.
       */
      queryLanguage: { type: "string", enum: LANGUAGE_ENUM },
      partOfSpeech: {
        type: "string",
        enum: ["noun", "verb", "adjective", "phrase", "other"],
      },
      termExample: { type: "string", minLength: 4, maxLength: 240 },
      translationExample: { type: "string", minLength: 2, maxLength: 240 },
      kind: { type: "string", enum: ["word", "phrase", "sentence"] },
      /*
       * Flat strings rather than a nullable object.
       *
       * "There is nothing worth keeping in this sentence" is a real answer,
       * and an empty string says it without asking the schema to express a
       * null object — which the structured-output layer handles unevenly
       * across model versions. The parser below turns all-empty into null
       * once, in one place.
       */
      highlightTerm: { type: "string", maxLength: 120 },
      highlightTranslation: { type: "string", maxLength: 120 },
      highlightPartOfSpeech: { type: "string", maxLength: 40 },
      /*
       * The headword's IPA, in the same call.
       *
       * French, Spanish and Italian have no dictionary this app can ask for
       * a transcription, so the pronunciation row used to make a second
       * Gemini call for every new word — another wait, another request off
       * a free tier of twenty a day per model, and on 2026-09-27 a second
       * hang that ran into Vercel's 30s ceiling. Asking here costs a few
       * output tokens. Empty for Chinese, whose readings come from pinyin.
       */
      termIpa: { type: "string", maxLength: 120 },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      category: {
        type: "string",
        enum: ["people", "objects", "actions", "other"],
      },
    },
    required: [
      "term",
      "translation",
      "termLanguage",
      "translationLanguage",
      "queryLanguage",
      "partOfSpeech",
      "termExample",
      "translationExample",
      "kind",
      "highlightTerm",
      "highlightTranslation",
      "highlightPartOfSpeech",
      "termIpa",
      "confidence",
      "category",
    ],
  };
}

type CacheEntry = {
  expiresAt: number;
  result: LexiconEntry;
};

type ResolvedLookup = {
  result: LexiconEntry;
  /** "memory", "shared", "offline", or the model id that produced it. */
  origin: string;
  /**
   * Whether a model produced this. Offline fallbacks carry canned template
   * sentences, so they are returned but never cached — otherwise a momentary
   * Gemini outage would outlive itself in every cache layer.
   */
  fromModel: boolean;
  /**
   * On an offline answer only: how long until asking again is worth it.
   * See retryHint below.
   */
  retryAfterMs?: number | null;
  /**
   * On an offline answer only: when every model's daily quota comes back,
   * if running out of it is the reason there was no answer. Epoch ms.
   */
  quotaResetsAt?: number | null;
  dailyLimitReached?: boolean;
};

/*
 * A model answered, but not with something this app can show. Thrown after
 * generateJson has already succeeded, so its failure log never saw it.
 */
class LookupRejected extends Error {}

const resultCache = new Map<string, CacheEntry>();
const inFlightLookups = new Map<string, Promise<ResolvedLookup>>();
const modelCooldowns = new Map<string, number>();

/**
 * The cache key is the query, the pair it was answered in, and any language
 * the reader pinned.
 *
 * Both caches here are shared — the in-memory one across every request an
 * instance serves, the table across the whole app — and the answer is not the
 * same for everyone. Keyed on the query alone, the first person to look up
 * "bicycle" would decide what everyone else got back, in their language
 * rather than the asker's.
 *
 * A requested headword language belongs in the key for the same reason it
 * exists: "show me this in Italian" produces a different card for the same
 * eight letters, and serving one reader's choice to the next reader is the
 * bug this whole module is careful about in miniature.
 *
 * So does the reader's first language, which is not presentation either: it
 * decides whether a query is "what does this mean" or "what is this in the
 * language I study", and those are different cards.
 */
function getCacheKey(
  query: string,
  { learning, support, native }: LanguageRoles,
  chosenHead: LanguageCode | null,
) {
  const first = native && native !== support ? `~${native}` : "";
  const pin = chosenHead ? `@${chosenHead}` : "";

  return `${learning}+${support}${first}${pin}:${query.toLocaleLowerCase("en-US")}`;
}

function getCachedResult(key: string) {
  const cached = resultCache.get(key);

  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    resultCache.delete(key);
    return null;
  }

  // Refresh insertion order so frequently used words remain in the LRU cache.
  resultCache.delete(key);
  resultCache.set(key, cached);
  return cached.result;
}

function cacheResult(key: string, result: LexiconEntry) {
  resultCache.set(key, {
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
    result,
  });

  while (resultCache.size > MEMORY_CACHE_MAX_ITEMS) {
    const oldestKey = resultCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    resultCache.delete(oldestKey);
  }
}

function stripJsonCodeFence(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * The model's flat answer, folded into the shape the app carries.
 *
 * The highlight is the only real work: three strings that are all present and
 * all possibly empty become one object or nothing at all, decided here rather
 * than at each of the places that render it.
 */
function toLexiconEntry(value: unknown): LexiconEntry | null {
  if (!isLexiconEntry(value)) return null;

  const raw = value as LexiconEntry & {
    highlightTerm?: unknown;
    highlightTranslation?: unknown;
    highlightPartOfSpeech?: unknown;
  };

  const highlightTerm =
    typeof raw.highlightTerm === "string" ? raw.highlightTerm.trim() : "";
  const highlightTranslation =
    typeof raw.highlightTranslation === "string"
      ? raw.highlightTranslation.trim()
      : "";

  /*
   * The three flat highlight fields are folded into one object below and
   * must not survive as loose keys — a cached entry carrying both shapes is
   * two answers to the same question.
   */
  const entry = { ...raw };
  delete entry.highlightTerm;
  delete entry.highlightTranslation;
  delete entry.highlightPartOfSpeech;

  return {
    ...entry,
    highlight:
      highlightTerm && highlightTranslation
        ? {
            term: highlightTerm,
            translation: highlightTranslation,
            partOfSpeech:
              typeof raw.highlightPartOfSpeech === "string"
                ? raw.highlightPartOfSpeech.trim()
                : "",
          }
        : null,
  };
}

type LookupContext = {
  userId: string;
  query: string;
  roles: LanguageRoles;
  chosenHead: LanguageCode | null;
  detected: LanguageCode | null;
  kind: LexiconQueryKind;
};

async function lookupWithModel(
  client: GoogleGenAI,
  model: string,
  context: LookupContext,
  timeoutMs: number,
  signal?: AbortSignal,
) {
  const outputText = await generateJson(client, {
    purpose: "word-lookup",
    signal,
    model,
    input: buildClassifyTextPrompt({
        query: context.query,
        roles: context.roles,
        detected: context.detected,
        chosenHead: context.chosenHead,
        kind: context.kind,
      }),
    schema: buildTextResultSchema(),
    timeoutMs: timeoutMs,
  });

  const parsed = JSON.parse(stripJsonCodeFence(outputText)) as unknown;
  const result = toLexiconEntry(parsed);

  if (!result) {
    throw new LookupRejected("Gemini returned an invalid vocabulary result.");
  }

  /*
   * A gloss in the same language as the headword is not a gloss.
   *
   * The prompt says so, and a model still produces one occasionally for a
   * word that exists in both languages. Caught here rather than downstream
   * because the database refuses such a row and the reader would meet it as
   * a failed save several screens later.
   */
  if (result.termLanguage && result.termLanguage === result.translationLanguage) {
    throw new LookupRejected("Gemini glossed the word in its own language.");
  }

  return result;
}

/*
 * How long until asking again is worth it, told to the client with an
 * offline answer so it can wait that long and try once more by itself.
 *
 * The soonest a model this instance put away comes back. A busy model that
 * refused without being put away — a 503, an overloaded answer — is worth
 * asking again almost at once, so it answers two seconds. When nothing here
 * says a retry would go differently, it answers null and the client does not
 * try: a model that just spent the whole budget saying nothing will spend
 * it again.
 */
const QUICK_RETRY_MS = 2_000;

function retryHint(transientRefusal: boolean): number | null {
  const now = Date.now();
  let soonest: number | null = null;

  for (const model of getTextModelCandidates()) {
    const until = modelCooldowns.get(model) ?? 0;
    if (until <= now) continue;
    const wait = until - now;
    soonest = soonest === null ? wait : Math.min(soonest, wait);
  }

  if (transientRefusal) {
    return soonest === null ? QUICK_RETRY_MS : Math.min(soonest, QUICK_RETRY_MS);
  }

  return soonest;
}

type ModelLookup =
  | { result: LexiconEntry; model: string }
  | { result: null; retryAfterMs: number | null };

async function lookupWithModelFallback(
  context: LookupContext,
): Promise<ModelLookup> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { result: null, retryAfterMs: null };

  /*
   * No `httpOptions` here on purpose.
   *
   * The ceiling is not here. Every attempt is bounded by generateJson, which
   * sets both the transport timeout and an abort signal per call — see
   * lib/ai/modelRequest.ts. Configuring the client as well would say this
   * route is bounded twice when it is bounded once, and the client-level
   * version is the one that was measured not to hold.
   */
  const client = new GoogleGenAI({ apiKey });

  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_BUDGET_MS;
  let transientRefusal = false;

  /*
   * The healthy candidates, in order: minus anything another instance has
   * put away (lib/ai/modelHealth.ts), minus anything this instance has.
   */
  const shared = await healthyModels(getTextModelCandidates());
  const candidates = shared.filter(
    (model) => (modelCooldowns.get(model) ?? 0) <= Date.now(),
  );

  /*
   * Hedged rather than one after another: if the model in front has not
   * answered in HEDGE_AFTER_MS, the next is asked alongside it and the first
   * answer wins. The 13.5s hang on 2026-09-27 becomes a four-second wait.
   */
  const answered = await firstAnswer(
    candidates,
    (model, timeoutMs, signal) =>
      lookupWithModel(client, model, context, timeoutMs, signal),
    {
      hedgeAfterMs: HEDGE_AFTER_MS,
      deadline,
      minAttemptMs: MIN_ATTEMPT_MS,
      maxAttemptMs: REQUEST_TIMEOUT_MS,
      maxAttempts: CORE_MAX_ATTEMPTS,
    },
    (model, error, ms, timeoutMs) => {
      const status = getErrorStatus(error);

      /*
       * A timeout puts the model away too, not just a rate limit: a rate
       * limit is cheap to discover, and a timeout is the most expensive
       * failure there is.
       */
      if (shouldCoolDown(error)) {
        modelCooldowns.set(model, Date.now() + cooldownMsFor(error));
      } else if (status !== null && status >= 500) {
        transientRefusal = true;
      }

      if (error instanceof LookupRejected) {
        recordAiFailure({
          purpose: "word-lookup",
          model,
          reason: "model_error",
          status: null,
          ms,
          detail: error.message,
        });
      }

      console.warn("Vocabulary model unavailable; trying fallback.", {
        model,
        status,
        reason: isRateLimitError(error)
          ? "rate_limit"
          : isTimeoutError(error)
            ? "timeout"
            : "model_error",
        ms,
        budgetMs: timeoutMs,
        // Truncated: a rejected request can come back with the prompt
        // attached, and the part after "metric:" is what says which quota.
        detail:
          error instanceof Error ? error.message.slice(0, 600) : String(error),
      });
    },
  );

  if (answered) {
    console.info("Vocabulary lookup answered.", {
      model: answered.model,
      ms: Date.now() - startedAt,
    });

    return { result: answered.value, model: answered.model };
  }

  return { result: null, retryAfterMs: retryHint(transientRefusal) };
}

async function performLookup(
  context: LookupContext,
  key: string,
): Promise<ResolvedLookup> {
  // Any word another user has already looked up costs nothing and returns in
  // a single round trip, so this runs ahead of the model.
  const shared = await readSharedLookupCache(key);
  if (shared) {
    return { result: shared, origin: "shared", fromModel: true };
  }

  const allowed = await consumeDailyQuota(context.userId, "word_lookup", 150);
  if (!allowed) {
    return {
      result: await lookupOffline(context.query, {
        source: context.detected, head: context.chosenHead, roles: context.roles,
      }),
      origin: "daily-limit", fromModel: false, dailyLimitReached: true,
    };
  }

  const startedAt = Date.now();
  let modelResult: Awaited<ReturnType<typeof lookupWithModelFallback>>;
  try {
    modelResult = await lookupWithModelFallback(context);
  } catch (error) {
    await refundDailyQuota(context.userId, "word_lookup");
    throw error;
  }
  // A dictionary answer or a failed model call never spends an allowance.
  if (!modelResult.result) await refundDailyQuota(context.userId, "word_lookup");
  if (modelResult.result) {
    const { result, model } = modelResult;

    /*
     * After the response rather than beside it.
     *
     * This was `void writeSharedLookupCache(…)`, and a serverless function is
     * frozen the moment its response is sent: the row for "bonjour" looked up
     * at 15:10:00 on 2026-09-25 reached the table at 15:11:47, when the next
     * lookup happened to wake the same instance. A word looked up once and
     * never again could simply never be written. `after` is the platform's
     * promise that the work runs to the end without the reader waiting on it.
     */
    after(() => writeSharedLookupCache(key, result, model));

    /*
     * The transcription the lookup brought with it goes straight into the
     * phonetics cache, so the pronunciation row finds it rather than asking
     * a model again.
     */
    const ipa = typeof result.termIpa === "string" ? result.termIpa.trim() : "";
    if (ipa && result.termLanguage) {
      const language = result.termLanguage;
      after(() => rememberIpa(language, result.term, ipa));
    }

    return {
      result,
      origin: model,
      fromModel: true,
    };
  }

  recordAiFailure({
    purpose: "word-lookup",
    model: getTextModelCandidates().join(","),
    reason: "served_offline",
    status: null,
    ms: Date.now() - startedAt,
    detail: null,
  });

  /*
   * Out of quota everywhere is a different thing to say than "busy": a
   * retry cannot help until the reset, so none is suggested, and the reader
   * is told when instead.
   */
  const quotaResetsAt = await dailyQuotaResetAt(getTextModelCandidates());

  return {
    retryAfterMs: quotaResetsAt ? null : modelResult.retryAfterMs,
    quotaResetsAt,
    result: await lookupOffline(context.query, {
      source: context.detected,
      head: context.chosenHead,
      roles: context.roles,
    }),
    origin: "offline",
    fromModel: false,
  };
}

async function lookupVocabulary(
  context: LookupContext,
): Promise<ResolvedLookup> {
  const key = getCacheKey(context.query, context.roles, context.chosenHead);

  const cached = getCachedResult(key);
  if (cached) return { result: cached, origin: "memory", fromModel: true };

  const inFlightKey = `${context.userId}:${key}`;
  const existingRequest = inFlightLookups.get(inFlightKey);
  if (existingRequest) return existingRequest;

  const request = performLookup(context, key)
    .then((resolved) => {
      if (resolved.fromModel) cacheResult(key, resolved.result);
      return resolved;
    })
    .finally(() => {
      inFlightLookups.delete(inFlightKey);
    });

  inFlightLookups.set(inFlightKey, request);
  return request;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in before looking up a word." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      text?: string;
      headLanguage?: unknown;
    };
    const query = normalizeQuery(body.text ?? "");

    if (!query) {
      return NextResponse.json(
        { error: "Please provide a word or phrase to look up." },
        { status: 400 },
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Please keep it under ${MAX_QUERY_LENGTH} characters.` },
        { status: 400 },
      );
    }

    const roles = await readLanguageRoles(supabase, user.id);

    /*
     * Detected here as well as on the device, and for a different reason.
     * The client detects to decide what to show while it waits; this
     * detection is a hint inside the prompt, so it has to be computed where
     * the prompt is built rather than trusted from a request body that any
     * caller can write.
     */
    const detection = detectLanguage(query);
    const chosenHead = isLanguageCode(body.headLanguage)
      ? body.headLanguage
      : null;

    const resolved = await lookupVocabulary({
      userId: user.id,
      query,
      roles,
      chosenHead,
      detected:
        detection.language && detection.confidence >= DETECTION_CONFIDENCE_FLOOR
          ? detection.language
          : null,
      kind: classifyQueryKind(query),
    });

    /*
     * The built-in dictionary's transcription over the model's: it was
     * checked, it is the same one the pronunciation row shows, and an
     * offline answer has none of its own (lib/pronunciation/builtinIpa.ts).
     */
    const builtinTermIpa = builtinIpa(
      resolved.result.term,
      resolved.result.termLanguage,
    );

    return NextResponse.json(
      {
        ...resolved.result,
        ...(builtinTermIpa ? { termIpa: builtinTermIpa } : {}),
        // Tells the client this is the offline dictionary's canned example
        // rather than a real one, so it can say so and offer a retry instead
        // of passing the degraded copy off as a normal result.
        degraded: !resolved.fromModel,
        ...(resolved.fromModel
          ? {}
          : {
              retryAfterMs: resolved.retryAfterMs ?? null,
              quotaResetsAt: resolved.quotaResetsAt ?? null,
              dailyLimitReached: resolved.dailyLimitReached ?? false,
            }),
      },
      {
        headers: {
          // Lets cache effectiveness be read straight off a response rather
          // than inferred from billing.
          "X-Lookup-Source": resolved.origin,
        },
      },
    );
  } catch (error) {
    console.error("Vocabulary lookup route failed:", {
      status: getErrorStatus(error),
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { error: "Couldn't look up that word. Please try again." },
      { status: 500 },
    );
  }
}
