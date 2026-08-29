"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Moves viewport-level UI out of route content and directly under body.
 *
 * A protected page lives inside the app's dedicated scroll container. Sheets,
 * cameras and full-screen dialogs must not inherit that container's clipping
 * or view-transition coordinate space, so they render in the document's
 * overlay layer instead. The first render stays inline to keep server and
 * hydration markup identical; interactive overlays open after mount and are
 * portalled immediately.
 */
export default function OverlayPortal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  return mounted ? createPortal(children, document.body) : children;
}
