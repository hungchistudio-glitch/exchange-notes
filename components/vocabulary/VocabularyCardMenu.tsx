"use client";

import {
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";

type Props = {
  word: string;
  disabled?: boolean;
  onEdit: () => void;
  onShare: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

export default function VocabularyCardMenu({
  word,
  disabled = false,
  onEdit,
  onShare,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

  const finishClose = useCallback(() => {
    setOpen(false);
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pendingAction) void pendingAction();
  }, []);

  const motion = useSheetMotion({ open, onClose: finishClose });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleTriggerClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (!disabled) {
      setOpen(true);
    }
  }

  function runAction(action: () => void | Promise<void>) {
    pendingActionRef.current = action;
    motion.requestClose();
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={handleTriggerClick}
        aria-label={`More actions for ${word}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-600 transition-colors hover:bg-neutral-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MoreHorizontal size={18} />
      </button>

      {mounted && motion.rendered
        ? createPortal(
            <div
              className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-6"
              role="presentation"
            >
              <button
                type="button"
                aria-label="Close actions"
                onClick={motion.requestClose}
                className={`absolute inset-0 bg-black/25 backdrop-blur-[2px] ${motion.backdropClassName}`}
                {...motion.backdropProps}
              />

              <section
                role="dialog"
                aria-modal="true"
                aria-label={`Actions for ${word}`}
                {...motion.panelProps}
                className={`${motion.panelClassName} relative z-10 w-full max-w-md overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]`}
                style={{
                  ...motion.panelProps.style,
                  paddingBottom:
                    "max(env(safe-area-inset-bottom), 16px)",
                }}
              >
                <div
                  className={`${motion.handleClassName} flex h-8 items-center justify-center sm:hidden`}
                  {...motion.handleProps}
                >
                  <span className="h-1 w-10 rounded-full bg-black/15" />
                </div>

                <header className="flex items-center justify-between border-b border-black/[0.07] px-5 pb-4 pt-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                      Word actions
                    </p>

                    <h2 className="mt-1 truncate text-lg font-semibold tracking-[-0.025em] text-neutral-950">
                      {word}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={motion.requestClose}
                    aria-label="Close actions"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
                  >
                    <X size={17} />
                  </button>
                </header>

                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => runAction(onEdit)}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-semibold text-neutral-900 transition hover:bg-neutral-100 active:scale-[0.99]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                      <Pencil size={16} />
                    </span>

                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => runAction(onShare)}
                    className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-semibold text-neutral-900 transition hover:bg-neutral-100 active:scale-[0.99]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                      <Share2 size={16} />
                    </span>

                    Share
                  </button>

                  <div className="my-2 h-px bg-black/[0.07]" />

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => runAction(onDelete)}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-semibold text-red-600 transition hover:bg-red-50 active:scale-[0.99] disabled:opacity-40"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
                      <Trash2 size={16} />
                    </span>

                    Delete
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
