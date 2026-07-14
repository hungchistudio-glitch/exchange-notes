import { NextRequest, NextResponse } from "next/server";

type SortMode = "for-you" | "trending";
type VocabularyStatus = "new" | "learning" | "mastered";

type RankingItem = {
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

type RankingRequest = {
  mode?: SortMode;
  items?: RankingItem[];
  interactions?: Record<string, InteractionRecord>;
  currentSearch?: string;
  newsContext?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

const MODEL = process.env.GEMINI_RANKING_MODEL || "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_ITEMS = 160;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function fallbackOrder(
  items: RankingItem[],
  interactions: Record<string, InteractionRecord>,
) {
  const statusWeight: Record<VocabularyStatus, number> = {
    learning: 30,
    new: 20,
    mastered: 5,
  };

  const interactionScore = (id: string) => {
    const record = interactions[id];
    if (!record) return 0;

    return (
      (record.search ?? 0) * 6 +
      (record.send ?? 0) * 5 +
      (record.share ?? 0) * 4 +
      (record.speak ?? 0) * 3 +
      (record.status ?? 0) * 2 +
      (record.view ?? 0)
    );
  };

  return [...items]
    .sort((a, b) => {
      const scoreDifference =
        interactionScore(b.id) + statusWeight[b.status] -
        (interactionScore(a.id) + statusWeight[a.status]);

      if (scoreDifference !== 0) return scoreDifference;

      return (
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
      );
    })
    .map((item) => item.id);
}

function parseOrderedIds(text: string, validIds: Set<string>) {
  const stripped = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(stripped) as unknown;
  const candidate = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "orderedIds" in parsed
      ? (parsed as { orderedIds?: unknown }).orderedIds
      : null;

  if (!Array.isArray(candidate)) {
    throw new Error("Gemini returned an invalid ranking format.");
  }

  const uniqueIds: string[] = [];
  const seen = new Set<string>();

  for (const value of candidate) {
    if (typeof value !== "string" || !validIds.has(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    uniqueIds.push(value);
  }

  return uniqueIds;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as RankingRequest;
    const mode = body.mode;

    if (mode !== "for-you" && mode !== "trending") {
      return NextResponse.json({ error: "Invalid ranking mode." }, { status: 400 });
    }

    const items = Array.isArray(body.items)
      ? body.items
          .slice(0, MAX_ITEMS)
          .filter(
            (item): item is RankingItem =>
              Boolean(
                item &&
                  typeof item.id === "string" &&
                  typeof item.word === "string" &&
                  typeof item.translation === "string" &&
                  ["new", "learning", "mastered"].includes(item.status),
              ),
          )
          .map((item) => ({
            id: item.id,
            word: cleanText(item.word, 120),
            translation: cleanText(item.translation, 120),
            status: item.status,
            createdAt: cleanText(item.createdAt, 40),
            partOfSpeech: cleanText(item.partOfSpeech, 40),
            example: cleanText(item.example, 240),
          }))
      : [];

    if (items.length === 0) {
      return NextResponse.json({ orderedIds: [] });
    }

    const interactions =
      body.interactions && typeof body.interactions === "object"
        ? body.interactions
        : {};

    const compactInteractions = Object.fromEntries(
      Object.entries(interactions)
        .filter(([id]) => items.some((item) => item.id === id))
        .map(([id, record]) => [
          id,
          {
            view: Number(record.view ?? 0),
            search: Number(record.search ?? 0),
            speak: Number(record.speak ?? 0),
            share: Number(record.share ?? 0),
            send: Number(record.send ?? 0),
            status: Number(record.status ?? 0),
            lastInteractedAt: cleanText(record.lastInteractedAt, 40),
          },
        ]),
    );

    const modeInstruction =
      mode === "for-you"
        ? `Rank these saved vocabulary items for this individual learner. Put words most related to their repeated searches, taps, pronunciation plays, shares, sends, and current learning activity first. Prefer useful adjacent concepts they are likely ready to learn. Put mastered, overly basic, low-interest, or unrelated words toward the end.`
        : `Rank these saved vocabulary items by current news and public-interest relevance. Use the supplied current Daily News context as the strongest signal. Put words strongly connected to prominent, repeated, recent stories first. Then place generally newsworthy words. Put ordinary, timeless, or low-news-interest words last. Do not invent words and do not add IDs.`;

    const prompt = `
You are the ranking engine for a bilingual English–Traditional Chinese vocabulary app.

${modeInstruction}

Rules:
1. Return every supplied item ID exactly once.
2. Return ONLY valid JSON in this shape: {"orderedIds":["id1","id2"]}.
3. Never return explanations, markdown, scores, or words.
4. Learning status meaning: learning = actively studying, new = not studied much, mastered = already comfortable.
5. Recent interaction and repeated behavior matter more than a single accidental view.

Current search:
${cleanText(body.currentSearch, 200) || "(none)"}

Interaction data:
${JSON.stringify(compactInteractions)}

Current Daily News context:
${cleanText(body.newsContext, 14000) || "(not supplied)"}

Vocabulary items:
${JSON.stringify(items)}
`.trim();

    const geminiResponse = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    });

    const geminiData = (await geminiResponse.json()) as GeminiResponse;

    if (!geminiResponse.ok) {
      throw new Error(geminiData.error?.message || "Gemini ranking failed.");
    }

    const responseText =
      geminiData.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    const validIds = new Set(items.map((item) => item.id));
    const aiIds = parseOrderedIds(responseText, validIds);
    const fallbackIds = fallbackOrder(items, compactInteractions);
    const seen = new Set(aiIds);
    const orderedIds = [
      ...aiIds,
      ...fallbackIds.filter((id) => !seen.has(id)),
    ];

    return NextResponse.json({ orderedIds });
  } catch (error) {
    console.error("Vocabulary ranking error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not rank vocabulary.",
      },
      { status: 500 },
    );
  }
}
