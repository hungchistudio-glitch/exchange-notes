"use client";

import { Brain, ScanLine, Sparkles, X } from "lucide-react";

import type { TranslationDictionary } from "@/lib/i18n/types";
import type {
  YumiLookTarget,
  YumiOrbitPhase,
} from "@/hooks/pet/useYumiOrbitMenu";

import styles from "./YumiOrbitMenu.module.css";

type MascotCopy = TranslationDictionary["vocabulary"]["mascot"];

type YumiOrbitMenuProps = {
  phase: YumiOrbitPhase;
  showHints?: boolean;
  copy: MascotCopy;
  onClose: () => void;
  onLook: (target: YumiLookTarget) => void;
  onReview: () => void;
  onAddWord: () => void;
  onCamera: () => void;
};

export default function YumiOrbitMenu({
  phase,
  showHints = false,
  copy,
  onClose,
  onLook,
  onReview,
  onAddWord,
  onCamera,
}: YumiOrbitMenuProps) {
  if (phase === "closed") return null;

  const activate = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        data-phase={phase}
        data-show-hints={showHints}
        onClick={onClose}
        aria-label={copy.closeActionsAriaLabel}
      />

      <div
        className={styles.menu}
        data-phase={phase}
        role="group"
        aria-label={copy.actionMenuAriaLabel}
      >
        <span className={styles.orbitLine} aria-hidden="true" />
        <span className={styles.signalRing} aria-hidden="true" />

        <button
          type="button"
          className={`${styles.action} ${styles.reviewAction}`}
          onPointerEnter={() => onLook("review")}
          onPointerLeave={() => onLook("viewer")}
          onFocus={() => onLook("review")}
          onBlur={() => onLook("viewer")}
          onClick={() => activate(onReview)}
          aria-label={copy.reviewActionLabel}
          data-tooltip={copy.reviewActionLabel}
        >
          <Brain size={22} strokeWidth={1.65} />
        </button>

        <button
          type="button"
          className={`${styles.action} ${styles.addAction}`}
          onPointerEnter={() => onLook("add")}
          onPointerLeave={() => onLook("viewer")}
          onFocus={() => onLook("add")}
          onBlur={() => onLook("viewer")}
          onClick={() => activate(onAddWord)}
          aria-label={copy.addWordActionLabel}
          data-tooltip={copy.addWordActionLabel}
        >
          <Sparkles size={22} strokeWidth={1.65} />
        </button>

        <button
          type="button"
          className={`${styles.action} ${styles.cameraAction}`}
          onPointerEnter={() => onLook("camera")}
          onPointerLeave={() => onLook("viewer")}
          onFocus={() => onLook("camera")}
          onBlur={() => onLook("viewer")}
          onClick={() => activate(onCamera)}
          aria-label={copy.cameraActionLabel}
          data-tooltip={copy.cameraActionLabel}
        >
          <ScanLine size={22} strokeWidth={1.6} />
        </button>

        <button
          type="button"
          className={styles.closeAction}
          onClick={onClose}
          aria-label={copy.closeActionsAriaLabel}
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      </div>
    </>
  );
}
