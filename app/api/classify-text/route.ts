import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TextResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
  category: "people" | "objects" | "actions" | "other";
};

const TEXT_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    englishName: { type: "string", minLength: 1, maxLength: 80 },
    chineseName: { type: "string", minLength: 1, maxLength: 80 },
    partOfSpeech: {
      type: "string",
      enum: ["noun", "verb", "adjective", "phrase", "other"],
    },
    englishExample: { type: "string", minLength: 4, maxLength: 200 },
    chineseExample: { type: "string", minLength: 2, maxLength: 200 },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    category: {
      type: "string",
      enum: ["people", "objects", "actions", "other"],
    },
  },
  required: [
    "englishName",
    "chineseName",
    "partOfSpeech",
    "englishExample",
    "chineseExample",
    "confidence",
    "category",
  ],
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
    const query = body.text?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Please provide a word or phrase to look up." },
        { status: 400 }
      );
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

    const client = new GoogleGenAI({ apiKey });

    const interaction = await client.interactions.create({
      model,
      input: `
The user typed this into an English and Traditional Chinese language-learning
app: "${query}"

It may be an English word/phrase, a Traditional Chinese word/phrase, or a
misspelling of either. Identify what it most likely means and return the
requested fields.

Rules:
- Use Traditional Chinese, never Simplified Chinese.
- If the input is already Traditional Chinese, treat it as the source word
  and translate it into English.
- If uncertain what was meant, make your best guess and use low confidence.
      `.trim(),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: TEXT_RESULT_SCHEMA,
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

    const result = JSON.parse(stripJsonCodeFence(outputText)) as TextResult;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Text classification failed:", error);

    return NextResponse.json(
      { error: "Couldn't look up that word. Please try again." },
      { status: 500 }
    );
  }
}
