"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import {
  isLaunching,
  isLaunchingOnServer,
  subscribeToLaunching,
} from "@/lib/launchState";

/** Long enough to register, short enough that nobody waits on it. */
const FADE_MS = 240;

/**
 * The stage every protected route is played on.
 *
 * One fade, the same in both modes, on every navigation inside the signed-in
 * app. No movement and no scale: a page that slides or grows reads as a
 * slower page on a long list, and the point of this is that arriving
 * somewhere feels considered rather than abrupt.
 *
 * This replaced Cosmic Mode's six per-room arrivals, which were tagged by
 * each control and mapped here to named animations. They were deliberate and
 * they are gone on purpose: the app now moves the same way everywhere, and a
 * transition that differs by destination is a transition the reader has to
 * learn.
 *
 * ---
 *
 * It is an opacity animation on one element, not a view transition.
 *
 * It was a <ViewTransition> boundary, and that is what made the whole app
 * feel heavier rather than smoother. A view transition is not a fade: to run
 * one the browser rasterises the outgoing page, applies the update,
 * rasterises the incoming page, and then animates those two snapshots in the
 * top layer — and the live page neither renders nor answers a touch until it
 * finishes. Standard Mode had no route boundary at all before this feature,
 * so every navigation there went from doing none of that to doing all of it.
 *
 * An opacity animation on a single element is composited: it costs no
 * snapshots, holds nothing in the top layer, and leaves the page live and
 * scrollable while it plays.
 *
 * The Web Animations API rather than a CSS class, because replaying a class
 * animation means removing it, forcing a reflow, and adding it back on every
 * navigation. `animate()` restarts by being called.
 */
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

  /*
   * Layout effect, so the fade is already running when the browser paints
   * the new screen for the first time. From a passive effect the page would
   * paint at full opacity for a frame and then drop to nothing to fade back
   * in, which is a flicker rather than a fade.
   */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    // The first screen of the session is arrived at, not navigated to.
    if (!stage || previousPath === null || previousPath === pathname) return;

    // The opening is playing over the top of this; it owns the screen.
    if (modeTransition || launching) return;

    // A fade is motion even without movement.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // No Web Animations API here: arrive without the fade rather than throw.
    if (typeof stage.animate !== "function") return;

    stage.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: FADE_MS,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    });
  }, [launching, modeTransition, pathname]);

  /*
   * One element, always. The mode change is handled by not animating during
   * it, above, rather than by removing the wrapper.
   *
   * The boundary this replaced was taken away entirely while the mode was
   * changing, because a view transition running over the mode sequence would
   * animate the same subtree twice. An opacity animation has no such
   * conflict, and keeping the element mounted matters: swapping between a
   * wrapper and bare children is a change of element type in the same
   * position, so React unmounts and remounts the whole page underneath it.
   * That is what made the install prompt disappear when the opening ended.
   */
  return <div ref={stageRef}>{children}</div>;
}
