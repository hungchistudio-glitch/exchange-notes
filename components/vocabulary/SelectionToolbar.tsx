"use client";

import { BookmarkPlus, Check, LoaderCircle, Send } from "lucide-react";

import type { SelectionState } from "@/hooks/useTextSelection";
import type { VocabularyItem } from "@/lib/types/app";

type SelectionToolbarProps = {
  selection: SelectionState | null;
  addingWord: boolean;
  addedWord: boolean;
  onAddWord: () => void;
  onSendToPartner: (sharedItem?: VocabularyItem) => void;
};

export default function SelectionToolbar({
  selection,
  addingWord,
  addedWord,
  onAddWord,
  onSendToPartner,
}: SelectionToolbarProps) {
  if (!selection) return null;

  return (
    <div
      className="absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-full border border-white/20 bg-black/40 p-1.5 text-white shadow-xl backdrop-blur-xl"
      style={{
        top: selection.top - 12,
        left: selection.left,
      }}
    >
      <button
        type="button"
        onClick={onAddWord}
        disabled={addingWord}
        aria-label={addedWord ? "已加入單字本" : "加入單字本"}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-60"
      >
        {addingWord ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : addedWord ? (
          <Check size={16} />
        ) : (
          <BookmarkPlus size={16} />
        )}
      </button>

      <span className="h-4 w-px bg-white/20" />

      <button
        type="button"
        onClick={() => onSendToPartner()}
        aria-label="傳送給夥伴"
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
      >
        <Send size={16} />
      </button>
    </div>
  );
}
