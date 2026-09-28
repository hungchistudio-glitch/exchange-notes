import { beforeEach, describe, expect, it, vi } from "vitest";

const health = vi.hoisted(() => ({
  healthyModels: vi.fn(async (models: readonly string[]) => [...models]),
  backgroundAllowed: vi.fn(async () => true),
}));

vi.mock("@/lib/ai/modelHealth", () => health);

import { CORE_MAX_ATTEMPTS } from "@/lib/ai/hedge";
import { ModelsUnavailableError, tryModels } from "@/lib/ai/tryModels";

const MODELS = ["a", "b", "c", "d", "e", "f"];

beforeEach(() => {
  health.healthyModels.mockReset().mockImplementation(async (models) => [...models]);
  health.backgroundAllowed.mockReset().mockResolvedValue(true);
});

describe("tryModels — the shared policy for callers that do not hedge", () => {
  it("returns the first answer and which model gave it", async () => {
    const attempt = vi.fn(async (model: string) => `from ${model}`);

    await expect(tryModels(MODELS, attempt)).resolves.toEqual({
      value: "from a",
      model: "a",
    });
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("asks only models the shared health table says are up", async () => {
    health.healthyModels.mockResolvedValue(["c", "d"]);
    const asked: string[] = [];

    await tryModels(MODELS, async (model) => {
      asked.push(model);
      if (model === "c") throw new Error("503");
      return model;
    });

    expect(asked).toEqual(["c", "d"]);
  });

  it(`stops after ${CORE_MAX_ATTEMPTS} refusals, however long the list`, async () => {
    const asked: string[] = [];
    const refusal = new Error("503 high demand");

    await expect(
      tryModels(MODELS, async (model) => {
        asked.push(model);
        throw refusal;
      }),
    ).rejects.toBe(refusal);

    expect(asked).toHaveLength(CORE_MAX_ATTEMPTS);
  });

  it("says it did not ask, rather than that a model said no, when none is up", async () => {
    health.healthyModels.mockResolvedValue([]);
    const attempt = vi.fn();

    const failure = await tryModels(MODELS, attempt).catch((error) => error);

    expect(failure).toBeInstanceOf(ModelsUnavailableError);
    expect(failure.reason).toBe("none_healthy");
    expect(attempt).not.toHaveBeenCalled();
  });

  it("never starts an attempt without the time left to finish one", async () => {
    const attempt = vi.fn(async () => "late");

    const failure = await tryModels(MODELS, attempt, {
      deadline: Date.now() + 1_000,
      minAttemptMs: 3_000,
    }).catch((error) => error);

    expect(failure).toBeInstanceOf(ModelsUnavailableError);
    expect(attempt).not.toHaveBeenCalled();
  });

  it("gives an attempt no more than what is left of the deadline", async () => {
    const timeouts: number[] = [];

    await tryModels(
      MODELS,
      async (_model, timeoutMs) => {
        timeouts.push(timeoutMs);
        return "ok";
      },
      { timeoutMs: 15_000, deadline: Date.now() + 8_000 },
    );

    expect(timeouts[0]).toBeLessThanOrEqual(8_000);
    expect(timeouts[0]).toBeGreaterThan(7_000);
  });

  it("asks each model once even when the list names one twice", async () => {
    const asked: string[] = [];

    await tryModels(["a", "a", " b "], async (model) => {
      asked.push(model);
      throw new Error("no");
    }).catch(() => undefined);

    expect(asked).toEqual(["a", "b"]);
  });
});

describe("tryModels — background work (Chi, 2026-09-28: only with quota to spare)", () => {
  it("does not ask at all while the quota is scarce", async () => {
    health.backgroundAllowed.mockResolvedValue(false);
    const attempt = vi.fn();

    const failure = await tryModels(MODELS, attempt, { background: true }).catch(
      (error) => error,
    );

    expect(failure).toBeInstanceOf(ModelsUnavailableError);
    expect(failure.reason).toBe("deferred");
    expect(attempt).not.toHaveBeenCalled();
  });

  it("asks one model once when it may run", async () => {
    const asked: string[] = [];

    await tryModels(
      MODELS,
      async (model) => {
        asked.push(model);
        throw new Error("503");
      },
      { background: true },
    ).catch(() => undefined);

    expect(asked).toEqual(["a"]);
  });
});
