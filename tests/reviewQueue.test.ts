import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => ({
  client: null as unknown,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => supabaseState.client,
}));

import { getTodaysReview } from "@/lib/review/getTodaysReview";

afterEach(() => {
  vi.useRealTimers();
});

describe("today's review queue", () => {
  it("includes legacy NULL schedules and due dates in chronological order", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T15:00:00.000Z"));

    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "word-1",
          word: "bonjour",
          translation: "hello",
          word_language: "fr",
          translation_language: "en",
          texts: { fr: "bonjour", en: "hello" },
          examples: {},
        },
      ],
      error: null,
    });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      or: vi.fn(),
      order,
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.or.mockReturnValue(query);

    supabaseState.client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn(() => query),
    };

    await expect(getTodaysReview()).resolves.toHaveLength(1);
    expect(query.or).toHaveBeenCalledWith(
      "next_review_at.is.null,next_review_at.lte.2026-09-10T15:00:00.000Z",
    );
    expect(order).toHaveBeenCalledWith("next_review_at", {
      ascending: true,
      nullsFirst: true,
    });
  });

  it("does not query vocabulary without an authenticated reader", async () => {
    const from = vi.fn();
    supabaseState.client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from,
    };

    await expect(getTodaysReview()).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
