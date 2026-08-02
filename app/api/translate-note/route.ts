import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  try {
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

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

    const client = new GoogleGenAI({ apiKey });

    const interaction = await client.interactions.create({
      model,
      input: `
The user wrote this note in a bilingual English / Traditional Chinese
language-learning app: "${text}"

It may be written in English, in Traditional Chinese, or a mix of both.
Return both a natural English version and a natural Traditional Chinese
version of the same note.

Rules:
- Use Traditional Chinese, never Simplified Chinese.
- If the note is already bilingual, keep each language's own wording
  rather than re-translating it from the other.
- Keep the tone and meaning as close to the original as possible.
      `.trim(),
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
