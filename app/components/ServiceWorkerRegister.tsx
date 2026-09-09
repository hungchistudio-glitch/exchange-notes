"use client";

import { useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";

/**
 * Registers the service worker and tells the user when a newer build has
 * taken over.
 *
 * Without this the app kept running whatever JavaScript it loaded at start-up.
 * The worker itself updates fine — sw.js calls skipWaiting and clients.claim
 * — but an installed PWA resumed from the background often never reloads, so
 * a phone could sit on a build from days ago while production had moved on.
 *
 * The usual `registration.waiting` check does not apply here precisely because
 * of that skipWaiting: the new worker never parks in the waiting state. What
 * does happen is that it activates and claims the page, so `controllerchange`
 * is the signal that the code on screen is now older than the worker serving
 * it.
 */
export default function ServiceWorkerRegister() {
  const { t } = useTranslation();
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Captured before registering: on a first-ever install there is no
    // controller and the resulting controllerchange is just the worker taking
    // over for the first time, not a new version of anything.
    const hadController = Boolean(navigator.serviceWorker.controller);

    let registration: ServiceWorkerRegistration | null = null;

    void navigator.serviceWorker
      .register("/sw.js")
      .then((current) => {
        registration = current;
      })
      .catch(() => {});

    function handleControllerChange() {
      if (!hadController) return;
      setUpdateReady(true);
    }

    // Returning to the foreground is the moment worth spending a request on:
    // it is when a resumed PWA is most likely to be running stale code.
    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      void registration?.update().catch(() => {});
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (!updateReady || dismissed) return null;

  const copy = t.pwa;

  return (
    <div
      role="status"
      className={[
        "fixed inset-x-3 z-[200] flex items-center gap-3 rounded-full",
        "bottom-[max(18px,env(safe-area-inset-bottom))]",
        "border border-white/10 bg-black/90 px-4 py-3 text-white",
        "shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur",
        "sm:inset-x-auto sm:left-1/2 sm:w-auto sm:-translate-x-1/2",
      ].join(" ")}
    >
      <p className="flex-1 text-[0.8125rem] font-medium">{copy.updateReadyTitle}</p>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] text-ink-invert-soft transition active:scale-95"
      >
        {copy.updateReadyDismiss}
      </button>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-full bg-white px-4 py-1.5 text-[0.8125rem] font-semibold text-black transition active:scale-95"
      >
        {copy.updateReadyAction}
      </button>
    </div>
  );
}
