import "server-only";

import { GoogleGenAI } from "@google/genai";

import { getTextModelCandidates } from "@/lib/ai/modelConfig";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { createServiceClient } from "@/lib/supabase/service";

import { generateJson } from "@/lib/ai/modelRequest";
/* =========================================================
   Translating text nobody owns

   A reader's own vocabulary can be filled in when they switch language,
   because those are their rows. A word card sitting in a conversation is
   not: it belongs to whoever sent it, and rewriting someone's sent message
   to change what it says is not a thing this app does.

   So the message stays exactly as sent, and the rendering gains the
   reader's language from here. Cached like phonetics and for the same
   reason — the answer does not change, and looking it up once means the
   second reader of the same dish name pays nothing.
   ========================================================= */

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          source: { type: "string" },
          text: { type: "string" },
        },
        required: ["source", "text"],
      },
    },
  },
  required: ["items"],
} as const;

async function readCache(
  from: LanguageCode,
  to: LanguageCode,
  texts: string[],
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (texts.length === 0) return found;

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("text_translations")
      .select("source_text, text")
      .eq("source_language", from)
      .eq("target_language", to)
      .in("source_text", texts);

    if (error || !data) return found;

    for (const row of data as Array<{ source_text: string; text: string }>) {
      if (row.text?.trim()) found.set(row.source_text, row.text.trim());
    }
  } catch {
    // A cache that cannot be read is a slow lookup, not a failed one.
  }

  return found;
}

async function writeCache(
  from: LanguageCode,
  to: LanguageCode,
  entries: Map<string, string>,
): Promise<void> {
  if (entries.size === 0) return;

  try {
    const supabase = createServiceClient();

    await supabase.from("text_translations").upsert(
      [...entries].map(([source_text, text]) => ({
        source_language: from,
        source_text,
        target_language: to,
        text,
        source: "model",
      })),
      {
        onConflict: "source_language,source_text,target_language",
        ignoreDuplicates: true,
      },
    );
  } catch {
    // Losing a cache write costs one repeat lookup. It must never cost the
    // caller the translation it already has in hand.
  }
}

/*
 * Deliberately two functions rather than one.
 *
 * The cache answers most of this, and the model is asked only for what is
 * left — so a caller that has to pay for the model needs the seam between
 * those two things. A single translateTexts() hid it, and the route that
 * called it therefore had no way to charge for a model call without also
 * charging for a screen the cache had already answered in full.
 *
 * Splitting it also removes the shape that got this wrong in the first
 * place: there is no longer a function that reaches a paid model and looks
 * from the outside like a lookup.
 */

/** What the cache already holds, and what it does not. */
export type CachedTranslations = {
  found: Map<string, string>;
  missing: string[];
};

/**
 * The translations already stored for `texts`, and the ones still wanted.
 *
 * Costs nothing but a query. `missing` is deduplicated and trimmed, and is
 * empty when `from` and `to` are the same language — a caller can treat a
 * non-empty `missing` as "asking the model is the only way to answer this".
 */
export async function readCachedTranslations(
  texts: string[],
  from: LanguageCode,
  to: LanguageCode,
): Promise<CachedTranslations> {
  const wanted = [...new Set(texts.map((text) => text.trim()))].filter(Boolean);

  if (wanted.length === 0 || from === to) {
    return { found: new Map(), missing: [] };
  }

  const found = await readCache(from, to, wanted);

  return {
    found,
    missing: wanted.filter((text) => !found.has(text)),
  };
}

/**
 * Asks the model for the phrases the cache could not answer.
 *
 * Returns only what came back. Anything absent from the result is a phrase
 * the model was asked about and did not usefully answer — "we could not ask"
 * and "there is no translation" are different answers, and collapsing them is
 * how one busy minute becomes a card that is never translated, because the
 * caller caches the silence and stops asking.
 */
export async function translateMissing(
  missing: string[],
  from: LanguageCode,
  to: LanguageCode,
): Promise<Map<string, string>> {
  const fresh = new Map<string, string>();

  if (missing.length === 0 || !process.env.GEMINI_API_KEY) return fresh;

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const fromName = getLanguage(from).name.english;
  const toName = getLanguage(to).name.english;

  let lastError: unknown = null;

  // Every candidate: the models share an API key but not a quota, so the one
  // that is busy is usually not the only one available.
  for (const model of getTextModelCandidates()) {
    try {
      const raw = await generateJson(client, {
        purpose: "text-translate",
        model,
        input: [
          `Translate each ${fromName} phrase below into ${toName}.`,
          ``,
          `Rules:`,
          `- Natural and idiomatic, the way a native speaker would write it.`,
          `- These are short vocabulary entries and dish names; keep them short.`,
          `- Copy "source" back exactly as given.`,
          `- Return them in the same order.`,
          ``,
          ...missing.map((text, index) => `${index + 1}. ${text}`),
        ].join("\n"),
        schema: RESULT_SCHEMA,
      });

      const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim()) as {
        items?: Array<{ source?: string; text?: string }>;
      };

      (parsed.items ?? []).forEach((answer, index) => {
        // Positional, cross-checked against the echoed source: a model that
        // reordered an entry must not have its answer filed under another
        // phrase.
        const asked = missing[index];
        if (!asked) return;

        const echoed = answer.source?.trim();
        if (echoed && echoed !== asked) return;

        const text = answer.text?.trim();
        if (text) fresh.set(asked, text);
      });

      lastError = null;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) console.error("Card translation failed:", lastError);

  await writeCache(from, to, fresh);

  return fresh;
}
