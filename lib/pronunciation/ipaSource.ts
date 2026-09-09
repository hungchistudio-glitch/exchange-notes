import "server-only";

import { GoogleGenAI } from "@google/genai";

import { getTextModelCandidates } from "@/lib/ai/modelConfig";
import { getLanguage, hasPhonetics, type LanguageCode } from "@/lib/languages";
import { createServiceClient } from "@/lib/supabase/service";

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

  for (const model of getTextModelCandidates()) {
    try {
      const interaction = await client.interactions.create({
        model,
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
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: RESULT_SCHEMA,
        },
        generation_config: { thinking_level: "low" },
        store: false,
      });

      const raw =
        typeof interaction.output_text === "string"
          ? interaction.output_text
          : "";

      const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim()) as {
        words?: Array<{ text?: string; ipa?: string }>;
      };

      (parsed.words ?? []).forEach((answer, index) => {
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
    } catch (error) {
      lastError = error;
    }
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
): Promise<{ found: Map<string, string>; unavailable: string[] }> {
  const wanted = [...new Set(texts.map(cacheKey))].filter(Boolean);

  if (wanted.length === 0 || !hasPhonetics(language, "ipa")) {
    return { found: new Map(), unavailable: [] };
  }

  const found = await readCache(language, wanted);
  const missing = wanted.filter((text) => !found.has(text));

  if (missing.length === 0) return { found, unavailable: [] };

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

  if (stillMissing.length === 0) return { found, unavailable: [] };

  const { found: fresh, failed } = await fromModel(stillMissing, language);

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
  };
}
