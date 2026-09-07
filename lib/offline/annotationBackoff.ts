"use client";

/* =========================================================
   Holding a failed lookup back

   Two stores fetch annotations for whatever is on screen — usePhonetics for
   IPA and zhuyin, useTranslatedTexts for a card's other languages — and they
   are built the same way on purpose: a module-level cache, a fifty
   millisecond batching window, and a `notify` at the end of every flush that
   re-renders each subscriber.

   That last part is what made a failure expensive. A failure is deliberately
   not cached — a busy model is not evidence that a word has no IPA, and a
   later render should be free to ask again — but the flush's own `notify` is
   what produces the next render, and a subscriber asks for its words during
   render. So "a later render" was immediately, and nothing sat between a
   failed lookup and the next one.

   Measured on the word-card screen against a route answering 401: 28
   requests a second, indefinitely, for as long as the screen was open. An
   expired session, a 500, a rate-limited upstream, or a dropped connection
   `isOnline` has not noticed yet all reach it identically, and the reader
   sees no error — only a warm phone and a spent data allowance.

   So a failure is remembered here: not as an answer, but as a time. The word
   is still asked for again — a second later, then five, then every thirty.
   A broken minute costs two requests rather than seventeen hundred, and the
   annotation still appears on its own when the network comes back.

   One module rather than a copy in each store, because the two have already
   drifted once and this is exactly the kind of thing that drifts again.
   ========================================================= */

/** A second, then five, then every thirty for as long as it keeps failing. */
const RETRY_DELAYS_MS = [1_000, 5_000, 30_000];

export type AnnotationBackoff = {
  /** True while this key is held back and must not be asked for. */
  held: (id: string) => boolean;
  /** Records that a lookup for this key failed. */
  note: (id: string) => void;
  /** Records that a lookup for this key succeeded. */
  clear: (id: string) => void;
  /**
   * Wakes the store when the soonest held key comes due.
   *
   * Nothing wakes a screen that is simply sitting there. Without this, a word
   * held back waits for whatever incidental re-render happens next — a
   * scroll, a keystroke, a filter — and a reader who put the phone down while
   * the signal was bad comes back to cards that never gained their
   * annotations. Call it at the end of a flush.
   */
  scheduleWake: () => void;
};

export function createAnnotationBackoff(
  notify: () => void,
): AnnotationBackoff {
  const holds = new Map<string, { until: number; attempts: number }>();

  let wake: ReturnType<typeof setTimeout> | null = null;
  let wakeAt = Infinity;

  /*
   * The earliest moment anything still held becomes askable again.
   *
   * Holds already past their time are skipped rather than counted as "now":
   * a word whose hold has expired but which nothing on screen wants any more
   * would otherwise be a permanent zero, and the wake would re-arm itself
   * against it forever.
   */
  function soonestPending(): number {
    const now = Date.now();
    let soonest = Infinity;

    for (const hold of holds.values()) {
      if (hold.until > now) soonest = Math.min(soonest, hold.until);
    }

    return soonest;
  }

  function scheduleWake() {
    const soonest = soonestPending();
    if (!Number.isFinite(soonest)) return;

    /*
     * A pending wake is kept only while it is the earlier of the two. A word
     * held for thirty seconds must not decide when a word held for one gets
     * its turn — which is what a plain "already scheduled, leave it" does as
     * soon as a screen holds more than one failing word.
     */
    if (wake !== null) {
      if (wakeAt <= soonest) return;
      clearTimeout(wake);
    }

    wakeAt = soonest;

    wake = setTimeout(
      () => {
        wake = null;
        wakeAt = Infinity;

        notify();

        /*
         * Re-armed here, not only at the end of a flush. The render this
         * notify causes may ask for nothing — every word it wanted could
         * still be held — and then no flush runs, so nothing else would ever
         * schedule the next wake and the remaining words would wait for an
         * incidental re-render that may never come.
         */
        scheduleWake();
      },
      Math.max(0, soonest - Date.now()),
    );
  }

  return {
    held(id) {
      const hold = holds.get(id);
      return hold !== undefined && hold.until > Date.now();
    },

    note(id) {
      const attempts = (holds.get(id)?.attempts ?? 0) + 1;

      const delay =
        RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length) - 1];

      holds.set(id, { until: Date.now() + delay, attempts });
    },

    clear(id) {
      holds.delete(id);
    },

    scheduleWake,
  };
}
