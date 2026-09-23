"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Puts the keyboard on the setting the fragment names.
 *
 * Scrolling a row into view is the sighted half of "here it is". Without this
 * the other half never happened: the page moved, and focus stayed wherever it
 * was — usually the document body, at the top — so a reader using the keyboard
 * was told the answer was somewhere below and then given no way to reach it
 * but to tab through every group in between.
 *
 * The row's own control is preferred over the wrapper, because the control is
 * the thing you came to press. `preventScroll` keeps focus from doing its own
 * jump first; the scroll below is the one that honours the anchor's
 * scroll-margin-top and therefore clears the fixed header.
 */
export function focusSetting(id: string) {
  const anchor = document.getElementById(id);
  if (!anchor) return;

  const control = anchor.querySelector<HTMLElement>(
    'button:not([disabled]), a[href]:not([aria-disabled="true"]), input:not([disabled]), [tabindex="0"]',
  );

  (control ?? anchor).focus({ preventScroll: true });

  anchor.scrollIntoView({
    block: "start",
    /*
     * Instant, not the page's smooth default. A search result is a jump, not
     * a journey — animating past nine other settings on the way is both
     * slower and, for anyone who asked for reduced motion, wrong.
     */
    behavior: "instant",
  });
}

/**
 * A settings row, addressable.
 *
 * Settings search does not reach into a row and open it — it takes you to it
 * and points, which is `:target` and a 1.4s flash defined in globals.css. The
 * id is the whole mechanism: it works across a route change, it survives a
 * reload, and it costs no state anywhere.
 *
 * The effect is for the arrival that is not a search: a link into
 * `/profile/help#setting-tour` from another screen, or a reload of a URL that
 * already carries a fragment. The row exists only once this component has
 * mounted, which is after the browser has finished looking for it.
 */
export default function SettingsAnchor({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function focusIfTargeted() {
      if (window.location.hash === `#${id}`) focusSetting(id);
    }

    // A frame late on purpose: the row's own control may still be rendering
    // when this mounts, and focusing the wrapper instead would be the wrong
    // of the two.
    const frame = requestAnimationFrame(focusIfTargeted);
    window.addEventListener("hashchange", focusIfTargeted);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", focusIfTargeted);
    };
  }, [id]);

  return (
    /*
     * empty:hidden, because a row is allowed to decide it has nothing to
     * offer — the install row hides itself on a browser that cannot install
     * anything — and a wrapper with no content would otherwise leave a
     * divider line across the group with nothing under it.
     *
     * tabIndex -1 so focusSetting can land here when a row has no control of
     * its own to receive it. It stays out of the tab order either way.
     */
    <div id={id} tabIndex={-1} className="settings-anchor empty:hidden">
      {children}
    </div>
  );
}
