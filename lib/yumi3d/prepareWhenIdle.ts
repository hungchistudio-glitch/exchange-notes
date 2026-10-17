/* =========================================================
   Making a Yumi before anyone scrolls to her

   Building a scene is the heaviest thing the landing page does: a WebGL
   context, three.js's programs, her materials. Done when she came within a
   screen or so of view, it landed in the middle of the reader's scroll and
   froze it (measured 2026-10-16: 70–100ms at full speed on a 2018 Mac, three
   to four times that on a throttled phone profile, at the film and again at
   the showcase).

   So the landing page's Yumis are made in the quiet after the page has
   loaded, while the reader is still on the hero, one at a time: two at once
   would be the same freeze, twice as long. Each task resolves when its scene
   is ready (or has failed), and only then does the next one start. A task
   whose component has gone away before its turn is skipped.

   The loader (YumiLoading) stands in her place until each one is ready, so
   a reader who scrolls faster than this still sees the ring, never a gap.
   ========================================================= */

let queue: Promise<void> = Promise.resolve();
let loaded: Promise<void> | null = null;

function pageLoaded() {
  loaded ??=
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>(resolve =>
          window.addEventListener("load", () => resolve(), { once: true }),
        );
  return loaded;
}

function idle(timeout: number) {
  return new Promise<void>(resolve => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => resolve(), { timeout });
    } else {
      window.setTimeout(resolve, 0);
    }
  });
}

/**
 * Queues `task` to run after the page has loaded and the browser is idle,
 * after every task queued before it has settled. Returns a cancel function;
 * a cancelled task that has not started yet never runs.
 */
export function prepareWhenIdle(task: () => Promise<unknown>): () => void {
  let cancelled = false;
  queue = queue
    .then(pageLoaded)
    .then(() => idle(2000))
    .then(() => (cancelled ? undefined : task()))
    .then(
      () => undefined,
      () => undefined,
    );
  return () => {
    cancelled = true;
  };
}
