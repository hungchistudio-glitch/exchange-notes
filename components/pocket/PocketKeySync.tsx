"use client";

import { useEffect } from "react";

import { ensurePocketKey } from "@/lib/pocket/device";

/**
 * Inside the iPhone app, gives Yumi Pocket Lookup's share extension its own
 * key the first time the reader is signed in on this phone
 * (lib/pocket/device.ts). Elsewhere it does nothing.
 */
export default function PocketKeySync() {
  useEffect(() => {
    void ensurePocketKey().catch(() => undefined);
  }, []);
  return null;
}
