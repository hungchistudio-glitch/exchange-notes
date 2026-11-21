import { describe, expect, it } from "vitest";

import { recapBackHref, recapFromReview, reviewDoor, reviewExitHref } from "@/lib/navigation/cameFrom";

/* =========================================================
   Back to the door a page was opened from (Chi, 2026-11-20: 從哪進來就回哪)

   Settings → this week → back lands on Settings, not the review page;
   Settings → review → this week → back → back lands on Settings too.
   ?from= is matched, never followed: anything else falls back to where
   each page has always gone.
   ========================================================= */

/** What the review page's own ?from= leads to, and where its recap link then says it came from. */
const throughReview = (from: string | null) => {
  const door = reviewDoor(from);
  return { exit: reviewExitHref(door), recapBack: recapBackHref(recapFromReview(door)) };
};

describe("the weekly recap's back key", () => {
  it("goes back to Settings when opened from Settings", () => {
    expect(recapBackHref("settings")).toBe("/profile");
  });

  it("goes back to the review page, opened as it was", () => {
    expect(throughReview(null).recapBack).toBe("/review");
    expect(throughReview("settings").recapBack).toBe("/review?from=settings");
    expect(throughReview("vocabulary").recapBack).toBe("/review?from=vocabulary");
  });

  it("never takes a destination from the query string", () => {
    for (const from of [null, "", "https://evil.example", "//evil.example", "/admin", "review-admin"]) {
      expect(recapBackHref(from)).toBe("/review");
    }
  });
});

describe("leaving the review page", () => {
  it("goes back to the door it was opened from", () => {
    expect(throughReview("settings").exit).toBe("/profile");
    expect(throughReview("vocabulary").exit).toBe("/vocabulary");
    expect(throughReview(null).exit).toBe("/home");
    expect(throughReview("https://evil.example").exit).toBe("/home");
  });

  it("walks Settings → review → recap → back → back home to Settings", () => {
    const recapBack = throughReview("settings").recapBack;
    const backOnReview = new URL(recapBack, "https://app.example").searchParams.get("from");
    expect(throughReview(backOnReview).exit).toBe("/profile");
  });
});
