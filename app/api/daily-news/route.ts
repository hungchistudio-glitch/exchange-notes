import { NextRequest, NextResponse } from "next/server";

import {
  getDailyNews,
  type RefreshDailyNewsResult,
} from "@/lib/dailyNews/generate";

import type { DailyNewsCard } from "@/lib/dailyNews/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const RESPONSE_CARD_COUNT = 3;

function normalizeSeenValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSeenValues(
  request: NextRequest
): Set<string> {
  const rawValue =
    request.nextUrl.searchParams.get("seen") ??
    request.nextUrl.searchParams.get("exclude") ??
    "";

  if (!rawValue) {
    return new Set<string>();
  }

  const seen = new Set<string>();

  for (const rawItem of rawValue.split(/\|\||,/).slice(0, 40)) {
    let decodedItem = rawItem;

    try {
      decodedItem = decodeURIComponent(rawItem);
    } catch {
      // Keep original value when decoding fails.
    }

    const cleanValue = decodedItem.trim();

    if (!cleanValue) {
      continue;
    }

    seen.add(cleanValue);
    seen.add(normalizeSeenValue(cleanValue));
  }

  return seen;
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [copy[index], copy[randomIndex]] = [
      copy[randomIndex],
      copy[index],
    ];
  }

  return copy;
}

function chooseCards(
  cards: DailyNewsCard[],
  seenValues: Set<string>
): DailyNewsCard[] {
  const unseenCards = cards.filter((card) => {
    const normalizedTitle = normalizeSeenValue(card.englishTitle);

    return (
      !seenValues.has(card.id) &&
      !seenValues.has(card.englishTitle) &&
      !seenValues.has(normalizedTitle)
    );
  });

  if (unseenCards.length >= RESPONSE_CARD_COUNT) {
    return shuffle(unseenCards).slice(0, RESPONSE_CARD_COUNT);
  }

  const unseenIds = new Set(unseenCards.map((card) => card.id));

  const supplementaryCards = shuffle(
    cards.filter((card) => !unseenIds.has(card.id))
  );

  return [...shuffle(unseenCards), ...supplementaryCards].slice(
    0,
    RESPONSE_CARD_COUNT
  );
}

function getPublicError(error: unknown): {
  status: number;
  message: string;
} {
  const rawMessage =
    error instanceof Error ? error.message : String(error);

  if (rawMessage.includes("NEWS_API_KEY_MISSING")) {
    return {
      status: 500,
      message: "Daily News is not configured yet.",
    };
  }

  if (
    rawMessage.includes("rateLimited") ||
    rawMessage.includes("maximumResultsReached")
  ) {
    return {
      status: 429,
      message:
        "Daily News has reached its provider limit. Please try again later.",
    };
  }

  if (
    rawMessage.includes("NEWS_API_TIMEOUT") ||
    rawMessage.includes("GEMINI_TIMEOUT")
  ) {
    return {
      status: 504,
      message:
        "The news service took too long to respond. Please try again.",
    };
  }

  if (
    rawMessage.includes("NO_SUITABLE_NEWS") ||
    rawMessage.includes("DAILY_NEWS_TOO_FEW_CARDS")
  ) {
    return {
      status: 503,
      message:
        "No suitable major stories are available right now. Please try again shortly.",
    };
  }

  return {
    status: 500,
    message:
      "Daily News could not be loaded. Please try again shortly.",
  };
}

export async function GET(request: NextRequest) {
  try {
    const result: RefreshDailyNewsResult = await getDailyNews();

    const seenValues = parseSeenValues(request);
    const cards = chooseCards(result.cards, seenValues);

    if (cards.length === 0) {
      throw new Error("DAILY_NEWS_TOO_FEW_CARDS");
    }

    return NextResponse.json(
      {
        cards,
        generatedAt: result.generatedAt,
        source: result.source,
        aiEnhanced: cards.some((card) => card.aiEnhanced),
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Daily News public route failed:",
      error instanceof Error ? error.message : error
    );

    const publicError = getPublicError(error);

    return NextResponse.json(
      {
        error: publicError.message,
      },
      {
        status: publicError.status,
        headers: {
          "Cache-Control":
            "no-store, max-age=0, must-revalidate",
        },
      }
    );
  }
}