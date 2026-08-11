import styles from "@/components/foundation/buttons/OrbitIconButton.module.css";

/**
 * The two turning arcs, on their own, to drop inside any round control.
 *
 * OrbitIconButton renders a `<button>`, which is no use for the controls that
 * are links — the camera and photo lookups navigate, and turning them into
 * buttons to get a decoration would be the wrong trade. Separating the rings
 * from the button means the treatment can go on anything round.
 *
 * The host needs `position: relative` and a circular radius; everything here
 * is absolutely positioned inside it and inert.
 */
export default function OrbitRings() {
  return (
    <>
      <span aria-hidden="true" className={styles.orbit} />
      <span aria-hidden="true" className={styles.orbitInner} />
    </>
  );
}
