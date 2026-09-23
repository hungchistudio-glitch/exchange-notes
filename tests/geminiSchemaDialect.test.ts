import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The schema this app sends, and the schema Gemini accepts

   Every schema in this app is written as ordinary JSON Schema. Gemini's
   responseSchema is the OpenAPI subset, which rejects what it does not
   recognise rather than ignoring it — and on 2026-09-23 that rejection was
   every route in the app at once: gemini-3.6-flash answering 400 in 109
   milliseconds, too fast to have read the prompt.

   Two things did it, and all twelve of the app's schemas have both:
   `additionalProperties`, which does not exist in this dialect, and numeric
   `minLength` / `maxLength`, which this dialect spells as strings.

   These cases are the translation, asserted on the request that actually
   goes out.
   ========================================================= */

const sent: Array<{
  model: string;
  config: { responseSchema?: Record<string, unknown> };
}> = [];

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (params: {
        model: string;
        config: { responseSchema?: Record<string, unknown> };
      }) => {
        sent.push(params);
        return { text: '{"ok":true}' };
      },
    };
  },
}));

const { GoogleGenAI } = await import("@google/genai");
const { generateJson } = await import("@/lib/ai/modelRequest");

function ask(schema: unknown) {
  return generateJson(new GoogleGenAI({ apiKey: "test" }), {
    model: "gemini-3.6-flash",
    input: "anything",
    schema,
  });
}

const schemaOf = () => sent[0].config.responseSchema as Record<string, unknown>;

beforeEach(() => {
  sent.length = 0;
});

describe("the schema on the way out", () => {
  it("drops the keywords this endpoint has no opinion about", async () => {
    await ask({
      type: "object",
      additionalProperties: false,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      properties: { term: { type: "string" } },
      required: ["term"],
    });

    expect(schemaOf()).not.toHaveProperty("additionalProperties");
    expect(schemaOf()).not.toHaveProperty("$schema");
    expect(schemaOf().required).toEqual(["term"]);
  });

  it("spells the length bounds the way this dialect spells them", async () => {
    await ask({
      type: "object",
      properties: {
        term: { type: "string", minLength: 1, maxLength: 240 },
        tags: { type: "array", maxItems: 3, items: { type: "string" } },
      },
    });

    const properties = schemaOf().properties as Record<
      string,
      Record<string, unknown>
    >;

    expect(properties.term.minLength).toBe("1");
    expect(properties.term.maxLength).toBe("240");
    expect(properties.tags.maxItems).toBe("3");
  });

  it("reaches every nested schema, not only the top one", async () => {
    await ask({
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { title: { type: "string", maxLength: 80 } },
          },
        },
        either: {
          anyOf: [
            { type: "string", maxLength: 4 },
            { type: "object", additionalProperties: false },
          ],
        },
      },
    });

    const properties = schemaOf().properties as Record<string, never>;
    const card = (properties.cards as { items: Record<string, unknown> }).items;
    expect(card).not.toHaveProperty("additionalProperties");
    expect(
      (card.properties as Record<string, Record<string, unknown>>).title
        .maxLength,
    ).toBe("80");

    const either = (properties.either as { anyOf: Array<Record<string, unknown>> })
      .anyOf;
    expect(either[0].maxLength).toBe("4");
    expect(either[1]).not.toHaveProperty("additionalProperties");
  });

  it("names the types the way this dialect names them", async () => {
    await ask({ type: "object", properties: { n: { type: "integer" } } });

    expect(schemaOf().type).toBe("OBJECT");
    expect(
      (schemaOf().properties as Record<string, Record<string, unknown>>).n.type,
    ).toBe("INTEGER");
  });

  it("bounds every attempt, whether or not a schema was given", async () => {
    await generateJson(new GoogleGenAI({ apiKey: "test" }), {
      model: "gemini-3.6-flash",
      input: "anything",
      timeoutMs: 12_000,
    });

    const config = sent[0].config as unknown as {
      httpOptions: { timeout: number; retryOptions: { attempts: number } };
      abortSignal: AbortSignal;
      responseSchema?: unknown;
    };

    expect(config.httpOptions.timeout).toBe(12_000);
    expect(config.httpOptions.retryOptions.attempts).toBe(1);
    expect(config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(config.responseSchema).toBeUndefined();
  });
});
