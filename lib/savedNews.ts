import { createClient } from "@/lib/supabase/client";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

const FALLBACK_STORAGE_KEY = "saved-news-fallback";
const MAX_FALLBACK_ENTRIES = 100;

export type SavedNewsRecord = {
  articleId: string;
  category: string;
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  vocabulary: DailyNewsCard["vocabulary"];
  sourceName: string;
  sourceUrl: string;
  imageUrl: string | null;
  publishedAt: string;
  savedAt: string;
};

type SaveResult = {
  savedVia: "supabase" | "local";
};

function readFallbackRecords(): SavedNewsRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    return Array.isArray(parsed) ? (parsed as SavedNewsRecord[]) : [];
  } catch {
    return [];
  }
}

function writeFallbackRecords(records: SavedNewsRecord[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      FALLBACK_STORAGE_KEY,
      JSON.stringify(records.slice(-MAX_FALLBACK_ENTRIES))
    );
  } catch {
    // Storage can fail (private mode, quota). Safe to ignore —
    // the save already succeeded or failed on its own terms.
  }
}

function saveToFallback(card: DailyNewsCard): void {
  const records = readFallbackRecords();

  if (records.some((record) => record.articleId === card.id)) {
    return;
  }

  const record: SavedNewsRecord = {
    articleId: card.id,
    category: card.category,
    englishTitle: card.englishTitle,
    chineseTitle: card.chineseTitle,
    englishSummary: card.englishSummary,
    chineseSummary: card.chineseSummary,
    vocabulary: card.vocabulary,
    sourceName: card.sourceName,
    sourceUrl: card.sourceUrl,
    imageUrl: card.imageUrl,
    publishedAt: card.publishedAt,
    savedAt: new Date().toISOString(),
  };

  writeFallbackRecords([...records, record]);
}

/**
 * Saves a Daily News story to Notes. Tries Supabase first (so it syncs
 * across devices); if the table isn't set up yet or the request fails
 * for any reason, it falls back to saving locally so the action never
 * silently does nothing for the user.
 */
export async function saveNewsArticle(
  card: DailyNewsCard
): Promise<SaveResult> {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("NOT_AUTHENTICATED");
    }

    const { error } = await supabase.from("saved_news_articles").upsert(
      {
        user_id: user.id,
        article_id: card.id,
        category: card.category,
        english_title: card.englishTitle,
        chinese_title: card.chineseTitle || null,
        english_summary: card.englishSummary,
        chinese_summary: card.chineseSummary || null,
        vocabulary: card.vocabulary,
        source_name: card.sourceName,
        source_url: card.sourceUrl,
        image_url: card.imageUrl,
        published_at: card.publishedAt,
      },
      { onConflict: "user_id,article_id" }
    );

    if (error) {
      throw error;
    }

    return { savedVia: "supabase" };
  } catch {
    saveToFallback(card);
    return { savedVia: "local" };
  }
}

/**
 * Returns the subset of the given article IDs that are already saved,
 * checked against Supabase first and merged with anything saved locally
 * while Supabase was unavailable.
 */
export async function getSavedArticleIds(
  articleIds: string[]
): Promise<Set<string>> {
  const localIds = new Set(
    readFallbackRecords().map((record) => record.articleId)
  );

  if (articleIds.length === 0) {
    return localIds;
  }

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return localIds;
    }

    const { data, error } = await supabase
      .from("saved_news_articles")
      .select("article_id")
      .eq("user_id", user.id)
      .in("article_id", articleIds);

    if (error || !data) {
      return localIds;
    }

    for (const row of data as { article_id: string }[]) {
      localIds.add(row.article_id);
    }

    return localIds;
  } catch {
    return localIds;
  }
}