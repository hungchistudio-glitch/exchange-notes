import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  consumeDailyQuota,
  refundDailyQuota,
  resetDailyQuotaStateForTests,
  setDailyQuotaClientForTests,
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

  setDailyQuotaClientForTests(client as never);

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
      consumeDailyQuota("user-1", "vision_identification", 60),
    ).resolves.toBe(true);

    expect(calls).toEqual([
      {
        fn: "consume_ai_daily_quota",
        args: {
          /*
           * The reader is named in the argument now, not read from
           * auth.uid() inside the function. That is what let the function
           * be locked to service_role — and it is the whole point of this
           * assertion: a call that stops carrying p_user_id is a call the
           * database will refuse.
           */
          p_user_id: "user-1",
          p_operation: "vision_identification",
          p_limit: 60,
        },
      },
    ]);
  });

  it("refuses once the allowance is gone", async () => {
    const { client } = supabaseWith({ consume_ai_daily_quota: refused });

    await expect(
      consumeDailyQuota("user-1", "vision_identification", 60),
    ).resolves.toBe(false);
  });
});

describe("handing a request back", () => {
  it("calls the refund function for that operation", async () => {
    const { client, calls } = supabaseWith({});

    await refundDailyQuota("user-1", "menu_scan");

    expect(calls).toEqual([
      {
        fn: "refund_ai_daily_quota",
        args: { p_user_id: "user-1", p_operation: "menu_scan" },
      },
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
      refundDailyQuota("user-1", "menu_scan"),
    ).resolves.toBeUndefined();
  });

  it("survives an rpc that throws rather than returning an error", async () => {
    const client = {
      rpc: vi.fn(async () => {
        throw new Error("socket hang up");
      }),
    } as never;

    setDailyQuotaClientForTests(client);

    await expect(
      refundDailyQuota("user-1", "menu_scan"),
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
        await consumeDailyQuota("user-1", "vision_identification", 3),
      );
    }

    expect(outcomes).toEqual([true, true, true, false]);
  });

  it("stops calling a function it has just found to be missing", async () => {
    const { client, calls } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota("user-1", "vision_identification", 3);
    await consumeDailyQuota("user-1", "vision_identification", 3);

    expect(calls).toHaveLength(1);
  });

  it("counts each operation separately", async () => {
    // One user's menu scans must not eat their object lookups.
    const { client } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota("user-1", "vision_identification", 1);

    await expect(
      consumeDailyQuota("user-1", "vision_identification", 1),
    ).resolves.toBe(false);
    await expect(
      consumeDailyQuota("user-1", "menu_scan", 1),
    ).resolves.toBe(true);
  });

  it("counts each reader separately", async () => {
    const { client } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota("user-1", "vision_identification", 1);

    await expect(
      consumeDailyQuota("user-2", "vision_identification", 1),
    ).resolves.toBe(true);
  });

  it("refunds in memory too, so a failure is not charged there either", async () => {
    const { client } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota("user-1", "vision_identification", 1);
    await refundDailyQuota("user-1", "vision_identification");

    // The one allowance is available again, exactly as it would be in the
    // database after a refunded timeout.
    await expect(
      consumeDailyQuota("user-1", "vision_identification", 1),
    ).resolves.toBe(true);
  });

  it("never lets a refund push the count below nothing", async () => {
    /*
     * A refund with no matching charge — which the database also treats as a
     * no-op — must not hand out a free request on top of the allowance.
     */
    const { client } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota("user-1", "vision_identification", 1);
    await refundDailyQuota("user-1", "vision_identification");
    await refundDailyQuota("user-1", "vision_identification");
    await refundDailyQuota("user-1", "vision_identification");

    expect(
      await consumeDailyQuota("user-1", "vision_identification", 1),
    ).toBe(true);
    expect(
      await consumeDailyQuota("user-1", "vision_identification", 1),
    ).toBe(false);
  });
});

/* =========================================================
   Falling back is temporary

   It used to be permanent. One rpc error — a cold-start timeout, a dropped
   connection, a moment of database pressure — moved an operation onto the
   in-memory counter for the entire life of the serverless instance, and
   nothing ever tried the database again.

   That is not a slightly wrong number. The fallback is per-instance, so the
   real ceiling becomes the limit times however many instances are warm, and
   it is forgotten on every cold start: a reader who has spent their fifteen
   lookups gets fifteen more by being routed to a fresh one. The database
   counter exists because neither of those is acceptable, and a blip must not
   be what retires it.
   ========================================================= */
describe("recovering from a counter that was unreachable", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tries the database again once the hold has passed", async () => {
    const { client, calls } = supabaseWith({ consume_ai_daily_quota: broken });

    await consumeDailyQuota("user-1", "vision_identification", 3);
    await consumeDailyQuota("user-1", "vision_identification", 3);
    expect(calls).toHaveLength(1);

    vi.advanceTimersByTime(61_000);

    await consumeDailyQuota("user-1", "vision_identification", 3);
    expect(calls).toHaveLength(2);
  });

  it("goes back to the database for good once it answers", async () => {
    const replies: Record<string, { data?: unknown; error: { code: string } | null }> =
      { consume_ai_daily_quota: broken };

    const calls: Array<{ fn: string; args: unknown }> = [];

    const client = {
      rpc: vi.fn(async (fn: string, args: unknown) => {
        calls.push({ fn, args });
        return replies[fn];
      }),
    } as never;

    setDailyQuotaClientForTests(client);

    await consumeDailyQuota("user-1", "menu_scan", 3);
    expect(calls).toHaveLength(1);

    replies.consume_ai_daily_quota = allowed;
    vi.advanceTimersByTime(61_000);

    // The retry answers, so every request after it goes to the database
    // rather than waiting out another minute.
    await consumeDailyQuota("user-1", "menu_scan", 3);
    await consumeDailyQuota("user-1", "menu_scan", 3);

    expect(calls).toHaveLength(3);
  });

  it("keeps a refund on the counter that took the charge", async () => {
    /*
     * Charged in memory because the database was unreachable, refunded a
     * moment later while it still is. The refund must not be sent to the
     * database and lost — the charge is not there.
     */
    const { client, calls } = supabaseWith({ consume_ai_daily_quota: broken });

    expect(await consumeDailyQuota("user-2", "reply_coach", 1)).toBe(true);
    await refundDailyQuota("user-2", "reply_coach");

    expect(calls.some((call) => call.fn === "refund_ai_daily_quota")).toBe(false);

    // The refund landed where the charge did, so the one allowance is free.
    expect(await consumeDailyQuota("user-2", "reply_coach", 1)).toBe(true);
  });
});

describe("the counter is unreachable from a browser", () => {
  /*
   * The database half of this lives in
   * supabase/migrations/20260910192557_ai_quota_server_only.sql, which
   * grants EXECUTE on both functions to service_role alone. This is the
   * application half, and it is asserted from source because the failure
   * it guards against is invisible at runtime: handing these RPCs a
   * user-scoped client worked perfectly well, and that is exactly how a
   * reader came to be able to refund their own allowance in a loop.
   */
  const source = readFileSync(
    join(import.meta.dirname, "..", "lib", "ai", "dailyQuota.ts"),
    "utf8",
  );

  it("builds its own privileged client instead of taking one", () => {
    expect(source).toContain('from "@/lib/supabase/service"');

    /* The request-scoped client is built from the publishable key and
       therefore runs as `authenticated` — the same role a browser has. */
    expect(source).not.toContain('from "@/lib/supabase/server"');
  });

  it("names the reader in the call rather than relying on auth.uid()", () => {
    /* service_role has no auth.uid(); a call without p_user_id raises. */
    expect(source).toContain("p_user_id");
  });
});
