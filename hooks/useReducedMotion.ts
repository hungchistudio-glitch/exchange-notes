"use client";

import { useEffect, useState } from "react";

/**
 * Whether the user has asked the system to stop moving things.
 *
 * Starts false and corrects itself after mount rather than reading
 * matchMedia during render: the server has no media queries, and a
 * component that renders differently on the first client pass than the
 * server did is a hydration mismatch. Every animation this gates is an
 * enhancement of something already legible, so one frame of motion before
 * the correction is the right way round to be wrong.
 */
export default function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    queueMicrotask(() => setReduced(query.matches));

    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handler);

    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}
