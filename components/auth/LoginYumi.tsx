import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";

import styles from "./LoginYumi.module.css";

/**
 * Yumi at the top of the sign-in card (Chi, 2026-10-24: the card was plain
 * beside the landing page's orbits and character). She floats in a slow
 * orbit with two satellites, breathing, blinking and glancing with the
 * app's shared idle (app/yumi-motion.css), and she is the first thing a new
 * reader meets, as she is on the landing page.
 *
 * Both of her refits are drawn and CSS shows the one for the mode the
 * document is in: this page has no mode context, and reading the cookie on
 * the client would draw the wrong one first. Decorative; the title names
 * the app.
 */
export default function LoginYumi() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <span className={styles.orbit}>
        <i className={styles.satellite} />
        <i className={`${styles.satellite} ${styles.satelliteFar}`} />
      </span>
      <div className={`${styles.float} yumi-breath`}>
        <ExchangeNotesMark
          className={`${styles.mark} ${styles.standard}`}
          pupilClassName="yumi-glance"
          upperLidClassName="yumi-blink-upper"
          lowerLidClassName="yumi-blink-lower"
        />
        <ExchangeNotesMark
          className={`${styles.mark} ${styles.cosmic}`}
          cosmic
          energy={0.4}
          pupilClassName="yumi-glance"
          upperLidClassName="yumi-blink-upper"
          lowerLidClassName="yumi-blink-lower"
          irisClassName="yumi-iris"
          sweepClassName="yumi-sweep"
        />
      </div>
    </div>
  );
}
