"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Whether an element is on screen, for deciding whether it is worth animating.
 *
 * Yumi is drawn with a lot of infinite CSS animations — 28 in the mark alone.
 * Each is individually cheap, nearly all animating transform or opacity, but
 * each also holds a compositing layer for as long as it runs, and they ran
 * whether or not anyone could see them. On a mid-range Android that is real
 * battery and real frames spent on a logo scrolled half a page above.
 *
 * Spread the result onto the element as `data-in-view`; the rule that acts on
 * it lives once in globals.css rather than once per stylesheet.
 *
 * Defaults to true, and stays true where there is no IntersectionObserver: the
 * failure mode of this hook has to be "animates anyway", never "silently
 * frozen".
 */
export default function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
