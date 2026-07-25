"use client";

import { useMemo, useState } from "react";

import Card from "@/components/foundation/cards/Card";
import TextArea from "@/components/foundation/forms/TextArea";

type NotesComposerProps = {
  onSave: (english: string, chinese: string) => void;
};

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function NotesComposer({
  onSave,
}: NotesComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [englishDraft, setEnglishDraft] = useState("");
  const [chineseDraft, setChineseDraft] = useState("");

  const canSave = useMemo(
    () => Boolean(englishDraft.trim() || chineseDraft.trim()),
    [englishDraft, chineseDraft]
  );

  function resetComposer() {
    setEnglishDraft("");
    setChineseDraft("");
    setIsOpen(false);
  }

  function handleSave() {
    const english = englishDraft.trim();
    const chinese = chineseDraft.trim();

    if (!english && !chinese) {
      return;
    }

    onSave(english, chinese);
    resetComposer();
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Personal learning space
          </p>

          <h2 className="mt-1 text-[28px] font-bold tracking-[-0.035em]">
            Notes
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Save useful words, sentences, and ideas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          aria-expanded={isOpen}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-black/[0.07] bg-white px-4 text-xs font-semibold text-neutral-700 transition-transform active:scale-95"
        >
          <PlusIcon />
          New note
        </button>
      </div>

      {isOpen && (
        <Card className="mt-5 p-4">
          <label className="block">
            <span className="text-xs font-semibold text-neutral-500">
              English
            </span>

            <TextArea
              value={englishDraft}
              onChange={(event) =>
                setEnglishDraft(event.target.value)
              }
              rows={3}
              maxLength={1000}
              placeholder="Write a word, sentence, or thought..."
              className="mt-2 bg-[#f5f3ed]"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-semibold text-neutral-500">
              繁體中文
            </span>

            <TextArea
              value={chineseDraft}
              onChange={(event) =>
                setChineseDraft(event.target.value)
              }
              rows={3}
              maxLength={1000}
              placeholder="寫下翻譯、想法或補充..."
              className="mt-2 bg-[#f5f3ed]"
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={resetComposer}
              className="h-11 rounded-2xl border border-black/[0.06] bg-white text-sm font-semibold"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="h-11 rounded-2xl bg-neutral-950 text-sm font-semibold text-white disabled:opacity-30"
            >
              Save note
            </button>
          </div>
        </Card>
      )}
    </>
  );
}
