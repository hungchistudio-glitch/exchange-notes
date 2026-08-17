"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import Card from "@/components/foundation/cards/Card";
import TextArea from "@/components/foundation/forms/TextArea";
import useTranslation from "@/hooks/i18n/useTranslation";

type NotesComposerProps = {
  onSave: (english: string, chinese: string) => void;
};

export default function NotesComposer({
  onSave,
}: NotesComposerProps) {
  const { t } = useTranslation();
  const copy = t.home.notes;

  const [isOpen, setIsOpen] = useState(false);
  const [englishDraft, setEnglishDraft] = useState("");
  const [chineseDraft, setChineseDraft] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");

  const canSave = useMemo(
    () => Boolean(englishDraft.trim() || chineseDraft.trim()),
    [englishDraft, chineseDraft]
  );

  function resetComposer() {
    setEnglishDraft("");
    setChineseDraft("");
    setTranslateError("");
    setIsOpen(false);
  }

  async function handleSave() {
    const english = englishDraft.trim();
    const chinese = chineseDraft.trim();

    if (!english && !chinese) {
      return;
    }

    if (Boolean(english) !== Boolean(chinese)) {
      setTranslating(true);
      setTranslateError("");

      try {
        const response = await fetch("/api/translate-note", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: english || chinese }),
        });

        const data = (await response.json()) as {
          english?: string;
          chinese?: string;
          error?: string;
        };

        if (!response.ok || !data.english || !data.chinese) {
          throw new Error(data.error || "Translation failed.");
        }

        onSave(data.english, data.chinese);
        resetComposer();
        return;
      } catch (error) {
        console.error(error);
        setTranslateError(copy.translateError);
        setTranslating(false);
        return;
      }
    }

    onSave(english, chinese);
    resetComposer();
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {copy.spaceEyebrow}
          </p>

          <h2 className="mt-1 text-[28px] font-bold tracking-[-0.035em]">
            {copy.spaceTitle}
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            {copy.spaceDescription}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          aria-expanded={isOpen}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-black/[0.07] bg-white px-4 text-xs font-semibold text-neutral-700 transition-transform active:scale-95"
        >
          <Plus size={16} strokeWidth={1.9} aria-hidden="true" />
          {copy.newNote}
        </button>
      </div>

      {isOpen && (
        <Card className="mt-5 p-4">
          <label className="block">
            <span className="text-xs font-semibold text-ink-soft">
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
              className="mt-2 bg-surface"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-semibold text-ink-soft">
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
              className="mt-2 bg-surface"
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={resetComposer}
              className="h-11 rounded-2xl border border-black/[0.06] bg-white text-sm font-semibold transition-transform active:scale-95"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || translating}
              className="h-11 rounded-2xl bg-neutral-950 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-30 disabled:active:scale-100"
            >
              {translating ? "Translating…" : "Save note"}
            </button>
          </div>

          {translateError && (
            <p className="mt-3 text-xs font-semibold text-red-600">
              {translateError}
            </p>
          )}

          {(Boolean(englishDraft.trim()) !== Boolean(chineseDraft.trim())) &&
            !translateError && (
              <p className="mt-3 text-xs text-ink-faint">
                Saving will auto-translate the other language for you.
              </p>
            )}
        </Card>
      )}
    </>
  );
}
