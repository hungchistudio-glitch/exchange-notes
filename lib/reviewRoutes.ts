import { notFound } from "next/navigation";

/* =========================================================
   Screens that exist for whoever is building the app

   Six of these shipped before this guard existed — the vocabulary search
   field, the brand sheet, the tour, the launch animation and the two Yumi
   openings — and every one of them answered 200 on the live site. There are
   more now; the number is deliberately not restated here, so it cannot go
   stale. They are not secret and they are not dangerous, but they are
   development furniture: unfinished states, seeded fixtures, and components
   mounted outside the flow they belong to. A reader who lands on one has
   found part of the workshop, and a search engine that indexes one has
   indexed a page nobody meant to publish.

   This asks to be let in rather than asking to be kept out, and that is the
   whole design of it. The first version tested `VERCEL_ENV !== "production"`
   — which reads correctly, shipped, and left all six answering 200 on the
   live site, because that variable does not reach the runtime here unless a
   project setting exposes it, and an absent variable is not "production".
   A guard that fails open is not a guard.

   NODE_ENV is set by the framework itself and is always there.
   ========================================================= */

/**
 * Ends the request with a 404 anywhere that is not a development machine.
 *
 * VERCEL_ENV is still consulted, but only to *widen* access to preview
 * deployments — being able to open a review screen on a phone against a
 * branch is how the camera's stacking bug was actually reproduced. If that
 * variable is absent, previews lose these screens and production stays
 * closed, which is the right way for this to fail.
 */
export function reviewRouteOnly() {
  const development = process.env.NODE_ENV === "development";
  const preview = process.env.VERCEL_ENV === "preview";

  if (!development && !preview) notFound();
}
