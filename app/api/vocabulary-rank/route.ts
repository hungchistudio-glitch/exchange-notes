import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SortMode = "for-you" | "trending";
type VocabularyStatus = "new" | "learning" | "mastered";

type RankItem = {
  id: string;
  word: string;
  translation: string;
  status: VocabularyStatus;
  createdAt?: string | null;
  partOfSpeech?: string | null;
  example?: string | null;
};

type InteractionRecord = {
  word?: string;
  translation?: string;
  view?: number;
  search?: number;
  speak?: number;
  share?: number;
  send?: number;
  status?: number;
  lastInteractedAt?: string;
};

type RankRequest = {
  mode?: unknown;
  items?: unknown;
  interactions?: unknown;
  currentSearch?: unknown;
  newsContext?: unknown;
};

type GeminiRankResponse = {
  orderedIds: string[];
};

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 18_000;
const MAX_ITEMS = 250;
const MAX_NEWS_CONTEXT = 14_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeItem(value: unknown): RankItem | null {
  if (!isRecord(value)) return null;

  const id = normalizeText(value.id);
  const word = normalizeText(value.word);
  const translation = normalizeText(value.translation);
  const rawStatus = normalizeText(value.status);

  if (!id || !word || !translation) return null;

  const status: VocabularyStatus =
    rawStatus === "learning" || rawStatus === "mastered" ? rawStatus : "new";

  return {
    id,
    word,
    translation,
    status,
    createdAt: normalizeText(value.createdAt) || null,
    partOfSpeech: normalizeText(value.partOfSpeech) || null,
    example: normalizeText(value.example) || null,
  };
}

function normalizeInteractions(value: unknown): Record<string, InteractionRecord> {
  if (!isRecord(value)) return {};

  const result: Record<string, InteractionRecord> = {};

  for (const [id, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue;

    result[id] = {
      word: normalizeText(raw.word),
      translation: normalizeText(raw.translation),
      view: Number(raw.view) || 0,
      search: Number(raw.search) || 0,
      speak: Number(raw.speak) || 0,
      share: Number(raw.share) || 0,
      send: Number(raw.send) || 0,
      status: Number(raw.status) || 0,
      lastInteractedAt: normalizeText(raw.lastInteractedAt),
    };
  }

  return result;
}

function interactionScore(record: InteractionRecord | undefined): number {
  if (!record) return 0;

  const recency = record.lastInteractedAt
    ? Math.max(
        0,
        10 -
          (Date.now() - new Date(record.lastInteractedAt).getTime()) /
            (1000 * 60 * 60 * 24 * 7),
      )
    : 0;

  return (
    (record.view ?? 0) * 1 +
    (record.search ?? 0) * 5 +
    (record.speak ?? 0) * 2 +
    (record.share ?? 0) * 5 +
    (record.send ?? 0) * 7 +
    (record.status ?? 0) * 4 +
    recency
  );
}

function statusPriority(status: VocabularyStatus): number {
  if (status === "learning") return 30;
  if (status === "new") return 18;
  return 2;
}

function fallbackOrder(
  mode: SortMode,
  items: RankItem[],
  interactions: Record<string, InteractionRecord>,
  currentSearch: string,
  newsContext: string,
): string[] {
  const queryTokens = currentSearch
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const news = newsContext.toLocaleLowerCase();

  return [...items]
    .sort((a, b) => {
      if (mode === "for-you") {
        const score = (item: RankItem) => {
          const haystack = `${item.word} ${item.translation} ${item.partOfSpeech ?? ""} ${item.example ?? ""}`.toLocaleLowerCase();
          const queryAffinity = queryTokens.reduce(
            (total, token) => total + (haystack.includes(token) ? 25 : 0),
            0,
          );
          return (
            interactionScore(interactions[item.id]) +
            statusPriority(item.status) +
            queryAffinity
          );
        };

        return score(b) - score(a);
      }

      const trendingScore = (item: RankItem) => {
        const word = item.word.toLocaleLowerCase();
        const translation = item.translation.toLocaleLowerCase();
        const wordMatches = word.length > 2 ? news.split(word).length - 1 : 0;
        const translationMatches =
          translation.length > 1 ? news.split(translation).length - 1 : 0;
        return wordMatches * 12 + translationMatches * 10 + statusPriority(item.status) / 10;
      };

      return trendingScore(b) - trendingScore(a);
    })
    .map((item) => item.id);
}

function buildPrompt(
  mode: SortMode,
  items: RankItem[],
  interactions: Record<string, InteractionRecord>,
  currentSearch: string,
  newsContext: string,
): string {
  const instruction =
    mode === "for-you"
      ? `Rank the user's saved vocabulary from most useful and personally relevant to least relevant. Prioritize repeated searches, views, pronunciation, shares, sends, recent interactions, words marked learning, semantic similarity to the current search, and words that stretch the learner. Put mastered, extremely basic, or unrelated words later.`
      : `Rank the user's saved vocabulary from most currently newsworthy/trending to least. Use the supplied recent-news context, frequency of themes and named entities, public relevance, and recency. Only rank the provided saved vocabulary. Do not invent words.`;

  return `${instruction}

Return JSON only in exactly this shape:
{"orderedIds":["id1","id2"]}

Rules:
- Include every provided id exactly once.
- Do not add ids.
- Do not omit ids.
- Do not include markdown or explanations.

Current search: ${JSON.stringify(currentSearch)}

Vocabulary items:
${JSON.stringify(items)}

User interactions:
${JSON.stringify(interactions)}

Recent news context:
${newsContext || "No news context available."}`;
}

function validateOrderedIds(value: unknown, validIds: Set<string>): string[] | null {
  if (!isRecord(value) || !Array.isArray(value.orderedIds)) return null;

  const orderedIds = value.orderedIds.filter(
    (id): id is string => typeof id === "string" && validIds.has(id),
  );

  const unique = [...new Set(orderedIds)];
  if (unique.length !== validIds.size) return null;

  return unique;
}

export async function POST(request: NextRequest) {
  let body: RankRequest;

  try {
    body = (await request.json()) as RankRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const mode: SortMode | null =
    body.mode === "for-you" || body.mode === "trending" ? body.mode : null;
  const items = Array.isArray(body.items)
    ? body.items.map(normalizeItem).filter((item): item is RankItem => item !== null).slice(0, MAX_ITEMS)
    : [];

  if (!mode) {
    return NextResponse.json({ error: "Invalid ranking mode." }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ orderedIds: [] });
  }

  const interactions = normalizeInteractions(body.interactions);
  const currentSearch = normalizeText(body.currentSearch).slice(0, 160);
  const newsContext = normalizeText(body.newsContext).slice(0, MAX_NEWS_CONTEXT);
  const fallback = fallbackOrder(mode, items, interactions, currentSearch, newsContext);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ orderedIds: fallback, source: "fallback" });
  }

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
          {
            role: "user",
            parts: [
              {
                text: buildPrompt(
                  mode,
                  items,
                  interactions,
                  currentSearch,
                  newsContext,
                ),
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini vocabulary ranking failed:", data);
      return NextResponse.json({ orderedIds: fallback, source: "fallback" });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== "string") {
      return NextResponse.json({ orderedIds: fallback, source: "fallback" });
    }

    let parsed: GeminiRankResponse;
    try {
      parsed = JSON.parse(rawText) as GeminiRankResponse;
    } catch {
      return NextResponse.json({ orderedIds: fallback, source: "fallback" });
    }

    const validIds = new Set(items.map((item) => item.id));
    const orderedIds = validateOrderedIds(parsed, validIds);

    return NextResponse.json({
      orderedIds: orderedIds ?? fallback,
      source: orderedIds ? "gemini" : "fallback",
    });
  } catch (error) {
    if (!(error instanceof Error && error.name === "AbortError")) {
      console.error("Vocabulary ranking error:", error);
    }

    return NextResponse.json({ orderedIds: fallback, source: "fallback" });
  } finally {
    clearTimeout(timeout);
  }
}
