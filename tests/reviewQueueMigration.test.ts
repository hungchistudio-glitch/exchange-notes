import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("review queue migration", () => {
  it("closes the NULL insertion window before enforcing NOT NULL", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260910121000_review_queue_not_null.sql",
      ),
      "utf8",
    ).toLowerCase();

    const setDefault = sql.indexOf("set default now()");
    const backfill = sql.indexOf("where next_review_at is null");
    const setNotNull = sql.indexOf("set not null");

    expect(setDefault).toBeGreaterThan(-1);
    expect(backfill).toBeGreaterThan(setDefault);
    expect(setNotNull).toBeGreaterThan(backfill);
  });
});
