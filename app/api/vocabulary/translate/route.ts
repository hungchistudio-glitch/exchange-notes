import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { getTextModelCandidates } from "@/lib/ai/modelConfig";
import {
  buildTranslateVocabularyPrompt,
  type VocabularyToTranslate,
} from "@/lib/ai/prompts/translateVocabulary";
import {
  LANGUAGE_CODES,
  isLanguageCode,
  type ByLanguage,
  type LanguageCode,
} from "@/lib/languages";
import { readLearningPair } from "@/lib/profile/languagePair";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/*
 * One batch is twenty words.
 *
 * Small enough that a failure costs little and the response stays inside the
 * model's comfortable output length; large enough that a 258-word library is
 * thirteen calls rather than 258. The caller repeats until nothing is left,
 * so the size is a throughput knob, not a limit on what can be filled.
 */
const BATCH_SIZE = 20;

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
          text: { type: "string", minLength: 1, maxLength: 120 },
          example: { type: "string", maxLength: 300 },
        },
        required: ["text", "example"],
      },
    },
  },
  required: ["words"],
};

type Row = {
  id: string;
  part_of_speech: string | null;
  texts: ByLanguage;
  examples: ByLanguage;
};

function toRequest(row: Row): VocabularyToTranslate | null {
  const known = LANGUAGE_CODES.flatMap((language) => {
    const text = row.texts[language]?.trim();
    if (!text) return [];
    return [{ language, text, example: row.examples[language]?.trim() }];
  });

  if (known.length === 0) return null;

  return { id: row.id, known, partOfSpeech: row.part_of_speech };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { language?: unknown };

    /*
     * The target defaults to what the user is learning, which is the only
     * language this is ever wanted for in practice — but it is a parameter,
     * because filling a language you are about to switch to is a reasonable
     * thing to offer and this route should not have an opinion about it.
     */
    const [learning] = await readLearningPair(supabase, user.id);
    const target: LanguageCode = isLanguageCode(body.language)
      ? body.language
      : learning;

    /*
     * Every row, and only the four small columns needed to decide.
     *
     * There was a page limit here, and no ordering to go with it — so each
     * call re-read whichever rows the database felt like returning, filled
     * the ones that were missing, and eventually reported "done" while words
     * it had never looked at were still untranslated. A library stopped
     * halfway and said it had finished.
     *
     * The columns are tiny (a word and a sentence per language), so reading
     * all of them costs less than the paging that was getting this wrong.
     */
    const { data, error } = await supabase
      .from("vocabulary_items")
      .select("id, part_of_speech, texts, examples")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    // "Has no key for this language" is awkward to express against jsonb
    // through the client and trivial to express here.
    const outstanding = ((data ?? []) as Row[]).filter(
      (row) => !row.texts?.[target]?.trim(),
    );

    const missing = outstanding.slice(0, BATCH_SIZE);

    if (missing.length === 0) {
      return NextResponse.json({ filled: 0, remaining: 0, done: true });
    }

    const items = missing
      .map(toRequest)
      .filter((item): item is VocabularyToTranslate => item !== null);

    if (items.length === 0) {
      return NextResponse.json({ filled: 0, remaining: 0, done: true });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Translation is not configured." },
        { status: 503 },
      );
    }

    const client = new GoogleGenAI({ apiKey });

    /*
     * Every candidate, not just the first.
     *
     * This route was the last one still asking a single model, and it is
     * the one production was actually failing on: twenty-four 429s in an
     * hour, all from the same busy model, while a second one sharing the
     * same key sat idle. A library fill is a long run of requests — the
     * shape most likely to meet a rate limit and the least able to afford
     * losing the batch when it does.
     */
    let outputText = "";
    let lastError: unknown = null;

    for (const model of getTextModelCandidates()) {
      try {
        const interaction = await client.interactions.create({
          model,
          input: buildTranslateVocabularyPrompt(items, target),
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: RESULT_SCHEMA,
          },
          generation_config: { thinking_level: "low" },
          store: false,
        });

        outputText =
          typeof interaction.output_text === "string"
            ? interaction.output_text
            : "";

        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;

    const parsed = JSON.parse(
      outputText.replace(/^```json\s*|```$/g, "").trim(),
    ) as { words?: Array<{ text?: string; example?: string }> };

    const answers = parsed.words ?? [];

    /*
     * Written one row at a time, and only into the key that was missing.
     *
     * A word the user edited, or one that already had this language, is never
     * touched: the merge is the existing map plus one key. Losing a person's
     * own wording to a machine filling in a blank is the one failure this
     * feature must not have.
     */
    let filled = 0;
    /*
     * The rows as they now are, handed back rather than left for the caller
     * to go and find. It used to answer with counts only, so the only way to
     * put a filled batch on screen was to re-read the whole library — twenty
     * words translated, three hundred re-fetched, up to twenty-five times in
     * a session. The route already holds exactly what changed.
     */
    const updated: Array<{
      id: string;
      texts: Record<string, string>;
      examples: Record<string, string>;
    }> = [];

    for (const [index, item] of items.entries()) {
      const answer = answers[index];
      const text = answer?.text?.trim();
      if (!text) continue;

      const row = missing.find((candidate) => candidate.id === item.id);
      if (!row || row.texts?.[target]?.trim()) continue;

      const example = answer.example?.trim();

      const nextTexts = { ...row.texts, [target]: text };
      const nextExamples = example
        ? { ...row.examples, [target]: example }
        : row.examples;

      const { error: updateError } = await supabase
        .from("vocabulary_items")
        .update({ texts: nextTexts, examples: nextExamples })
        .eq("id", row.id)
        .eq("user_id", user.id);

      if (updateError) continue;

      filled += 1;
      updated.push({
        id: row.id,
        texts: nextTexts,
        examples: nextExamples ?? {},
      });
    }

    /*
     * What is actually left, not "everything minus this batch" — which is
     * what this used to answer, and which meant the caller could never tell
     * how far along it was.
     *
     * `done` still keys on filling nothing rather than on the count reaching
     * zero: a batch that comes back empty is a batch that is not going to
     * succeed on retry either, and stopping is better than a loop.
     */
    return NextResponse.json({
      filled,
      language: target,
      updated,
      remaining: Math.max(outstanding.length - filled, 0),
      done: filled === 0,
    });
  } catch (error) {
    console.error("Vocabulary translation failed:", error);

    return NextResponse.json(
      { error: "Those words could not be translated. Please try again." },
      { status: 500 },
    );
  }
}
