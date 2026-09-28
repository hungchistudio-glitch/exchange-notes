import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The nightly news run produced nothing on 23–26 September and two cards on
 * the 27th, and nothing tried again until the next night. The news route
 * now finishes a short night after answering — at most once per window
 * across every instance, and never while every model is out for the day.
 */

const textQuotaResetAt = vi.fn();
const selectTodaysArticles = vi.fn();
const buildLearningCards = vi.fn();

vi.mock("@/lib/ai/askText", () => ({
  textQuotaResetAt: () => textQuotaResetAt(),
}));
vi.mock("@/lib/dailyNews", () => ({
  selectTodaysArticles: (...args: unknown[]) => selectTodaysArticles(...args),
  buildLearningCards: (...args: unknown[]) => buildLearningCards(...args),
}));
vi.mock("@/lib/news/languagesInUse", () => ({
  getDailyNewsLanguages: async () => ["en", "zh-TW"],
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("tests pass their own client");
  },
}));

import { refillPoolIfThin, THIN_DAY } from "@/lib/news/refillPool";

type Fake = {
  recentCount: number;
  lockClaimed: boolean;
  lockUpdates: number;
  inserted: unknown[];
};

function fakeSupabase(state: Fake) {
  return {
    from(table: string) {
      if (table === "daily_news_refill_lock") {
        const chain = {
          update: () => chain,
          eq: () => chain,
          lt: () => chain,
          select: async () => {
            state.lockUpdates += 1;
            return { data: state.lockClaimed ? [{ id: "refill" }] : [], error: null };
          },
        };
        return chain;
      }

      /* daily_news_items */
      return {
        select: (_columns: string, options?: { head?: boolean }) => ({
          gte: async () =>
            options?.head
              ? { count: state.recentCount, error: null }
              : { data: [], error: null },
        }),
        upsert: async (rows: unknown[]) => {
          state.inserted.push(...rows);
          return { error: null };
        },
        delete: () => ({ lt: async () => ({ error: null }) }),
      };
    },
  } as never;
}

function freshState(overrides: Partial<Fake> = {}): Fake {
  return { recentCount: 0, lockClaimed: true, lockUpdates: 0, inserted: [], ...overrides };
}

beforeEach(() => {
  textQuotaResetAt.mockReset().mockResolvedValue(null);
  selectTodaysArticles.mockReset().mockResolvedValue([{ url: "https://a" }]);
  buildLearningCards.mockReset().mockResolvedValue([
    { card: {}, category: "World", sourceUrl: "https://a", publishedAt: "2026-09-28" },
  ]);
});

describe("refillPoolIfThin", () => {
  it("leaves a full night alone without touching the lock", async () => {
    const state = freshState({ recentCount: THIN_DAY });

    await expect(refillPoolIfThin(fakeSupabase(state))).resolves.toBe("not-thin");
    expect(state.lockUpdates).toBe(0);
    expect(buildLearningCards).not.toHaveBeenCalled();
  });

  it("does not ask while every model is out for the day", async () => {
    const state = freshState();
    textQuotaResetAt.mockResolvedValue(Date.now() + 3_600_000);

    await expect(refillPoolIfThin(fakeSupabase(state))).resolves.toBe("quota-out");
    expect(state.lockUpdates).toBe(0);
  });

  it("refills a short night once it holds the lock", async () => {
    const state = freshState({ recentCount: 2 });

    await expect(refillPoolIfThin(fakeSupabase(state))).resolves.toBe("refilled");
    expect(state.inserted).toHaveLength(1);
  });

  it("stands aside when another request has tried recently", async () => {
    const state = freshState({ lockClaimed: false });

    await expect(refillPoolIfThin(fakeSupabase(state))).resolves.toBe("locked");
    expect(buildLearningCards).not.toHaveBeenCalled();
  });

  it("reports a failed refill instead of throwing into the response", async () => {
    const state = freshState();
    buildLearningCards.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(refillPoolIfThin(fakeSupabase(state))).resolves.toBe("failed");
  });
});
