"use client";

import { useState } from "react";

import ActiveLaunch from "@/components/launch/activeLaunch";

/**
 * The opening, on every load of a signed-in page.
 *
 * There used to be a sessionStorage flag here so it played "once per
 * session". In an installed PWA that is the wrong unit: iOS keeps the web
 * app's session alive across backgrounding, so the flag survived the app
 * being closed and reopened, and the opening played exactly once ever and
 * was silently skipped from then on. Reopening the app is precisely when an
 * opening animation is supposed to run.
 *
 * There is no gate now. It plays whenever this layout mounts, which is once
 * per document load — soft navigation between protected pages keeps the
 * layout, so moving around inside the app does not replay it.
 */
export default function SplashGate() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return <ActiveLaunch onComplete={() => setVisible(false)} />;
}
