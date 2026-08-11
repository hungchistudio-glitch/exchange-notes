"use client";

import { ViewTransition } from "react";
import type { ReactNode } from "react";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";

/**
 * The stage every protected route is played on.
 *
 * Cosmic Mode's navigation is meant to read as moving through a ship rather
 * than swapping documents, and this is where that happens: each control tags
 * its navigation with a transition type (see CommandDeck and ProtectedNav),
 * and the maps below turn that type into a named animation defined in
 * app/cosmic-motion.css.
 *
 * The two modes are kept apart structurally, not just by configuration.
 * Standard Mode gets no <ViewTransition> boundary in its tree at all — not an
 * inert one. Relying on `default: "none"` to neutralise it was not enough in
 * practice: the boundary still takes part in every navigation, and it is the
 * same boundary whose child tree the mode switch replaces, so a mode change
 * and a route change could end up animating over each other.
 *
 * `default: "none"` stays for a second reason — an untyped navigation inside
 * Cosmic Mode, which is what a browser back button or an edge-swipe produces.
 * Those should not have a scripted animation fighting the gesture.
 */

// Leaving is one language regardless of destination: the deck recedes. Six
// different exits would be six things happening at once, since the arriving
// room is already carrying the personality.
const EXIT = {
  "room-lexicon": "deck-depart",
  "room-mission": "deck-depart",
  "room-scanner": "deck-depart",
  "room-comms": "deck-depart",
  "room-earth": "deck-depart",
  "room-memory": "deck-depart",
  "deck-return": "room-depart",
  "dock-move": "dock-move",
  default: "none",
} as const;

// Arriving is where each room gets its own character — the scanner opens like
// a lens, comms converges like a signal, and so on.
const ENTER = {
  "room-lexicon": "room-lexicon",
  "room-mission": "room-mission",
  "room-scanner": "room-scanner",
  "room-comms": "room-comms",
  "room-earth": "room-earth",
  "room-memory": "room-memory",
  "deck-return": "deck-arrive",
  "dock-move": "dock-move",
  default: "none",
} as const;

export default function CosmicRouteStage({
  children,
}: {
  children: ReactNode;
}) {
  const { isCosmic, modeTransition } = useInterfaceMode();

  /*
   * No boundary in Standard Mode, and none while the mode itself is changing.
   *
   * The second case matters as much as the first: during a mode change the
   * shell underneath is being replaced, and that is the one moment a route
   * animation must not also be running. The mode sequence owns the screen
   * until it finishes; route travel resumes after.
   */
  if (!isCosmic || modeTransition) {
    return children;
  }

  return (
    <ViewTransition enter={ENTER} exit={EXIT} default="none">
      {children}
    </ViewTransition>
  );
}
