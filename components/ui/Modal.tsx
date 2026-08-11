"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";

import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";

type ModalProps = {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
};

export default function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  className = "",
}: ModalProps) {
  const titleId = useId();
  const motion = useSheetMotion({ open, onClose });

  if (!motion.rendered) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-end
        justify-center
        p-0
        sm:items-center
        sm:p-5
      "
    >
      <button
        type="button"
        aria-label="Close"
        onClick={motion.requestClose}
        className={`absolute inset-0 bg-[var(--modal-scrim)]/35 backdrop-blur-[3px] ${motion.backdropClassName}`}
        {...motion.backdropProps}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        {...motion.panelProps}
        className={`
          ${motion.panelClassName}
          relative
          z-10
          max-h-[90vh]
          w-full
          max-w-[520px]
          overflow-y-auto
          rounded-t-[28px]
          border
          border-line
          bg-[var(--modal-surface)]
          shadow-2xl
          sm:rounded-[28px]
          ${className}
        `}
      >
        <div
          className={`${motion.handleClassName} flex h-7 items-center justify-center sm:hidden`}
          {...motion.handleProps}
        >
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        <div
          className={`${motion.handleClassName} sticky top-0 z-10 flex items-start gap-4 border-b border-line bg-[var(--modal-surface)]/95 px-5 py-4 backdrop-blur`}
          {...motion.handleProps}
        >
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 id={titleId} className="text-xl font-semibold tracking-[-0.025em] text-[var(--modal-ink)]">
                {title}
              </h2>
            ) : null}

            {description ? (
              <div className="mt-1 text-sm leading-5 text-[var(--modal-muted)]">
                {description}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={motion.requestClose}
            className="
              en-focus-ring
              inline-flex
              size-10
              shrink-0
              items-center
              justify-center
              rounded-2xl
              text-[var(--modal-muted)]
              transition
              hover:bg-[var(--modal-line)]
              hover:text-[var(--modal-accent)]
            "
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5">
          {children}
        </div>

        {footer ? (
          <div className="sticky bottom-0 border-t border-line bg-[var(--modal-surface)]/95 px-5 py-4 backdrop-blur">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
