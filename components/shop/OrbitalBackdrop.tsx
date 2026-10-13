import styles from './OrbitalBackdrop.module.css';
/** Painted once: a station window, Earth limb and a few fixed stars. */
export default function OrbitalBackdrop(){return <div className={styles.window} aria-hidden="true">
 <div className={styles.stars}/><div className={styles.orbit}/><div className={styles.earth}><span/></div><div className={styles.glass}/>
 <div className={styles.coordinate}>33 / EARTH ORBIT</div>
</div>}
