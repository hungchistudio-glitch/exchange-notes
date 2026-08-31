"use client";

/* =========================================================
   The focus confirmation

   Drawn only when the camera actually accepted a focus point — see the tap
   handler in TargetCamera. On hardware that cannot be aimed, nothing
   appears, because an animation over a lens that did not move tells the
   reader something untrue about their photograph.

   Deliberately stateless. The parent already knows when a tap happened,
   because a tap is an event it handled, and it clears the point on a timer
   from that same handler. Keeping a copy here would mean an effect that
   mirrors a prop into state, which is both a cascading render and a second
   place for "is the indicator up" to be wrong.
   ========================================================= */

type FocusIndicatorProps = {
  /** Cleared by the parent once the animation has had its moment. */
  point: { x: number; y: number; id: number } | null;
  label: string;
};

export default function FocusIndicator({ point, label }: FocusIndicatorProps) {
  if (!point) return null;

  return (
    <>
      {/*
        Keyed on the tap, so a second tap restarts the animation instead of
        leaving the first one to finish where the finger no longer is.
      */}
      <span
        key={point.id}
        className="pointer-events-none absolute h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 motion-safe:animate-[focusPulse_900ms_ease-out_forwards]"
        style={{
          left: point.x,
          top: point.y,
          filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.4))",
        }}
        aria-hidden="true"
      />

      {/*
        The same fact, said rather than drawn. Focus success is not left to
        a ring a screen-reader user cannot see, and not to colour.
      */}
      <span role="status" className="sr-only">
        {label}
      </span>

      <style>{`
        @keyframes focusPulse {
          0%   { transform: translate(-50%, -50%) scale(1.35); opacity: 0; }
          35%  { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
