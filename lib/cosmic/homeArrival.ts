/* =========================================================
   How the Cosmic home comes in (Chi, 2026-11-12: the obsidian bridge)

   One owner for the home's arrival, so a mount is not taken for a launch:

   | what happened                          | the home                     |
   |----------------------------------------|------------------------------|
   | first Cosmic home of this app runtime  | the full wake, about 900ms   |
   | back from another page                 | a 200ms fade, nothing moves  |
   | the mode switch brought it in          | nothing: the switch's own    |
   |                                        | sequence carries it          |
   | the opening is playing                 | waits for it, then the wake  |
   | reduced motion                         | nothing                      |

   "This app runtime" is this document: a reload or a relaunched PWA is a
   new one, a return from the background is not. A module-level flag is
   exactly that, and it survives route remounts and StrictMode's double
   mount (state is kept across those; the flag is only read as the home
   first renders and spent once it has decided).
   ========================================================= */

export type HomeArrival = "full" | "return" | "waiting" | "none";

/** The full wake: from the first frame to Yumi at rest. */
export const HOME_WAKE_MS = 900;
/** Coming back from another page. */
export const HOME_RETURN_MS = 200;

let seen = false;

/** What a home rendering now would play: read only, so render can call it. */
export function arrivalOnMount(): HomeArrival {
  return seen ? "return" : "full";
}

/** The first home of this runtime has decided; later ones only fade in. */
export function spendFirstArrival() {
  seen = true;
}

/** For tests: a fresh runtime. */
export function resetHomeArrivalForTests() {
  seen = false;
}
