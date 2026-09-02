"use client";

import { memo } from "react";
import { BookmarkPlus, Check, LoaderCircle, Send } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";
import type { SelectionState } from "@/hooks/useTextSelection";
import type { VocabularyItem } from "@/lib/types/app";

type SelectionToolbarProps = {
  selection: SelectionState | null;
  addingWord: boolean;
  addedWord: boolean;
  /** What went wrong, if anything. Shown in place of the buttons. */
  error?: string;
  onAddWord: () => void;
  onSendToPartner: (sharedItem?: VocabularyItem) => void;
};

function SelectionToolbar({
  selection,
  addingWord,
  addedWord,
  error,
  onAddWord,
  onSendToPartner,
}: SelectionToolbarProps) {
  const { t } = useTranslation();
  const copy = t.vocabulary.selection;

  if (!selection) return null;

  /*
   * The failure takes the pill over rather than sitting beside it.
   *
   * There is no room next to two icons for a sentence, and the reader is
   * looking at exactly this spot — they just tapped it. Saying so here is
   * the difference between "that did not work" and the old behaviour, which
   * was to dismiss the selection and leave them believing it had.
   */
  if (error) {
    return (
      <div
        role="status"
        className="absolute z-20 max-w-[16rem] -translate-x-1/2 -translate-y-full whitespace-normal rounded-2xl border border-white/20 bg-black/60 px-3 py-2 text-[0.75rem] leading-4 text-white shadow-xl backdrop-blur-xl"
        style={{ top: selection.top - 12, left: selection.left }}
      >
        {error}
      </div>
    );
  }

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
        aria-label={addedWord ? copy.addedWord : copy.addWord}
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
        aria-label={copy.sendToPartner}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
      >
        <Send size={16} />
      </button>
    </div>
  );
}

export default memo(SelectionToolbar);
