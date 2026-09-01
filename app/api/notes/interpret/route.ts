import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { getTextModelCandidates, readBoundedInteger } from "@/lib/ai/modelConfig";
import { buildInterpretNotePrompt } from "@/lib/ai/prompts/interpretNote";
import { isLanguageCode } from "@/lib/languages";
import { fetchNote } from "@/lib/notes/repository";
import { createClient } from "@/lib/supabase/server";
import { consumeDailyQuota, refundDailyQuota } from "@/lib/ai/dailyQuota";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_INTERPRETATIONS_PER_DAY = readBoundedInteger(
  process.env.NOTE_INTERPRET_DAILY_USER_LIMIT,
  30,
  1,
  200,
);

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    naturalTranslation: { type: "string", minLength: 1, maxLength: 2000 },
    meaning: { type: "string", maxLength: 1500 },
    localExpressions: {
      type: "array",
      maxItems: 3,
      items: { type: "string", maxLength: 500 },
    },
    tone: { type: "string", maxLength: 500 },
    culturalNuance: { type: "string", maxLength: 1000 },
    usageExamples: {
      type: "array",
      maxItems: 3,
      items: { type: "string", maxLength: 600 },
    },
    warnings: {
      type: "array",
      maxItems: 3,
      items: { type: "string", maxLength: 500 },
    },
  },
  required: [
    "naturalTranslation",
    "meaning",
    "localExpressions",
    "tone",
    "culturalNuance",
    "usageExamples",
    "warnings",
  ],
};

type Result = {
  naturalTranslation: string;
  meaning: string;
  localExpressions: string[];
  tone: string;
  culturalNuance: string;
  usageExamples: string[];
  warnings: string[];
};

function stripJsonCodeFence(value: string) {
  return value.replace(/^```json\s*|^```\s*|\s*```$/gi, "").trim();
}

const OPERATION = "note_interpretation" as const;

export async function POST(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let charged: string | null = null;

  try {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      noteId?: unknown;
      targetLanguage?: unknown;
    };
    const noteId = typeof body.noteId === "string" ? body.noteId : "";

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(noteId)) {
      return NextResponse.json({ error: "Invalid note." }, { status: 400 });
    }

    if (!isLanguageCode(body.targetLanguage)) {
      return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
    }

    // This session-bound read is the authorization check. RLS admits only the
    // owner or a recipient whose share has not been revoked.
    const note = await fetchNote(supabase, user.id, noteId);
    if (!note) {
      return NextResponse.json({ error: "Note not found or no longer shared." }, { status: 404 });
    }

    const cached = note.interpretations.find(
      (item) => item.targetLanguage === body.targetLanguage,
    );
    if (cached && (cached.model !== "legacy-import" || cached.meaning)) {
      return NextResponse.json({ interpretation: cached, cached: true });
    }

    if (
      !(await consumeDailyQuota(
        supabase,
        user.id,
        OPERATION,
        MAX_INTERPRETATIONS_PER_DAY,
      ))
    ) {
      return NextResponse.json(
        { error: "Today's Yumi interpretation limit has been reached." },
        { status: 429 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Yumi interpretation is not configured." }, { status: 503 });
    }

    // Spent; handed back below if every candidate model fails.
    charged = user.id;

    const client = new GoogleGenAI({ apiKey });
    let outputText = "";
    let usedModel = "";
    let lastError: unknown = null;

    for (const model of getTextModelCandidates()) {
      try {
        const interaction = await client.interactions.create({
          model,
          input: buildInterpretNotePrompt({
            text: note.originalText,
            sourceLanguage: note.originalLanguage,
            targetLanguage: body.targetLanguage,
            personalMeaning: note.personalMeaning,
            context: note.context,
          }),
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: RESULT_SCHEMA,
          },
          generation_config: { thinking_level: "low" },
          store: false,
        });

        outputText = typeof interaction.output_text === "string"
          ? interaction.output_text
          : "";
        usedModel = model;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError || !outputText.trim()) throw lastError ?? new Error("Empty result");

    // A model answered. What follows is the app's own storage, and a failure
    // there is not the reader's to pay for either — but the call was made, so
    // the unit is earned.
    charged = null;

    const result = JSON.parse(stripJsonCodeFence(outputText)) as Result;

    // Only this validated server path writes machine interpretations. The
    // public table has no client INSERT/UPDATE policy.
    const service = createServiceClient();
    const { data, error } = await service
      .from("note_interpretations")
      .upsert(
        {
          note_id: note.id,
          target_language: body.targetLanguage,
          natural_translation: result.naturalTranslation.trim(),
          meaning: result.meaning.trim(),
          local_expressions: result.localExpressions,
          tone: result.tone.trim(),
          cultural_nuance: result.culturalNuance.trim(),
          usage_examples: result.usageExamples,
          warnings: result.warnings,
          model: usedModel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "note_id,target_language" },
      )
      .select("id,note_id,target_language,natural_translation,meaning,local_expressions,tone,cultural_nuance,usage_examples,warnings,model,created_at")
      .single();

    if (error || !data) throw error ?? new Error("Interpretation was not saved");

    return NextResponse.json({
      interpretation: {
        id: data.id,
        noteId: data.note_id,
        targetLanguage: data.target_language,
        naturalTranslation: data.natural_translation,
        meaning: data.meaning,
        localExpressions: data.local_expressions,
        tone: data.tone,
        culturalNuance: data.cultural_nuance,
        usageExamples: data.usage_examples,
        warnings: data.warnings,
        model: data.model,
        createdAt: data.created_at,
      },
      cached: false,
    });
  } catch (error) {
    if (supabase && charged) {
      await refundDailyQuota(supabase, charged, OPERATION);
    }

    console.error("Note interpretation failed", error);
    return NextResponse.json({ error: "Yumi could not interpret this note." }, { status: 500 });
  }
}
