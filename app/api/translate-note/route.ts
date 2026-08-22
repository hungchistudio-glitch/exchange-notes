import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { buildTranslateNotePrompt } from "@/lib/ai/prompts/translateNote";
import { readLearningPair } from "@/lib/profile/languagePair";

import { readBoundedInteger } from "@/lib/ai/modelConfig";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * This endpoint spends money on every call, so it is gated the same way the
 * other model-backed routes are. It previously had no sign-in check, no
 * quota and no length limit, which meant anyone who read the app's network
 * traffic could run unlimited translations of arbitrarily long text on the
 * project's Gemini key — and exhausting the free tier that way takes the
 * feature down for real users.
 */
const MAX_TEXT_LENGTH = readBoundedInteger(
  process.env.TRANSLATE_MAX_TEXT_LENGTH,
  1000,
  100,
  4000,
);

const MAX_TRANSLATIONS_PER_DAY = readBoundedInteger(
  process.env.TRANSLATE_DAILY_USER_LIMIT,
  60,
  1,
  500,
);

/** Set once the quota function is found to be missing, to stop retrying it. */
let persistentQuotaUnavailable = false;

type TranslateResult = {
  english: string;
  chinese: string;
};

const TRANSLATE_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    english: { type: "string", minLength: 1, maxLength: 1000 },
    chinese: { type: "string", minLength: 1, maxLength: 1000 },
  },
  required: ["english", "chinese"],
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
    p_operation: "note_translation",
    p_limit: MAX_TRANSLATIONS_PER_DAY,
  });

  if (error) {
    persistentQuotaUnavailable = true;
    console.warn(
      "Persistent AI quota is unavailable for note translation.",
      { code: error.code },
    );
    return true;
  }

  const rows = data as Array<{ allowed?: boolean }> | null;
  return rows?.[0]?.allowed === true;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in before translating a note." },
        { status: 401 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Please provide some text to translate." },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error:
            `Please keep the note under ${MAX_TEXT_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    if (!(await consumeDailyQuota(supabase))) {
      return NextResponse.json(
        {
          error:
            "You've reached today's translation limit. Please try again tomorrow.",
        },
        { status: 429 }
      );
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

    const languagePair = await readLearningPair(supabase, user.id);

    const client = new GoogleGenAI({ apiKey });

    const interaction = await client.interactions.create({
      model,
      input: buildTranslateNotePrompt(text, languagePair),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: TRANSLATE_RESULT_SCHEMA,
      },
      generation_config: {
        thinking_level: "low",
      },
      store: false,
    });

    const outputText =
      typeof interaction.output_text === "string"
        ? interaction.output_text
        : "";

    if (!outputText.trim()) {
      throw new Error("Gemini returned an empty response.");
    }

    const result = JSON.parse(
      stripJsonCodeFence(outputText)
    ) as TranslateResult;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Note translation failed:", error);

    return NextResponse.json(
      { error: "Couldn't translate this note. Please try again." },
      { status: 500 }
    );
  }
}
