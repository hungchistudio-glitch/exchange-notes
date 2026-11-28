"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { createNewsWind, glyphPool, letterTargets, type NewsWind as Wind } from "@/lib/discover/newsWind";
import { reducedMotion } from "@/lib/discover/newsWindDay";

/* =========================================================
   The news page's arrival (Chi, 2026-11-28): a wind of today's letters,
   the page condensing out of it, and the Yumi logo dropped in last like a
   ball that bounces three times.

   The stage (DailyNews's outer element) carries the phase in
   data-news-wind; app/globals.css hides the page's content while the wind
   blows and fades it in as the letters land. Everything here ends in the
   page shown: a finish on every path (done, hidden tab, a stalled frame
   loop, unmount), and a CSS fail-safe for a script that never ran.

   Full once a day (about two seconds); after that, a short gust. A refresh
   from the logo blows a short gust too. Reduced motion: none of it.
   ========================================================= */

type Timing = { minGustMs: number; assembleMs: number; budget: number };

function timingFor(full: boolean): Timing {
  const phone = typeof window !== "undefined" && window.innerWidth < 768;
  const slow = typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;
  const budget = Math.round((full ? (phone ? 420 : 760) : phone ? 150 : 240) * (slow ? 0.7 : 1));
  return full
    ? { minGustMs: 650, assembleMs: 760, budget }
    : { minGustMs: 220, assembleMs: 480, budget };
}

/** Three bounces, each lower and quicker, squashing on the floor. */
function dropKeyframes(height: number): Keyframe[] {
  const fall = "cubic-bezier(0.55, 0, 1, 0.45)";
  const rise = "cubic-bezier(0, 0.55, 0.45, 1)";
  const at = (offset: number, y: number, sx: number, sy: number, easing: string) => ({
    offset,
    transform: `translateY(${y.toFixed(1)}px) scale(${sx}, ${sy})`,
    easing,
  });
  return [
    { ...at(0, -height, 0.9, 1.12, fall), opacity: 1 },
    at(0.4, 0, 1.24, 0.76, rise),
    at(0.44, -6, 0.98, 1.03, rise),
    at(0.6, -54, 0.97, 1.04, fall),
    at(0.75, 0, 1.13, 0.87, rise),
    at(0.78, -3, 1, 1, rise),
    at(0.87, -17, 0.99, 1.01, fall),
    at(0.94, 0, 1.06, 0.94, rise),
    at(1, 0, 1, 1, "linear"),
  ];
}

export default function NewsWind({
  stageRef,
  ready,
  glyphs,
  gustKey,
  cosmic,
}: {
  /** The element whose data-news-wind the page's CSS follows. */
  stageRef: React.RefObject<HTMLElement | null>;
  /** The stories are on the page (not loading, not refreshing). */
  ready: boolean;
  /** Today's headlines and summaries, as one string. */
  glyphs: string;
  /** Goes up when a refresh starts: a short gust over the page. */
  gustKey: number;
  cosmic: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const run = useRef<{
    wind: Wind;
    full: boolean;
    startedAt: number;
    frame: number;
    assembling: boolean;
    finish: () => void;
  } | null>(null);
  const glyphsRef = useRef<string[]>(glyphPool(glyphs));
  const readyRef = useRef(ready);
  const lastGust = useRef(gustKey);
  useEffect(() => { glyphsRef.current = glyphPool(glyphs); }, [glyphs]);
  useEffect(() => { readyRef.current = ready; }, [ready]);

  const begin = (full: boolean) => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas || reducedMotion()) {
      stage?.removeAttribute("data-news-wind");
      stage?.removeAttribute("data-news-wind-logo");
      return;
    }
    run.current?.finish();
    const timing = timingFor(full);
    const wind = createNewsWind(canvas, { cosmic, budget: timing.budget, glyphs: () => glyphsRef.current });
    stage.setAttribute("data-news-wind", "gust");
    if (full) stage.setAttribute("data-news-wind-logo", "waiting");
    canvas.style.display = "block";

    let done = false;
    const timers: number[] = [];
    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      if (current.frame) cancelAnimationFrame(current.frame);
      wind.dispose();
      canvas.style.display = "none";
      stage.removeAttribute("data-news-wind");
      stage.removeAttribute("data-news-wind-logo");
      document.removeEventListener("visibilitychange", onHidden);
      if (run.current === current) run.current = null;
    };
    const onHidden = () => { if (document.hidden) finish(); };
    document.addEventListener("visibilitychange", onHidden);

    const current = { wind, full, startedAt: performance.now(), frame: 0, assembling: false, finish };
    run.current = current;
    wind.blow();

    /* A frame loop that has stopped (a hidden pane, a throttled tab) must
       not keep the page hidden: whatever happens, it is shown by then. */
    timers.push(window.setTimeout(finish, 14_000));

    const settle = async () => {
      current.assembling = true;
      const root = stage.querySelector<HTMLElement>("[data-wind-content]");
      const words = root
        ? Array.from(root.querySelectorAll<HTMLElement>("[data-spoken-text], [data-wind-text]"))
        : [];
      const targets = letterTargets(words, timing.budget, window.innerHeight);
      stage.setAttribute("data-news-wind", "assemble");
      // The page fades in under the last of the letters as they land.
      timers.push(window.setTimeout(() => stage.setAttribute("data-news-wind", "reveal"), timing.assembleMs * 0.72));
      timers.push(window.setTimeout(finish, timing.assembleMs + 2_600));
      /* The ball falls as the last letters land: the last beat of the same
         movement, not a second one after it. */
      const dropped = full
        ? new Promise<void>((resolve) => {
            timers.push(window.setTimeout(() => { void dropLogo(stage, wind).then(resolve); }, timing.assembleMs * 0.75));
          })
        : Promise.resolve();
      if (targets.length) await wind.assemble(targets, timing.assembleMs);
      if (done) return;
      stage.setAttribute("data-news-wind", "reveal");
      await Promise.all([wind.clear(320), dropped]);
      finish();
    };

    const loop = (now: number) => {
      if (done) return;
      wind.step(now);
      if (!current.assembling && readyRef.current && now - current.startedAt >= timing.minGustMs) void settle();
      current.frame = requestAnimationFrame(loop);
    };
    current.frame = requestAnimationFrame(loop);
  };

  /* The first arrival. DailyNews hid the page before its first paint
     (prepareNewsWind) and said whether today's is the full one; a page it
     did not hide (reduced motion) gets no wind at all. */
  /* What DailyNews asked for, read once: a mount that is undone and done
     again (React's development check, a remount) starts the same arrival
     rather than finding the attributes its own cleanup removed. */
  const asked = useRef<{ active: boolean; full: boolean } | null>(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    asked.current ??= {
      active: Boolean(stage?.hasAttribute("data-news-wind")),
      full: stage?.getAttribute("data-news-wind-logo") === "waiting",
    };
    if (asked.current.active) begin(asked.current.full);
    return () => run.current?.finish();
    // Once, on mount: later gusts come from gustKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A refresh from the logo: a short gust while the new batch is fetched. */
  useEffect(() => {
    if (gustKey === lastGust.current) return;
    lastGust.current = gustKey;
    if (run.current) return;
    begin(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gustKey]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-news-wind-canvas=""
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", pointerEvents: "none", zIndex: 30, display: "none" }}
    />,
    document.body,
  );
}

/**
 * The logo, dropped from above the screen into its place: three bounces,
 * squashing on each landing, a ring where it first lands and the radar's
 * rings switching on (data-powering, YumiSignalRadar.module.css).
 */
function dropLogo(stage: HTMLElement, wind: Wind): Promise<void> {
  const logo = stage.querySelector<HTMLElement>("[data-wind-logo]");
  stage.removeAttribute("data-news-wind-logo");
  if (!logo || typeof logo.animate !== "function") return Promise.resolve();
  const box = logo.getBoundingClientRect();
  const height = box.bottom + 40;
  const duration = 950;
  const animation = logo.animate(dropKeyframes(height), { duration, fill: "backwards" });
  logo.style.transformOrigin = "50% 100%";
  const centre = { x: box.left + box.width / 2, y: box.bottom - 2 };
  window.setTimeout(() => {
    wind.ripple(centre.x, centre.y);
    logo.setAttribute("data-powering", "");
    window.setTimeout(() => logo.removeAttribute("data-powering"), 900);
  }, duration * 0.4);
  window.setTimeout(() => wind.ripple(centre.x, centre.y), duration * 0.75);
  return animation.finished.then(() => {
    logo.style.transformOrigin = "";
  }, () => undefined);
}
