"use client";

import { useEffect, useRef, useState } from "react";

/** Long enough to read as a movement, short enough to stay out of the way. */
const REVEAL_MS = 260;

/**
 * Entrance and exit for something that opens in place, rather than over.
 *
 * A sheet gets this from useSheetMotion, which also locks the page, swallows
 * Escape and owns a scrim — all correct for a surface that covers the app,
 * and all wrong for a card that unfolds inside a conversation. What is shared
 * is the one thing an inline reveal is usually missing: staying mounted long
 * enough to leave.
 *
 * Swapping the open element for the closed one in a ternary gives the reader
 * no exit at all. The card is simply not there on the next frame, which reads
 * as a mis-tap rather than as a thing closing.
 *
 * `rendered` keeps the element in the tree; `visible` drives the transition.
 * Under reduced motion both change together, so the element appears and
 * disappears without travelling.
 */
export default function useRevealMotion(open: boolean) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(open);

  const frameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clear() {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (secondFrameRef.current !== null) {
        cancelAnimationFrame(secondFrameRef.current);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      frameRef.current = null;
      secondFrameRef.current = null;
      timerRef.current = null;
    }

    clear();

    /*
     * Every state change happens inside a frame callback rather than in the
     * effect body — the same shape useSheetMotion uses, and for the same
     * reason. Mounting and revealing in one commit gives the browser nothing
     * to transition from: the element's first paint is already its final
     * state, and the entrance is simply skipped.
     */
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;

      if (open) {
        setRendered(true);
        secondFrameRef.current = requestAnimationFrame(() => {
          secondFrameRef.current = null;
          setVisible(true);
        });
        return;
      }

      setVisible(false);

      const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? 1
        : REVEAL_MS;

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setRendered(false);
      }, duration);
    });

    return clear;
  }, [open]);

  return { rendered, visible };
}
