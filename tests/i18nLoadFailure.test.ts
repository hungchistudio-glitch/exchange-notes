import { afterEach, describe, expect, it, vi } from "vitest";

describe("translation chunk failures", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/i18n/fr");
    vi.resetModules();
  });

  it("keeps the requested language unpublished and retryable", async () => {
    vi.resetModules();
    vi.doMock("@/lib/i18n/fr", () => {
      throw new Error("translation chunk unavailable");
    });

    const [{ default: english }, i18n] = await Promise.all([
      import("@/lib/i18n/en"),
      import("@/lib/i18n/index"),
    ]);

    i18n.primeTranslations("english", english);

    const firstRequest = i18n.loadTranslations("french");
    await expect(firstRequest).rejects.toThrow();

    expect(i18n.getTranslations("english")).toBe(english);
    expect(i18n.getTranslations("french")).toBeUndefined();

    const retry = i18n.loadTranslations("french");
    expect(retry).not.toBe(firstRequest);
    await expect(retry).rejects.toThrow();
  });
});
