import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The menu scanner says when Google is down (Chi, 2026-09-28)

   Before anything is spent when every menu model is already away, and
   after asking when they all answered "high demand" — with when Google is
   likely back, the way the camera does.
   ========================================================= */

const mocks = vi.hoisted(() => ({
  menuOutage: vi.fn(),
  scanMenu: vi.fn(),
  consumeDailyQuota: vi.fn(async () => true),
  refundDailyQuota: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "reader-1" } } }) },
  }),
}));

vi.mock("@/lib/profile/languagePair", () => ({
  readLearningPair: async () => ["fr", "zh-TW"],
}));

vi.mock("@/lib/ai/dailyQuota", () => ({
  consumeDailyQuota: mocks.consumeDailyQuota,
  refundDailyQuota: mocks.refundDailyQuota,
}));

vi.mock("@/lib/ai/menuScan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/menuScan")>();
  return { ...actual, menuOutage: mocks.menuOutage, scanMenu: mocks.scanMenu };
});

const { POST } = await import("@/app/api/scanner/menu/analyze/route");
const { MenuScanUnavailableError } = await import("@/lib/ai/menuScan");

function request() {
  return {
    json: async () => ({
      image: "data:image/jpeg;base64,cGhvdG8=",
      targetLanguage: "zh-TW",
    }),
  } as Request;
}

beforeEach(() => {
  mocks.menuOutage.mockReset().mockResolvedValue(null);
  mocks.scanMenu.mockReset();
  mocks.consumeDailyQuota.mockClear();
  mocks.refundDailyQuota.mockClear();
});

describe("the menu scanner when Google is down", () => {
  it("says so at once, without spending the reader's allowance", async () => {
    mocks.menuOutage.mockResolvedValue({ until: 1_790_000_000_000, quotaOnly: false });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "google_down",
      retryAt: 1_790_000_000_000,
      quotaOnly: false,
    });
    expect(mocks.consumeDailyQuota).not.toHaveBeenCalled();
    expect(mocks.scanMenu).not.toHaveBeenCalled();
  });

  it("says so after asking, and hands the allowance back", async () => {
    mocks.scanMenu.mockRejectedValue(
      new MenuScanUnavailableError({ until: 42, quotaOnly: false }),
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "google_down",
      retryAt: 42,
    });
    expect(mocks.refundDailyQuota).toHaveBeenCalledTimes(1);
  });
});
