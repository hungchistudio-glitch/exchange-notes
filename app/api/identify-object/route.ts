import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ObjectResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
};

const OBJECT_RESULT_SCHEMA = {
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
  },
  required: [
    "englishName",
    "chineseName",
    "partOfSpeech",
    "englishExample",
    "chineseExample",
    "confidence",
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

    const body = (await request.json()) as { image?: string };

    if (
      typeof body.image !== "string" ||
      !body.image.startsWith("data:image/")
    ) {
      return NextResponse.json(
        { error: "Please provide a valid image." },
        { status: 400 }
      );
    }

    const imageMatch = body.image.match(
      /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/
    );

    if (!imageMatch) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WEBP, and GIF images are supported." },
        { status: 400 }
      );
    }

    const mediaType = imageMatch[1];
    const imageBase64 = imageMatch[2];

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

    const client = new GoogleGenAI({ apiKey });

    const interaction = await client.interactions.create({
      model,
      input: [
        {
          type: "text",
          text: `
Identify the main physical object in this image for an English and
Traditional Chinese language-learning app.

Rules:
- Use Traditional Chinese, never Simplified Chinese.
- Do not identify a person.
- If there are several objects, choose the most visually prominent one.
- If uncertain, choose a broad general name and use low confidence.
          `.trim(),
        },
        {
          type: "image",
          data: imageBase64,
          mime_type: mediaType,
        },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: OBJECT_RESULT_SCHEMA,
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
    ) as ObjectResult;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Object identification failed:", error);

    return NextResponse.json(
      { error: "The image could not be identified. Please try another photo." },
      { status: 500 }
    );
  }
}
