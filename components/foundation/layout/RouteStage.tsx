"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import {
  isLaunching,
  isLaunchingOnServer,
  subscribeToLaunching,
} from "@/lib/launchState";
import {
  ARRIVAL_EASING,
  ARRIVAL_MS,
  ARRIVAL_RISE_PX,
  arrivalDelay,
  arrivalLayers,
  holdsFixed,
  inView,
} from "@/lib/motion/pageArrival";

/**
 * The stage every protected route is played on.
 *
 * A navigation has three moments here, the same in both modes (Chi,
 * 2026-10-30: "進入每頁時應該要有種高級感，目前很尷尬地跳出"):
 *
 * 1. **The tap.** The page being left dims a little at once, so the tap
 *    reads as heard. It never delays the navigation: the dim is started in
 *    the click and the new page replaces it whenever it is ready.
 * 2. **The outline.** A route with a loading file shows its skeleton first;
 *    the stage brightens back to full as it goes up.
 * 3. **The page.** When the real page is in, it arrives in layers: its
 *    blocks float up one after another, the first at once, all inside about
 *    0.35s (lib/motion/pageArrival). A page behind a skeleton is played as
 *    the skeleton leaves, which is the moment that used to jump: the
 *    outline swapped for the page in one frame.
 *
 * Before this, the whole page faded from 60% over 150ms (from 40% over
 * 220ms in Standard Mode) as the skeleton went up, and nothing at all
 * happened as the page replaced it.
 *
 * ---
 *
 * Web Animations on elements, not a view transition, for the reasons this
 * file has always given: a view transition rasterises the outgoing and
 * incoming pages and animates the snapshots in the top layer, and the live
 * page neither renders nor answers a touch until it finishes. Opacity and
 * `translate` on a handful of blocks are composited and leave the page
 * live. `animate()` restarts by being called; a class would need removing,
 * a forced reflow and adding back on every navigation.
 *
 * The stage itself never moves: a transform on it would make it the
 * containing block for every fixed element in the page (the composer, the
 * sheets, the floating buttons). Layers holding one only fade.
 */

/** How dim the page being left goes, and how quickly. */
const LEAVING_OPACITY = 0.7;
const LEAVING_MS = 140;
/** A tap whose page never came (an error, a cancelled navigation) lets go. */
const LEAVING_GIVE_UP_MS = 3000;
/** The outline brightening back as it goes up. */
const OUTLINE_MS = 140;
/** A skeleton still up after this is no longer waited on for the arrival. */
const OUTLINE_WAIT_MS = 10_000;

const SKELETON = "[data-route-skeleton]";
/** A page that plays its own arrival (the games, the shop) is left to it. */
const OWN_ARRIVAL = "[data-own-arrival]";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Plays the page's arrival in layers; a page with none fades as one. */
function arrive(stage: HTMLElement) {
  if (stage.querySelector(OWN_ARRIVAL)) {
    stage.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 150, easing: ARRIVAL_EASING });
    return;
  }
  const layers = arrivalLayers(stage).filter(layer => inView(layer, window.innerHeight));
  if (layers.length === 0) {
    stage.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 220, easing: ARRIVAL_EASING });
    return;
  }
  layers.forEach((layer, index) => {
    const rise = !holdsFixed(layer);
    layer.animate(
      rise
        ? [{ opacity: 0, translate: `0 ${ARRIVAL_RISE_PX}px` }, { opacity: 1, translate: "0 0" }]
        : [{ opacity: 0 }, { opacity: 1 }],
      {
        duration: ARRIVAL_MS,
        delay: arrivalDelay(index, layers.length),
        easing: ARRIVAL_EASING,
        // Held at the first frame through its delay, so nothing shows early.
        fill: "backwards",
      },
    );
  });
}

export default function RouteStage({ children }: { children: ReactNode }) {
  const { modeTransition } = useInterfaceMode();
  const launching = useSyncExternalStore(
    subscribeToLaunching,
    isLaunching,
    isLaunchingOnServer,
  );

  const stageRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const leavingRef = useRef<Animation | null>(null);

  /* 1. The tap: dim the page being left, in the click itself. */
  useEffect(() => {
    let giveUp = 0;
    const onClick = (event: MouseEvent) => {
      const stage = stageRef.current;
      if (!stage || typeof stage.animate !== "function") return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      // Only a move to another page in this app: not a hash, not this page's own query.
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (reducedMotion()) return;
      leavingRef.current?.cancel();
      leavingRef.current = stage.animate([{ opacity: 1 }, { opacity: LEAVING_OPACITY }], {
        duration: LEAVING_MS,
        easing: "ease-out",
        fill: "forwards",
      });
      window.clearTimeout(giveUp);
      giveUp = window.setTimeout(() => {
        leavingRef.current?.cancel();
        leavingRef.current = null;
      }, LEAVING_GIVE_UP_MS);
    };
    // Capture: a Link prevents the click's default, so a bubbling listener
    // could not tell a navigation from a click something else consumed.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(giveUp);
    };
  }, []);

  /*
   * 2 and 3: the outline, then the page. A layout effect, so the arrival is
   * already running when the browser first paints the new screen; from a
   * passive effect the page would paint whole for a frame and then drop to
   * nothing to rise, which is a flicker.
   */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    // Whatever happens next, the page being left has gone.
    const leaving = leavingRef.current;
    leavingRef.current = null;

    // The first screen of the session is arrived at, not navigated to.
    if (!stage || previousPath === null || previousPath === pathname) {
      leaving?.cancel();
      return;
    }

    // The opening is playing over the top of this; it owns the screen.
    // The mode sequence is replacing the shell underneath.
    if (modeTransition || launching || reducedMotion() || typeof stage.animate !== "function") {
      leaving?.cancel();
      return;
    }

    if (!stage.querySelector(SKELETON)) {
      leaving?.cancel();
      arrive(stage);
      return;
    }

    // The outline is up: brighten from wherever the dim had got to.
    const from = leaving ? Number(getComputedStyle(stage).opacity) : 0.6;
    leaving?.cancel();
    stage.animate([{ opacity: from }, { opacity: 1 }], { duration: OUTLINE_MS, easing: ARRIVAL_EASING });

    // And the page arrives the moment it replaces the outline. A mutation
    // callback runs before the next paint, so it never shows unarrived.
    const observer = new MutationObserver(() => {
      if (stage.querySelector(SKELETON)) return;
      observer.disconnect();
      window.clearTimeout(stopWaiting);
      arrive(stage);
    });
    observer.observe(stage, { childList: true, subtree: true });
    const stopWaiting = window.setTimeout(() => observer.disconnect(), OUTLINE_WAIT_MS);
    return () => {
      observer.disconnect();
      window.clearTimeout(stopWaiting);
    };
  }, [launching, modeTransition, pathname]);

  /*
   * One element, always. Swapping between a wrapper and bare children is a
   * change of element type in the same position, so React would unmount
   * and remount the whole page underneath it: that is what once made the
   * install prompt disappear when the opening ended.
   */
  return <div ref={stageRef}>{children}</div>;
}
