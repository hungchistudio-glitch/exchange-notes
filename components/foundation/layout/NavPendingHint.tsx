"use client";

import { useLinkStatus } from "next/link";

/* =========================================================
   The tap answers before the page does

   Even with a loading boundary there is a beat between the finger coming
   off the glass and the new route's skeleton appearing — the request has to
   leave and come back. On a slow connection that beat is long enough for a
   reader to conclude the tap missed and press again, which is where "it
   feels stuck" comes from.

   So the tab itself says it heard. useLinkStatus reports the pending state
   of the Link it sits inside, and this draws a quiet ring while that is
   true. It is deliberately the smallest thing that could work: no spinner,
   no colour change, nothing that competes with the destination arriving.

   Next's own guidance is that a loading boundary is the real fix and this
   is for the gap around it — which is exactly how both are used here.
   ========================================================= */

export default function NavPendingHint() {
  const { pending } = useLinkStatus();

  return (
    <span
      /*
       * Purely decorative, and the state it reflects is already carried
       * properly: the route change is announced by the browser, and the
       * skeleton it precedes is a live region. A second announcement of
       * "loading" from a nameless ring would be noise.
       */
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-full ring-current transition-opacity duration-200 motion-reduce:transition-none ${
        pending ? "opacity-30 ring-2" : "opacity-0 ring-0"
      }`}
    />
  );
}
