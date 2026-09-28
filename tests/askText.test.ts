import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Message reading, reply suggestions and the daily news asked
 * gemini-3.6-flash alone, and lost whole days to it (23–27 September).
 * askText gives them the word lookup's policy: the lite alias first, a model
 * another instance put away is skipped, and a slow first answer is hedged.
 */

const generateJson = vi.fn();
const healthyModels = vi.fn();
const dailyQuotaResetAt = vi.fn();

vi.mock("@/lib/ai/modelRequest", () => ({
  generateJson: (...args: unknown[]) => generateJson(...args),
  TEXT_REQUEST_TIMEOUT_MS: 15_000,
}));

vi.mock("@/lib/ai/modelHealth", () => ({
  healthyModels: (...args: unknown[]) => healthyModels(...args),
  dailyQuotaResetAt: (...args: unknown[]) => dailyQuotaResetAt(...args),
}));

import { askText } from "@/lib/ai/askText";
import {
  DEFAULT_ALIAS_LITE_MODEL,
  DEFAULT_STRONG_MODEL,
} from "@/lib/ai/modelConfig";

const client = {} as never;

beforeEach(() => {
  generateJson.mockReset();
  healthyModels.mockReset();
  dailyQuotaResetAt.mockReset();
  healthyModels.mockImplementation(async (models: string[]) => [...models]);
  dailyQuotaResetAt.mockResolvedValue(null);
  delete process.env.GEMINI_TEXT_MODEL;
  delete process.env.GEMINI_MODEL;
});

describe("askText", () => {
  it("asks the lite alias first and returns its answer", async () => {
    generateJson.mockResolvedValue('{"ok":true}');

    const result = await askText(client, {
      purpose: "message-analyze",
      input: "hi",
      budgetMs: 10_000,
    });

    expect(result).toEqual({ text: '{"ok":true}', model: DEFAULT_ALIAS_LITE_MODEL });
    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(generateJson.mock.calls[0][1]).toMatchObject({
      model: DEFAULT_ALIAS_LITE_MODEL,
      purpose: "message-analyze",
    });
  });

  it("falls back to the next model when the first refuses", async () => {
    generateJson.mockImplementation(async (_client, { model }) => {
      if (model === DEFAULT_ALIAS_LITE_MODEL) throw Object.assign(new Error("busy"), { status: 503 });
      return "answer";
    });

    const result = await askText(client, { purpose: "reply-coach", input: "hi", budgetMs: 10_000 });

    expect(result).toEqual({ text: "answer", model: DEFAULT_STRONG_MODEL });
  });

  it("skips a model another instance has put away", async () => {
    healthyModels.mockResolvedValue([DEFAULT_STRONG_MODEL]);
    generateJson.mockResolvedValue("answer");

    await askText(client, { purpose: "daily-news", input: "hi", budgetMs: 10_000 });

    expect(generateJson.mock.calls[0][1].model).toBe(DEFAULT_STRONG_MODEL);
  });

  it("says when the quota comes back if nothing answered", async () => {
    generateJson.mockRejectedValue(Object.assign(new Error("quota"), { status: 429 }));
    dailyQuotaResetAt.mockResolvedValue(1_790_600_000_000);

    const result = await askText(client, { purpose: "message-analyze", input: "hi", budgetMs: 10_000 });

    expect(result).toEqual({ text: null, quotaResetsAt: 1_790_600_000_000 });
  });
});
