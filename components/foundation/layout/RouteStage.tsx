"use client";

import { ViewTransition, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import {
  isLaunching,
  isLaunchingOnServer,
  subscribeToLaunching,
} from "@/lib/launchState";

/**
 * The stage every protected route is played on.
 *
 * One crossfade, the same in both modes, on every navigation inside the
 * signed-in app: the outgoing screen fades out as the incoming one fades in.
 * No movement, no scale — a page that slides or grows reads as a slower page
 * on a long list, and the point of this is that arriving somewhere feels
 * considered rather than abrupt.
 *
 * This replaced Cosmic Mode's six per-room arrivals, which were tagged by
 * each control and mapped here to named animations. They were deliberate and
 * they are gone on purpose: the app now moves the same way everywhere, and a
 * transition that differs by destination is a transition the reader has to
 * learn. The keyframes and the tagging went with them.
 *
 * Standard Mode had no boundary at all before this — not an inert one — so
 * this is the first route animation it has ever had.
 */
export default function RouteStage({ children }: { children: ReactNode }) {
  const { modeTransition } = useInterfaceMode();
  const launching = useSyncExternalStore(
    subscribeToLaunching,
    isLaunching,
    isLaunchingOnServer,
  );

  /*
   * No boundary at all while the mode itself is changing.
   *
   * The mode sequence replaces the shell underneath, and that is the one
   * moment a route animation must not also be running — it is the same
   * boundary whose child tree is being swapped, so the two would animate over
   * each other. Removing the boundary remounts what is inside it, which is
   * already what a mode change does to the shell, so nothing is lost.
   */
  if (modeTransition) return children;

  /*
   * The opening gets the animation turned off, not the boundary taken away.
   *
   * A view transition's snapshots are rendered in the browser's *top layer*,
   * above every z-index — so a route transition running underneath the
   * opening painted the page on top of it, and the reader saw the home screen
   * flash before the opening appeared. Standard Mode had no boundary at all
   * until this feature, which is why it had never happened.
   *
   * The first fix for that returned `children` bare while the opening was up.
   * That is a different element type in the same position, so React unmounted
   * and remounted the whole page the instant the opening finished: every
   * effect re-ran and every piece of page state reset 2.8 seconds after load.
   * The install prompt, which opens on a timer at 1.2s and is therefore still
   * behind the overlay at that moment, vanished as it was handed the screen.
   *
   * Same boundary throughout, then, and only the animation changes.
   */
  return (
    <ViewTransition default={launching ? "none" : "page-fade"}>
      {children}
    </ViewTransition>
  );
}
