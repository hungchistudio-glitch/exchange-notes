/* =========================================================
   Where a page's back key goes: back to the door it was opened from
   (Chi, 2026-11-20: 從哪進來就回哪)

   A page opened from Settings goes back to Settings, and one opened from
   the review page goes back there, so Settings → review → this week →
   back → back ends where it began. The door travels as ?from=, which is
   matched against the fixed list below and never used as a path: the
   query string is the reader's to edit, and a destination taken from it
   would be an open redirect.
   ========================================================= */

/** The review page's doors. With none, leaving it goes Home, as it always has. */
export type ReviewDoor = "vocabulary" | "settings";

export function reviewDoor(from: string | null): ReviewDoor | null {
  return from === "vocabulary" || from === "settings" ? from : null;
}

export function reviewExitHref(door: ReviewDoor | null): string {
  return door === "vocabulary" ? "/vocabulary" : door === "settings" ? "/profile" : "/home";
}

/** The ?from= a link out of the review page carries: the review page, and how it was reached. */
export function recapFromReview(door: ReviewDoor | null): string {
  return door ? `review-${door}` : "review";
}

/**
 * Where the weekly recap's back key goes. Settings → Settings; the review
 * page → the review page, opened from wherever it was. Anything else (a
 * bookmark, a reload of an old link) goes to the review page, which is
 * where the recap has always gone back to.
 */
export function recapBackHref(from: string | null): string {
  switch (from) {
    case "settings":
      return "/profile";
    case "review-settings":
      return "/review?from=settings";
    case "review-vocabulary":
      return "/review?from=vocabulary";
    default:
      return "/review";
  }
}
