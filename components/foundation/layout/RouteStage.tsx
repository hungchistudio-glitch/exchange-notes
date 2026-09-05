"use client";

import { ViewTransition } from "react";
import type { ReactNode } from "react";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";

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

  /*
   * No boundary while the mode itself is changing.
   *
   * The mode sequence replaces the shell underneath, and that is the one
   * moment a route animation must not also be running — it is the same
   * boundary whose child tree is being swapped, so the two would animate over
   * each other. The mode change owns the screen until it finishes; route
   * travel resumes after.
   */
  if (modeTransition) return children;

  return (
    <ViewTransition default="page-fade">{children}</ViewTransition>
  );
}
