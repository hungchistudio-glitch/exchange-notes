"use client";

import { useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import styles from "@/components/scanner/MenuProcessing.module.css";

/*
 * Reading, understanding and translating happen inside one model call, so
 * these labels are a narration of a process the client cannot instrument —
 * paced against how long a menu actually takes rather than reported by the
 * server. That is honest as long as it never claims a stage *finished*: the
 * scan session's own state stays at ocr_processing until the answer lands,
 * and nothing here writes to it.
 */
const PHASE_STEPS_MS = [0, 2600, 7000, 14000];

type MenuProcessingProps = {
  image: string | null;
  onCancel: () => void;
};

export default function MenuProcessing({
  image,
  onCancel,
}: MenuProcessingProps) {
  const { t } = useTranslation();
  const copy = t.scanner.menu;

  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = PHASE_STEPS_MS.slice(1).map((delay, index) =>
      window.setTimeout(() => setPhase(index + 1), delay),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const phaseLabels = [
    copy.phaseReading,
    copy.phaseUnderstanding,
    copy.phaseTranslating,
    copy.phaseFinishing,
  ];

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {image ? (
        // The photo stays on screen, dimmed, so the wait is visibly about
        // the thing the user just pointed at.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
      ) : null}

      <div className="relative flex flex-1 flex-col items-center justify-center px-8">
        <div className={styles.core}>
          <span className={styles.ring} />
          <span className={`${styles.ring} ${styles.ringMiddle}`} />
          <span className={`${styles.ring} ${styles.ringInner}`} />
          <span className={styles.pupil} />
        </div>

        <p
          aria-live="polite"
          className="mt-8 text-[19px] font-semibold tracking-[-0.02em] text-white"
        >
          {phaseLabels[phase]}
        </p>

        <p className="mt-2 text-center text-[13px] leading-5 text-white/55">
          {copy.processingHint}
        </p>
      </div>

      <div
        className="relative flex justify-center px-8"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full bg-white/10 px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          {copy.cancel}
        </button>
      </div>
    </div>
  );
}
