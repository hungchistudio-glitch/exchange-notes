import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The one route that can see what Gemini actually says

   Four model names were tried in five days and every one behaved the same,
   because the name was never the variable. The fallback this app ships
   with, gemini-3.5-flash-lite, has answered 504 DEADLINE_EXCEEDED on every
   day but one since 18 September — so the second entry in a two-model
   candidate list is decorative, and picking a replacement by reading a
   changelog would be the fifth guess.

   These cases cover the two things that make it a measurement instead:
   asking Google to name the models this key can reach, and probing exactly
   the ones named in the request.
   ========================================================= */

const mocks = vi.hoisted(() => ({
  signedIn: true,
  list: vi.fn(),
  generateContent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: mocks.signedIn ? { id: "reader-1" } : null },
      }),
    },
  }),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      list: mocks.list,
      generateContent: mocks.generateContent,
    };
  },
}));

const { GET } = await import("@/app/api/diagnostics/gemini/route");

function request(query = "") {
  return new Request(`https://exchange-notes-app.vercel.app/api/diagnostics/gemini${query}`);
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key-that-is-long-enough";
  mocks.signedIn = true;
  mocks.list.mockReset();
  mocks.generateContent.mockReset().mockResolvedValue({ text: '{"ok":true}' });
});

describe("the model catalogue", () => {
  beforeEach(() => {
    mocks.list.mockResolvedValue({
      page: [
        {
          name: "models/gemini-3.6-flash",
          displayName: "Gemini 3.6 Flash",
          supportedActions: ["generateContent", "countTokens"],
          inputTokenLimit: 1_048_576,
        },
        {
          name: "models/embedding-001",
          displayName: "Embedding 001",
          supportedActions: ["embedContent"],
        },
      ],
    });
  });

  it("asks Google rather than probing, and spends no tokens doing it", async () => {
    const response = await GET(request("?catalogue"));
    const body = await response.json();

    expect(mocks.list).toHaveBeenCalledWith({ config: { queryBase: true } });
    expect(mocks.generateContent).not.toHaveBeenCalled();
    expect(body.models).toHaveLength(2);
  });

  /*
   * "models/gemini-3.6-flash" is how the API names them and
   * "gemini-3.6-flash" is how this app does. A catalogue that has to be
   * hand-edited before a name can be pasted into ?models= is a catalogue
   * nobody uses.
   */
  it("names models the way the app names them", async () => {
    const body = await (await GET(request("?catalogue"))).json();

    expect(body.models.map((model: { name: string }) => model.name)).toEqual([
      "embedding-001",
      "gemini-3.6-flash",
    ]);
    expect(body.models[1].actions).toContain("generateContent");
  });

  it("reports a listing that fails rather than pretending there are none", async () => {
    mocks.list.mockRejectedValue(
      Object.assign(new Error("API key not valid."), { status: 400 }),
    );

    const response = await GET(request("?catalogue"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.status).toBe(400);
    expect(body.detail).toContain("API key not valid");
  });
});

describe("probing named models", () => {
  it("probes exactly the models the request names", async () => {
    const body = await (await GET(request("?models=alpha,beta"))).json();

    expect(mocks.generateContent.mock.calls.map(([call]) => call.model)).toEqual([
      "alpha",
      "beta",
    ]);
    expect(body.attempts.map((attempt: { model: string }) => attempt.model)).toEqual([
      "alpha",
      "beta",
    ]);
  });

  /*
   * A dead model costs its whole twelve-second ceiling, so an unbounded
   * list would make this route the thing that times out rather than the
   * thing that reports a timeout.
   */
  it("never probes more than three, however many are named", async () => {
    await GET(request("?models=a,b,c,d,e"));

    expect(mocks.generateContent).toHaveBeenCalledTimes(3);
  });

  it("ignores blanks and duplicates in the list", async () => {
    await GET(request("?models=a,,a, b ,"));

    expect(mocks.generateContent.mock.calls.map(([call]) => call.model)).toEqual([
      "a",
      "b",
    ]);
  });

  /*
   * The probe carries a responseSchema because every real call in this app
   * does. A model that takes a bare prompt and rejects the OpenAPI dialect
   * would otherwise pass here and fail everywhere else — which is the
   * failure that cost two days.
   */
  it("sends a schema, the way the routes it stands in for do", async () => {
    await GET(request("?models=alpha"));

    const [call] = mocks.generateContent.mock.calls[0];
    expect(call.config.responseSchema).toMatchObject({ type: "OBJECT" });
  });

  it("falls back to the configured candidates when none are named", async () => {
    const { getTextModelCandidates } = await import("@/lib/ai/modelConfig");
    const body = await (await GET(request())).json();

    expect(body.models[0]).toBe(getTextModelCandidates()[0]);
    expect(body.attempts.length).toBeGreaterThan(0);
  });

  it("records what a refusal said, not only that there was one", async () => {
    mocks.generateContent.mockRejectedValue(
      Object.assign(
        new Error('{"error":{"code":504,"message":"Deadline expired"}}'),
        { status: 504 },
      ),
    );

    const body = await (await GET(request("?models=alpha"))).json();

    expect(body.attempts[0]).toMatchObject({ ok: false, status: 504 });
    expect(body.attempts[0].detail).toContain("Deadline expired");
    expect(body.verdict).toMatch(/refused|timed out/i);
  });
});

describe("what it will not do", () => {
  it("refuses anyone who is not signed in", async () => {
    mocks.signedIn = false;

    const response = await GET(request("?catalogue"));

    expect(response.status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("reports the shape of the key and never the key", async () => {
    const body = await (await GET(request("?models=alpha"))).json();
    const serialised = JSON.stringify(body);

    expect(body.key).toEqual({ present: true, length: 28 });
    expect(serialised).not.toContain("test-key-that-is-long-enough");
  });
});
