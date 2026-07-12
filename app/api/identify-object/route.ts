import { NextRequest, NextResponse } from "next/server";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
};

type PartOfSpeech = "noun" | "verb" | "adjective" | "other";
type Confidence = "high" | "medium" | "low";

type GeminiIdentifyResult = {
  englishName: string;
  traditionalChineseName: string;
  partOfSpeech: PartOfSpeech;
  englishExample: string;
  traditionalChineseExample: string;
  confidence: Confidence;
};

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_BASE64_LENGTH = 20_000_000;
const REQUEST_TIMEOUT_MS = 20_000;

const PROMPT = `
Identify the main object in this image for a language-learning app.

Return only valid JSON in this exact format:
{
  "englishName": "string",
  "traditionalChineseName": "string",
  "partOfSpeech": "noun | verb | adjective | other",
  "englishExample": "string",
  "traditionalChineseExample": "string",
  "confidence": "high | medium | low"
}

Use natural English and Traditional Chinese.
Do not include markdown or extra explanation.
`;

function isGeminiIdentifyResult(
  value: unknown
): value is GeminiIdentifyResult {
  if (typeof value !== "object" || value === null) return false;

  const result = value as Record<string, unknown>;

  return (
    typeof result.englishName === "string" &&
    typeof result.traditionalChineseName === "string" &&
    typeof result.partOfSpeech === "string" &&
    typeof result.englishExample === "string" &&
    typeof result.traditionalChineseExample === "string" &&
    typeof result.confidence === "string"
  );
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is missing." },
      { status: 500 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { image } = (body ?? {}) as {
    image?: unknown;
  };

  if (typeof image !== "string" || image.length === 0) {
    return NextResponse.json(
      { error: "Image data is missing." },
      { status: 400 }
    );
  }

  const match = image.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/
  );

  if (!match) {
    return NextResponse.json(
      { error: "Invalid image format." },
      { status: 400 }
    );
  }

  const mimeType = match[1];
  const imageBase64 = match[2];

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported image format: ${mimeType}` },
      { status: 400 }
    );
  }

  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json(
      { error: "Image is too large." },
      { status: 413 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ??
            "Gemini request failed.",
        },
        { status: response.status }
      );
    }

    if (data.promptFeedback?.blockReason) {
      return NextResponse.json(
        {
          error:
            `Image was blocked: ${data.promptFeedback.blockReason}`,
        },
        { status: 422 }
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "Gemini returned no result." },
        { status: 502 }
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Gemini returned malformed data." },
        { status: 502 }
      );
    }

    if (!isGeminiIdentifyResult(parsed)) {
      return NextResponse.json(
        {
          error:
            "Gemini returned data in an unexpected shape.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      englishName: parsed.englishName,
      chineseName: parsed.traditionalChineseName,
      partOfSpeech: parsed.partOfSpeech,
      englishExample: parsed.englishExample,
      chineseExample: parsed.traditionalChineseExample,
      confidence: parsed.confidence,
    });
  } catch (error) {
    const isAbort =
      error instanceof Error &&
      error.name === "AbortError";

    return NextResponse.json(
      {
        error: isAbort
          ? "Request to Gemini timed out."
          : "Could not reach Gemini.",
      },
      { status: isAbort ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}