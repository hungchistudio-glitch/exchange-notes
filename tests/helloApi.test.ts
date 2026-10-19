import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The hello routes' promises

   Making one needs a signed-in reader, takes only the word, the pair and
   the look from the request — never a name or an outfit — charges one
   "hello_sense" against their day (and gives it back when nothing usable
   came of it), and a request key sent twice makes one hello, charged once.

   Filling a missing language is open to anyone looking, which is why it
   takes no text at all, and why the model is not reached until the
   database has granted a claim (a live hello, still missing that
   language, three tries at most, a minute apart).
   ========================================================= */

const state = vi.hoisted(() => ({
  user: { id: "owner-1" } as { id: string } | null,
  existing: null as { id: string } | null,
  quotaOk: true,
  rpc: vi.fn(),
  consume: vi.fn(),
  refund: vi.fn(),
  complete: vi.fn(),
  phonetics: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: state.existing, error: null }),
      };
      return chain;
    },
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ rpc: state.rpc }),
}));

vi.mock("@/lib/ai/dailyQuota", () => ({
  consumeDailyQuota: state.consume,
  refundDailyQuota: state.refund,
}));

vi.mock("@/lib/hello/server", async (original) => ({
  ...(await original<typeof import("@/lib/hello/server")>()),
  completeSense: state.complete,
  withPhonetics: state.phonetics,
}));

const { POST: create } = await import("@/app/api/hello/route");
const { POST: fill } = await import("@/app/api/hello/[id]/fill/route");

const ORIGIN = "https://exchange-notes-app.vercel.app";
const HELLO_ROW = {
  status: "active",
  hello: {
    id: "AbCdEfGhIjKl",
    createdAt: "2026-10-19T09:00:00.000Z",
    sender: { name: "Chi", exchangeId: "chi" },
    yumi: { outfit: {}, mode: "standard", posterPath: null },
    pair: ["en", "zh-TW"],
    source: "en",
    sense: { en: { text: "library" }, "zh-TW": { text: "圖書館" } },
  },
};

const VALID = {
  requestKey: "key-12345678",
  mode: "standard",
  pair: ["en", "zh-TW"],
  known: [{ language: "en", text: "library", partOfSpeech: "noun" }],
};

function post(body: unknown) {
  return create(new Request(`${ORIGIN}/api/hello`, { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  state.user = { id: "owner-1" };
  state.existing = null;
  state.rpc.mockReset();
  state.consume.mockReset();
  state.refund.mockReset();
  state.complete.mockReset();
  state.phonetics.mockReset();

  state.consume.mockImplementation(async () => state.quotaOk);
  state.phonetics.mockImplementation(async (sense: unknown) => sense);
  state.complete.mockImplementation(async () => ({
    sides: { "zh-TW": { text: "圖書館" }, es: { text: "biblioteca" }, fr: { text: "bibliothèque" }, it: { text: "biblioteca" } },
    modelFailed: false,
  }));
  state.rpc.mockImplementation(async (name: string) => {
    if (name === "create_yumi_hello") return { data: { id: "AbCdEfGhIjKl" }, error: null };
    if (name === "get_yumi_hello") return { data: HELLO_ROW, error: null };
    return { data: null, error: null };
  });
  state.quotaOk = true;
});

describe("making a hello", () => {
  it("needs a signed-in reader, and reaches nothing without one", async () => {
    state.user = null;
    const response = await post(VALID);
    expect(response.status).toBe(401);
    expect(state.consume).not.toHaveBeenCalled();
    expect(state.complete).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("refuses a pair of one language, a word with a link in it, or no key", async () => {
    for (const body of [
      { ...VALID, pair: ["en", "en"] },
      { ...VALID, known: [{ language: "en", text: "visit https://example.com" }] },
      { ...VALID, known: [] },
      { ...VALID, requestKey: "x" },
      { ...VALID, mode: "neon" },
    ]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(state.consume).not.toHaveBeenCalled();
    expect(state.complete).not.toHaveBeenCalled();
  });

  it("charges once, and takes the sender and outfit from the database, never the request", async () => {
    const response = await post({ ...VALID, sender: { name: "Someone Else" }, outfit: { head: "crown" }, owner: "x" });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { url: string; test: boolean; hello: { id: string } };
    expect(body).toMatchObject({ url: `${ORIGIN}/hello/AbCdEfGhIjKl`, test: false, hello: { id: "AbCdEfGhIjKl" } });

    expect(state.consume).toHaveBeenCalledWith("owner-1", "hello_sense", expect.any(Number));
    expect(state.consume.mock.calls.filter(([, operation]) => operation === "hello_sense")).toHaveLength(1);

    const [, args] = state.rpc.mock.calls.find(([name]) => name === "create_yumi_hello")!;
    expect(Object.keys(args).sort()).toEqual(
      ["p_id", "p_mode", "p_owner", "p_pair", "p_request_key", "p_sense", "p_source"].sort(),
    );
    expect(args.p_owner).toBe("owner-1");
    expect(JSON.stringify(args)).not.toContain("Someone Else");
    expect(JSON.stringify(args)).not.toContain("crown");
  });

  it("returns the same hello for the same key, with no second charge or translation", async () => {
    state.existing = { id: "AbCdEfGhIjKl" };
    const response = await post(VALID);
    expect(response.status).toBe(200);
    expect(((await response.json()) as { hello: { id: string } }).hello.id).toBe("AbCdEfGhIjKl");
    expect(state.consume).not.toHaveBeenCalled();
    expect(state.complete).not.toHaveBeenCalled();
    expect(state.rpc.mock.calls.map(([name]) => name)).toEqual(["get_yumi_hello"]);
  });

  it("stops at the day's limit before reaching the model", async () => {
    state.quotaOk = false;
    const response = await post(VALID);
    expect(response.status).toBe(429);
    expect(state.complete).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("gives the charge back when the pair could not be made", async () => {
    state.complete.mockImplementation(async () => ({ sides: {}, modelFailed: true }));
    const response = await post(VALID);
    expect(response.status).toBe(503);
    expect(state.refund).toHaveBeenCalledWith("owner-1", "hello_sense");
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("says when the reader has made too many today", async () => {
    state.rpc.mockImplementation(async (name: string) =>
      name === "create_yumi_hello" ? { data: null, error: { code: "53400" } } : { data: HELLO_ROW, error: null },
    );
    expect((await post(VALID)).status).toBe(429);
  });
});

describe("filling a missing language", () => {
  function ask(id: string, body: unknown) {
    return fill(new Request(`${ORIGIN}/api/hello/${id}/fill`, { method: "POST", body: JSON.stringify(body) }), {
      params: Promise.resolve({ id }),
    });
  }

  it("never reaches the model without the database's claim", async () => {
    state.rpc.mockResolvedValue({ data: null, error: null });
    const response = await ask("AbCdEfGhIjKl", { language: "it" });
    expect(response.status).toBe(429);
    expect(state.complete).not.toHaveBeenCalled();
  });

  it("takes no text: the hello's own sides are the source", async () => {
    state.rpc.mockImplementation(async (name: string) =>
      name === "claim_yumi_hello_fill"
        ? { data: { sense: { en: { text: "library" }, "zh-TW": { text: "圖書館" } } }, error: null }
        : { data: true, error: null },
    );
    state.complete.mockResolvedValue({ sides: { it: { text: "biblioteca" } }, modelFailed: false });

    const response = await ask("AbCdEfGhIjKl", { language: "it", text: "translate this for me instead" });
    expect(response.status).toBe(200);
    const [known, targets] = state.complete.mock.calls[0];
    expect(targets).toEqual(["it"]);
    expect(JSON.stringify(known)).not.toContain("translate this");
    expect(known.map((side: { text: string }) => side.text).sort()).toEqual(["library", "圖書館"].sort());
    expect(state.rpc).toHaveBeenCalledWith("fill_yumi_hello_language", {
      p_id: "AbCdEfGhIjKl",
      p_language: "it",
      p_side: { text: "biblioteca" },
    });
  });

  it("refuses an id or a language of the wrong shape", async () => {
    expect((await ask("nope", { language: "it" })).status).toBe(400);
    expect((await ask("AbCdEfGhIjKl", { language: "de" })).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
