import Anthropic from "@anthropic-ai/sdk";
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

function extractJson(text: string): ObjectResult {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned) as ObjectResult;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is missing." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      image?: string;
    };

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
        {
          error:
            "Only JPEG, PNG, WEBP, and GIF images are supported.",
        },
        { status: 400 }
      );
    }

    const mediaType = imageMatch[1] as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/gif";

    const imageBase64 = imageMatch[2];

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `
Identify the main physical object in this image for an English and Traditional Chinese language-learning app.

Return only valid JSON, with no markdown:

{
  "englishName": "the most natural everyday English name",
  "chineseName": "the natural Traditional Chinese name used in Taiwan",
  "partOfSpeech": "noun, verb, adjective, phrase, or other",
  "englishExample": "one short natural English sentence",
  "chineseExample": "the Traditional Chinese translation of that sentence",
  "confidence": "high, medium, or low"
}

Rules:
- Use Traditional Chinese, never Simplified Chinese.
- Do not identify a person.
- If there are several objects, choose the most visually prominent one.
- If uncertain, choose a broad general name and use low confidence.
              `.trim(),
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find(
      (item) => item.type === "text"
    );

    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude returned no text.");
    }

    const result = extractJson(textBlock.text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Object identification failed:", error);

    return NextResponse.json(
      {
        error:
          "The image could not be identified. Please try another photo.",
      },
      { status: 500 }
    );
  }
}
