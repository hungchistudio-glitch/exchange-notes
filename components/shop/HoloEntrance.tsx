"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import styles from "./HoloEntrance.module.css";

/* =========================================================
   The shop's way in: a soft-light holographic scan

   Chi chose a holographic scan on 2026-11-12, then asked for it smoother
   the same day: the line stuttered on the way down, it was too stiff (an
   even speed, a hard edge, outlines blinking out), and the start and the
   end jumped. Chi chose the soft-light version, about 1.2 seconds.

   The page opens as a hologram: a dark blueprint with a fine grid, and on
   it the outlines of what is about to be there (the sign, the stand, the
   tabs, the pieces). A soft band of light eases down the screen, slow,
   fast, slow; above it the page is real, and the blueprint fades into it
   through a soft edge rather than a cut, taking the outlines with it.

   How it stays smooth:
   - The veil slides down while the blueprint inside it slides up by the
     same amount, so the blueprint and the outlines stand still and only
     the edge sweeps. Both are transforms on the same timing, which the
     compositor runs alone, however busy the page is.
   - The edge is the veil's own gradient mask; nothing fades one by one.
   - All the outlines are one SVG, with no blur.
   - It is rendered with the page, so a page the server drew shows the
     blueprint from its first paint instead of going blank; the sweep
     waits for the page to come alive (data-go), since hydrating it held
     the first frames of the sweep back by up to a tenth of a second on a
     slowed phone. On a visit from inside the app that is at once.
   - Yumi's 3D scene is not built until it is over (ShopStage holdScene),
     so her compile never lands on a frame of the sweep.
   A tap, a scroll or a key ends it. Under reduced motion it never shows.
   ========================================================= */

/** From the first frame to the band faded: YumiShop removes it after. */
export const HOLO_MS = 1250;

/* How much of the scan is left. On a page the server drew it began at the
   first paint, long before this could run; its own clock says how far it
   has gone. Without the Web Animations API, the whole of it. */
function leftOf(holo: HTMLElement | null) {
  const veil = holo?.firstElementChild as HTMLElement | null;
  const animation = veil?.getAnimations?.()[0];
  const at = animation?.currentTime;
  return typeof at === "number" ? Math.max(0, HOLO_MS - at) : HOLO_MS;
}
const MOST_OUTLINES = 18;

type Outline = { key: number; x: number; y: number; w: number; h: number; r: number };

export default function HoloEntrance({ onDone }: {
  /** The scan is over, or was cut short. */
  onDone: () => void;
}) {
  const holoRef = useRef<HTMLDivElement>(null);
  const [outlines, setOutlines] = useState<Outline[]>([]);

  /* What is on the first screen, measured before the first paint on a
     visit from inside the app (on a page the server drew, at hydration).
     The page is this overlay's parent: its own ref is not attached yet
     when this first runs, this one already is. */
  useLayoutEffect(() => {
    const root = holoRef.current?.parentElement;
    /* The page is alive: the sweep can go. */
    holoRef.current?.setAttribute("data-go", "");
    /* Past already: nothing left to outline. */
    if (!root || leftOf(holoRef.current) < 300) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const found: Outline[] = [];
    root.querySelectorAll<HTMLElement>("[data-holo-frame]").forEach(element => {
      if (found.length >= MOST_OUTLINES) return;
      const box = element.getBoundingClientRect();
      if (box.width < 8 || box.height < 8 || box.bottom <= 0 || box.top >= height || box.right <= 0 || box.left >= width) return;
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 10;
      found.push({ key: found.length, x: box.left, y: box.top, w: box.width, h: box.height, r: Math.min(radius, box.height / 2) });
    });
    setOutlines(found);
  }, []);

  /* Over when its own clock says so, or at the first touch, scroll or key. */
  useEffect(() => {
    const timer = window.setTimeout(onDone, leftOf(holoRef.current));
    const cut = () => onDone();
    const events = ["pointerdown", "keydown", "wheel", "touchmove"] as const;
    events.forEach(name => window.addEventListener(name, cut, { once: true, capture: true, passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach(name => window.removeEventListener(name, cut, { capture: true }));
    };
  }, [onDone]);

  return (
    <div ref={holoRef} className={styles.holo} aria-hidden="true" data-holo-overlay="">
      <div className={styles.veil}>
        <div className={styles.blueprint}>
          {outlines.length > 0 && (
            <svg className={styles.outlines} width="100%" height="100%">
              {outlines.map(o => (
                <g key={o.key}>
                  <rect className={styles.halo} x={o.x} y={o.y} width={o.w} height={o.h} rx={o.r} />
                  <rect className={styles.edge} x={o.x + 0.5} y={o.y + 0.5} width={o.w - 1} height={o.h - 1} rx={o.r} />
                  <path
                    className={styles.corners}
                    d={[
                      `M${o.x} ${o.y + 10}V${o.y}H${o.x + 10}`,
                      `M${o.x + o.w - 10} ${o.y}H${o.x + o.w}V${o.y + 10}`,
                      `M${o.x} ${o.y + o.h - 10}V${o.y + o.h}H${o.x + 10}`,
                      `M${o.x + o.w - 10} ${o.y + o.h}H${o.x + o.w}V${o.y + o.h - 10}`,
                    ].join("")}
                  />
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>
      <div className={styles.band}>
        <span className={styles.readout}>STATION 33 · SYNC</span>
      </div>
    </div>
  );
}
