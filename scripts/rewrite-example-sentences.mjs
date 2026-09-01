import "./alias-hooks.mjs";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const { buildRewriteExamplesPrompt } = await import(
  "@/lib/ai/prompts/exampleSentence"
);
const { LANGUAGE_CODES } = await import("@/lib/languages");

/* =========================================================
   Rewrites the example sentences already in the library

   Fixing the prompts only fixes the next word. What is already saved stays
   saved, and most of this library was written under the old instructions —
   of 395 stored English examples, fewer than a third put the word in a
   person's mouth. Words met through the news are the worst of it, because
   that prompt told the model its examples "must not introduce new claims
   about the article" and the model obliged by writing about the article:

     earnings   "Average growth in total earnings, including bonuses, fell to
                 4.1% in the three months to June."
     franchise  "The music over the closing credits will incidentally
                 disappoint fans of this animated franchise."

   Those are Guardian sentences. They are accurate, they contain the word,
   and nobody will ever say either of them.

   The prompt comes from lib/ai/prompts/exampleSentence rather than being
   copied here, which is the point of scripts/alias-hooks.mjs. A script
   carrying its own copy of a prompt is how the sentences being rewritten
   came to be wrong.

   Usage:
     node scripts/rewrite-example-sentences.mjs              # dry run, prints a sample
     node scripts/rewrite-example-sentences.mjs --apply      # writes
     node scripts/rewrite-example-sentences.mjs --apply \
       --ids=uuid,uuid                                       # just those rows

   --ids exists because a run over four hundred words will lose a batch
   sooner or later — one timeout, and eight words keep the sentences the run
   was meant to replace. Without it the only retry is the whole library
   again, which rewrites three hundred and seventy sentences that were
   already fine to fix the eight that were not.

   Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
   GEMINI_API_KEY from .env.local. Back the examples up before --apply; this
   overwrites them in place and there is no undo in here.
   ========================================================= */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BATCH = 8;
const CONCURRENCY = 3;
const MODEL = process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-3.1-flash-lite";

const apply = process.argv.includes("--apply");

const idsArgument = process.argv.find((argument) => argument.startsWith("--ids="));
const onlyIds = idsArgument
  ? idsArgument
      .slice("--ids=".length)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  : null;

function readEnvFile() {
  const text = readFileSync(join(root, ".env.local"), "utf8");

  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      }),
  );
}

const env = { ...readEnvFile(), ...process.env };

for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
]) {
  if (!env[key]) {
    console.error(`Missing ${key}.`);
    process.exit(1);
  }
}

const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

/**
 * The response shape for one batch.
 *
 * Built per batch because a batch only covers the languages its words are
 * actually known in, and every key is optional — a word known in two
 * languages must not be asked for five sentences.
 */
function schemaFor(languages) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      words: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            examples: {
              type: "object",
              additionalProperties: false,
              properties: Object.fromEntries(
                languages.map((code) => [
                  code,
                  { type: "string", minLength: 2, maxLength: 300 },
                ]),
              ),
              required: [],
            },
          },
          required: ["examples"],
        },
      },
    },
    required: ["words"],
  };
}

async function rewrite(rows) {
  const languages = LANGUAGE_CODES.filter((code) =>
    rows.some((row) => row.texts?.[code]?.trim()),
  );

  const prompt = buildRewriteExamplesPrompt(
    rows.map((row) => ({
      id: row.id,
      known: languages
        .filter((code) => row.texts?.[code]?.trim())
        .map((code) => ({ language: code, text: row.texts[code].trim() })),
      partOfSpeech: row.part_of_speech,
    })),
    languages,
  );

  const interaction = await ai.interactions.create(
    {
      model: MODEL,
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: schemaFor(languages),
      },
      generation_config: { thinking_level: "low" },
      store: false,
    },
    { maxRetries: 0, timeout: 120_000 },
  );

  const text = String(interaction.output_text ?? "")
    .replace(/^```json\s*|```$/g, "")
    .trim();

  return JSON.parse(text).words ?? [];
}

/**
 * Merges one batch's answers over the rows they came from.
 *
 * A language is only replaced when the model answered for it *and* the row
 * actually holds the word in it. Blanking a sentence the reader can see, on
 * the strength of a model omitting a key, is the one outcome worth ruling
 * out structurally.
 */
function merge(row, fresh) {
  const examples = { ...(row.examples ?? {}) };
  let changed = false;

  for (const code of LANGUAGE_CODES) {
    const sentence = fresh?.[code]?.trim();
    if (!sentence || !row.texts?.[code]?.trim()) continue;
    if (examples[code] === sentence) continue;

    examples[code] = sentence;
    changed = true;
  }

  return changed ? examples : null;
}

async function write(row, examples) {
  const { error } = await db
    .from("vocabulary_items")
    .update({
      examples,
      /*
       * The two legacy columns are still read as a fallback — by cardSides
       * when the map is missing a language, and by the review queue — so
       * they have to keep agreeing with the map rather than drifting behind
       * it.
       */
      example_sentence: row.word_language
        ? (examples[row.word_language] ?? null)
        : null,
      translated_example: row.translation_language
        ? (examples[row.translation_language] ?? null)
        : null,
    })
    .eq("id", row.id);

  if (error) throw new Error(error.message);
}

async function handleBatch(rows, samples) {
  const answers = await rewrite(rows);
  let touched = 0;

  for (const [index, row] of rows.entries()) {
    const examples = merge(row, answers[index]?.examples);
    if (!examples) continue;

    if (samples.length < 8) {
      const code = row.word_language ?? "en";
      samples.push({
        word: row.texts?.[code] ?? row.word,
        before: row.examples?.[code] ?? "(none)",
        after: examples[code] ?? "(unchanged)",
      });
    }

    if (apply) await write(row, examples);
    touched += 1;
  }

  return touched;
}

const query = db
  .from("vocabulary_items")
  .select(
    "id, word, part_of_speech, texts, examples, word_language, translation_language",
  )
  .order("created_at", { ascending: true });

const { data, error } = await (onlyIds ? query.in("id", onlyIds) : query);

if (error) {
  console.error(`Could not read the library: ${error.message}`);
  process.exit(1);
}

const rows = data ?? [];
const batches = [];

for (let at = 0; at < rows.length; at += BATCH) {
  batches.push(rows.slice(at, at + BATCH));
}

console.log(
  `${rows.length} words, ${batches.length} batches, model ${MODEL}` +
    (apply ? "" : "  —  DRY RUN, nothing will be written"),
);

const samples = [];
const failed = [];
let touched = 0;

for (let at = 0; at < batches.length; at += CONCURRENCY) {
  const slice = batches.slice(at, at + CONCURRENCY);

  const counts = await Promise.all(
    slice.map(async (batch, offset) => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          return await handleBatch(batch, samples);
        } catch (batchError) {
          if (attempt === 1) {
            failed.push(at + offset);
            console.log(
              `  batch ${at + offset} failed: ${String(batchError.message).slice(0, 90)}`,
            );
            return 0;
          }

          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
      }

      return 0;
    }),
  );

  touched += counts.reduce((sum, count) => sum + count, 0);

  console.log(
    `  ${Math.min(at + CONCURRENCY, batches.length)}/${batches.length} batches · ${touched} words`,
  );
}

console.log(`\nSample:`);
for (const sample of samples) {
  console.log(`\n  ${sample.word}`);
  console.log(`    was: ${sample.before}`);
  console.log(`    now: ${sample.after}`);
}

console.log(
  `\n${touched}/${rows.length} words ${apply ? "rewritten" : "would be rewritten"}` +
    (failed.length ? `, ${failed.length} batches failed` : ""),
);
