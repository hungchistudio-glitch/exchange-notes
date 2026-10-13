'use client';
import EnergyCookie from './EnergyCookie';
import styles from './EnergyReward.module.css';
export default function EnergyReward({amount,label}:{amount:number;label:string}) {
 return <div className={styles.reward} role="status" aria-live="polite">
  <span className={styles.yumi} aria-hidden="true"><i /></span>
  <EnergyCookie className={styles.cookie}/><strong>+{amount}</strong><span>{label}</span>
 </div>;
}
