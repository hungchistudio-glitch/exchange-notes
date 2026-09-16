"use client";

import { useState } from "react";

/**
 * Holds on to the last thing a sheet had to show, so it can finish leaving.
 *
 * A sheet whose open state is derived from a selection — `open={Boolean(item)}`,
 * `onClose={() => setItem(null)}` — loses its content and its open flag in the
 * same render. What the reader sees depends on what the sheet does next, and
 * both answers were wrong:
 *
 *   `if (!item) return null`      the sheet vanishes mid-animation
 *   `if (!item) return <Sheet/>`  the sheet empties, then slides away
 *
 * Neither is a dismissal. A dismissal is the thing the reader was looking at
 * travelling off the screen, still intact, because that is what makes the
 * gesture feel like it moved an object rather than cancelled a query.
 *
 * So the value outlives the selection. The caller keeps driving `open` from
 * the live selection — that part was always right — and renders from this
 * instead, which returns the last non-empty value until a new one arrives.
 *
 * Adjusting state during render rather than in an effect: this exists only to
 * remember a prop, and an effect would hand the sheet one frame of nothing
 * before catching up. React re-runs the component immediately, so the value
 * returned below is never the stale one.
 */
export default function useRetainedWhileClosing<T>(
  value: T | null | undefined,
): T | null {
  const [retained, setRetained] = useState<T | null>(value ?? null);

  if (value != null && value !== retained) setRetained(value);

  return value ?? retained;
}
