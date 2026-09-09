"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import OverlayPortal from "@/components/foundation/overlays/OverlayPortal";
import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";

type PwaInstallOverlayProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

// A minimal custom overlay (not the shared BottomSheet) since
// InstallPromptCard supplies its own icon/title layout rather than a
// generic header + body split.
export default function PwaInstallOverlay({ open, onClose, children }: PwaInstallOverlayProps) {
  const motion = useSheetMotion({ open, onClose });

  if (!motion.rendered) return null;

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden overscroll-none sm:items-center sm:px-4" role="presentation">
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
        {...motion.panelProps}
        className={`${motion.panelClassName} relative z-10 w-full max-w-md touch-pan-y overflow-y-auto overscroll-contain rounded-t-[30px] bg-surface px-6 pb-[max(28px,env(safe-area-inset-bottom))] text-black shadow-[0_-18px_60px_rgba(0,0,0,0.28)] sm:rounded-[30px] sm:pt-8 sm:shadow-2xl`}
        style={{
          ...motion.panelProps.style,
          maxHeight:
            "calc(100dvh - max(3rem, env(safe-area-inset-top)))",
        }}
      >
        <div
          className={`${motion.handleClassName} -mx-6 flex h-10 items-center justify-center sm:hidden`}
          {...motion.handleProps}
        >
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={motion.requestClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft transition-colors hover:bg-black/[0.08]"
        >
          <X size={15} strokeWidth={1.8} />
        </button>

        {children}
      </section>
      </div>
    </OverlayPortal>
  );
}
