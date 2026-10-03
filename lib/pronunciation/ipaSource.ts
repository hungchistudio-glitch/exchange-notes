import "server-only";

import { GoogleGenAI } from "@google/genai";

import { getTextModelCandidates } from "@/lib/ai/modelConfig";
import { getLanguage, hasPhonetics, type LanguageCode } from "@/lib/languages";
import { builtinIpa } from "@/lib/pronunciation/builtinIpa";
import { createServiceClient } from "@/lib/supabase/service";

import { generateJson } from "@/lib/ai/modelRequest";
import { firstAnswer } from "@/lib/ai/hedge";
import { backgroundAllowed, healthyModels } from "@/lib/ai/modelHealth";
/* =========================================================
   Where IPA comes from

   This app used to annotate English and nothing else, and the reason given
   was cost rather than principle: the endpoint fires once per word every
   time a vocabulary drawer opens, so a model lookup would have burned the
   quota the Daily News rework exists to protect.

   A cache removes the objection instead of working around it. A word's
   transcription does not change, so it is looked up once — ever, across all
   readers — and after that the drawer is a database read. Quota is bounded
   by distinct new words, not by how often anyone opens anything.

   Before any of it, the ~4,000 words of the app's own dictionary are
   answered from builtinIpa.ts, which has them all.

   English still asks a real dictionary first. It is free, keyless and
   authoritative, and there is no reason to pay a model for an answer
   dictionaryapi.dev already has. The model is the fallback there, and the
   source for Spanish, French and Italian, which that dictionary does not
   serve.
   ========================================================= */

type DictionaryEntry = {
  phonetic?: string;
  phonetics?: Array<{ text?: string }>;
};

/** Languages a free dictionary can answer for, so the model is not asked. */
const DICTIONARY_LANGUAGES: readonly LanguageCode[] = ["en"];

/*
 * The model half's time limits. The route allows 30s; the budget leaves the
 * auth call, the cache read and write, and the response well inside it.
 */
const TOTAL_BUDGET_MS = 18_000;
const ATTEMPT_MS = 10_000;
const MIN_ATTEMPT_MS = 3_000;

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    words: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          ipa: { type: "string" },
        },
        required: ["text", "ipa"],
      },
    },
  },
  required: ["words"],
} as const;

function cacheKey(text: string): string {
  return text.trim();
}

async function readCache(
  language: LanguageCode,
  texts: string[],
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (texts.length === 0) return found;

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("word_phonetics")
      .select("text, ipa")
      .eq("language", language)
      .in("text", texts);

    if (error || !data) return found;

    for (const row of data as Array<{ text: string; ipa: string }>) {
      if (row.ipa?.trim()) found.set(row.text, row.ipa.trim());
    }
  } catch {
    // A cache that cannot be read is a slow lookup, not a failed one.
  }

  return found;
}

async function writeCache(
  language: LanguageCode,
  entries: Map<string, string>,
  source: string,
): Promise<void> {
  if (entries.size === 0) return;

  try {
    const supabase = createServiceClient();

    await supabase.from("word_phonetics").upsert(
      [...entries].map(([text, ipa]) => ({ language, text, ipa, source })),
      { onConflict: "language,text", ignoreDuplicates: true },
    );
  } catch {
    // Losing a cache write costs one repeat lookup later. It must never
    // cost the caller the transcription it already has in hand.
  }
}

/**
 * File a transcription that arrived some other way — the word lookup now
 * asks for the headword's IPA in the same call — so the pronunciation row
 * finds it in the cache instead of asking a model again.
 */
export async function rememberIpa(
  language: LanguageCode,
  text: string,
  ipa: string,
): Promise<void> {
  const word = cacheKey(text);
  const value = ipa.trim();
  if (!word || !value || !hasPhonetics(language, "ipa")) return;
  if (process.env.NODE_ENV === "test") return;

  await writeCache(language, new Map([[word, value]]), "model");
}

async function fromDictionary(word: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(4000) },
    );

    if (!response.ok) return "";

    const entries = (await response.json()) as DictionaryEntry[];

    for (const entry of entries) {
      if (entry.phonetic?.trim()) return entry.phonetic.trim();
      const withText = entry.phonetics?.find((p) => p.text?.trim());
      if (withText?.text) return withText.text.trim();
    }
  } catch {
    // A dictionary miss is not an error worth surfacing; the model below
    // covers it, and an un-annotated word renders as an un-annotated word.
  }

  return "";
}

/**
 * Transcription for words the cheaper sources could not answer.
 *
 * Batched on purpose: a drawer opens with a handful of words, and one call
 * for all of them is the difference between a quota that scales with words
 * and one that scales with taps.
 *
 * This is reference data, not a measurement. Asking what "consulenza" is in
 * IPA has a right answer that does not depend on the reader — unlike a
 * pronunciation score, which would be a number invented about a person, and
 * is why nothing in this app produces one.
 */
async function fromModel(
  texts: string[],
  language: LanguageCode,
): Promise<{ found: Map<string, string>; failed: boolean }> {
  const out = new Map<string, string>();
  if (texts.length === 0 || !process.env.GEMINI_API_KEY) {
    return { found: out, failed: false };
  }

  const meta = getLanguage(language);
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  /*
   * Every candidate, not just the first.
   *
   * The models share an API key but not a quota, so the one that is busy is
   * usually not the only one available — and this is a small, mechanical
   * task that the fast model does as well as the strong one. Falling
   * through is the difference between "the annotation is a second late" and
   * "the annotation never appears".
   */
  let lastError: unknown = null;

  /*
   * Bounded as a whole, and hedged.
   *
   * This asked each candidate in turn at the shared fifteen-second ceiling
   * with no total at all, so a hang on the first and a slow second added up
   * past the route's 30s maxDuration: on 2026-09-27 a French word's
   * transcription ended in "Vercel Runtime Timeout Error". Now the whole
   * thing has TOTAL_BUDGET_MS and no attempt starts with less than
   * MIN_ATTEMPT_MS left. (It was hedged like the word lookup until
   * 2026-09-28; as background work it now asks one model — see below.)
   */
  /*
   * In the background, and only when there is room (Chi, 2026-09-28).
   *
   * These transcriptions are asked for automatically — Home, the cookie
   * tray, message and news cards — and on the 28th they were the largest
   * single user of the free allowance: about 140 failed requests in a day,
   * and the reserve model spent within the hour, while the camera and the
   * lookups the reader was actually waiting on went without. A word looked
   * up or photographed brings its IPA with it (termIpa); what is left here
   * waits for a comfortable allowance, asks one model, and does not hedge.
   * "failed" puts the words in the client's backoff, to be asked later.
   */
  if (!(await backgroundAllowed(getTextModelCandidates()))) {
    return { found: out, failed: true };
  }

  const answered = await firstAnswer(
    (await healthyModels(getTextModelCandidates())).slice(0, 1),
    async (model, timeoutMs, signal) => {
      const raw = await generateJson(client, {
        purpose: "phonetics",
        model,
        signal,
        timeoutMs,
        input: [
          `Give the IPA transcription of each ${meta.name.english} word or phrase below.`,
          ``,
          `Rules:`,
          `- Broad phonemic transcription, wrapped in forward slashes, e.g. /konsuˈlɛntsa/.`,
          `- Mark primary stress with ˈ before the stressed syllable.`,
          `- Transcribe it as ${meta.name.english}, never as English.`,
          `- Return the words in the same order, with "text" copied exactly as given.`,
          `- If a word is not ${meta.name.english} or you are unsure, return an empty "ipa" rather than guessing.`,
          ``,
          ...texts.map((text, index) => `${index + 1}. ${text}`),
        ].join("\n"),
        schema: RESULT_SCHEMA,
      });

      return JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim()) as {
        words?: Array<{ text?: string; ipa?: string }>;
      };
    },
    {
      hedgeAfterMs: Number.POSITIVE_INFINITY,
      maxAttempts: 1,
      deadline: Date.now() + TOTAL_BUDGET_MS,
      minAttemptMs: MIN_ATTEMPT_MS,
      maxAttemptMs: ATTEMPT_MS,
    },
    (_model, error) => {
      lastError = error;
    },
  );

  if (answered) {
    (answered.value.words ?? []).forEach((answer, index) => {
      // Positional, with the echoed text as a cross-check: a model that
      // renamed or reordered an entry must not have its answer filed under
      // somebody else's word.
      const asked = texts[index];
      if (!asked) return;

      const echoed = answer.text?.trim();
      if (echoed && echoed !== asked) return;

      const ipa = answer.ipa?.trim();
      if (ipa) out.set(asked, ipa);
    });

    return { found: out, failed: false };
  }

  console.error("IPA transcription failed:", lastError);

  return { found: out, failed: true };
}

/**
 * IPA for each of `texts`, in `language`.
 *
 * Absent from the map means "no transcription available", which a renderer
 * should skip. It never means "here is one from another language".
 */
export async function transcribe(
  texts: string[],
  language: LanguageCode,
  budget?: {
    consume: () => Promise<boolean>;
    refund: () => Promise<void>;
  },
): Promise<{
  found: Map<string, string>;
  unavailable: string[];
  limited: string[];
}> {
  const wanted = [...new Set(texts.map(cacheKey))].filter(Boolean);

  if (wanted.length === 0 || !hasPhonetics(language, "ipa")) {
    return { found: new Map(), unavailable: [], limited: [] };
  }

  /*
   * The built-in dictionary's own transcriptions first: no database, no
   * network, no quota (builtinIpa.ts). Only what it does not know goes on
   * to the cache, the dictionary and the model.
   */
  const found = new Map<string, string>();
  for (const text of wanted) {
    const ipa = builtinIpa(text, language);
    if (ipa) found.set(text, ipa);
  }

  const unknown = wanted.filter((text) => !found.has(text));
  if (unknown.length === 0) return { found, unavailable: [], limited: [] };

  for (const [text, ipa] of await readCache(language, unknown)) {
    found.set(text, ipa);
  }
  const missing = wanted.filter((text) => !found.has(text));

  if (missing.length === 0) return { found, unavailable: [], limited: [] };

  if (DICTIONARY_LANGUAGES.includes(language)) {
    const fresh = new Map<string, string>();

    const results = await Promise.all(
      missing.map(async (word) => [word, await fromDictionary(word)] as const),
    );

    for (const [word, ipa] of results) {
      if (ipa) {
        fresh.set(word, ipa);
        found.set(word, ipa);
      }
    }

    await writeCache(language, fresh, "dictionaryapi.dev");
  }

  const stillMissing = wanted.filter((text) => !found.has(text));

  if (stillMissing.length === 0) {
    return { found, unavailable: [], limited: [] };
  }

  let charged = false;

  if (process.env.GEMINI_API_KEY && budget) {
    if (!(await budget.consume())) {
      return { found, unavailable: [], limited: stillMissing };
    }

    charged = true;
  }

  const { found: fresh, failed } = await fromModel(stillMissing, language);

  if (failed && charged) {
    await budget?.refund();
  }

  for (const [text, ipa] of fresh) found.set(text, ipa);

  await writeCache(language, fresh, "model");

  /*
   * "We could not ask" and "there is no transcription" are different
   * answers, and collapsing them is what made a busy minute permanent: the
   * caller cached the silence as "this word has none" and never asked
   * again. Only a lookup that actually ran gets to say a word has no IPA.
   */
  return {
    found,
    unavailable: failed
      ? stillMissing.filter((text) => !fresh.has(text))
      : [],
    limited: [],
  };
}
