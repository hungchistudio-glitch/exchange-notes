import { GoogleGenAI } from "@google/genai";

import {
  GEMINI_TIMEOUT_MS,
  MAX_CARD_POOL,
  NEWS_CATEGORIES,
  PARTS_OF_SPEECH,
  TARGET_CEFR_LEVEL,
  VOCABULARY_ITEMS_PER_CARD,
} from "./config";

import type { CandidateArticle } from "./newsApi";
import type {
  DailyNewsCard,
  VocabularyItem,
} from "./types";

type GeneratedLearningCard = {
  articleId: string;
  category: DailyNewsCard["category"];
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  vocabulary: VocabularyItem[];
};

type GeminiLearningResponse = {
  cards: GeneratedLearningCard[];
};

const ALLOWED_CATEGORIES = new Set<string>(
  NEWS_CATEGORIES
);

const ALLOWED_PARTS_OF_SPEECH = new Set<string>(
  PARTS_OF_SPEECH
);

const GEMINI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cards: {
      type: "array",
      minItems: 3,
      maxItems: MAX_CARD_POOL,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          articleId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          category: {
            type: "string",
            enum: NEWS_CATEGORIES,
          },
          englishTitle: {
            type: "string",
            minLength: 8,
            maxLength: 120,
          },
          chineseTitle: {
            type: "string",
            minLength: 4,
            maxLength: 90,
          },
          englishSummary: {
            type: "string",
            minLength: 30,
            maxLength: 360,
          },
          chineseSummary: {
            type: "string",
            minLength: 12,
            maxLength: 260,
          },
          vocabulary: {
            type: "array",
            minItems:
              VOCABULARY_ITEMS_PER_CARD,
            maxItems:
              VOCABULARY_ITEMS_PER_CARD,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                word: {
                  type: "string",
                  minLength: 2,
                  maxLength: 50,
                },
                translation: {
                  type: "string",
                  minLength: 1,
                  maxLength: 50,
                },
                partOfSpeech: {
                  type: "string",
                  enum: PARTS_OF_SPEECH,
                },
                englishExample: {
                  type: "string",
                  minLength: 8,
                  maxLength: 190,
                },
                chineseExample: {
                  type: "string",
                  minLength: 4,
                  maxLength: 150,
                },
              },
              required: [
                "word",
                "translation",
                "partOfSpeech",
                "englishExample",
                "chineseExample",
              ],
            },
          },
        },
        required: [
          "articleId",
          "category",
          "englishTitle",
          "chineseTitle",
          "englishSummary",
          "chineseSummary",
          "vocabulary",
        ],
      },
    },
  },
  required: ["cards"],
} as const;

function normalizeText(
  value: unknown,
  maximumLength: number
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function stripCodeFence(value: string): string {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function validateVocabularyItem(
  value: unknown
): VocabularyItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate =
    value as Record<string, unknown>;

  const word = normalizeText(
    candidate.word,
    50
  );

  const translation = normalizeText(
    candidate.translation,
    50
  );

  const partOfSpeech = normalizeText(
    candidate.partOfSpeech,
    20
  );

  const englishExample = normalizeText(
    candidate.englishExample,
    190
  );

  const chineseExample = normalizeText(
    candidate.chineseExample,
    150
  );

  if (
    !word ||
    !translation ||
    !ALLOWED_PARTS_OF_SPEECH.has(
      partOfSpeech
    ) ||
    !englishExample ||
    !chineseExample
  ) {
    return null;
  }

  return {
    word,
    translation,
    partOfSpeech:
      partOfSpeech as VocabularyItem["partOfSpeech"],
    englishExample,
    chineseExample,
  };
}

function validateGeneratedCard(
  value: unknown
): GeneratedLearningCard | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate =
    value as Record<string, unknown>;

  const articleId = normalizeText(
    candidate.articleId,
    100
  );

  const category = normalizeText(
    candidate.category,
    30
  );

  const englishTitle = normalizeText(
    candidate.englishTitle,
    120
  );

  const chineseTitle = normalizeText(
    candidate.chineseTitle,
    90
  );

  const englishSummary = normalizeText(
    candidate.englishSummary,
    360
  );

  const chineseSummary = normalizeText(
    candidate.chineseSummary,
    260
  );

  const rawVocabulary = Array.isArray(
    candidate.vocabulary
  )
    ? candidate.vocabulary
    : [];

  const vocabulary = rawVocabulary
    .map(validateVocabularyItem)
    .filter(
      (
        item
      ): item is VocabularyItem =>
        item !== null
    )
    .slice(
      0,
      VOCABULARY_ITEMS_PER_CARD
    );

  if (
    !articleId ||
    !ALLOWED_CATEGORIES.has(category) ||
    !englishTitle ||
    !chineseTitle ||
    !englishSummary ||
    !chineseSummary ||
    vocabulary.length !==
      VOCABULARY_ITEMS_PER_CARD
  ) {
    return null;
  }

  return {
    articleId,
    category:
      category as DailyNewsCard["category"],
    englishTitle,
    chineseTitle,
    englishSummary,
    chineseSummary,
    vocabulary,
  };
}

function createGeminiPrompt(
  candidates: CandidateArticle[]
): string {
  const articleData = candidates.map(
    (candidate) => ({
      articleId: candidate.articleId,
      categoryHint:
        candidate.categoryHint,
      originalTitle:
        candidate.originalTitle,
      description:
        candidate.description,
      sourceName: candidate.sourceName,
      publishedAt:
        candidate.publishedAt,
      trustedSource:
        candidate.trustedSource,
    })
  );

  return `
You create accurate bilingual news-learning cards for Traditional Chinese readers in Taiwan.

Use only the supplied NewsAPI article data.

ACCURACY RULES:
- Do not search the web.
- Do not invent facts.
- Do not invent names, dates, locations, quotations, numbers, causes, or outcomes.
- Do not merge information from different articles.
- Do not change any articleId.
- Do not include source URLs.
- When information is limited, use a short and cautious summary.
- Never claim more than the supplied headline and description support.

SELECTION RULES:
- Select between 3 and ${MAX_CARD_POOL} distinct articles.
- Prioritize major international developments.
- Prefer trustedSource articles.
- Avoid multiple articles about the same event.
- Exclude sports, gossip, shopping, opinion, entertainment trivia, and promotional content.

LANGUAGE RULES:
- Rewrite the headline in clear, natural ${TARGET_CEFR_LEVEL} English.
- Keep the meaning factual and close to the original.
- Translate the headline into natural Traditional Chinese used in Taiwan.
- Write one concise factual English summary.
- Translate the summary accurately into Traditional Chinese.
- Do not use Simplified Chinese.

VOCABULARY RULES:
- Produce exactly ${VOCABULARY_ITEMS_PER_CARD} useful ${TARGET_CEFR_LEVEL} words or phrases per article.
- Vocabulary must appear in, or be directly useful for understanding, the rewritten title or summary.
- Include a Traditional Chinese meaning.
- Include one supported part of speech.
- Write one original educational English example.
- Translate that example into natural Traditional Chinese.
- Example sentences must not add claims about the news event.

Return only JSON matching the required schema.

ARTICLES:
${JSON.stringify(articleData)}
`.trim();
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeout:
    | ReturnType<typeof setTimeout>
    | undefined;

  const timeoutPromise =
    new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(
          new Error("GEMINI_TIMEOUT")
        );
      }, timeoutMs);
    });

  try {
    return await Promise.race([
      operation,
      timeoutPromise,
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function parseGeminiResponse(
  outputText: string
): GeneratedLearningCard[] {
  let parsed: GeminiLearningResponse;

  try {
    parsed = JSON.parse(
      stripCodeFence(outputText)
    ) as GeminiLearningResponse;
  } catch {
    throw new Error(
      "GEMINI_INVALID_JSON"
    );
  }

  if (!Array.isArray(parsed.cards)) {
    throw new Error(
      "GEMINI_INVALID_RESPONSE"
    );
  }

  return parsed.cards
    .map(validateGeneratedCard)
    .filter(
      (
        card
      ): card is GeneratedLearningCard =>
        card !== null
    );
}

function mergeGeneratedCards(
  candidates: CandidateArticle[],
  generatedCards: GeneratedLearningCard[]
): DailyNewsCard[] {
  const sourceById = new Map(
    candidates.map((candidate) => [
      candidate.articleId,
      candidate,
    ])
  );

  const usedArticleIds =
    new Set<string>();

  const cards: DailyNewsCard[] = [];

  for (const generated of generatedCards) {
    if (
      usedArticleIds.has(
        generated.articleId
      )
    ) {
      continue;
    }

    const source = sourceById.get(
      generated.articleId
    );

    if (!source) {
      continue;
    }

    cards.push({
      id: source.articleId,
      category: generated.category,
      englishTitle:
        generated.englishTitle,
      chineseTitle:
        generated.chineseTitle,
      englishSummary:
        generated.englishSummary,
      chineseSummary:
        generated.chineseSummary,
      sourceName:
        source.sourceName,
      sourceUrl:
        source.sourceUrl,
      publishedAt:
        source.publishedAt,
      imageUrl:
        source.imageUrl,
      vocabulary:
        generated.vocabulary,
      aiEnhanced: true,
    });

    usedArticleIds.add(
      generated.articleId
    );

    if (
      cards.length >=
      MAX_CARD_POOL
    ) {
      break;
    }
  }

  return cards;
}

export async function enrichNewsWithGemini(
  candidates: CandidateArticle[]
): Promise<DailyNewsCard[]> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY_MISSING"
    );
  }

  if (candidates.length === 0) {
    throw new Error(
      "NO_GEMINI_CANDIDATES"
    );
  }

  const model =
    process.env.GEMINI_MODEL?.trim();

  if (!model) {
    throw new Error(
      "GEMINI_MODEL_MISSING"
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: createGeminiPrompt(
        candidates.slice(
          0,
          MAX_CARD_POOL
        )
      ),
      config: {
        responseMimeType:
          "application/json",
        responseSchema:
          GEMINI_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 6000,
      },
    }),
    GEMINI_TIMEOUT_MS
  );

  const outputText =
    typeof response.text === "string"
      ? response.text.trim()
      : "";

  if (!outputText) {
    throw new Error(
      "GEMINI_EMPTY_RESPONSE"
    );
  }

  const generatedCards =
    parseGeminiResponse(outputText);

  const mergedCards =
    mergeGeneratedCards(
      candidates,
      generatedCards
    );

  if (mergedCards.length < 3) {
    throw new Error(
      "GEMINI_TOO_FEW_VALID_CARDS"
    );
  }

  return mergedCards;
}