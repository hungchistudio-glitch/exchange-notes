import type { DailyNewsCard } from "@/lib/types/dailyNews";

export const DISCOVER_BATCH_SIZE = 8;
/** Enough recent candidates to balance topics without reading the whole pool. */
export const DISCOVER_CANDIDATE_LIMIT = 64;
const FOCUS_CATEGORIES = ["art", "technology", "fashion"];

/** Input is newest first and already filtered for this reader's language/history. */
export function selectDiscoverBatch(cards: DailyNewsCard[]): DailyNewsCard[] {
  const selected: DailyNewsCard[] = [];
  const used = new Set<string>();
  const key = (card: DailyNewsCard) => card.sourceUrl || card.id || card.itemId || "";
  const add = (card: DailyNewsCard | undefined) => {
    if (!card || !key(card) || used.has(key(card))) return;
    selected.push(card);
    used.add(key(card));
  };

  // Two rounds give all three interests a place near the top. Prefer another
  // publisher in round two, then fall back to the freshest available story.
  for (let round = 0; round < 2; round++) {
    for (const category of FOCUS_CATEGORIES) {
      const matches = cards.filter(card => card.category.trim().toLowerCase() === category && !used.has(key(card)));
      const publishers = new Set(selected.filter(card => card.category.trim().toLowerCase() === category).map(card => card.sourceName));
      add(matches.find(card => !publishers.has(card.sourceName)) ?? matches[0]);
    }
  }

  // Missing topics never leave holes; retain the newest general coverage too.
  for (const card of cards) {
    if (selected.length >= DISCOVER_BATCH_SIZE) break;
    add(card);
  }
  return selected;
}
