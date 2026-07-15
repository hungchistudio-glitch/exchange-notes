import { NextRequest, NextResponse } from "next/server";

type PronunciationRequest = {
  english?: string;
  chinese?: string;
};

type PronunciationResult = {
  englishPronunciation: string;
  zhuyin: string;
};

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ??
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
  "";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/` +
  `${GEMINI_MODEL}:generateContent`;

function cleanJsonText(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeResult(value: unknown): PronunciationResult {
  if (!value || typeof value !== "object") {
    return {
      englishPronunciation: "",
      zhuyin: "",
    };
  }

  const result = value as Record<string, unknown>;

  return {
    englishPronunciation:
      typeof result.englishPronunciation === "string"
        ? result.englishPronunciation.trim()
        : "",
    zhuyin:
      typeof result.zhuyin === "string"
        ? result.zhuyin.trim()
        : "",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PronunciationRequest;

    const english = body.english?.trim() ?? "";
    const chinese = body.chinese?.trim() ?? "";

    if (!english && !chinese) {
      return NextResponse.json(
        { error: "A word is required." },
        { status: 400 },
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 500 },
      );
    }

    const prompt = `
You are creating pronunciation data for an English and Traditional Chinese
language-learning app used in Taiwan.

English word or phrase:
${english || "(none)"}

Traditional Chinese translation:
${chinese || "(none)"}

Return ONLY valid JSON with exactly these fields:

{
  "englishPronunciation": "",
  "zhuyin": ""
}

Rules:

1. englishPronunciation:
   - Give a simple English-readable pronunciation guide.
   - Use capital letters for the stressed syllable.
   - Separate syllables with hyphens when useful.
   - Do not use Mandarin pinyin.
   - Do not add slashes, explanations, or alternatives.
   - Example: "vocabulary" becomes "voh-KAB-yuh-lair-ee".
   - For a brand or proper noun, provide the most commonly accepted
     pronunciation.
   - Leave empty only when no English word was provided.

2. zhuyin:
   - Use Taiwan Traditional Chinese Bopomofo only.
   - Include correct tone marks.
   - Separate separate Chinese characters or syllables with spaces.
   - Do not use Hanyu Pinyin or Latin letters.
   - Example: "蘋果" becomes "ㄆㄧㄥˊ ㄍㄨㄛˇ".
   - For transliterated names, represent the displayed Chinese pronunciation.
   - Leave empty only when no Chinese text was provided.

Do not include markdown.
`.trim();

    const response = await fetch(
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
        cache: "no-store",
      },
    );

    const geminiData = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      error?: {
        message?: string;
      };
    };

    if (!response.ok) {
      throw new Error(
        geminiData.error?.message ||
          "Gemini could not generate pronunciation.",
      );
    }

    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Gemini returned an empty pronunciation.");
    }

    const result = normalizeResult(
      JSON.parse(cleanJsonText(responseText)),
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("word-pronunciation error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate pronunciation.",
      },
      { status: 500 },
    );
  }
}
