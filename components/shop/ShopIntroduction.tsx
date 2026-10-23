"use client";

import { useId, useState, type ReactNode } from "react";
import { Orbit } from "lucide-react";
import styles from "./YumiShop.module.css";

// Static engraving keeps the coin crisp at every display scale.
function CoinEngraving() {
  return <svg className={styles.coinEngraving} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <circle cx="50" cy="50" r="43" strokeWidth="1.5" strokeDasharray=".1 3.3" strokeLinecap="round" />
    <circle cx="50" cy="50" r="37.5" strokeWidth=".6" />
    <path d="M28 71Q17 57 25 38M72 71Q83 57 75 38" strokeWidth=".8" />
    <path d="M25 65q-8-2-7-8 7 1 7 8Zm-3-9q-6-4-4-9 6 3 4 9Zm1-9q-4-6 0-10 4 4 0 10Zm52 18q8-2 7-8-7 1-7 8Zm3-9q6-4 4-9-6 3-4 9Zm-1-9q4-6 0-10-4 4 0 10Z" strokeWidth=".5" />
    <path d="m50 20 2 3-2 3-2-3Zm0 54 2 3-2 3-2-3Z" fill="currentColor" stroke="none" />
  </svg>;
}

/** One state drives both faces and the disclosure. CSS reverses smoothly
 * on repeated taps; no timers can leave the story open after a close. */
export default function ShopIntroduction({ openLabel, closeLabel, children }: {
  openLabel: string; closeLabel: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={styles.introduction} data-open={open}>
      <button type="button" className={styles.coinTrigger} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
        <span className={styles.coinPerspective} aria-hidden="true">
          <span className={styles.coinTurn}>
            <span className={`${styles.coinFace} ${styles.coinFront}`}>
              <CoinEngraving />
              <span className={styles.coinNumerals}>33</span>
            </span>
            <span className={`${styles.coinFace} ${styles.coinBack}`}><CoinEngraving /><Orbit className={styles.coinEmblem} size={27} strokeWidth={1} /></span>
          </span>
        </span>
        <span className={styles.coinPrompt}>{open ? closeLabel : openLabel}<span aria-hidden="true">{open ? " −" : " +"}</span></span>
      </button>
      <div id={id} className={styles.coinDisclosure} aria-hidden={!open} inert={!open}>
        <div className={styles.coinDisclosureInner}>{children}</div>
      </div>
    </div>
  );
}
