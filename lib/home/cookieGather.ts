"use client";

/* =========================================================
   The star, and the cookies it gathers

   The star used to live inside the floating field, and so it only existed
   when the field did: not until Yumi's scene was live and the field's chunk
   had loaded, not for a reader with no cookies, and not while a search was
   showing. It came and went with state the reader cannot see (Chi,
   2026-10-09: "星星icon按鈕應該一直都存在，只有cosmic模式下不存在").

   So the star is now part of the Standard home itself, drawn from the first
   frame, and asks the field to gather rather than reaching into it — the
   same one-way request shape lib/home/homeMoments.ts uses for the tour.
   ========================================================= */

const listeners = new Set<() => void>();

/** The field listens while it is mounted. */
export function onCookieGatherRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The star asks. With no field on screen there is nothing to gather. */
export function requestCookieGather(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      /* A gather is never worth an error on the reader's screen. */
    }
  }
}
