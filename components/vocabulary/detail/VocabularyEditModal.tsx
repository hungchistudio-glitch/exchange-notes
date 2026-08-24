"use client";

import {
  FormEvent,
  useState,
} from "react";
import {
  LoaderCircle,
  X,
} from "lucide-react";

import AppButton from "@/components/ui/AppButton";
import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { VocabularyItem } from "@/lib/types/app";

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
  const { t } = useTranslation();
  const edit = t.vocabulary.detail.edit;
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
  const motion = useSheetMotion({
    open,
    onClose,
    closeDisabled: saving,
  });

  if (!motion.rendered) return null;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedWord = word.trim();
    const trimmedTranslation =
      translation.trim();

    if (!trimmedWord) {
      setError(
        edit.englishRequired,
      );
      return;
    }

    if (!trimmedTranslation) {
      setError(
        edit.chineseRequired,
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

      setSaving(false);
      motion.requestClose();
    } catch (saveError) {
      console.error(saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : edit.saveFailed,
      );
      setSaving(false);
    }
  }

  const inputClassName =
    "mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-950 outline-none transition placeholder:text-ink-faint focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-neutral-950/5";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
    >
      <button
        type="button"
        aria-label={edit.close}
        onClick={motion.requestClose}
        disabled={saving}
        className={`absolute inset-0 bg-black/45 backdrop-blur-sm ${motion.backdropClassName}`}
        {...motion.backdropProps}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-vocabulary-title"
        {...motion.panelProps}
        className={`${motion.panelClassName} relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[32px]`}
      >
        <div
          className={`${motion.handleClassName} flex h-8 items-center justify-center sm:hidden`}
          {...motion.handleProps}
        >
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2
              id="edit-vocabulary-title"
              className="text-xl font-semibold tracking-[-0.03em] text-neutral-950"
            >
              {edit.title}
            </h2>

            <p className="mt-1 text-sm text-ink-soft">
              {edit.subtitle}
            </p>
          </div>

          <button
            type="button"
            aria-label={edit.close}
            onClick={motion.requestClose}
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
              {edit.english}
              <div className="relative">
                <input
                  value={word}
                  onChange={(event) =>
                    setWord(event.target.value)
                  }
                  className={`${inputClassName} pr-11`}
                  placeholder="{edit.english} word or phrase"
                  autoFocus
                />
                {word && <ClearFieldButton floating onClear={() => setWord("")} />}
              </div>
            </label>

            <label className="block text-sm font-medium text-neutral-800">
              {edit.traditionalChinese}
              <div className="relative">
                <input
                  value={translation}
                  onChange={(event) =>
                    setTranslation(
                      event.target.value,
                    )
                  }
                  className={`${inputClassName} pr-11`}
                  placeholder={edit.chinesePlaceholder}
                />
                {translation && (
                  <ClearFieldButton floating onClear={() => setTranslation("")} />
                )}
              </div>
            </label>
          </div>

          <div className="h-px bg-neutral-100" />

          <label className="block text-sm font-medium text-neutral-800">
            {edit.englishExample}
            <div className="relative">
              <textarea
                value={exampleSentence}
                onChange={(event) =>
                  setExampleSentence(
                    event.target.value,
                  )
                }
                className={`${inputClassName} min-h-28 resize-y pr-11`}
                placeholder="Use the word in an {edit.english} sentence."
              />
              {exampleSentence && (
                <ClearFieldButton
                  floating
                  className="!top-3 !translate-y-0"
                  onClear={() => setExampleSentence("")}
                />
              )}
            </div>
          </label>

          <label className="block text-sm font-medium text-neutral-800">
            {edit.chineseExample}
            <div className="relative">
              <textarea
                value={translatedExample}
                onChange={(event) =>
                  setTranslatedExample(
                    event.target.value,
                  )
                }
                className={`${inputClassName} min-h-28 resize-y pr-11`}
                placeholder={edit.chineseExamplePlaceholder}
              />
              {translatedExample && (
                <ClearFieldButton
                  floating
                  className="!top-3 !translate-y-0"
                  onClear={() => setTranslatedExample("")}
                />
              )}
            </div>
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
              onClick={motion.requestClose}
              disabled={saving}
            >
              {edit.cancel}
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
                ? edit.saving
                : edit.save}
            </AppButton>
          </div>
        </form>
      </section>
    </div>
  );
}
