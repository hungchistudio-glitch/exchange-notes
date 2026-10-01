import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The batch must not shift when the model skips a word

   Twenty words go to the model in one call and the answers come back in a
   list. That list used to be read by position — `answers[index]` — against a
   schema with no id in it, so a model that returned nineteen entries for
   twenty words handed every word after the gap its neighbour's translation
   and its neighbour's example sentence. They were then written to the
   reader's own library, indistinguishable from right answers. An audit on
   2026-09-18 found three rows carrying someone else's sentence.

   Dropping one word is the failure mode a list of twenty actually has, so
   that is what this asserts: the two answers that came back land on their own
   words, and the word with no answer is left alone for the next batch rather
   than being given the next word's.
   ========================================================= */

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  consume: vi.fn(async () => true),
  backgroundAllowed: vi.fn(async () => true),
  rows: [] as unknown[],
}));

vi.mock("@/lib/ai/modelHealth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/modelHealth")>()),
  backgroundAllowed: mocks.backgroundAllowed,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "reader-1" } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: mocks.rows, error: null }),
        }),
      }),
      update: (patch: unknown) => ({
        eq: (_column: string, id: string) => ({
          eq: async () => {
            mocks.update(id, patch);
            return { error: null };
          },
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/ai/dailyQuota", () => ({
  consumeDailyQuota: mocks.consume,
  refundDailyQuota: async () => undefined,
}));

vi.mock("@/lib/profile/languagePair", () => ({
  readLearningPair: async () => ["fr", "en"],
}));

vi.mock("@google/genai", () => ({
  /* A class, because the route calls `new GoogleGenAI(...)`. */
  GoogleGenAI: class {
    models = { generateContent: mocks.create };
  },
}));

import { POST } from "@/app/api/vocabulary/translate/route";

function request() {
  return { json: async () => ({ language: "fr" }) } as Request;
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  mocks.create.mockReset();
  mocks.update.mockReset();
  mocks.consume.mockReset().mockResolvedValue(true);
  mocks.backgroundAllowed.mockReset().mockResolvedValue(true);
  // Words the built-in dictionaries do not hold, so the model is asked.
  mocks.rows = [
    { id: "row-a", part_of_speech: null, texts: { en: "serendipity" }, examples: {} },
    { id: "row-b", part_of_speech: null, texts: { en: "aqueduct" }, examples: {} },
    { id: "row-c", part_of_speech: null, texts: { en: "nebula" }, examples: {} },
  ];
});

describe("library fill pairing", () => {
  it("leaves a skipped word alone instead of giving it the next word's answer", async () => {
    // The model answers the first and third words and says nothing about the
    // second — the shape that used to shift "nébuleuse" onto "aqueduct".
    mocks.create.mockResolvedValue({
      text: JSON.stringify({
        words: [
          { id: "w1", text: "sérendipité", example: "Quelle sérendipité !" },
          { id: "w3", text: "nébuleuse", example: "Une nébuleuse brille." },
        ],
      }),
    });

    const response = await POST(request());
    const body = (await response.json()) as { filled: number };

    expect(body.filled).toBe(2);

    const written = new Map(
      mocks.update.mock.calls.map(
        ([id, patch]) => [id, patch as { texts: Record<string, string> }],
      ),
    );

    expect(written.get("row-a")?.texts.fr).toBe("sérendipité");
    expect(written.get("row-c")?.texts.fr).toBe("nébuleuse");
    expect(written.has("row-b")).toBe(false);
  });

  it("ignores an answer whose id belongs to no word in the batch", async () => {
    mocks.create.mockResolvedValue({
      text: JSON.stringify({
        words: [
          { id: "w1", text: "sérendipité", example: "Quelle sérendipité !" },
          { id: "w9", text: "inventé", example: "Rien." },
        ],
      }),
    });

    const response = await POST(request());
    const body = (await response.json()) as { filled: number };

    expect(body.filled).toBe(1);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0][0]).toBe("row-a");
  });

  /*
   * The model is asked for one entry per word and usually gives one. The
   * ordinary case has to keep working, or the guard above is just a way of
   * filling nothing.
   */
  it("fills every word when every word is answered", async () => {
    mocks.create.mockResolvedValue({
      text: JSON.stringify({
        words: [
          { id: "w1", text: "sérendipité", example: "Quelle sérendipité !" },
          { id: "w2", text: "aqueduc", example: "L\u2019aqueduc est ancien." },
          { id: "w3", text: "nébuleuse", example: "Une nébuleuse brille." },
        ],
      }),
    });

    const response = await POST(request());
    const body = (await response.json()) as { filled: number };

    expect(body.filled).toBe(3);
    expect(mocks.update).toHaveBeenCalledTimes(3);
  });
});

/*
 * Chi's rule, 2026-09-28: background work only while the quota is
 * comfortable. A library fill is background work — nobody is waiting on it,
 * and a batch of twenty words is exactly the request that would take a model
 * away from someone pointing the camera at something.
 */
describe("library fill when the quota is scarce", () => {
  it("waits for another visit: nothing asked, nothing charged, and done for now", async () => {
    mocks.backgroundAllowed.mockResolvedValue(false);

    const response = await POST(request());
    const body = (await response.json()) as {
      filled: number;
      done: boolean;
      deferred?: boolean;
      remaining: number;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ filled: 0, done: true, deferred: true, remaining: 3 });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.consume).not.toHaveBeenCalled();
  });

  it("asks one model once when it may run", async () => {
    mocks.create.mockRejectedValue(Object.assign(new Error("high demand"), { status: 503 }));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});

/*
 * Chi, 2026-10-01: "單字庫補翻譯先用字典". Words the app already knows in all
 * five languages are filled from its own dictionaries, with no model and no
 * allowance — even while the models are too busy for background work.
 */
describe("library fill from the built-in dictionaries", () => {
  it("fills everyday words without asking a model or charging", async () => {
    mocks.backgroundAllowed.mockResolvedValue(false);
    mocks.rows = [
      { id: "row-a", part_of_speech: "noun", texts: { en: "apple" }, examples: {} },
      { id: "row-b", part_of_speech: null, texts: { "zh-TW": "謝謝" }, examples: {} },
      { id: "row-c", part_of_speech: null, texts: { en: "nebula" }, examples: {} },
    ];

    const response = await POST(request());
    const body = (await response.json()) as {
      filled: number;
      remaining: number;
      done: boolean;
      updated: Array<{ id: string; texts: Record<string, string> }>;
    };

    expect(body).toMatchObject({ filled: 2, remaining: 1, done: false });
    expect(Object.fromEntries(body.updated.map((row) => [row.id, row.texts.fr]))).toEqual({
      "row-a": "pomme",
      "row-b": "merci",
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.consume).not.toHaveBeenCalled();

    // The next call finds only the word the dictionary does not know, and
    // that one waits for spare quota as before.
    mocks.rows = mocks.rows.filter((row) => (row as { id: string }).id === "row-c");
    const next = await (await POST(request())).json();
    expect(next).toMatchObject({ filled: 0, deferred: true, done: true });
  });

  it("keeps the reader's own words: only the missing language is written", async () => {
    mocks.rows = [
      {
        id: "row-a",
        part_of_speech: "noun",
        texts: { en: "apple", "zh-TW": "蘋果" },
        examples: { en: "An apple a day." },
      },
    ];

    await POST(request());

    expect(mocks.update).toHaveBeenCalledWith("row-a", {
      texts: { en: "apple", "zh-TW": "蘋果", fr: "pomme" },
    });
  });

  it("leaves a word to the model when its languages name different entries", async () => {
    // "cold" alone is the weather; with 感冒 beside it, it is the illness.
    // Either way the dictionary must not guess: here it agrees, and fills.
    mocks.rows = [
      { id: "row-a", part_of_speech: null, texts: { en: "cold", "zh-TW": "感冒" }, examples: {} },
      { id: "row-b", part_of_speech: null, texts: { en: "apple", "zh-TW": "香蕉" }, examples: {} },
    ];
    mocks.create.mockResolvedValue({ text: JSON.stringify({ words: [] }) });

    const body = await (await POST(request())).json();

    const filled = Object.fromEntries(
      (body.updated as Array<{ id: string; texts: Record<string, string> }>).map(
        (row) => [row.id, row.texts.fr],
      ),
    );
    expect(filled["row-a"]).toBe("rhume");
    expect(filled).not.toHaveProperty("row-b");
  });

  it("does not use an entry whose part of speech contradicts the word's", async () => {
    mocks.rows = [
      { id: "row-a", part_of_speech: "verb", texts: { en: "apple" }, examples: {} },
    ];
    mocks.create.mockResolvedValue({ text: JSON.stringify({ words: [] }) });

    await POST(request());

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
