import { describe, expect, it } from "vitest";

import { shouldTouchOpened, TOUCH_OPENED_EVERY_MS } from "@/lib/pet/repository";
import type { PetState } from "@/lib/pet/types";

/* Arriving at Home or Vocabulary used to read Yumi's row and then write
   "opened" to it every time, before she could be shown. The stamp is only
   read at a day's resolution, so it is written when it has gone stale. */

function state(lastOpenedAt: string | null): PetState {
  return {
    user_id: "u1",
    fed_word_ids: [],
    total_cookies_fed: 0,
    last_fed_at: null,
    last_opened_at: lastOpenedAt,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };
}

describe("shouldTouchOpened", () => {
  const now = Date.parse("2026-09-27T12:00:00.000Z");

  it("stamps a row that has never been opened", () => {
    expect(shouldTouchOpened(state(null), now)).toBe(true);
  });

  it("leaves a stamp from a minute ago alone", () => {
    expect(shouldTouchOpened(state(new Date(now - 60_000).toISOString()), now)).toBe(false);
  });

  it("stamps again once the old one has gone stale", () => {
    expect(
      shouldTouchOpened(state(new Date(now - TOUCH_OPENED_EVERY_MS).toISOString()), now),
    ).toBe(true);
  });

  it("stamps a row whose date cannot be read", () => {
    expect(shouldTouchOpened(state("not a date"), now)).toBe(true);
  });
});
