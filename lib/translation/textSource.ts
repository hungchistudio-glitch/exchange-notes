import "server-only";

import { GoogleGenAI } from "@google/genai";

import { getTextModelCandidates } from "@/lib/ai/modelConfig";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { createServiceClient } from "@/lib/supabase/service";

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

/**
 * `texts`, in `to`.
 *
 * Absent from the map means no translation is available — which a caller
 * should render as the original rather than as a blank.
 */
export async function translateTexts(
  texts: string[],
  from: LanguageCode,
  to: LanguageCode,
): Promise<{ found: Map<string, string>; unavailable: string[] }> {
  const wanted = [...new Set(texts.map((text) => text.trim()))].filter(Boolean);

  if (wanted.length === 0 || from === to) {
    return { found: new Map(), unavailable: [] };
  }

  const found = await readCache(from, to, wanted);
  const missing = wanted.filter((text) => !found.has(text));

  if (missing.length === 0 || !process.env.GEMINI_API_KEY) {
    return { found, unavailable: missing };
  }

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const fromName = getLanguage(from).name.english;
  const toName = getLanguage(to).name.english;

  const fresh = new Map<string, string>();
  let lastError: unknown = null;

  // Every candidate: the models share an API key but not a quota, so the one
  // that is busy is usually not the only one available.
  for (const model of getTextModelCandidates()) {
    try {
      const interaction = await client.interactions.create({
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

  for (const [text, translated] of fresh) found.set(text, translated);

  await writeCache(from, to, fresh);

  /*
   * "We could not ask" and "there is no translation" are different answers.
   * Collapsing them is how one busy minute becomes a card that is never
   * translated — the caller caches the silence and stops asking.
   */
  return {
    found,
    unavailable: missing.filter((text) => !fresh.has(text)),
  };
}
