"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useState } from "react";

import ActiveLaunch, { ACTIVE_LAUNCH } from "@/components/launch/activeLaunch";
import { setLaunching } from "@/lib/launchState";

const LAUNCH_GRACE_MS = 1200;
const SESSION_KEY = `exchange-notes:launch:${ACTIVE_LAUNCH.id}`;

function completedInThisTab() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "complete";
  } catch {
    // Private browsing or storage policy must never prevent entering the app.
    return false;
  }
}

/** Escape values for an inline script, including the HTML script terminator. */
function scriptValue(value: string) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** One complete opening per version, per browser-tab session. */
export default function SplashGate() {
  const gateId = useId();
  // Identical server and hydrating renders; browser storage is read at commit.
  const [visible, setVisible] = useState(true);

  const finish = useCallback(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "complete");
    } catch {
      // Finishing still releases the page when storage is unavailable.
    }
    setVisible(false);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;

    if (!visible || completedInThisTab()) {
      setLaunching(false);
      delete root.dataset.launching;
      // This storage reconciliation must finish before the hydration paint.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (visible) setVisible(false);
      return;
    }

    // Let the app load underneath, but pause its decorative motion and route
    // transitions so they do not compete with or paint above the opening.
    setLaunching(true);
    root.dataset.launching = "true";

    // Keep keyboard focus out of controls hidden beneath the opening. Retain
    // an existing inert state owned by another overlay when this one leaves.
    const viewport = document.querySelector<HTMLElement>("[data-app-viewport]");
    const previousInert = viewport?.getAttribute("inert") ?? null;
    viewport?.setAttribute("inert", "");

    return () => {
      setLaunching(false);
      delete root.dataset.launching;
      if (previousInert === null) viewport?.removeAttribute("inert");
      else viewport?.setAttribute("inert", previousInert);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    // A suspended or failed animation must never leave an opaque overlay up.
    const timer = window.setTimeout(
      finish,
      ACTIVE_LAUNCH.durationMs + LAUNCH_GRACE_MS,
    );

    return () => window.clearTimeout(timer);
  }, [finish, visible]);

  if (!visible) return null;

  return (
    <div id={gateId} suppressHydrationWarning>
      {/* Runs while HTML is parsed, before the overlay below can be painted.
          The layout effect handles client navigation, where scripts are inert. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem(${scriptValue(SESSION_KEY)})==="complete"){document.getElementById(${scriptValue(gateId)}).hidden=true}}catch{}`,
        }}
      />
      <ActiveLaunch onComplete={finish} />
    </div>
  );
}
