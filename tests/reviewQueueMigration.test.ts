import { describe, expect, it } from "vitest";

import { readMigration } from "./readMigration";

describe("review queue migration", () => {
  it("closes the NULL insertion window before enforcing NOT NULL", () => {
    const sql = readMigration("review_queue_not_null").toLowerCase();

    const setDefault = sql.indexOf("set default now()");
    const backfill = sql.indexOf("where next_review_at is null");
    const setNotNull = sql.indexOf("set not null");

    expect(setDefault).toBeGreaterThan(-1);
    expect(backfill).toBeGreaterThan(setDefault);
    expect(setNotNull).toBeGreaterThan(backfill);
  });
});
