import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * One run a night lost batches on most nights (4 to 11 cards against twelve;
 * none on 2026-11-05). Chi chose (2026-11-15): knock again every half hour
 * until the night has twelve, the categories it lacks first, and give up a
 * refused batch at once rather than wait on a second model that hangs.
 */

const textQuotaResetAt = vi.fn();
const selectTodaysArticles = vi.fn();
const buildLearningCards = vi.fn();

vi.mock("@/lib/ai/askText", () => ({ textQuotaResetAt: () => textQuotaResetAt() }));
vi.mock("@/lib/dailyNews", () => ({
  selectTodaysArticles: (...args: unknown[]) => selectTodaysArticles(...args),
  buildLearningCards: (...args: unknown[]) => buildLearningCards(...args),
}));
vi.mock("@/lib/news/languagesInUse", () => ({ getDailyNewsLanguages: async () => ["en", "zh-TW"] }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("tests pass their own client");
  },
}));

import { CATCH_UP_EVERY_MS, DAILY_TARGET, catchUpDailyNews, isLastKnock, nightStart } from "@/lib/news/refillPool";

type Night = {
  tonight: string[];
  lockAt: number | null;
  lockWrites: number;
  inserted: Array<{ category: string }>;
  countedSince?: string;
};

function fakeSupabase(night: Night) {
  return {
    from(table: string) {
      if (table === "daily_news_refill_lock") {
        let olderThan = 0;
        const update = {
          eq: () => update,
          lt: (_column: string, iso: string) => {
            olderThan = Date.parse(iso);
            return update;
          },
          select: async () => {
            if (night.lockAt === null || night.lockAt >= olderThan) return { data: [], error: null };
            night.lockWrites += 1;
            night.lockAt = Date.now();
            return { data: [{ id: "catch-up" }], error: null };
          },
        };
        return {
          update: () => update,
          select: () => ({
            eq: async () => ({ data: night.lockAt === null ? [] : [{ id: "catch-up" }], error: null }),
          }),
          insert: async () => {
            night.lockWrites += 1;
            night.lockAt = Date.now();
            return { error: null };
          },
        };
      }
      return {
        select: () => ({
          gte: async (_column: string, iso: string) => {
            night.countedSince ??= iso;
            return { data: night.tonight.map((category) => ({ category, source_url: "x" })), error: null };
          },
        }),
        upsert: async (rows: Array<{ category: string }>) => {
          night.inserted.push(...rows);
          return { error: null };
        },
        delete: () => ({ lt: async () => ({ error: null }) }),
      };
    },
  } as never;
}

const article = (category: string, n: number) => ({ category, url: `https://news.example/${category}/${n}` });

beforeEach(() => {
  textQuotaResetAt.mockReset().mockResolvedValue(null);
  selectTodaysArticles.mockReset().mockResolvedValue(
    ["Art", "Technology", "Fashion", "Art", "World", "Science", "Environment"].map(article),
  );
  buildLearningCards.mockReset().mockImplementation(async (articles: Array<{ category: string; url: string }>) =>
    articles.map((item) => ({ card: {}, category: item.category, sourceUrl: item.url, publishedAt: "2026-11-15" })),
  );
});

describe("the night's catch-up", () => {
  it("counts the night from 18:00 UTC", () => {
    expect(new Date(nightStart(Date.parse("2026-11-15T21:30:00Z"))).toISOString()).toBe("2026-11-15T18:00:00.000Z");
    expect(new Date(nightStart(Date.parse("2026-11-16T01:00:00Z"))).toISOString()).toBe("2026-11-15T18:00:00.000Z");
  });

  it("does nothing but count on a night that already has twelve", async () => {
    const night: Night = { tonight: Array(DAILY_TARGET).fill("Art"), lockAt: null, lockWrites: 0, inserted: [] };
    const result = await catchUpDailyNews(fakeSupabase(night), Date.parse("2026-11-15T21:30:00Z"));
    expect(result.decision).toBe("full");
    expect(night.lockWrites).toBe(0);
    expect(selectTodaysArticles).not.toHaveBeenCalled();
  });

  it("asks only for what the night lacks, the missing categories first", async () => {
    // Four cards came through; World, Science and Environment did not.
    const night: Night = {
      tonight: ["Art", "Technology", "Fashion", "Art", "Art", "Technology", "Fashion", "Art", "Art"],
      lockAt: null,
      lockWrites: 0,
      inserted: [],
    };
    const result = await catchUpDailyNews(fakeSupabase(night), Date.now());

    expect(result).toEqual({ decision: "ran", have: 9, added: 3 });
    expect(night.inserted.map((row) => row.category)).toEqual(["World", "Science", "Environment"]);
  });

  it("takes each category's first story before any second one (2026-11-16)", async () => {
    // Fourteen slots, twelve cards: Japan and Korea get in, a third Art and Fashion wait.
    selectTodaysArticles.mockResolvedValue(
      ["Art", "Technology", "Fashion", "Art", "Technology", "Fashion", "Art", "Fashion",
        "World", "Science", "Environment", "Taiwan", "Japan", "Korea"].map(article),
    );
    const night: Night = { tonight: [], lockAt: null, lockWrites: 0, inserted: [] };
    const result = await catchUpDailyNews(fakeSupabase(night), Date.now());

    expect(result).toEqual({ decision: "ran", have: 0, added: 12 });
    expect(night.inserted.map((row) => row.category)).toEqual([
      "Art", "Technology", "Fashion", "World", "Science", "Environment", "Taiwan", "Japan", "Korea",
      "Art", "Technology", "Fashion",
    ]);
  });

  it("turns away a second knock that lands within the same ten minutes", async () => {
    const night: Night = { tonight: ["Art"], lockAt: Date.now() - CATCH_UP_EVERY_MS / 2, lockWrites: 0, inserted: [] };
    const result = await catchUpDailyNews(fakeSupabase(night), Date.now());
    expect(result.decision).toBe("locked");
    expect(buildLearningCards).not.toHaveBeenCalled();
  });

  it("makes its lock on first use rather than taking a missing one for a held one", async () => {
    const night: Night = { tonight: [], lockAt: null, lockWrites: 0, inserted: [] };
    const result = await catchUpDailyNews(fakeSupabase(night), Date.now());
    expect(result.decision).toBe("ran");
    expect(night.lockWrites).toBe(1);
  });

  it("waits while every model is out for the day", async () => {
    textQuotaResetAt.mockResolvedValue(Date.now() + 3_600_000);
    const night: Night = { tonight: [], lockAt: null, lockWrites: 0, inserted: [] };
    expect((await catchUpDailyNews(fakeSupabase(night), Date.now())).decision).toBe("quota-out");
  });
});

/*
 * Chi, 2026-11-22: 錯誤紀錄降噪. A batch no model answered was an error in
 * the logs most nights, though the next knock made it up. Now it is a
 * warning, and an error is kept for a night that ends short.
 */
describe("what the night logs", () => {
  const midNight = Date.parse("2026-11-22T21:00:00Z");
  const lastKnock = Date.parse("2026-11-22T23:30:00Z");

  it("knows the scheduler's last knock, 23:30 UTC", () => {
    expect(isLastKnock(midNight)).toBe(false);
    expect(isLastKnock(Date.parse("2026-11-22T23:00:00Z"))).toBe(false);
    expect(isLastKnock(lastKnock)).toBe(true);
    expect(isLastKnock(Date.parse("2026-11-23T03:00:00Z"))).toBe(true);
  });

  it("only warns when no model answers a run the night can still make up", async () => {
    buildLearningCards.mockResolvedValue([]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const night: Night = { tonight: ["Art"], lockAt: null, lockWrites: 0, inserted: [] };

    expect(await catchUpDailyNews(fakeSupabase(night), midNight)).toEqual({ decision: "failed", have: 1 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });

  it("is an error when the last knock leaves the night short", async () => {
    buildLearningCards.mockResolvedValue([]);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const night: Night = { tonight: ["Art", "World"], lockAt: null, lockWrites: 0, inserted: [] };

    expect((await catchUpDailyNews(fakeSupabase(night), lastKnock)).decision).toBe("failed");
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain(`2 of ${DAILY_TARGET}`);
    error.mockRestore();
  });

  it("is quiet when the last knock fills the night", async () => {
    selectTodaysArticles.mockResolvedValue(["World", "Science"].map(article));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const night: Night = { tonight: Array(DAILY_TARGET - 2).fill("Art"), lockAt: null, lockWrites: 0, inserted: [] };

    expect(await catchUpDailyNews(fakeSupabase(night), lastKnock)).toEqual({ decision: "ran", have: 10, added: 2 });
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("still throws what is not the models' weather, such as a refused write", async () => {
    const night: Night = { tonight: [], lockAt: null, lockWrites: 0, inserted: [] };
    const client = fakeSupabase(night) as unknown as { from: (table: string) => Record<string, unknown> };
    const failingWrite = {
      from(table: string) {
        const real = client.from(table);
        if (table === "daily_news_refill_lock") return real;
        return { ...real, upsert: async () => ({ error: { message: "permission denied" } }) };
      },
    } as never;
    await expect(catchUpDailyNews(failingWrite, midNight)).rejects.toThrow("permission denied");
  });
});
