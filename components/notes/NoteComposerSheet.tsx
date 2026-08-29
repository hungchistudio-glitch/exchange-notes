"use client";

import { LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";

import TextArea from "@/components/foundation/forms/TextArea";
import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import { LANGUAGE_CODES, getLanguageName, type LanguageCode } from "@/lib/languages";
import { detectNoteLanguage } from "@/lib/notes/languageDetection";
import type { Note, NoteInput } from "@/lib/notes/repository";

type NoteComposerSheetProps = {
  open: boolean;
  onClose: () => void;
  onSave: (input: NoteInput) => Promise<Note | null>;
};

export default function NoteComposerSheet({
  open,
  onClose,
  onSave,
}: NoteComposerSheetProps) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.home.notes;
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [languageOverridden, setLanguageOverridden] = useState(false);
  const [personalMeaning, setPersonalMeaning] = useState("");
  const [context, setContext] = useState("");
  const [tags, setTags] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveLanguage = languageOverridden
    ? language
    : detectNoteLanguage(text);

  const parsedTags = useMemo(
    () => [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 12),
    [tags],
  );

  function reset() {
    setText("");
    setLanguage("en");
    setLanguageOverridden(false);
    setPersonalMeaning("");
    setContext("");
    setTags("");
    setSource("");
    setError("");
    setSaving(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function save() {
    if (!text.trim() || saving) return;
    setSaving(true);
    setError("");

    const note = await onSave({
      originalText: text,
      originalLanguage: effectiveLanguage,
      personalMeaning,
      context,
      tags: parsedTags,
      sourceName: source.trim() || null,
      sourceKind: "manual",
      privacy: "private",
    });

    if (!note) {
      setError(copy.saveError);
      setSaving(false);
      return;
    }

    close();
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={copy.composerTitle}
      description={copy.composerDescription}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={close}
            className="h-12 rounded-2xl border border-line bg-white text-sm font-semibold"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!text.trim() || saving}
            className="h-12 rounded-2xl bg-black text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-35"
          >
            {saving ? t.common.saving : t.common.save}
          </button>
        </div>
      }
    >
      <label className="block">
        <span className="text-xs font-semibold text-ink-soft">{copy.originalLabel}</span>
        <TextArea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={copy.originalPlaceholder}
          className="mt-2"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-xs font-semibold text-ink-soft">{copy.languageLabel}</span>
        <select
          value={effectiveLanguage}
          onChange={(event) => {
            setLanguage(event.target.value as LanguageCode);
            setLanguageOverridden(true);
          }}
          className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm font-semibold outline-none"
        >
          {LANGUAGE_CODES.map((code) => (
            <option key={code} value={code}>
              {getLanguageName(code, interfaceLanguage)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] text-ink-faint">{copy.detectedHint}</p>
      </label>

      <label className="mt-5 block">
        <span className="text-xs font-semibold text-ink-soft">{copy.personalMeaning}</span>
        <TextArea
          value={personalMeaning}
          onChange={(event) => setPersonalMeaning(event.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={copy.personalMeaningPlaceholder}
          className="mt-2"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-xs font-semibold text-ink-soft">{copy.contextLabel}</span>
        <TextArea
          value={context}
          onChange={(event) => setContext(event.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={copy.contextPlaceholder}
          className="mt-2"
        />
      </label>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-ink-soft">{copy.tagsLabel}</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            maxLength={300}
            placeholder={copy.tagsPlaceholder}
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm outline-none placeholder:text-ink-faint"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-soft">{copy.sourceLabel}</span>
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            maxLength={300}
            placeholder={copy.sourcePlaceholder}
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm outline-none placeholder:text-ink-faint"
          />
        </label>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-black/[0.035] p-4">
        <LockKeyhole size={17} className="mt-0.5 shrink-0 text-ink-soft" />
        <div>
          <p className="text-sm font-semibold">{copy.privateLabel}</p>
          <p className="mt-1 text-xs leading-5 text-ink-soft">{copy.privateDescription}</p>
        </div>
      </div>

      {error ? <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
    </BottomSheet>
  );
}
