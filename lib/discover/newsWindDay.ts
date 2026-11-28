/* =========================================================
   Whether the news page arrives on its full wind today (Chi, 2026-11-28:
   每天首次完整版). Read by DailyNews before its first paint, so the page's
   content is hidden before it could be seen; the wind itself
   (components/discover/NewsWind.tsx) loads after and takes over.
   ========================================================= */

const DAY_KEY = "news-wind-day-v1";

function today(now: Date) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/* React's development double mount asks twice in a moment: one answer. */
let lastTake: { at: number; full: boolean } | null = null;

/** Whether today's full arrival is still to play; marks it played. */
export function takeFullArrival(now = new Date()): boolean {
  const at = now.getTime();
  if (lastTake && at - lastTake.at < 1_500) return lastTake.full;
  let full = false;
  try {
    full = window.localStorage.getItem(DAY_KEY) !== today(now);
    if (full) window.localStorage.setItem(DAY_KEY, today(now));
  } catch {
    full = false;
  }
  lastTake = { at, full };
  return full;
}

export function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Hide the page under the coming wind; nothing under reduced motion. */
export function prepareNewsWind(stage: HTMLElement) {
  if (reducedMotion()) return;
  stage.setAttribute("data-news-wind", "gust");
  if (takeFullArrival()) stage.setAttribute("data-news-wind-logo", "waiting");
}
