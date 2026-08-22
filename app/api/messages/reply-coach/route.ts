import {
  promptLanguageName,
  whenScriptRuleApplies,
} from "@/lib/ai/languagePrompt";
import { DEFAULT_LEARNING_PAIR, readLanguageCode } from "@/lib/languages";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { readBoundedInteger } from "@/lib/ai/modelConfig";
import { createClient } from "@/lib/supabase/server";
import type { ReplyDirection, ReplySuggestion } from "@/lib/messages/decode";

export const runtime = "nodejs";

/*
 * Three ways to answer.
 *
 * Nothing here is persisted. A suggestion is only worth anything in the moment
 * it was drafted for — the conversation has moved on by the next message — and
 * §41's ReplySuggestion is a shape passed to the screen, not a row to keep.
 *
 * Every suggestion comes back with a gloss in the language the user already
 * has. Handing someone a sentence in a language they are still learning and
 * inviting them to send it without knowing what it says is not coaching.
 * §24 is also explicit that nothing may send on its own; this route returns
 * text and has no way to post it.
 */

const MAX_COACH_CALLS_PER_DAY = readBoundedInteger(
  process.env.REPLY_COACH_DAILY_USER_LIMIT,
  60,
  1,
  500,
);

/** Set once the quota function is found to be missing, to stop retrying it. */
let persistentQuotaUnavailable = false;

const SUGGESTIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          direction: { type: "string", enum: ["friendly", "casual", "natural"] },
          text: { type: "string", minLength: 1, maxLength: 300 },
          gloss: { type: "string", minLength: 1, maxLength: 300 },
        },
        required: ["direction", "text", "gloss"],
      },
    },
  },
  required: ["suggestions"],
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
    p_operation: "reply_coach",
    p_limit: MAX_COACH_CALLS_PER_DAY,
  });

  if (error) {
    persistentQuotaUnavailable = true;
    console.warn("Persistent AI quota is unavailable for reply coach.", {
      code: error.code,
    });
    return true;
  }

  const rows = data as Array<{ allowed?: boolean }> | null;
  return rows?.[0]?.allowed === true;
}

const SCRIPT_RULE = `\n- Any Chinese you write, in a reply or in a gloss, must be Traditional as
  written in Taiwan. Never a Simplified character, anywhere, for any reason.`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = (await request.json()) as {
      conversationId?: unknown;
      messageId?: unknown;
    };

    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId : "";
    const messageId = Number(body.messageId);

    if (!conversationId || !Number.isInteger(messageId) || messageId <= 0) {
      return NextResponse.json(
        { error: "A conversation and a message are required." },
        { status: 400 },
      );
    }

    /*
     * The membership check is the select itself: RLS will not return a message
     * from a conversation this user is not in, and asking for the message by
     * both ids means a valid message id from elsewhere cannot be pointed at
     * this conversation.
     */
    const { data: target, error: targetError } = await supabase
      .from("messages")
      .select("id, conversation_id, created_at")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (targetError) throw targetError;

    if (!target) {
      return NextResponse.json(
        { error: "This conversation is not available." },
        { status: 404 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Reply Coach is not configured." },
        { status: 503 },
      );
    }

    if (!(await consumeDailyQuota(supabase))) {
      return NextResponse.json(
        { error: "Daily Reply Coach limit reached." },
        { status: 429 },
      );
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

    const { data: recentMessages } = await supabase
      .from("messages")
      .select("sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .lte("created_at", target.created_at)
      .order("created_at", { ascending: false })
      .limit(8);

    const context = (recentMessages ?? [])
      .slice()
      .reverse()
      .map((row) => {
        const who = row.sender_id === user.id ? "me" : "them";
        return `${who}: ${String(row.body).slice(0, 300)}`;
      })
      .join("\n");

    const client = new GoogleGenAI({ apiKey });

    const interaction = await client.interactions.create({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
      input: `
Someone is learning ${learningLanguage} and wants to reply to their language
partner. Draft three different replies they could send.

The conversation so far, oldest last message last:
${context}

Rules:
- Write each reply in ${learningLanguage} — that is what they are here to
  practise sending.
- Write each "gloss" in ${nativeLanguage}, saying plainly what that reply
  means. They should never send a sentence they cannot read.
- Give exactly three, one of each direction:
  - "friendly": warm and a little more expressive.
  - "casual": short, relaxed, the way a friend actually texts.
  - "natural": what a fluent speaker would most likely say here.
- Keep them at the length a real text message is. One or two sentences.
- Answer what was actually said. Do not change the subject, do not invent
  plans, and do not commit them to anything the conversation has not raised.
- No greetings-for-the-sake-of-it and no sign-offs.
${scriptRule}
      `.trim(),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: SUGGESTIONS_SCHEMA,
      },
      generation_config: { thinking_level: "low" },
      store: false,
    });

    const outputText =
      typeof interaction.output_text === "string" ? interaction.output_text : "";

    if (!outputText.trim()) {
      throw new Error("The model returned nothing.");
    }

    const parsed = JSON.parse(stripJsonCodeFence(outputText)) as {
      suggestions?: Array<{
        direction?: ReplyDirection;
        text?: string;
        gloss?: string;
      }>;
    };

    const seen = new Set<ReplyDirection>();
    const suggestions: ReplySuggestion[] = [];

    for (const item of parsed.suggestions ?? []) {
      const direction = item.direction;
      const text = item.text?.trim();
      const gloss = item.gloss?.trim();

      if (!direction || !text || !gloss) continue;
      // One per direction: three cards labelled "casual" is not three choices.
      if (seen.has(direction)) continue;

      seen.add(direction);
      suggestions.push({
        direction,
        text: text.slice(0, 300),
        gloss: gloss.slice(0, 300),
      });
    }

    if (suggestions.length === 0) {
      throw new Error("The model returned no usable suggestions.");
    }

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error("Reply Coach failed:", error);

    return NextResponse.json(
      { error: "Couldn't draft replies right now." },
      { status: 500 },
    );
  }
}
