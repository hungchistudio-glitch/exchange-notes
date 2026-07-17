import { NextRequest, NextResponse } from "next/server";

import { parseCoachLesson } from "@/lib/coach/lessonParser";
import type { CoachWord } from "@/lib/coach/types";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_WORDS = 8;

type GenerateCoachRequest = {
  words?: unknown;
};

function isCoachWord(value: unknown): value is CoachWord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const word = value as Record<string, unknown>;

  return (
    typeof word.id === "string" &&
    typeof word.word === "string" &&
    typeof word.translation === "string" &&
    (word.language === "english" ||
      word.language === "traditional-chinese")
  );
}

function buildPrompt(words: CoachWord[]): string {
  const wordList = words
    .map(
      (word, index) =>
        `${index + 1}. ${word.word} — ${word.translation}` +
        `${word.partOfSpeech ? ` (${word.partOfSpeech})` : ""}`
    )
    .join("\n");

  return `
You are an expert bilingual English and Traditional Chinese language coach.

Create one concise, practical lesson using these vocabulary words:

${wordList}

The learner may be learning English or Traditional Chinese.
Use natural, modern language suitable for everyday conversation.

Requirements:

1. Use every vocabulary word naturally.
2. Create a short lesson title.
3. Write a short introduction in Traditional Chinese.
4. Write one English story of approximately 120 to 180 words.
5. Provide the complete Traditional Chinese story translation.
6. Create a natural two-person dialogue with 6 to 10 lines.
7. Every dialogue line must include:
   - speaker
   - English text
   - Traditional Chinese translation
8. Explain 2 to 4 useful grammar or usage points.
9. Create 4 multiple-choice questions.
10. Each quiz question must have exactly 4 options.
11. The answer must exactly match one option.
12. Include a brief Traditional Chinese explanation for each answer.

Return only valid JSON using this exact shape:

{
  "title": "string",
  "introduction": "string",
  "story": "string",
  "storyTranslation": "string",
  "dialogue": [
    {
      "speaker": "A",
      "text": "English sentence",
      "translation": "繁體中文翻譯"
    }
  ],
  "grammarNotes": [
    {
      "title": "string",
      "explanation": "繁體中文說明",
      "example": "English example",
      "translation": "繁體中文翻譯"
    }
  ],
  "quiz": [
    {
      "id": "question-1",
      "question": "English question",
      "translation": "繁體中文題目",
      "options": ["A", "B", "C", "D"],
      "answer": "one exact option",
      "explanation": "繁體中文答案說明"
    }
  ]
}

Do not include markdown, code fences, or extra commentary.
`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is missing." },
      { status: 500 }
    );
  }

  let body: GenerateCoachRequest;

  try {
    body = (await request.json()) as GenerateCoachRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.words)) {
    return NextResponse.json(
      { error: "Vocabulary words are missing." },
      { status: 400 }
    );
  }

  const words = body.words
    .filter(isCoachWord)
    .slice(0, MAX_WORDS);

  if (words.length < 3) {
    return NextResponse.json(
      {
        error:
          "Add at least three vocabulary words before generating a lesson.",
      },
      { status: 400 }
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
            parts: [{ text: buildPrompt(words) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.65,
        },
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ??
            "Gemini lesson generation failed.",
        },
        { status: response.status }
      );
    }

    const generatedText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof generatedText !== "string") {
      return NextResponse.json(
        { error: "Gemini returned no lesson." },
        { status: 502 }
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(generatedText);
    } catch {
      return NextResponse.json(
        { error: "Gemini returned malformed JSON." },
        { status: 502 }
      );
    }

    const lesson = parseCoachLesson(parsed, words);

    return NextResponse.json({ lesson });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      error.name === "AbortError";

    const message =
      error instanceof Error
        ? error.message
        : "Could not generate the lesson.";

    return NextResponse.json(
      {
        error: timedOut
          ? "AI lesson generation timed out. Please try again."
          : message,
      },
      { status: timedOut ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
