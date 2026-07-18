"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  LoaderCircle,
  X,
} from "lucide-react";

import AppButton from "@/components/ui/AppButton";
import type { VocabularyItem } from "./types";

export type VocabularyEditValues = {
  word: string;
  translation: string;
  example_sentence: string | null;
  translated_example: string | null;
};

type VocabularyEditModalProps = {
  open: boolean;
  item: VocabularyItem;
  onClose: () => void;
  onSave: (
    values: VocabularyEditValues,
  ) => Promise<void>;
};

function optionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function VocabularyEditModal({
  open,
  item,
  onClose,
  onSave,
}: VocabularyEditModalProps) {
  const [word, setWord] = useState(item.word);
  const [translation, setTranslation] = useState(
    item.translation,
  );
  const [
    exampleSentence,
    setExampleSentence,
  ] = useState(
    item.example_sentence ?? "",
  );
  const [
    translatedExample,
    setTranslatedExample,
  ] = useState(
    item.translated_example ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setWord(item.word);
    setTranslation(item.translation);
    setExampleSentence(
      item.example_sentence ?? "",
    );
    setTranslatedExample(
      item.translated_example ?? "",
    );
    setError("");
  }, [open, item]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !saving
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedWord = word.trim();
    const trimmedTranslation =
      translation.trim();

    if (!trimmedWord) {
      setError(
        "English word cannot be empty.",
      );
      return;
    }

    if (!trimmedTranslation) {
      setError(
        "Traditional Chinese translation cannot be empty.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onSave({
        word: trimmedWord,
        translation: trimmedTranslation,
        example_sentence:
          optionalValue(exampleSentence),
        translated_example:
          optionalValue(translatedExample),
      });

      onClose();
    } catch (saveError) {
      console.error(saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save your changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClassName =
    "mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-neutral-950/5";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-vocabulary-title"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[32px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2
              id="edit-vocabulary-title"
              className="text-xl font-semibold tracking-[-0.03em] text-neutral-950"
            >
              Edit vocabulary
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Update the word and examples.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close edit vocabulary"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={(event) =>
            void handleSubmit(event)
          }
          className="space-y-6 p-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-neutral-800">
              English
              <input
                value={word}
                onChange={(event) =>
                  setWord(event.target.value)
                }
                className={inputClassName}
                placeholder="English word or phrase"
                autoFocus
              />
            </label>

            <label className="block text-sm font-medium text-neutral-800">
              Traditional Chinese
              <input
                value={translation}
                onChange={(event) =>
                  setTranslation(
                    event.target.value,
                  )
                }
                className={inputClassName}
                placeholder="繁體中文翻譯"
              />
            </label>
          </div>

          <div className="h-px bg-neutral-100" />

          <label className="block text-sm font-medium text-neutral-800">
            English example
            <textarea
              value={exampleSentence}
              onChange={(event) =>
                setExampleSentence(
                  event.target.value,
                )
              }
              className={`${inputClassName} min-h-28 resize-y`}
              placeholder="Use the word in an English sentence."
            />
          </label>

          <label className="block text-sm font-medium text-neutral-800">
            Chinese example
            <textarea
              value={translatedExample}
              onChange={(event) =>
                setTranslatedExample(
                  event.target.value,
                )
              }
              className={`${inputClassName} min-h-28 resize-y`}
              placeholder="輸入繁體中文例句"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="sticky bottom-0 flex gap-3 border-t border-neutral-100 bg-white/95 pt-5 backdrop-blur">
            <AppButton
              type="button"
              variant="secondary"
              className="flex-1 justify-center"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </AppButton>

            <AppButton
              type="submit"
              className="flex flex-1 items-center justify-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              ) : null}

              {saving
                ? "Saving..."
                : "Save changes"}
            </AppButton>
          </div>
        </form>
      </section>
    </div>
  );
}
