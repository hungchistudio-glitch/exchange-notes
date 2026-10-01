"use client";

import { useEffect } from "react";

import { MIN_AWAY_MS, checkForUpdate } from "@/lib/pwa/appUpdate";

/**
 * Reloads onto a newer build when the app comes back to the foreground
 * after a while away and the reader is not in the middle of anything.
 * The rules are in lib/pwa/appUpdate.ts. Draws nothing.
 */
export default function AppUpdateWatcher() {
  useEffect(() => {
    const running = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
    // A local build has no commit to compare.
    if (!running) return;

    let hiddenAt = document.visibilityState === "hidden" ? Date.now() : 0;
    let checking = false;

    const check = () => {
      if (checking) return;
      checking = true;
      void checkForUpdate({ running }).finally(() => {
        checking = false;
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      // A quick trip to another app — to copy a word, to answer a
      // message — should not come back to a page that just reloaded.
      if (away >= MIN_AWAY_MS) check();
    };

    // iOS can also restore a page from its back-forward cache, which fires
    // pageshow rather than a visibility change.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) check();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
