"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  className?: string;
};

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  description,
  footer,
  className = "",
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:px-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[var(--en-overlay)] backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        className={[
          "relative z-10 w-full max-w-md overflow-hidden rounded-t-[30px]",
          "bg-[var(--en-surface)] text-[var(--en-text-primary)]",
          "shadow-[0_-18px_60px_rgba(0,0,0,0.28)]",
          "sm:rounded-[30px] sm:shadow-[var(--en-shadow)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[var(--en-border-strong)] sm:hidden" />

        <header className="flex items-start justify-between gap-4 border-b border-[var(--en-border)] px-5 py-4">
          <div className="min-w-0">
            <h2
              id="bottom-sheet-title"
              className="text-[18px] font-semibold tracking-[-0.025em] text-[var(--en-text-primary)]"
            >
              {title}
            </h2>

            {description ? (
              <p className="mt-1 text-sm leading-5 text-[var(--en-text-tertiary)]">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Close"
            title="Close"
            onClick={onClose}
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              "bg-[var(--en-surface-secondary)] text-[var(--en-icon-secondary)]",
              "transition-all hover:bg-[var(--en-surface-hover)] active:scale-95",
            ].join(" ")}
          >
            <X
              size={17}
              strokeWidth={1.8}
            />
          </button>
        </header>

        <div className="max-h-[70dvh] overflow-y-auto px-5 py-5">
          {children}
        </div>

        {footer ? (
          <footer className="border-t border-[var(--en-border)] bg-[var(--en-surface)] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
