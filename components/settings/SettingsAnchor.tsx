import type { ReactNode } from "react";

/**
 * A settings row, addressable.
 *
 * Settings search does not reach into a row and open it — it takes you to it
 * and points, which is `:target` and a 1.4s flash defined in globals.css. The
 * id is the whole mechanism: it works across a route change, it survives a
 * reload, and it costs no state anywhere.
 */
export default function SettingsAnchor({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    /*
     * empty:hidden, because a row is allowed to decide it has nothing to
     * offer — the install row hides itself on a browser that cannot install
     * anything — and a wrapper with no content would otherwise leave a
     * divider line across the group with nothing under it.
     */
    <div id={id} className="settings-anchor empty:hidden">
      {children}
    </div>
  );
}
