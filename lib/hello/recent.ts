"use client";

import { isHelloId } from "./url";

/* =========================================================
   The last hello a signed-out visitor opened, on this device

   Signing in carries a hello back for a day (app/hello/[id]/join). A new
   reader who signs up, sets up their languages and takes the tour may take
   longer — or open the app later from its icon — so the hello they came
   from is also kept here, and the friends screen offers the way back for
   thirty days.

   Public facts only — the id and the name shown on the hello — and on
   this device only: nothing that would tell the next person to use the
   device anything about the last.
   ========================================================= */

const KEY = "exchange-notes:recent-hello";
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

export type RecentHello = { id: string; name: string; at: number };

export function rememberRecentHello(hello: { id: string; name: string }): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ id: hello.id, name: hello.name.slice(0, 60), at: Date.now() }));
  } catch {
    /* Private browsing or full storage: the link still works. */
  }
}

export function readRecentHello(): RecentHello | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RecentHello>;
    if (!isHelloId(value.id) || typeof value.name !== "string" || typeof value.at !== "number") return null;
    if (Date.now() - value.at > KEEP_MS) return null;
    return { id: value.id, name: value.name, at: value.at };
  } catch {
    return null;
  }
}

export function forgetRecentHello(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Nothing to forget. */
  }
}
