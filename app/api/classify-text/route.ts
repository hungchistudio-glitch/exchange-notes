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
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { LanguageRoles } from "@/lib/lexicon/languageRouting";
import type { LexiconEntry, LexiconQueryKind } from "@/lib/lexicon/types";
import { isLexiconEntry } from "@/lib/lexicon/types";
import { lookupOffline } from "@/lib/vocabulary/offlineLookup";
import {
  readSharedLookupCache,
  writeSharedLookupCache,
} from "@/lib/vocabulary/sharedLookupCache";
import {
  getTextModelCandidates,
  readBoundedInteger,
} from "@/lib/ai/modelConfig";

export const runtime = "nodejs";

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
const MODEL_COOLDOWN_MS = 65 * 1000;
const REQUEST_TIMEOUT_MS = readBoundedInteger(
  process.env.TEXT_REQUEST_TIMEOUT_MS,
  6_000,
  2_000,
  20_000,
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
};

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

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
  };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === "number" ? status : null;
}

function isRateLimitError(error: unknown) {
  if (getErrorStatus(error) === 429) return true;
  return error instanceof Error && /quota|rate.?limit|too many requests/i.test(error.message);
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
) {
  const interaction = await client.interactions.create(
    {
      model,
      input: buildClassifyTextPrompt({
        query: context.query,
        roles: context.roles,
        detected: context.detected,
        chosenHead: context.chosenHead,
        kind: context.kind,
      }),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: buildTextResultSchema(),
      },
      generation_config: {
        thinking_level: "low",
      },
      store: false,
    },
    {
      maxRetries: 0,
      timeout: REQUEST_TIMEOUT_MS,
    },
  );

  const outputText =
    typeof interaction.output_text === "string"
      ? interaction.output_text
      : "";

  if (!outputText.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(stripJsonCodeFence(outputText)) as unknown;
  const result = toLexiconEntry(parsed);

  if (!result) {
    throw new Error("Gemini returned an invalid vocabulary result.");
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
    throw new Error("Gemini glossed the word in its own language.");
  }

  return result;
}

async function lookupWithModelFallback(context: LookupContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    },
  });

  for (const model of getTextModelCandidates()) {
    const cooldownUntil = modelCooldowns.get(model) ?? 0;
    if (cooldownUntil > Date.now()) continue;

    try {
      const result = await lookupWithModel(client, model, context);
      return { result, model };
    } catch (error) {
      const status = getErrorStatus(error);

      if (isRateLimitError(error)) {
        modelCooldowns.set(model, Date.now() + MODEL_COOLDOWN_MS);
      }

      console.warn("Vocabulary model unavailable; trying fallback.", {
        model,
        status,
        reason: isRateLimitError(error) ? "rate_limit" : "model_error",
      });
    }
  }

  return null;
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

  const modelResult = await lookupWithModelFallback(context);
  if (modelResult) {
    // Not awaited: persisting for other users must not delay this response,
    // and a cache that cannot be written is not a failed lookup.
    void writeSharedLookupCache(key, modelResult.result, modelResult.model);

    return {
      result: modelResult.result,
      origin: modelResult.model,
      fromModel: true,
    };
  }

  return {
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

  const existingRequest = inFlightLookups.get(key);
  if (existingRequest) return existingRequest;

  const request = performLookup(context, key)
    .then((resolved) => {
      if (resolved.fromModel) cacheResult(key, resolved.result);
      return resolved;
    })
    .finally(() => {
      inFlightLookups.delete(key);
    });

  inFlightLookups.set(key, request);
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
      query,
      roles,
      chosenHead,
      detected:
        detection.language && detection.confidence >= DETECTION_CONFIDENCE_FLOOR
          ? detection.language
          : null,
      kind: classifyQueryKind(query),
    });

    return NextResponse.json(
      {
        ...resolved.result,
        // Tells the client this is the offline dictionary's canned example
        // rather than a real one, so it can say so and offer a retry instead
        // of passing the degraded copy off as a normal result.
        degraded: !resolved.fromModel,
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
