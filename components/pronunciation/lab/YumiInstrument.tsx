"use client";

import type { YumiInstrument as InstrumentKind } from "@/lib/pronunciation/lab/types";

import styles from "./YumiInstrument.module.css";

type YumiInstrumentProps = {
  instrument: InstrumentKind;
  /** Whether Yumi is doing something. Nothing moves when she is not. */
  active: boolean;
};

/**
 * The instrument Yumi is calibrated with, drawn around her.
 *
 * Each language gets a different one because each language measures a
 * different thing: English scans phonemes, Chinese traces pitch, Spanish
 * counts syllables, French listens for nasal resonance, Italian gates
 * length. The difference is phonetic science, deliberately and only — no
 * costume, no flag, no national ornament anywhere near it.
 *
 * A new language adds a case here and a line in its pack. Missing one is
 * not a failure state: the switch is exhaustive, so the compiler asks for
 * it at the moment the instrument type gains a member.
 */
export default function YumiInstrument({
  instrument,
  active,
}: YumiInstrumentProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${styles.instrument} ${active ? styles.active : ""}`}
      aria-hidden="true"
    >
      {renderInstrument(instrument)}
    </svg>
  );
}

function renderInstrument(instrument: InstrumentKind) {
  switch (instrument) {
    case "phoneme-waveform":
      return (
        <>
          <path
            className={`${styles.line} ${styles.faint}`}
            d="M8 100 H192"
          />
          <path
            className={`${styles.line} ${styles.wave}`}
            d="M8 100 q10 -26 20 0 t20 0 q10 -34 20 0 t20 0 q10 -20 20 0 t20 0 q10 -30 20 0 t20 0"
          />
        </>
      );

    case "tone-contour":
      return (
        <>
          <path className={`${styles.line} ${styles.faint}`} d="M14 62 H186" />
          <path className={`${styles.line} ${styles.faint}`} d="M14 138 H186" />
          <path
            className={styles.line}
            d="M18 78 C 60 78, 74 62, 96 62 C 122 62, 130 128, 152 128 C 168 128, 176 96, 184 84"
          />
          <circle className={styles.contourDot} cx="96" cy="62" r="3.4" />
        </>
      );

    case "syllable-pulse":
      return (
        <>
          <path className={`${styles.line} ${styles.faint}`} d="M18 168 H182" />
          <rect className={styles.pulseBar} x="34" y="146" width="7" height="20" rx="3.5" />
          <rect className={styles.pulseBar} x="76" y="134" width="7" height="32" rx="3.5" />
          <rect className={styles.pulseBar} x="118" y="146" width="7" height="20" rx="3.5" />
          <rect className={styles.pulseBar} x="160" y="140" width="7" height="26" rx="3.5" />
        </>
      );

    case "nasal-resonance":
      return (
        <>
          <path className={styles.resonanceArc} d="M62 34 A 76 76 0 0 1 62 166" />
          <path className={styles.resonanceArc} d="M44 22 A 96 96 0 0 1 44 178" />
          <path className={styles.resonanceArc} d="M26 10 A 116 116 0 0 1 26 190" />
        </>
      );

    case "consonant-length":
      return (
        <>
          <path className={`${styles.line} ${styles.faint}`} d="M18 168 H182" />
          <rect className={styles.gate} x="42" y="152" width="18" height="14" rx="4" />
          <rect
            className={`${styles.gate} ${styles.gateLong}`}
            x="98"
            y="152"
            width="58"
            height="14"
            rx="4"
          />
        </>
      );
  }
}
