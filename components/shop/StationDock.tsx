import styles from "./StationDock.module.css";

/* =========================================================
   Station 33's docking pad

   The stand Yumi is tried on in: a beam from above, a brushed-alloy pad
   with a lit rim, three running lights on its front (her three fingers) and
   a contact shadow under her. One component for the shop's stand and for
   the landing page's story, so the Station 33 a stranger sees there is the
   one they will shop in.

   Coloured by the shop's --shop-plinth-* and --shop-spot tokens where they
   are set (the shop sets them per mode); elsewhere it falls back to the
   Standard pad.
   ========================================================= */

export default function StationDock({ className }: { className?: string }) {
  return (
    <div className={`${styles.dock} ${className ?? ""}`} aria-hidden="true">
      <div className={styles.spotlight} />
      <div className={styles.pedestal}>
        <span className={styles.plinthSide} />
        <span className={styles.plinthTop} />
        <span className={styles.contactShadow} />
      </div>
    </div>
  );
}
