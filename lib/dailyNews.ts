import { GoogleGenAI } from "@google/genai";

/**
 * All Gemini + Google Search generation logic for the Daily News feature,
 * shared between the (server-only, cron-triggered) generation job and any
 * future admin/manual regeneration tooling.
 *
 * Nothing in this file is ever imported by a route that runs on a normal
 * user page load — see app/api/cron/daily-news/route.ts for the only
 * caller. The public-facing app/api/daily-news/route.ts reads pre-generated
 * results from Supabase instead of calling this.
 */

export type VocabularyItem = {
  word: string;
  translation: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
};

export type GeneratedNewsCard = {
  region: "us" | "taiwan" | "international" | "europe" | "culture";
  category: string;
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  vocabulary: VocabularyItem[];
};

export type DailyNewsCard = GeneratedNewsCard & {
  id: string;
};

type GeminiNewsResponse = {
  cards: GeneratedNewsCard[];
};

const ALLOWED_CATEGORIES = new Set([
  "World",
  "Politics",
  "Business",
  "Technology",
  "Science",
  "Climate",
  "Health",
  "Culture",
]);

const ALLOWED_PARTS_OF_SPEECH = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
]);

const TRUSTED_DOMAINS = [
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "npr.org",
  "aljazeera.com",
  "dw.com",
  "france24.com",
  "cbc.ca",
  "abc.net.au",
  "channelnewsasia.com",
  "japantimes.co.jp",
  "scmp.com",
  "bloomberg.com",
  "cnbc.com",
  "ft.com",
  "economist.com",
  "euronews.com",
  "politico.com",
  "politico.eu",
  "nature.com",
  "science.org",
  "who.int",
  "un.org",
];

const NEWS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cards: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          region: {
            type: "string",
            enum: ["us", "taiwan", "international", "europe", "culture"],
          },
          category: {
            type: "string",
            enum: [
              "World",
              "Politics",
              "Business",
              "Technology",
              "Science",
              "Climate",
              "Health",
              "Culture",
            ],
          },
          englishTitle: { type: "string", minLength: 8, maxLength: 120 },
          chineseTitle: { type: "string", minLength: 4, maxLength: 80 },
          englishSummary: { type: "string", minLength: 40, maxLength: 320 },
          chineseSummary: { type: "string", minLength: 20, maxLength: 220 },
          sourceName: { type: "string", minLength: 2, maxLength: 60 },
          sourceUrl: { type: "string", minLength: 10, maxLength: 500 },
          publishedAt: { type: "string", minLength: 10, maxLength: 40 },
          vocabulary: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                word: { type: "string", minLength: 2, maxLength: 45 },
                translation: { type: "string", minLength: 1, maxLength: 40 },
                partOfSpeech: {
                  type: "string",
                  enum: ["noun", "verb", "adjective", "adverb", "phrase"],
                },
                englishExample: {
                  type: "string",
                  minLength: 10,
                  maxLength: 180,
                },
                chineseExample: {
                  type: "string",
                  minLength: 5,
                  maxLength: 130,
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
          "region",
          "category",
          "englishTitle",
          "chineseTitle",
          "englishSummary",
          "chineseSummary",
          "sourceName",
          "sourceUrl",
          "publishedAt",
          "vocabulary",
        ],
      },
    },
  },
  required: ["cards"],
} as const;

function normalizeText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

function normalizeMultilineText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maximumLength);
}

function normalizeDomain(value: string) {
  return value.toLowerCase().replace(/^www\./, "").trim();
}

function getUrlDomain(value: string) {
  try {
    return normalizeDomain(new URL(value).hostname);
  } catch {
    return "";
  }
}

function isTrustedSource(value: string) {
  const domain = getUrlDomain(value);

  if (!domain) {
    return false;
  }

  return TRUSTED_DOMAINS.some(
    (trustedDomain) =>
      domain === trustedDomain || domain.endsWith(`.${trustedDomain}`)
  );
}

function normalizeSourceUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    url.hash = "";

    const removableParameters = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gclid",
      "fbclid",
    ];

    for (const parameter of removableParameters) {
      url.searchParams.delete(parameter);
    }

    return url.toString();
  } catch {
    return "";
  }
}

function normalizePublishedAt(value: unknown) {
  if (typeof value !== "string") {
    return new Date().toISOString();
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString();
  }

  return parsedDate.toISOString();
}

function createStableId(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function stripJsonCodeFence(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function validateVocabularyItem(value: unknown): VocabularyItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const word = normalizeText(candidate.word, 45);
  const translation = normalizeText(candidate.translation, 40);
  const partOfSpeech = normalizeText(candidate.partOfSpeech, 20);
  const englishExample = normalizeMultilineText(candidate.englishExample, 180);
  const chineseExample = normalizeMultilineText(candidate.chineseExample, 130);

  if (
    !word ||
    !translation ||
    !ALLOWED_PARTS_OF_SPEECH.has(partOfSpeech) ||
    !englishExample ||
    !chineseExample
  ) {
    return null;
  }

  return { word, translation, partOfSpeech, englishExample, chineseExample };
}

function validateNewsCard(value: unknown): DailyNewsCard | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const category = normalizeText(candidate.category, 30);
  const englishTitle = normalizeText(candidate.englishTitle, 120);
  const chineseTitle = normalizeText(candidate.chineseTitle, 80);
  const englishSummary = normalizeMultilineText(candidate.englishSummary, 320);
  const chineseSummary = normalizeMultilineText(candidate.chineseSummary, 220);
  const sourceName = normalizeText(candidate.sourceName, 60);
  const sourceUrl = normalizeSourceUrl(candidate.sourceUrl);
  const publishedAt = normalizePublishedAt(candidate.publishedAt);

  const rawVocabulary = Array.isArray(candidate.vocabulary)
    ? candidate.vocabulary
    : [];

  const vocabulary = rawVocabulary
    .map(validateVocabularyItem)
    .filter((item): item is VocabularyItem => item !== null)
    .slice(0, 3);

  const region =
    typeof candidate.region === "string" &&
    ["us", "taiwan", "international", "europe", "culture"].includes(
      candidate.region
    )
      ? (candidate.region as DailyNewsCard["region"])
      : "international";

  if (
    !ALLOWED_CATEGORIES.has(category) ||
    !englishTitle ||
    !chineseTitle ||
    !englishSummary ||
    !chineseSummary ||
    !sourceName ||
    !sourceUrl ||
    !isTrustedSource(sourceUrl) ||
    vocabulary.length !== 3
  ) {
    return null;
  }

  return {
    id: createStableId(`${sourceUrl}:${englishTitle}`),
    region,
    category,
    englishTitle,
    chineseTitle,
    englishSummary,
    chineseSummary,
    sourceName,
    sourceUrl,
    publishedAt,
    vocabulary,
  };
}

function createPrompt() {
  const currentTime = new Date().toISOString();

  return `
Current UTC time: ${currentTime}

Search Google for the most important verified news published or materially
updated within the last 36 hours.

Select exactly five distinct stories with this required mix:
1. One major U.S. domestic news story.
2. One major Taiwan news story (politics, economy, society, or technology
   in Taiwan specifically).
3. One major international/global news story not centered on the U.S. or
   Taiwan.
4. One major Europe-focused news story.
5. One story from any of: technology, film, visual art, architecture,
   academic research, space exploration, physical/natural science, or
   history — pick whichever has the most substantive recent development.

Within these five, prioritize substantive stories over trivial ones:
- major geopolitical developments, elections, and government decisions
- economics, business, and trade
- technology and scientific breakthroughs
- space exploration and astronomy
- architecture, film, and the visual arts (major works, awards, discoveries)
- significant academic or historical findings
- climate and environmental events
- significant public-health developments

Do not select:
- celebrity gossip or tabloid content
- sports scores or routine sports coverage
- shopping content or product marketing
- opinion columns
- live-blog pages
- duplicate reports about the same event
- rumors or unverified social-media claims
- stories whose original publication date cannot be verified

Source requirements:
- Use a direct original article URL.
- Do not use a Google Search result or redirect URL.
- For U.S./international/Europe stories, use only reputable publishers such
  as Reuters, Associated Press, BBC, NPR, The Guardian, Al Jazeera, DW,
  France 24, CBC, ABC Australia, Channel NewsAsia, Bloomberg, Financial
  Times, CNBC, The Economist, Euronews, Politico, Nature, Science, WHO, or
  the United Nations.
- For the Taiwan story, use only reputable publishers such as Central News
  Agency (CNA/中央社), Taipei Times, Focus Taiwan, or Radio Taiwan
  International.
- For the technology/film/art/architecture/academia/space/science/history
  story, reputable specialist outlets are also acceptable, such as Nature,
  Science, MIT Technology Review, The Art Newspaper, Architectural Digest,
  Architectural Record, Smithsonian Magazine, Space.com, or NASA/ESA press
  releases, in addition to the general outlets above.
- Make sure the URL points to the article being summarized.
- Do not invent URLs, source names, dates, quotations, numbers, or facts.

Learning requirements:
- Rewrite each headline in clear, natural CEFR B1-B2 English.
- Provide a natural Traditional Chinese translation used in Taiwan.
- Write a concise English summary using only verified facts supported by the searched article.
- Provide an accurate Traditional Chinese translation of the summary.
- Select exactly three useful B1-B2 English vocabulary items from the headline or summary.
- Give the Traditional Chinese meaning and part of speech.
- Write one original English learning example and its Traditional Chinese translation for each word.
- The vocabulary examples must not introduce new claims about the news event.
- Set the "region" field on each card to one of: "us", "taiwan",
  "international", "europe", "culture" — matching which of the five
  required slots above it fills ("culture" for the
  technology/film/art/architecture/academia/space/science/history slot).

Return exactly five cards matching the required JSON schema.
`.trim();
}

/**
 * Runs exactly one Gemini + Google Search call and returns validated,
 * deduplicated news cards. Throws on any failure — callers (the cron route)
 * are responsible for catching and reporting errors.
 *
 * This is intentionally the ONLY place in the app that calls Gemini for
 * daily news. It should only ever be invoked from a scheduled job, never
 * from a route that runs on a user page load.
 */
export async function generateDailyNews(): Promise<{
  cards: DailyNewsCard[];
  generatedAt: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

  const client = new GoogleGenAI({ apiKey });

  const interaction = await client.interactions.create({
    model,
    input: createPrompt(),
    tools: [{ type: "google_search" }],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: NEWS_SCHEMA,
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

  const parsed = JSON.parse(
    stripJsonCodeFence(outputText)
  ) as GeminiNewsResponse;

  const rawCards = Array.isArray(parsed.cards) ? parsed.cards : [];

  const cards = rawCards
    .map(validateNewsCard)
    .filter((card): card is DailyNewsCard => card !== null);

  const uniqueCards = Array.from(
    new Map(cards.map((card) => [card.sourceUrl, card])).values()
  ).slice(0, 5);

  if (uniqueCards.length === 0) {
    throw new Error(
      "Gemini did not return any valid news cards with trusted original sources."
    );
  }

  return {
    cards: uniqueCards,
    generatedAt: new Date().toISOString(),
  };
}
