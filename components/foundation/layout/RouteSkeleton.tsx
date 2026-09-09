/* =========================================================
   What a tab shows while its page is on its way

   Every destination in the dock is a dynamic route, and until now none of
   them had a loading boundary. In the App Router that means tapping a tab
   changed nothing at all on screen until the server had answered — the dock
   highlight did not move, the page did not dim, nothing. The tap read as
   dropped, and the app read as slow, on a wait that is usually a couple of
   hundred milliseconds.

   A boundary also makes prefetching worth something: Next prefetches a
   dynamic route only as far as its nearest loading file, so without one
   there was nothing to prefetch either.

   These are shapes, not spinners. A block where the header will be and rows
   where the rows will be means the arriving page settles into an outline
   that is already there, instead of replacing a spinner with a full screen.
   Deliberately calm — no shimmer sweeping across the screen, which draws the
   eye to the loading rather than to the content.

   Server Components, all of them: they ship no JavaScript, which matters for
   something whose entire job is to appear before anything else can.
   ========================================================= */

/** One placeholder block. `pulse` is the only motion any of these have. */
export function SkeletonBlock({
  className = "",
  rounded = "rounded-2xl",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`bg-black/[0.055] ${rounded} ${className}`}
      /*
       * Hidden from assistive technology entirely. A screen reader announces
       * the route change itself; a dozen nameless boxes announced on the way
       * would be noise, and there is nothing here anyone can act on.
       */
      aria-hidden="true"
    />
  );
}

/**
 * The frame every tab's skeleton sits in.
 *
 * `motion-safe` on the pulse, because a reader who has asked for less motion
 * should get a still outline rather than a page that breathes at them.
 */
export function RouteSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] bg-surface px-4 pt-[max(1rem,env(safe-area-inset-top))] motion-safe:animate-pulse"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading</span>
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </div>
  );
}

/** A run of list rows, which is what four of the six destinations are. */
export function SkeletonRows({
  count = 6,
  height = "h-[76px]",
}: {
  count?: number;
  height?: string;
}) {
  return (
    <div className="mt-5 space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock key={index} className={`w-full ${height}`} />
      ))}
    </div>
  );
}
