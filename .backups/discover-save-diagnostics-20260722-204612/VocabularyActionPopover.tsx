"use client";

import { BookmarkPlus, Check, LoaderCircle, Send, X } from "lucide-react";
import { useEffect, useRef } from "react";

type VocabularyActionPopoverProps = {
  open: boolean;
  word: string;
  translation?: string;
  saving?: boolean;
  saved?: boolean;
  onSave: () => void;
  onSend: () => void;
  onClose: () => void;
};

export default function VocabularyActionPopover({
  open,
  word,
  translation,
  saving = false,
  saved = false,
  onSave,
  onSend,
  onClose,
}: VocabularyActionPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const firstButton = panelRef.current?.querySelector<HTMLButtonElement>(
      "button:not([disabled])",
    );

    firstButton?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-[max(24px,env(safe-area-inset-bottom))]"
      role="presentation"
    >
      <button
        type="button"
        aria-label="關閉單字選項"
        className="absolute inset-0 cursor-default bg-black/10 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${word} 單字選項`}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-black">{word}</p>

            {translation ? (
              <p className="mt-0.5 truncate text-sm text-black/45">
                {translation}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] transition-colors hover:bg-black/[0.09]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || saved}
            className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-left transition-colors hover:bg-black/[0.04] disabled:cursor-default disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white">
              {saving ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : saved ? (
                <Check size={17} />
              ) : (
                <BookmarkPlus size={17} />
              )}
            </span>

            <span className="font-semibold">
              {saving ? "正在存入…" : saved ? "已存入單字庫" : "存入單字庫"}
            </span>
          </button>

          <button
            type="button"
            onClick={onSend}
            disabled={saving}
            className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-left transition-colors hover:bg-black/[0.04] disabled:opacity-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.07] text-black">
              <Send size={17} />
            </span>

            <span className="font-semibold">傳送給朋友</span>
          </button>
        </div>
      </div>
    </div>
  );
}
