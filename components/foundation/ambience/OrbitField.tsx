import type { CSSProperties } from "react";

import styles from "@/components/foundation/ambience/OrbitField.module.css";

/*
 * Meteors, near to far. Cosmic Mode only — see the CSS.
 *
 * Every value in a row is doing the same job: selling one distance. Read down
 * any column and the ramp is monotonic — the near one is 92px long and covers
 * 270px a second, the far one is 36px and covers 60 — which is what stops the
 * five from looking like one meteor drawn five times.
 *
 * The angles are shallow, between 14° and 22°, and that is not a style choice.
 * This layer's mask cuts the middle of the screen out entirely so ambience
 * never lands where reading happens, so a steep meteor would spend most of its
 * life inside the hole. Shallow ones stay in the top and bottom bands where
 * the layer is actually visible, and the starts are placed in those same bands
 * for the same reason.
 *
 * Each is visible for about a quarter of its own cycle, so the average on
 * screen at any moment is a little over one: continuous, not constant. Five
 * durations that do not divide, with negative delays, so the sky already has
 * traffic on arrival and the pattern does not come back around for an hour.
 */
const METEORS: Array<{
  x: string;
  y: string;
  angle: string;
  length: string;
  travel: string;
  peak: string;
  duration: string;
  delay: string;
}> = [
  {
    x: "-20%",
    y: "6%",
    angle: "18deg",
    length: "92px",
    travel: "560px",
    peak: "0.9",
    duration: "8s",
    delay: "-2.2s",
  },
  {
    x: "25%",
    y: "-6%",
    angle: "15deg",
    length: "76px",
    travel: "480px",
    peak: "0.8",
    duration: "10.5s",
    delay: "-6.7s",
  },
  {
    x: "-22%",
    y: "68%",
    angle: "20deg",
    length: "60px",
    travel: "410px",
    peak: "0.7",
    duration: "13s",
    delay: "-11.9s",
  },
  {
    x: "40%",
    y: "76%",
    angle: "16deg",
    length: "46px",
    travel: "350px",
    peak: "0.58",
    duration: "16s",
    delay: "-15.3s",
  },
  {
    x: "-15%",
    y: "22%",
    angle: "22deg",
    length: "36px",
    travel: "300px",
    peak: "0.46",
    duration: "19.5s",
    delay: "-18.8s",
  },
];

/**
 * The app's ambient orbital lines, and — in Cosmic Mode — its meteors.
 *
 * Mounted once in the root layout, which is the only place that reaches every
 * route and sub-route — six pages render through Screen and eight do not, so
 * neither of those alone would have covered the app.
 *
 * The meteors are here rather than in the Command Deck because they are the
 * sky, and the sky is not a property of one page. They share this layer with
 * the arcs, and that works for the same reason the arcs work: a hairline that
 * exists for two seconds can be painted over the page without being in
 * anyone's way. Their planets could not, and are not here — a body large
 * enough to read as a world would read as a defect sitting on a card, so it
 * had to go behind the page instead. It is painted into the body's background
 * in app/cosmic.css.
 *
 * Deliberately not a client component. There is no state, no effect and no
 * listener here; it is markup and a stylesheet, so it costs nothing to hydrate
 * and adds nothing to the bundle a page has to run. Cosmic Mode is selected in
 * CSS off the attribute the root layout already writes on <html>, which is why
 * this needs no context and no mode prop — in Standard Mode the five meteors
 * are display: none and animate nothing.
 *
 * aria-hidden and pointer-events: none. Nothing here is content and nothing
 * here can be in the way of a tap.
 */
export default function OrbitField() {
  return (
    <div className={styles.field} aria-hidden="true">
      <div className={`${styles.orbit} ${styles.orbitA}`}>
        <span className={styles.ring} />
        <span className={styles.comet} />
      </div>

      <div className={`${styles.orbit} ${styles.orbitB}`}>
        <span className={`${styles.ring} ${styles.ringSolid}`} />
        <span className={`${styles.comet} ${styles.cometCool}`} />
      </div>

      <div className={`${styles.orbit} ${styles.orbitC}`}>
        <span className={styles.ring} />
      </div>

      {/* Last, so a meteor passes in front of the arcs rather than behind
          them — it is the only thing on this layer that is travelling. */}
      {METEORS.map((meteor) => (
        <span
          key={meteor.duration}
          className={styles.meteor}
          style={
            {
              "--meteor-x": meteor.x,
              "--meteor-y": meteor.y,
              "--meteor-angle": meteor.angle,
              "--meteor-length": meteor.length,
              "--meteor-travel": meteor.travel,
              "--meteor-peak": meteor.peak,
              "--meteor-duration": meteor.duration,
              "--meteor-delay": meteor.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
