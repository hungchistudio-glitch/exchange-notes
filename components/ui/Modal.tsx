"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

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
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-end
        justify-center
        bg-[#252821]/35
        p-0
        backdrop-blur-[3px]
        sm:items-center
        sm:p-5
      "
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`
          max-h-[90vh]
          w-full
          max-w-[520px]
          overflow-y-auto
          rounded-t-[28px]
          border
          border-[#E3E3DC]
          bg-[#FCFCF9]
          shadow-2xl
          sm:rounded-[28px]
          ${className}
        `}
      >
        <div className="sticky top-0 z-10 flex items-start gap-4 border-b border-[#E8E8E2] bg-[#FCFCF9]/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#2F312D]">
                {title}
              </h2>
            ) : null}

            {description ? (
              <div className="mt-1 text-sm leading-5 text-[#666A63]">
                {description}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="
              en-focus-ring
              inline-flex
              size-10
              shrink-0
              items-center
              justify-center
              rounded-2xl
              text-[#666A63]
              transition
              hover:bg-[#E7EEE4]
              hover:text-[#394A35]
            "
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5">
          {children}
        </div>

        {footer ? (
          <div className="sticky bottom-0 border-t border-[#E8E8E2] bg-[#FCFCF9]/95 px-5 py-4 backdrop-blur">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
