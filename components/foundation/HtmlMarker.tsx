"use client";

import { useLayoutEffect } from "react";

import InlineScript from "./InlineScript";

/* =========================================================
   A flag on <html> for as long as something is on screen

   Two global stylesheets used to ask "is this element anywhere on the
   page?" with :has() on <html> and <body>: body:has([data-app-viewport])
   for "inside the app" (app/tactile.css) and html:has(.cosmic-settings-page)
   for the graphite settings finish (app/cosmic-settings.css). Both read
   well, and both made every DOM change on every page restyle the whole
   page: Chrome cannot tell which subject an inserted element might affect,
   so it re-checks <html> and <body> and replays every rule hung off them.
   Measured 2026-10-16 on a production build, 20 tiny insertions and
   removals: 7,500 elements restyled (~190ms) on the landing page, 35,600
   (290–430ms) on the vocabulary list and 9,600 on Settings, against 360,
   680 and 690 (11–19ms) with these flags.

   The flag says the same thing without asking. It goes up while the HTML is
   still being parsed (InlineScript, at the very point the :has() would
   have started to match, so the first paint is unchanged) and on a client
   navigation as the component mounts, and it comes down when the last one
   unmounts, which is when the :has() would have stopped matching. It lives
   on <html> because <html> already tolerates attributes written before
   hydration (suppressHydrationWarning in app/layout.tsx); <body> does not.
   ========================================================= */

export type HtmlMarkerName =
  /** data-app-shell: the app's viewport is on the page (AppViewport). */
  | "appShell"
  /** data-cosmic-settings: a settings page is on the page. */
  | "cosmicSettings";

const mounted = new Map<HtmlMarkerName, number>();

export default function HtmlMarker({ name }: { name: HtmlMarkerName }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    mounted.set(name, (mounted.get(name) ?? 0) + 1);
    root.dataset[name] = "";
    return () => {
      const left = (mounted.get(name) ?? 1) - 1;
      mounted.set(name, left);
      if (left === 0) delete root.dataset[name];
    };
  }, [name]);

  return <InlineScript html={`document.documentElement.dataset.${name}=""`} />;
}
