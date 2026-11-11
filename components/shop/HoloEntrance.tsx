"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import styles from "./HoloEntrance.module.css";

/* =========================================================
   The shop's way in: a holographic scan (Chi, 2026-11-12)

   Chi chose this from four ideas ("保持高科技感的效果動畫感"). The page
   opens as a hologram: a dark blueprint veil with a fine grid over the
   whole screen, and on it the glowing outlines of what is about to be
   there (the sign, the stand, the tabs, the pieces). A bright scan line
   sweeps from top to bottom; above it the page is real, and each outline
   flashes and goes as the line crosses it, while the pieces under it fade
   in at that moment. About a second and a half, every time (Chi chose it),
   and a tap anywhere ends it at once. Under reduced motion it never runs.

   Opacity and transform only, so the compositor does all of it: the veil
   and the line move down as one, and nothing is filtered or repainted
   (an iPhone is what it is for). The parts of the page that take part
   carry data-holo-frame; the page holds the reveal of its cards until the
   line reaches them (--holo-delay, YumiShop.module.css).
   ========================================================= */

/** How long the line takes to cross the screen, top to bottom. */
export const HOLO_SCAN_MS = 1000;
/** From the first frame to the last outline gone and the line faded. */
const HOLO_TOTAL_MS = 1350;
/* A little after the first paint, so the line starts where it is seen. */
const HOLO_LEAD_MS = 60;
const MOST_FRAMES = 18;

type Frame = { key: number; x: number; y: number; w: number; h: number; radius: string; delay: number };

/** When the line crosses a point `top` pixels down the screen. */
export const holoDelayAt = (top: number, height: number) =>
  HOLO_LEAD_MS + Math.round(Math.min(1, Math.max(0, top / Math.max(1, height))) * HOLO_SCAN_MS);

export default function HoloEntrance({ rootRef, onDone }: {
  /** The page whose parts carry data-holo-frame. */
  rootRef: RefObject<HTMLElement | null>;
  /** The scan is over, or was cut short. */
  onDone: () => void;
}) {
  const [frames, setFrames] = useState<Frame[] | null>(null);

  /* What is on the first screen, measured once its layout is in. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const raf = requestAnimationFrame(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const found: Frame[] = [];
      root.querySelectorAll<HTMLElement>("[data-holo-frame]").forEach(element => {
        if (found.length >= MOST_FRAMES) return;
        const box = element.getBoundingClientRect();
        if (box.width < 8 || box.height < 8 || box.bottom <= 0 || box.top >= height || box.right <= 0 || box.left >= width) return;
        const delay = holoDelayAt(box.top, height);
        found.push({
          key: found.length, x: box.left, y: box.top, w: box.width, h: box.height,
          radius: getComputedStyle(element).borderRadius || "12px", delay,
        });
        /* A piece's card waits for the line before it fades in. */
        element.closest("li")?.style.setProperty("--holo-delay", `${delay}ms`);
      });
      setFrames(found);
    });
    return () => cancelAnimationFrame(raf);
  }, [rootRef]);

  /* Over after its time, or at the first tap. */
  useEffect(() => {
    const timer = window.setTimeout(onDone, HOLO_TOTAL_MS);
    const cut = () => onDone();
    window.addEventListener("pointerdown", cut, { once: true, capture: true });
    window.addEventListener("keydown", cut, { once: true, capture: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", cut, { capture: true });
      window.removeEventListener("keydown", cut, { capture: true });
    };
  }, [onDone]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={styles.holo} aria-hidden="true" data-holo-overlay="" style={{ ["--holo-scan" as string]: `${HOLO_SCAN_MS}ms`, ["--holo-lead" as string]: `${HOLO_LEAD_MS}ms` }}>
      <div className={styles.veil} />
      <div className={styles.frames}>
        {frames?.map(frame => (
          <i
            key={frame.key}
            className={styles.frame}
            style={{
              left: frame.x, top: frame.y, width: frame.w, height: frame.h,
              borderRadius: frame.radius, animationDelay: `${frame.delay - 90}ms`,
            }}
          >
            <b /><b /><b /><b />
          </i>
        ))}
      </div>
      <div className={styles.line}>
        <span className={styles.readout}>STATION 33 · SYNC</span>
      </div>
    </div>,
    document.body,
  );
}
