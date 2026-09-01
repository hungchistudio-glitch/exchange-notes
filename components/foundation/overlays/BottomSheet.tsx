"use client";

import { ReactNode, useId } from "react";
import { X } from "lucide-react";

import OverlayPortal from "./OverlayPortal";
import useSheetMotion from "./useSheetMotion";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
  titleAction?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  description,
  titleAction,
  footer,
  className = "",
}: BottomSheetProps) {
  const titleId = useId();
  const motion = useSheetMotion({ open, onClose });

  if (!motion.rendered) return null;

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden overscroll-none sm:items-center sm:px-4"
        role="presentation"
      >
      <button
        type="button"
        aria-label="Close"
        onClick={motion.requestClose}
        className={`absolute inset-0 cursor-default bg-black/40 backdrop-blur-[2px] ${motion.backdropClassName}`}
        {...motion.backdropProps}
      />

        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          {...motion.panelProps}
          className={[
            motion.panelClassName,
            "relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-[30px]",
            "bg-surface text-black",
            "shadow-[0_-18px_60px_rgba(0,0,0,0.28)]",
            "sm:rounded-[30px] sm:shadow-2xl",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            ...motion.panelProps.style,
            maxHeight:
              "calc(100dvh - max(3rem, env(safe-area-inset-top)))",
          }}
        >
          <div
            className={`${motion.handleClassName} flex h-7 shrink-0 items-center justify-center sm:hidden`}
            {...motion.handleProps}
          >
            <span className="h-1 w-10 rounded-full bg-black/15" />
          </div>

          <header
            className={`${motion.handleClassName} flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4`}
            {...motion.handleProps}
          >
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[1.125rem] font-semibold tracking-[-0.025em] text-black"
            >
              {title}
            </h2>

            {description ? (
              <p className="mt-1 text-sm leading-5 text-ink-soft">
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {titleAction}

            <button
              type="button"
              aria-label="Close"
              title="Close"
              onClick={motion.requestClose}
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                "bg-black/[0.05] text-ink-soft",
                "transition-all hover:bg-black/[0.08] active:scale-95",
              ].join(" ")}
            >
              <X size={17} strokeWidth={1.8} />
            </button>
          </div>
          </header>

          <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-5">
            {children}
          </div>

          {footer ? (
            <footer className="shrink-0 border-t border-line bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
              {footer}
            </footer>
          ) : null}
        </section>
      </div>
    </OverlayPortal>
  );
}
