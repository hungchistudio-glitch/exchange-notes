import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { consumeDailyQuota, refundDailyQuota } from "@/lib/ai/dailyQuota";
import { getTextModelCandidates, readBoundedInteger } from "@/lib/ai/modelConfig";
import { backgroundAllowed } from "@/lib/ai/modelHealth";
import { generateJson } from "@/lib/ai/modelRequest";
import { tryModels } from "@/lib/ai/tryModels";
import { cleanExampleSentence } from "@/lib/ai/prompts/exampleSentence";
import {
  buildTranslateVocabularyPrompt,
  promptId,
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
import { builtinFill } from "@/lib/vocabulary/builtinTranslation";

export const runtime = "nodejs";
/*
 * One batch, with room for a candidate that has to be given up on.
 * See lib/ai/modelRequest.ts for why a failure is now fast enough that this
 * is a ceiling rather than the thing the reader waits for.
 */
export const maxDuration = 60;

/*
 * One batch is twenty words.
 *
 * Small enough that a failure costs little and the response stays inside the
 * model's comfortable output length; large enough that a 258-word library is
 * thirteen calls rather than 258. The caller repeats until nothing is left,
 * so the size is a throughput knob, not a limit on what can be filled.
 */
const BATCH_SIZE = 20;

/*
 * How many batches a reader may fill in a day.
 *
 * This route reaches the model on every call that has work to do, and it is
 * called by a background loop rather than by anybody pressing anything — the
 * library fills itself in after a language change, twenty words at a time, up
 * to twenty-five batches a session. It was the only model-backed route in the
 * app with no allowance at all, which made it the cheapest way to spend the
 * project's Gemini budget: change language, let it run, change back.
 *
 * A hundred batches is two thousand words a day. A five-hundred-word library
 * filling into a language it has never held costs twenty-five of them, so
 * this is four such fills — more than a real reader does, and a firm stop for
 * anything that is not a real reader.
 */
const MAX_FILL_BATCHES_PER_DAY = readBoundedInteger(
  process.env.LIBRARY_FILL_DAILY_USER_LIMIT,
  100,
  1,
  1000,
);

const OPERATION = "library_fill" as const;

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
          /* Which word this answers. See the pairing note below. */
          id: { type: "string", minLength: 1, maxLength: 8 },
          text: { type: "string", minLength: 1, maxLength: 120 },
          example: { type: "string", maxLength: 300 },
        },
        required: ["id", "text", "example"],
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

/*
 * How many words one call may fill from the built-in dictionaries. No model
 * is asked for these, so the limit is only the database writes: a hundred
 * small updates, ten at a time, is a second or two.
 */
const DICTIONARY_BATCH = 100;
const WRITES_AT_ONCE = 10;

type Supabase = Awaited<ReturnType<typeof createClient>>;

type FilledRow = {
  id: string;
  texts: Record<string, string>;
  examples: Record<string, string>;
  basedOnTexts: Record<string, string>;
  basedOnExamples: Record<string, string>;
};

/**
 * Words the built-in dictionaries already know, filled without a model
 * (Chi, 2026-10-01: "單字庫補翻譯先用字典").
 *
 * The same rules as the model's answers below: only the missing key is
 * written, and only into a row that still lacks it. No example sentence —
 * the dictionary has none, and an invented one is what this app does not
 * write — so the card shows the word and the reader's own examples.
 */
async function fillFromDictionary(
  supabase: Supabase,
  userId: string,
  outstanding: Row[],
  target: LanguageCode,
): Promise<FilledRow[]> {
  const answers: Array<{ row: Row; text: string }> = [];

  for (const row of outstanding) {
    const request = toRequest(row);
    if (!request) continue;

    const text = builtinFill(request.known, target, row.part_of_speech);
    if (text) answers.push({ row, text });
    if (answers.length >= DICTIONARY_BATCH) break;
  }

  const filled: FilledRow[] = [];

  for (let start = 0; start < answers.length; start += WRITES_AT_ONCE) {
    const written = await Promise.all(
      answers.slice(start, start + WRITES_AT_ONCE).map(async ({ row, text }) => {
        const texts = { ...row.texts, [target]: text };
        const { data, error } = await supabase
          .from("vocabulary_items")
          .update({ texts })
          .eq("id", row.id)
          .eq("user_id", userId)
          .eq("texts", JSON.stringify(row.texts))
          .eq("examples", JSON.stringify(row.examples ?? {}))
          .select("id");

        return error || !data?.length ? null : {
          id: row.id, texts, examples: row.examples ?? {},
          basedOnTexts: row.texts, basedOnExamples: row.examples ?? {},
        };
      }),
    );

    for (const row of written) if (row) filled.push(row);
  }

  return filled;
}

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
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let charged = false;
  let userId: string | null = null;

  try {
    supabase = await createClient();
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
    userId = user.id;

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

    /*
     * The dictionary first. What it knows costs no request and no allowance
     * and is filled even while the models are too busy for background work;
     * the model is asked only once it has nothing left to give. A call that
     * filled words from it ends there, and the caller's next call carries on.
     */
    if (outstanding.length > 0) {
      const fromDictionary = await fillFromDictionary(
        supabase,
        user.id,
        outstanding,
        target,
      );

      if (fromDictionary.length > 0) {
        const remaining = Math.max(outstanding.length - fromDictionary.length, 0);

        return NextResponse.json({
          filled: fromDictionary.length,
          language: target,
          updated: fromDictionary,
          remaining,
          done: remaining === 0,
          fromDictionary: fromDictionary.length,
        });
      }
    }

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

    /*
     * Background work waits for spare quota (Chi, 2026-09-28: "只在額度充足時").
     *
     * Filling in a library is work nobody is waiting on, and a batch of
     * twenty words is exactly the request that takes a model away from a
     * reader pointing the camera at something. So it runs only while at
     * least two models are up, and asks one of them once. When the quota is
     * tight the answer is "not now": done for this session, nothing charged,
     * and the next visit carries on where this one stopped.
     */
    if (!(await backgroundAllowed(getTextModelCandidates()))) {
      return NextResponse.json({
        filled: 0,
        language: target,
        updated: [],
        remaining: outstanding.length,
        done: true,
        deferred: true,
      });
    }

    /*
     * Charged here: past every early return that costs nothing, and before
     * the model runs. Anything else lets two tabs filling the same library
     * both be allowed.
     */
    if (
      !(await consumeDailyQuota(
        user.id,
        OPERATION,
        MAX_FILL_BATCHES_PER_DAY,
      ))
    ) {
      /*
       * `done` as well as the status, because the caller reads both and the
       * honest answer to "is there more to fill" is no — not today. Without
       * it the background loop retries three times and gives up anyway, which
       * is three more calls to learn what this response already said.
       */
      return NextResponse.json(
        {
          error:
            "You have reached today's limit for filling in your library."
            + " It will carry on tomorrow.",
          filled: 0,
          remaining: outstanding.length,
          done: true,
          quotaExhausted: true,
        },
        { status: 429 },
      );
    }

    charged = true;

    const client = new GoogleGenAI({ apiKey });

    /*
     * One healthy model, once (lib/ai/tryModels.ts, background).
     *
     * This route used to walk every candidate — it was the one production
     * was failing on, twenty-four 429s in an hour from one busy model. The
     * attempt is still bounded (one try, one ceiling: a refusal measured
     * 225ms against 34.8s with the SDK's own retries), and a batch that
     * could not be asked is simply left for the next one.
     */
    const { value: outputText } = await tryModels(
      getTextModelCandidates(),
      async (model, timeoutMs) =>
        generateJson(client, {
          purpose: "vocabulary-translate",
          model,
          input: buildTranslateVocabularyPrompt(items, target),
          schema: RESULT_SCHEMA,
          timeoutMs,
        }),
      { background: true },
    );

    const parsed = JSON.parse(
      outputText.replace(/^```json\s*|```$/g, "").trim(),
    ) as {
      words?: Array<{ id?: string; text?: string; example?: string }>;
    };

    /*
     * Answers are matched by the id the model was given, never by position.
     *
     * This used to be `answers[index]`, against a schema with no id in it and
     * a prompt that asked for "one entry per word, in the same order". When
     * the model honoured that, it worked. When it dropped a single word —
     * which is the one thing a list of twenty is likely to do — every word
     * after the gap silently took its neighbour's translation and its
     * neighbour's example sentence, and they were written to the reader's
     * own library as if they were right. An audit on 2026-09-18 found three
     * rows carrying someone else's sentence.
     *
     * An unrecognised id is dropped rather than guessed at, and a word with
     * no answer is simply left for the next batch: `remaining` already tells
     * the caller the truth, and a missing row is a retry where a wrong row
     * is a correction nobody knows to make.
     */
    const byId = new Map<string, { text?: string; example?: string }>();

    for (const answer of parsed.words ?? []) {
      const id = answer?.id?.trim();
      if (!id || byId.has(id)) continue;
      byId.set(id, answer);
    }

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
    const updated: FilledRow[] = [];

    for (const [index, item] of items.entries()) {
      const answer = byId.get(promptId(index));
      const text = answer?.text?.trim();
      if (!text) continue;

      const row = missing.find((candidate) => candidate.id === item.id);
      if (!row || row.texts?.[target]?.trim()) continue;

      const example = cleanExampleSentence(answer?.example);

      const nextTexts = { ...row.texts, [target]: text };
      const nextExamples = example
        ? { ...row.examples, [target]: example }
        : row.examples;

      const { data: written, error: updateError } = await supabase
        .from("vocabulary_items")
        .update({ texts: nextTexts, examples: nextExamples })
        .eq("id", row.id)
        .eq("user_id", user.id)
        .eq("texts", JSON.stringify(row.texts))
        .eq("examples", JSON.stringify(row.examples ?? {}))
        .select("id");

      if (updateError || !written?.length) continue;

      filled += 1;
      updated.push({
        id: row.id,
        texts: nextTexts,
        examples: nextExamples ?? {},
        basedOnTexts: row.texts,
        basedOnExamples: row.examples ?? {},
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
    /*
     * A batch that filled nothing is a batch the reader did not get, whether
     * the model was busy or answered with something unusable. Charged like a
     * delivered one, it is the arithmetic that turns a hundred batches into
     * seventy on a bad afternoon.
     */
    if (filled === 0) {
      await refundDailyQuota(user.id, OPERATION);
      charged = false;
    }

    return NextResponse.json({
      filled,
      language: target,
      updated,
      remaining: Math.max(outstanding.length - filled, 0),
      done: filled === 0,
    });
  } catch (error) {
    console.error("Vocabulary translation failed:", error);

    // Spent before the model ran, and the model never answered. The reader
    // should not pay for a batch that threw.
    if (charged && supabase && userId) {
      await refundDailyQuota(userId, OPERATION);
    }

    return NextResponse.json(
      { error: "Those words could not be translated. Please try again." },
      { status: 500 },
    );
  }
}
