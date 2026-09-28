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
  mocks.rows = [
    { id: "row-a", part_of_speech: null, texts: { en: "apple" }, examples: {} },
    { id: "row-b", part_of_speech: null, texts: { en: "bridge" }, examples: {} },
    { id: "row-c", part_of_speech: null, texts: { en: "cloud" }, examples: {} },
  ];
});

describe("library fill pairing", () => {
  it("leaves a skipped word alone instead of giving it the next word's answer", async () => {
    // The model answers the first and third words and says nothing about the
    // second — the shape that used to shift "nuage" onto "bridge".
    mocks.create.mockResolvedValue({
      text: JSON.stringify({
        words: [
          { id: "w1", text: "pomme", example: "Je mange une pomme." },
          { id: "w3", text: "nuage", example: "Un nuage passe." },
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

    expect(written.get("row-a")?.texts.fr).toBe("pomme");
    expect(written.get("row-c")?.texts.fr).toBe("nuage");
    expect(written.has("row-b")).toBe(false);
  });

  it("ignores an answer whose id belongs to no word in the batch", async () => {
    mocks.create.mockResolvedValue({
      text: JSON.stringify({
        words: [
          { id: "w1", text: "pomme", example: "Je mange une pomme." },
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
          { id: "w1", text: "pomme", example: "Je mange une pomme." },
          { id: "w2", text: "pont", example: "Le pont est fermé." },
          { id: "w3", text: "nuage", example: "Un nuage passe." },
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
