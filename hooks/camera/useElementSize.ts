"use client";

/* =========================================================
   How big the preview actually is

   Every coordinate conversion needs the box's size, and the obvious way to
   get it — reading the ref while rendering — is wrong twice over. React 19
   forbids it outright, and it is also stale: the first render has no
   element, so the first frame of overlay lands wherever a zero-sized box
   would put it.

   A ResizeObserver is the honest source. It is an external system pushing
   updates in, which is what effects are for, and it catches the cases a
   one-off measurement misses: rotation, the keyboard opening, the browser
   chrome collapsing on scroll.
   ========================================================= */

import { useCallback, useEffect, useRef, useState } from "react";

export type ElementSize = { width: number; height: number };

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;

      if (!box) return;

      /*
       * Compared before setting: a ResizeObserver fires on sub-pixel
       * changes during a transform animation, and a setState per frame
       * would re-render the whole camera sixty times a second.
       */
      setSize((current) =>
        current?.width === box.width && current?.height === box.height
          ? current
          : { width: box.width, height: box.height },
      );
    });

    observer.observe(element);

    // The observer fires once on observe in every browser that has one, so
    // there is no separate initial measurement to get out of step with it.
    return () => observer.disconnect();
  }, []);

  const measure = useCallback(() => ref.current?.getBoundingClientRect(), []);

  return { ref, size, measure };
}
