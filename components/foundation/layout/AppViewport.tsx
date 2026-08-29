import type { ReactNode } from "react";

type AppViewportProps = {
  children: ReactNode;
  navigation: ReactNode;
};

/**
 * The protected app's physical frame.
 *
 * Page content owns the only vertical scroller. Persistent chrome is a sibling
 * of that scroller, which keeps it pinned to the device viewport regardless of
 * page length, iOS toolbar resizing, overscroll or route transitions.
 */
export default function AppViewport({
  children,
  navigation,
}: AppViewportProps) {
  return (
    <div
      data-app-viewport
      className="relative h-[100dvh] min-h-0 w-full overflow-hidden"
    >
      <div
        data-app-scroll-viewport
        className="h-full min-h-0 w-full overflow-y-auto overflow-x-clip overscroll-y-none"
      >
        {children}
      </div>

      {navigation}
    </div>
  );
}
