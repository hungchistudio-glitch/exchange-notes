import { describe, expect, it, vi } from "vitest";

/*
 * 2026-09-28 16:04 UTC, with every Gemini lite model answering 503: the
 * Gemma models answered 400 in 150ms — "Thinking level is not supported" —
 * refusing only the one option this app sends every model. They are asked
 * the way they can be answered now.
 */

vi.mock("@/lib/ai/callLog", () => ({ recordAiFailure: () => {} }));
vi.mock("@/lib/ai/modelHealth", () => ({
  awayFor: () => null,
  markModelAway: () => {},
}));

import { extractJsonObject, generateJson, isGemmaModel } from "@/lib/ai/modelRequest";

type Sent = { model: string; contents: Array<{ parts: Array<{ text?: string }> }>; config: Record<string, unknown> };

function clientReplying(text: string, sent: Sent[]) {
  return {
    models: {
      generateContent: async (params: Sent) => {
        sent.push(params);
        return { text };
      },
    },
  } as never;
}

describe("asking Gemma", () => {
  it("recognises the family", () => {
    expect(isGemmaModel("gemma-4-31b-it")).toBe(true);
    expect(isGemmaModel("gemini-3.8-flash")).toBe(false);
  });

  it("sends no thinking level and no JSON mode, and asks for JSON in words", async () => {
    const sent: Sent[] = [];
    const schema = { type: "object", properties: { term: { type: "string" } } };

    await generateJson(clientReplying('{"term":"chaise"}', sent), {
      model: "gemma-4-26b-a4b-it",
      input: "Translate chair.",
      schema,
    });

    const { config, contents } = sent[0];
    expect(config.thinkingConfig).toBeUndefined();
    expect(config.responseMimeType).toBeUndefined();
    expect(config.responseSchema).toBeUndefined();
    const instruction = contents[0].parts.at(-1)?.text ?? "";
    expect(instruction).toMatch(/single JSON object/);
    expect(instruction).toContain('"term"');
  });

  it("lifts the object out of a fenced or chatty reply", async () => {
    const sent: Sent[] = [];
    const reply = 'Sure! Here it is:\n```json\n{"term": "chaise", "n": 1}\n```\nHope that helps.';

    await expect(
      generateJson(clientReplying(reply, sent), { model: "gemma-4-31b-it", input: "x" }),
    ).resolves.toBe('{"term": "chaise", "n": 1}');
  });

  it("fails the attempt when there is no JSON to lift", () => {
    expect(() => extractJsonObject("I cannot help with that.")).toThrow();
  });

  it("still sends Gemini its thinking level and JSON mode", async () => {
    const sent: Sent[] = [];

    await generateJson(clientReplying('{"ok":true}', sent), {
      model: "gemini-3.8-flash",
      input: "x",
    });

    expect(sent[0].config.thinkingConfig).toBeDefined();
    expect(sent[0].config.responseMimeType).toBe("application/json");
  });
});
