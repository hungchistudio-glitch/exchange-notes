"use client";

import { useEffect, type RefObject } from "react";

/* =========================================================
   The shop's pieces arriving as they come into view

   Chi (2026-10-26): the whole catalogue used to be simply there, every
   card at once. Now each card rises into place as it scrolls onto the
   screen, down the page or along a shelf, the ones arriving together a
   beat apart in reading order. A card that has arrived stays; scrolling
   back never replays it.

   The catalogue is rendered with data-reveal="on", so its cards start
   hidden by CSS rather than flashing in and then vanishing when this
   runs. Without IntersectionObserver, or under reduced motion, it turns
   that off and everything is simply shown.
   ========================================================= */

const STAGGER_MS = 45;
const MOST_STAGGERED = 10;

export default function useShopReveal(rootRef: RefObject<HTMLElement | null>, itemSelector: string) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced || typeof IntersectionObserver === "undefined") {
      root.dataset.reveal = "off";
      return;
    }
    root.dataset.reveal = "on";

    const observer = new IntersectionObserver(entries => {
      const arriving = entries
        .filter(entry => entry.isIntersecting)
        .map(entry => ({ element: entry.target as HTMLElement, box: entry.boundingClientRect }))
        .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left);
      arriving.forEach(({ element }, index) => {
        element.style.setProperty("--reveal-delay", `${Math.min(index, MOST_STAGGERED) * STAGGER_MS}ms`);
        element.dataset.revealed = "true";
        observer.unobserve(element);
      });
    }, { threshold: 0.12 });

    const watch = () => {
      root.querySelectorAll<HTMLElement>(itemSelector).forEach(item => {
        if (!item.dataset.revealed) observer.observe(item);
      });
    };
    watch();
    // Filtering and switching collections put new cards on the shelves.
    const mutations = new MutationObserver(watch);
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [rootRef, itemSelector]);
}
