import styles from "./YumiLoading.module.css";

/* =========================================================
   What stands where Yumi will be, until she is there

   Every place that draws the 3D Yumi used to put the flat 2D mark in her
   spot while three.js was still arriving, and leave it there for good on a
   device that could not start WebGL. That was the old Yumi — a different
   character, in a different style — appearing for a moment on every cold
   load and then being swapped for the real one. Chi (2026-10-15): there is
   one Yumi, the 3D one, and nothing else gets to stand in for her.

   So the space holds a hairline ring with a short band of light running
   round it: it says "something is arriving here" without being a picture of
   anything, and it is the same in every place she loads.

   - `loading`      the band runs. It waits a quarter of a second before it
                    shows at all, so a warm load (the scene parked from the
                    last visit, a cached chunk) never flashes a loader.
   - `unavailable`  the scene could not start. The ring stays, still and
                    faint, so the layout around it does not collapse, and no
                    substitute character appears.
   - `done`         she is drawn. The ring fades out under her fade-in
                    rather than being cut, so the two cross.

   Decorative throughout: every caller's Yumi is decorative too, and a
   screen reader has nothing to gain from hearing that a picture is loading.
   ========================================================= */

export type YumiLoadingState = "loading" | "unavailable" | "done";

export default function YumiLoading({
  state = "loading",
  className,
}: {
  state?: YumiLoadingState;
  className?: string;
}) {
  return (
    <div
      className={`${styles.loader} ${className ?? ""}`}
      data-yumi-loading={state}
      aria-hidden="true"
    >
      <span className={styles.ring}>
        <span className={styles.band} />
      </span>
    </div>
  );
}
