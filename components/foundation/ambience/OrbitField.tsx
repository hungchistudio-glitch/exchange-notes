import styles from "@/components/foundation/ambience/OrbitField.module.css";

/**
 * The app's ambient orbital lines.
 *
 * Mounted once in the root layout, which is the only place that reaches every
 * route and sub-route — six pages render through Screen and eight do not, so
 * neither of those alone would have covered the app.
 *
 * Deliberately not a client component. There is no state, no effect and no
 * listener here; it is three divs and a stylesheet, so it costs nothing to
 * hydrate and adds nothing to the bundle a page has to run.
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
    </div>
  );
}
