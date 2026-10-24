import { describe, expect, it } from "vitest";

import { nextQuotaDayStart } from "@/lib/ai/dailyQuota";

/* =========================================================
   When a reader's AI allowance comes back

   The allowance rolls over at the reader's midnight (ai_quota_local_day),
   so a pause has to end then: the message-analysis route used UTC's,
   eight hours late in Taipei and four hours early in New York.
   ========================================================= */

const at = (iso: string) => new Date(iso).getTime();

describe("the next start of a reader's quota day", () => {
  it("is the reader's own next midnight", () => {
    // 15:00 in Taipei (07:00 UTC): back at Taipei midnight, 16:00 UTC.
    expect(nextQuotaDayStart("Asia/Taipei", at("2026-10-24T07:00:00Z"))).toBe(at("2026-10-24T16:00:00Z"));
    // 20:30 in New York (00:30 UTC the next day): back at 04:00 UTC.
    expect(nextQuotaDayStart("America/New_York", at("2026-10-25T00:30:00Z"))).toBe(at("2026-10-25T04:00:00Z"));
  });

  it("follows a clock change that night", () => {
    // New York leaves daylight saving on 2026-11-01: that midnight is still EDT.
    expect(nextQuotaDayStart("America/New_York", at("2026-10-31T20:00:00Z"))).toBe(at("2026-11-01T04:00:00Z"));
    // The midnight after it is EST, an hour later in UTC.
    expect(nextQuotaDayStart("America/New_York", at("2026-11-01T12:00:00Z"))).toBe(at("2026-11-02T05:00:00Z"));
  });

  it("falls back to UTC with no zone or one nobody knows, as the database does", () => {
    const now = at("2026-10-24T07:00:00Z");
    expect(nextQuotaDayStart(null, now)).toBe(at("2026-10-25T00:00:00Z"));
    expect(nextQuotaDayStart("  ", now)).toBe(at("2026-10-25T00:00:00Z"));
    expect(nextQuotaDayStart("Mars/Olympus_Mons", now)).toBe(at("2026-10-25T00:00:00Z"));
  });

  it("is always later than now and within a day", () => {
    for (const zone of ["Pacific/Kiritimati", "Pacific/Pago_Pago", "Europe/Paris", "Asia/Kolkata"]) {
      for (let hour = 0; hour < 24; hour += 5) {
        const now = at(`2026-10-24T${String(hour).padStart(2, "0")}:17:00Z`);
        const next = nextQuotaDayStart(zone, now);
        expect(next, zone).toBeGreaterThan(now);
        expect(next - now, zone).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
      }
    }
  });
});
