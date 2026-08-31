import { notFound } from "next/navigation";

/* =========================================================
   Screens that exist for whoever is building the app

   There are five of these — the vocabulary search field, the brand sheet,
   the tour, the launch animation and the Yumi opening — and every one of
   them answered 200 on the live site. They are not secret and they are not
   dangerous, but they are development furniture: unfinished states, seeded
   fixtures, and components mounted outside the flow they belong to. A
   reader who lands on one has found a part of the workshop, and a search
   engine that indexes one has indexed a page nobody meant to publish.

   They stay everywhere else. `preview` is the deployment a pull request
   gets, and being able to open a review screen on a phone against a branch
   is how the camera's stacking bug was actually reproduced — closing that
   off to tidy up production would cost more than it saved.
   ========================================================= */

/**
 * Ends the request with a 404 when this is the live site.
 *
 * Keyed on VERCEL_ENV rather than NODE_ENV, which is "production" for
 * preview deployments too and would take these away from the one place they
 * are most useful.
 */
export function reviewRouteOnly() {
  if (process.env.VERCEL_ENV === "production") notFound();
}
