"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type PwaInstallOverlayProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

// A minimal custom overlay (not the shared BottomSheet) since
// InstallPromptCard supplies its own icon/title layout rather than a
// generic header + body split.
export default function PwaInstallOverlay({ open, onClose, children }: PwaInstallOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:px-4" role="presentation">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[30px] bg-surface px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-8 text-black shadow-[0_-18px_60px_rgba(0,0,0,0.28)] sm:rounded-[30px] sm:shadow-2xl"
      >
        <div className="mx-auto -mt-3 mb-4 h-1 w-10 rounded-full bg-black/15 sm:hidden" />

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.05] text-black/50 transition-colors hover:bg-black/[0.08]"
        >
          <X size={15} strokeWidth={1.8} />
        </button>

        {children}
      </section>
    </div>
  );
}
