"use client";

import { useEffect, type RefObject } from "react";

/*
 * Yumi rises just enough for the field under her to clear the tour's card
 * (Chi, 2026-11-13: every Home step stands at the foot, and nothing may jump).
 *
 * A fixed rise could not do it. The card's height follows the reader's text
 * size and the step (the dial's checklist is the tallest), and so does the
 * column under her: measured on a 667px phone, a 10rem rise cleared the field
 * by 20px at the small size, missed it by 4 at the medium and by 43 at the
 * large. So this measures both and moves her by the difference.
 *
 * How: she is centred in the room the home surface leaves above its bottom
 * padding (StandardHome.module.css), so raising that padding by 2d raises her,
 * and the field under her, by d. The padding is written as `--coach-rise` on
 * the surface. Each measurement compares the field's foot with the card's
 * head, and moves by what is missing (or gives back what is spare); the next
 * measurement waits for her to settle, so it converges in a step or two
 * without chasing a moving target.
 *
 * Bounded above by the corner keys: she never rises into them. A text size
 * so large that she cannot clear the card that way keeps the best she can do.
 *
 * Only at rest: while she is answering, the ring is out, or the reader is
 * typing, the field is not under her rest position and would read as room.
 */

/** Air between the field and the card. */
const GAP = 12;

/** How far below the corner keys her figure must stay. */
const TOP_AIR = 12;

/** Long enough for the padding's 480ms glide and her frame loop to follow. */
const SETTLE_MS = 650;

const busy = () =>
  Boolean(
    document.querySelector(
      '[data-yumi-answering="true"], [data-yumi-ring-open="true"], [data-yumi-typing="true"]',
    ),
  );

export default function useRiseClearOfCoach(
  stageRef: RefObject<HTMLElement | null>,
  coaching: boolean,
) {
  useEffect(() => {
    const surface = stageRef.current?.parentElement;
    if (!coaching || !surface) return;

    let timer = 0;

    const measure = () => {
      timer = 0;
      if (busy()) return;

      const card = document.querySelector("[data-coach-card]")?.getBoundingClientRect();
      const field = document
        .querySelector('[data-coach-target="search-field"]')
        ?.getBoundingClientRect();
      const figure = stageRef.current?.querySelector("[data-yumi-figure]")?.getBoundingClientRect();
      if (!card || !field || !figure || card.height === 0 || field.height === 0) return;

      /* Where she stands now: the padding as it is, glide finished. */
      const rise = parseFloat(getComputedStyle(surface).paddingBottom) || 0;

      /* A card that is not at the foot leaves the field alone. */
      if (card.top < window.innerHeight / 2) {
        if (rise !== 0) apply(0);
        return;
      }

      const keys = Array.from(
        document.querySelectorAll("[data-home-shop-key], [data-home-hangyumi-key], [data-home-mode-portal]"),
        (key) => key.getBoundingClientRect().bottom,
      );
      const ceiling = Math.max(0, ...keys) + TOP_AIR;

      /* Positive: she has to go up this far. Negative: she may come down. */
      let shift = field.bottom + GAP - card.top;
      shift = Math.min(shift, figure.top - ceiling);
      shift = Math.max(shift, -rise / 2);

      if (Math.abs(shift) < 2) return;
      apply(Math.round(rise + 2 * shift));
    };

    const apply = (next: number) => {
      surface.style.setProperty("--coach-rise", `${Math.max(0, next)}px`);
      schedule();
    };

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(measure, SETTLE_MS);
    };

    /* The card changes height between steps and with the reader's text size;
       the column changes when the field shows or hides a line. */
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    const card = document.querySelector("[data-coach-card]");
    if (card) observer?.observe(card);
    if (stageRef.current) observer?.observe(stageRef.current);

    /* The card mounts beside this screen, and a step can swap it: watch for
       it arriving, and for the screen settling after the ring or an answer. */
    const watcher = new MutationObserver(() => {
      const next = document.querySelector("[data-coach-card]");
      if (next && next !== card) observer?.observe(next);
      schedule();
    });
    watcher.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-yumi-answering", "data-yumi-ring-open", "data-yumi-typing", "data-coach-step"],
      childList: false,
    });

    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      if (timer) window.clearTimeout(timer);
      observer?.disconnect();
      watcher.disconnect();
      window.removeEventListener("resize", schedule);
      surface.style.removeProperty("--coach-rise");
    };
  }, [coaching, stageRef]);
}
