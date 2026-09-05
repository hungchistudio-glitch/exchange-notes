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
   * No boundary while something else owns the screen.
   *
   * Two cases, and the same reason underneath both: a full-screen sequence is
   * already playing and a route animation must not play over it.
   *
   * The mode change replaces the shell — it is the same boundary whose child
   * tree is being swapped, so the two would animate over each other.
   *
   * The opening is the case that made this visible. A view transition's
   * snapshots are rendered in the browser's *top layer*, above every
   * z-index — so a route transition running underneath the opening painted
   * the page on top of it, and the reader saw the home screen flash before
   * the opening appeared. Standard Mode had no boundary at all until this
   * feature, which is why it had never happened before.
   */
  if (modeTransition || launching) return children;

  return (
    <ViewTransition default="page-fade">{children}</ViewTransition>
  );
}
