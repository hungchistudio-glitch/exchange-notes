import {
  promptLanguageName,
  whenScriptRuleApplies,
} from "@/lib/ai/languagePrompt";
import { DEFAULT_LEARNING_PAIR, readLanguageCode } from "@/lib/languages";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { readBoundedInteger } from "@/lib/ai/modelConfig";
import { createClient } from "@/lib/supabase/server";
import type {
  MessageAnalysis,
  PhraseType,
  ToneConfidence,
} from "@/lib/messages/decode";

export const runtime = "nodejs";

/*
 * Read one message on behalf of one reader.
 *
 * Enrichment, never a dependency. The message it describes was delivered and
 * rendered before this route was called and is unaffected by anything that
 * happens here — a refusal, a timeout, an exhausted quota and a model outage
 * all end the same way, with a conversation that has no card attached to it.
 *
 * Idempotent by design: the client asks for every unanalysed message it can
 * see, including on every remount, so a request for a message that already has
 * a row returns that row instead of spending another call.
 */

const MAX_ANALYSES_PER_DAY = readBoundedInteger(
  process.env.DECODE_DAILY_USER_LIMIT,
  120,
  1,
  1000,
);

const MAX_PHRASES = 4;

/** Set once the quota function is found to be missing, to stop retrying it. */
let persistentQuotaUnavailable = false;

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    worthExplaining: { type: "boolean" },
    tone: { type: "string", maxLength: 60 },
    toneConfidence: {
      type: "string",
      enum: ["high", "medium", "low", "unknown"],
    },
    phrases: {
      type: "array",
      maxItems: MAX_PHRASES,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          phrase: { type: "string", minLength: 1, maxLength: 120 },
          type: {
            type: "string",
            enum: ["expression", "abbreviation", "phrase", "slang", "idiom"],
          },
          meaning: { type: "string", minLength: 1, maxLength: 400 },
          expanded: { type: "string", maxLength: 200 },
        },
        required: ["phrase", "type", "meaning", "expanded"],
      },
    },
  },
  required: ["worthExplaining", "tone", "toneConfidence", "phrases"],
};

type ModelPhrase = {
  phrase: string;
  type: PhraseType;
  meaning: string;
  expanded: string;
};

type ModelResult = {
  worthExplaining: boolean;
  tone: string;
  toneConfidence: ToneConfidence | "unknown";
  phrases: ModelPhrase[];
};

function stripJsonCodeFence(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function consumeDailyQuota(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  if (persistentQuotaUnavailable) return true;

  const { data, error } = await supabase.rpc("consume_ai_daily_quota", {
    p_operation: "message_decode",
    p_limit: MAX_ANALYSES_PER_DAY,
  });

  if (error) {
    persistentQuotaUnavailable = true;
    console.warn("Persistent AI quota is unavailable for message decode.", {
      code: error.code,
    });
    return true;
  }

  const rows = data as Array<{ allowed?: boolean }> | null;
  return rows?.[0]?.allowed === true;
}

const SCRIPT_RULE = `\n- Any Chinese you write must be Traditional as written in Taiwan. Never a
  Simplified character, anywhere, for any reason.`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = (await request.json()) as { messageId?: unknown };
    const messageId = Number(body.messageId);

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return NextResponse.json(
        { error: "A message id is required." },
        { status: 400 },
      );
    }

    /*
     * RLS is the membership check. A message in someone else's conversation
     * simply is not selectable, so this returning nothing is both "no such
     * message" and "not yours" — which are the same answer to the caller.
     */
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("id", messageId)
      .maybeSingle();

    if (messageError) throw messageError;

    if (!message) {
      return NextResponse.json(
        { error: "This message is not available." },
        { status: 404 },
      );
    }

    // Your own words are not study material.
    if (message.sender_id === user.id) {
      return NextResponse.json(
        { analysis: skippedAnalysis(messageId) },
        { status: 200 },
      );
    }

    // Already answered. Returning the stored row keeps the client's
    // ask-for-everything-visible loop from costing anything on a revisit.
    const existing = await readStoredAnalysis(supabase, user.id, messageId);
    if (existing && existing.status !== "failed") {
      return NextResponse.json({ analysis: existing }, { status: 200 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("native_language, learning_language")
      .eq("id", user.id)
      .maybeSingle();

    const learningCode =
      readLanguageCode(profile?.learning_language) ?? DEFAULT_LEARNING_PAIR[0];
    const nativeCode =
      readLanguageCode(profile?.native_language) ?? DEFAULT_LEARNING_PAIR[1];

    const learningLanguage = promptLanguageName(learningCode);
    const nativeLanguage = promptLanguageName(nativeCode);

    const scriptRule = whenScriptRuleApplies([learningCode, nativeCode], SCRIPT_RULE);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Language help is not configured." },
        { status: 503 },
      );
    }

    if (!(await consumeDailyQuota(supabase))) {
      return NextResponse.json(
        { error: "Daily language-help limit reached." },
        { status: 429 },
      );
    }

    /*
     * Two pieces of context, both required by the brief.
     *
     * The surrounding messages are what §22 means by reading tone from the
     * conversation rather than the sentence — "fine" alone has no tone.
     * The known words are §46: Yumi is supposed to get quieter as it learns
     * what this person already has, not explain "hello" every week.
     */
    const [{ data: recentMessages }, { data: knownWords }] = await Promise.all([
      supabase
        .from("messages")
        .select("sender_id, body, created_at")
        .eq("conversation_id", message.conversation_id)
        .lte("created_at", message.created_at)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("vocabulary_items")
        .select("word")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

    const context = (recentMessages ?? [])
      .slice()
      .reverse()
      .map((row) => {
        const who = row.sender_id === user.id ? "the learner" : "their partner";
        return `${who}: ${String(row.body).slice(0, 300)}`;
      })
      .join("\n");

    const known = (knownWords ?? [])
      .map((row) => String(row.word))
      .filter(Boolean)
      .join(", ");

    const client = new GoogleGenAI({ apiKey });

    const interaction = await client.interactions.create({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
      input: `
You help someone learning ${learningLanguage} understand a message a friend
just sent them. Explain in ${nativeLanguage}.

The message to read:
"${String(message.body).slice(0, 1200)}"

The conversation it arrived in, oldest first:
${context || "(no earlier messages)"}

Words this person has already saved and does not need explained again:
${known || "(none yet)"}

Return at most ${MAX_PHRASES} items, and usually fewer. Rules:

- Pick only expressions a ${learningLanguage} learner would genuinely stumble
  on: idioms, slang, abbreviations, phrasal verbs, set phrases. Ordinary words
  they can look up are not worth a card.
- "phrase" MUST be copied exactly from the message, character for character,
  so it can be found in the original text. Never paraphrase it.
- "meaning" is written in ${nativeLanguage}.
- "expanded" is only for abbreviations — "lmk" -> "let me know". Use an empty
  string for everything else.
- Skip anything in the already-saved list above.
- If the message is plain and has nothing worth explaining, set
  worthExplaining to false and return an empty phrases array. Most ordinary
  messages are like this. Do not invent a lesson.
- "tone" is a short human label read from the whole conversation, not the one
  sentence — for example "Casual · Friendly". If you cannot tell, use an empty
  string and set toneConfidence to "unknown". Do not guess at feelings.
${scriptRule}
      `.trim(),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: ANALYSIS_SCHEMA,
      },
      generation_config: { thinking_level: "low" },
      store: false,
    });

    const outputText =
      typeof interaction.output_text === "string" ? interaction.output_text : "";

    if (!outputText.trim()) {
      throw new Error("The model returned nothing.");
    }

    const result = JSON.parse(stripJsonCodeFence(outputText)) as ModelResult;

    /*
     * Only phrases that are actually in the message survive.
     *
     * A paraphrased "phrase" cannot be underlined in the bubble, and a card
     * quoting words the message does not contain is worse than no card — it
     * teaches the wrong thing about what was said.
     */
    const haystack = String(message.body).toLowerCase();
    const phrases = (result.phrases ?? [])
      .filter((phrase) => phrase?.phrase?.trim())
      .filter((phrase) => haystack.includes(phrase.phrase.trim().toLowerCase()))
      .slice(0, MAX_PHRASES);

    const status: MessageAnalysis["status"] =
      result.worthExplaining && phrases.length > 0 ? "ready" : "skipped";

    const toneConfidence =
      result.toneConfidence === "unknown" ? null : result.toneConfidence ?? null;
    const tone = result.tone?.trim() ? result.tone.trim().slice(0, 60) : null;

    const { error: upsertError } = await supabase
      .from("message_language_analysis")
      .upsert(
        {
          message_id: messageId,
          user_id: user.id,
          conversation_id: message.conversation_id,
          status,
          tone: status === "ready" ? tone : null,
          tone_confidence: status === "ready" ? toneConfidence : null,
          model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "message_id,user_id" },
      );

    if (upsertError) throw upsertError;

    // Replace rather than append, so a retry after a failure cannot leave two
    // generations of phrases stacked on one message.
    await supabase
      .from("detected_phrases")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id);

    if (status === "ready") {
      const { error: phraseError } = await supabase
        .from("detected_phrases")
        .insert(
          phrases.map((phrase, index) => ({
            message_id: messageId,
            user_id: user.id,
            phrase: phrase.phrase.trim().slice(0, 120),
            phrase_type: phrase.type,
            meaning: phrase.meaning.trim().slice(0, 400),
            expanded: phrase.expanded?.trim()
              ? phrase.expanded.trim().slice(0, 200)
              : null,
            position: index,
          })),
        );

      if (phraseError) throw phraseError;
    }

    const analysis = await readStoredAnalysis(supabase, user.id, messageId);
    return NextResponse.json({ analysis }, { status: 200 });
  } catch (error) {
    console.error("Message analysis failed:", error);

    return NextResponse.json(
      { error: "Couldn't read this message right now." },
      { status: 500 },
    );
  }
}

function skippedAnalysis(messageId: number): MessageAnalysis {
  return {
    messageId,
    status: "skipped",
    tone: null,
    toneConfidence: null,
    phrases: [],
  };
}

async function readStoredAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  messageId: number,
): Promise<MessageAnalysis | null> {
  const { data: row } = await supabase
    .from("message_language_analysis")
    .select("message_id, status, tone, tone_confidence")
    .eq("user_id", userId)
    .eq("message_id", messageId)
    .maybeSingle();

  if (!row) return null;

  const analysis: MessageAnalysis = {
    messageId: row.message_id,
    status: row.status,
    tone: row.tone,
    toneConfidence: row.tone_confidence,
    phrases: [],
  };

  if (analysis.status !== "ready") return analysis;

  const { data: phraseRows } = await supabase
    .from("detected_phrases")
    .select("id, phrase, phrase_type, meaning, expanded")
    .eq("user_id", userId)
    .eq("message_id", messageId)
    .order("position", { ascending: true });

  analysis.phrases = (phraseRows ?? []).map((row) => ({
    id: row.id,
    phrase: row.phrase,
    phraseType: row.phrase_type,
    meaning: row.meaning,
    expanded: row.expanded,
  }));

  return analysis;
}
