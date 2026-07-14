import { NextRequest, NextResponse } from "next/server";

type PartOfSpeech = "noun" | "verb" | "adjective" | "other";
type Confidence = "high" | "medium" | "low";
type VocabularyCategory = "people" | "objects" | "actions" | "other";

type GeminiTextResult = {
  englishName: string;
  traditionalChineseName: string;
  partOfSpeech: PartOfSpeech;
  englishExample: string;
  traditionalChineseExample: string;
  confidence: Confidence;
  category: VocabularyCategory;
};

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const VALID_CATEGORIES = new Set<VocabularyCategory>([
  "people",
  "objects",
  "actions",
  "other",
]);

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_INPUT_LENGTH = 80;

function buildPrompt(text: string): string {
  return `
A user selected this word or short phrase from a chat conversation
for a language-learning app: "${text}"

It may be in English or Traditional Chinese. Identify it and provide
both languages, regardless of which one was given.

Also classify it into exactly one of these categories:
- "people": people, relationships, roles, or identities (e.g. father, patron, friend)
- "objects": physical items, places, or things (e.g. laptop, nail clipper, scene)
- "actions": verbs, events, or abstract concepts (e.g. escape, investigation, connection)
- "other": use only if none of the above clearly fit

Return only valid JSON in this exact format:
{
  "englishName": "string",
  "traditionalChineseName": "string",
  "partOfSpeech": "noun | verb | adjective | other",
  "englishExample": "string",
  "traditionalChineseExample": "string",
  "confidence": "high | medium | low",
  "category": "people | objects | actions | other"
}

Use natural English and Traditional Chinese.
Do not include markdown or extra explanation.
`;
}

function isGeminiTextResult(value: unknown): value is GeminiTextResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;

  return (
    typeof result.englishName === "string" &&
    typeof result.traditionalChineseName === "string" &&
    typeof result.partOfSpeech === "string" &&
    typeof result.englishExample === "string" &&
    typeof result.traditionalChineseExample === "string" &&
    typeof result.confidence === "string" &&
    typeof result.category === "string"
  );
}

function normalizeCategory(value: string): VocabularyCategory {
  const lowered = value.toLowerCase().trim() as VocabularyCategory;
  return VALID_CATEGORIES.has(lowered) ? lowered : "other";
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

  const { text } = (body ?? {}) as { text?: unknown };

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Text is missing." },
      { status: 400 }
    );
  }

  const cleanText = text.trim().slice(0, MAX_INPUT_LENGTH);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: buildPrompt(cleanText) }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? "Gemini request failed." },
        { status: response.status }
      );
    }

    const text_ = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text_) {
      return NextResponse.json(
        { error: "Gemini returned no result." },
        { status: 502 }
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text_);
    } catch {
      return NextResponse.json(
        { error: "Gemini returned malformed data." },
        { status: 502 }
      );
    }

    if (!isGeminiTextResult(parsed)) {
      return NextResponse.json(
        { error: "Gemini returned data in an unexpected shape." },
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
      category: normalizeCategory(parsed.category),
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";

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
