import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  consumeDailyQuota,
  refundDailyQuota,
  resetDailyQuotaStateForTests,
} from "@/lib/ai/dailyQuota";

/* =========================================================
   The daily allowance, and giving one back

   Two behaviours are worth pinning here, and both were wrong in production.

   The first is the refund. The unit is spent before the model runs, which is
   the only ordering safe against two shutter presses racing — but it means a
   model that times out is charged exactly like one that answered. With a
   fifteen-a-day allowance and a route whose own arithmetic guaranteed
   timeouts, that is most of the difference between the number on paper and
   the number a reader actually got.

   The second is what happens when the counter itself is unreachable. Four of
   the six routes used to answer `true` there — no limit at all, at the one
   moment nothing else is enforcing one. This module falls back to counting in
   memory instead, and these cases say so.
   ========================================================= */

/** A Supabase double that records rpc calls and replies from a script. */
function supabaseWith(
  replies: Record<string, { data?: unknown; error: { code: string } | null }>,
) {
  const calls: Array<{ fn: string; args: unknown }> = [];

  const client = {
    rpc: vi.fn(async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return replies[fn] ?? { data: null, error: null };
    }),
  };

  return { client: client as never, calls };
}

const allowed = { data: [{ allowed: true, used: 1, limit_count: 60 }], error: null };
const refused = { data: [{ allowed: false, used: 60, limit_count: 60 }], error: null };
const broken = { data: null, error: { code: "42883" } };

beforeEach(() => {
  resetDailyQuotaStateForTests();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("spending a request", () => {
  it("asks the database, naming the operation and the limit", async () => {
    const { client, calls } = supabaseWith({ consume_ai_daily_quota: allowed });

    await expect(
      consumeDailyQuota(client, "user-1", "vision_identification", 60),
    ).resolves.toBe(true);

    expect(calls).toEqual([
      {
        fn: "consume_ai_daily_quota",
        args: { p_operation: "vision_identification", p_limit: 60 },
      },
    ]);
  });

  it("refuses once the allowance is gone", async () => {
    const { client } = supabaseWith({ consume_ai_daily_quota: refused });

    await expect(
      consumeDailyQuota(client, "user-1", "vision_identification", 60),
    ).resolves.toBe(false);
  });
});

describe("handing a request back", () => {
  it("calls the refund function for that operation", async () => {
    const { client, calls } = supabaseWith({});

    await refundDailyQuota(client, "user-1", "menu_scan");

    expect(calls).toEqual([
      { fn: "refund_ai_daily_quota", args: { p_operation: "menu_scan" } },
    ]);
  });

  it("stays quiet when the refund itself fails", async () => {
    /*
     * A refund runs on a path that is already returning an error. Turning a
     * failed courtesy into a second failure would replace "that photo did not
     * work" with a five hundred.
     */
    const { client } = supabaseWith({ refund_ai_daily_quota: broken });

    await expect(
      refundDailyQuota(client, "user-1", "menu_scan"),
    ).resolves.toBeUndefined();
  });

  it("survives an rpc that throws rather than returning an error", async () => {
    const client = {
      rpc: vi.fn(async () => {
        throw new Error("socket hang up");
      }),
    } as never;

    await expect(
      refundDailyQuota(client, "user-1", "menu_scan"),
    ).resolves.toBeUndefined();
  });
});

describe("when the counter cannot be reached", () => {
  it("still enforces a limit rather than waving everything through", async () => {
    // The case four routes used to answer `true` to.
    const { client } = supabaseWith({ consume_ai_daily_quota: broken });

    const outcomes: boolean[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      outcomes.push(
        await consumeDailyQuota(client, "user-1", "vision_identification", 3),
      );
    }

    expect(outcomes).toEqual([true, true, true, false]);
  });

  it("stops calling a function it has found to be missing", async () => {
    const { client, calls } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota(client, "user-1", "vision_identification", 3);
    await consumeDailyQuota(client, "user-1", "vision_identification", 3);

    expect(calls).toHaveLength(1);
  });

  it("counts each operation separately", async () => {
    // One user's menu scans must not eat their object lookups.
    const { client } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota(client, "user-1", "vision_identification", 1);

    await expect(
      consumeDailyQuota(client, "user-1", "vision_identification", 1),
    ).resolves.toBe(false);
    await expect(
      consumeDailyQuota(client, "user-1", "menu_scan", 1),
    ).resolves.toBe(true);
  });

  it("counts each reader separately", async () => {
    const { client } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota(client, "user-1", "vision_identification", 1);

    await expect(
      consumeDailyQuota(client, "user-2", "vision_identification", 1),
    ).resolves.toBe(true);
  });

  it("refunds in memory too, so a failure is not charged there either", async () => {
    const { client } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota(client, "user-1", "vision_identification", 1);
    await refundDailyQuota(client, "user-1", "vision_identification");

    // The one allowance is available again, exactly as it would be in the
    // database after a refunded timeout.
    await expect(
      consumeDailyQuota(client, "user-1", "vision_identification", 1),
    ).resolves.toBe(true);
  });

  it("never lets a refund push the count below nothing", async () => {
    /*
     * A refund with no matching charge — which the database also treats as a
     * no-op — must not hand out a free request on top of the allowance.
     */
    const { client } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota(client, "user-1", "vision_identification", 1);
    await refundDailyQuota(client, "user-1", "vision_identification");
    await refundDailyQuota(client, "user-1", "vision_identification");
    await refundDailyQuota(client, "user-1", "vision_identification");

    expect(
      await consumeDailyQuota(client, "user-1", "vision_identification", 1),
    ).toBe(true);
    expect(
      await consumeDailyQuota(client, "user-1", "vision_identification", 1),
    ).toBe(false);
  });
});
