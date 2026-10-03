import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The seam the daily allowance is charged at

   /api/text-translate reaches Gemini only for phrases the cache cannot
   answer, and that distinction is the whole basis of counting it: this route
   is called by rendering rather than by anybody pressing anything, so a
   screen of already-seen cards must cost nothing. Charge per request and
   opening a conversation twice spends two of the reader's day.

   translateTexts() used to do both halves behind one call, which left the
   route no place to put the charge. These are the two halves.
   ========================================================= */

const cache = vi.hoisted(() => ({
  rows: [] as Array<{ source_text: string; text: string }>,
  written: [] as unknown[],
}));

const model = vi.hoisted(() => ({ calls: 0 }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            in: () => Promise.resolve({ data: cache.rows, error: null }),
          }),
        }),
      }),
      upsert: (rows: unknown) => {
        cache.written.push(rows);
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async () => {
        model.calls += 1;

        return {
          text: JSON.stringify({
            items: [{ source: "海鮮燉飯", text: "seafood risotto" }],
          }),
        };
      },
    };
  },
}));

const { readCachedTranslations, translateMissing } = await import(
  "@/lib/translation/textSource"
);

beforeEach(() => {
  cache.rows = [];
  cache.written = [];
  model.calls = 0;
  process.env.GEMINI_API_KEY = "test-key";
});

describe("readCachedTranslations", () => {
  it("costs nothing but a query, whatever it finds", async () => {
    cache.rows = [{ source_text: "海鮮燉飯", text: "seafood risotto" }];

    const { found, missing } = await readCachedTranslations(
      ["海鮮燉飯"],
      "zh-TW",
      "en",
    );

    expect(found.get("海鮮燉飯")).toBe("seafood risotto");
    expect(missing).toEqual([]);

    // The point of the split: a screen the cache answers in full never
    // reaches the model, so there is nothing to charge the reader for.
    expect(model.calls).toBe(0);
  });

  it("names what the cache could not answer", async () => {
    cache.rows = [{ source_text: "海鮮燉飯", text: "seafood risotto" }];

    const { found, missing } = await readCachedTranslations(
      ["海鮮燉飯", "四神湯"],
      "zh-TW",
      "en",
    );

    expect([...found.keys()]).toEqual(["海鮮燉飯"]);
    expect(missing).toEqual(["四神湯"]);
    expect(model.calls).toBe(0);
  });

  it("asks for nothing when the two languages are the same", async () => {
    const { found, missing } = await readCachedTranslations(
      ["risotto"],
      "en",
      "en",
    );

    expect(found.size).toBe(0);
    expect(missing).toEqual([]);
  });

  it("trims and deduplicates before deciding what is missing", async () => {
    const { missing } = await readCachedTranslations(
      ["四神湯", " 四神湯 ", "", "   "],
      "zh-TW",
      "en",
    );

    expect(missing).toEqual(["四神湯"]);
  });
});

/*
 * Chi, 2026-10-01: "聊天字卡翻譯先用字典". An everyday word on a card in a
 * conversation is answered by the built-in dictionaries, so it is free and
 * immediate, and only what they do not know is left for the model.
 */
describe("readCachedTranslations, with the built-in dictionaries", () => {
  it("answers an everyday word the cache has not seen", async () => {
    const { found, missing } = await readCachedTranslations(
      ["謝謝", "四神湯"],
      "zh-TW",
      "fr",
    );

    expect(found.get("謝謝")).toBe("merci");
    expect(missing).toEqual(["四神湯"]);
    expect(model.calls).toBe(0);
  });

  it("knows the camera's object words too", async () => {
    const { found } = await readCachedTranslations(["parapluie"], "fr", "it");

    expect(found.get("parapluie")).toBe("ombrello");
  });

  it("leaves the cached answer the card has been showing", async () => {
    cache.rows = [{ source_text: "謝謝", text: "merci beaucoup" }];

    const { found } = await readCachedTranslations(["謝謝"], "zh-TW", "fr");

    expect(found.get("謝謝")).toBe("merci beaucoup");
  });

  it("does not guess a plural's translation from the singular", async () => {
    const { missing } = await readCachedTranslations(["chats"], "fr", "es");

    expect(missing).toEqual(["chats"]);
  });
});

describe("translateMissing", () => {
  it("does not reach the model when there is nothing to ask", async () => {
    const fresh = await translateMissing([], "zh-TW", "en");

    expect(fresh.size).toBe(0);
    expect(model.calls).toBe(0);
  });

  it("asks once for what is left, and caches the answer", async () => {
    const fresh = await translateMissing(["海鮮燉飯"], "zh-TW", "en");

    expect(model.calls).toBe(1);
    expect(fresh.get("海鮮燉飯")).toBe("seafood risotto");
    expect(cache.written).toHaveLength(1);
  });

  it("leaves out a phrase the model did not answer", async () => {
    /*
     * Absent, not blank. "We could not ask" and "there is no translation" are
     * different answers, and the caller charges — and refunds — on that
     * difference.
     */
    const fresh = await translateMissing(["海鮮燉飯", "四神湯"], "zh-TW", "en");

    expect(fresh.has("海鮮燉飯")).toBe(true);
    expect(fresh.has("四神湯")).toBe(false);
  });
});
