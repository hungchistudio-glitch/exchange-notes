"use client";

import { LoaderCircle, Send, Sparkles, Trash2, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppHeader from "@/components/foundation/layout/AppHeader";
import Screen from "@/components/foundation/layout/Screen";
import useTranslation from "@/hooks/i18n/useTranslation";
import useOnline from "@/hooks/useOnline";
import { getInterfaceLanguageMeta, getLanguage, getLanguageName, LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";
import { createNote, deleteNote, fetchNote, type Note, type NoteInterpretation } from "@/lib/notes/repository";
import { createClient } from "@/lib/supabase/client";
import { speak } from "@/lib/speech";
import { track } from "@/lib/analytics/track";

import NotesShareSheet from "./NotesShareSheet";

function DetailSection({ title, value }: { title: string; value: string | string[] }) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  if (values.length === 0) return null;

  return (
    <section className="border-t border-line py-4 first:border-0 first:pt-0">
      <h3 className="text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-ink-faint">{title}</h3>
      <div className="mt-2 space-y-2">
        {values.map((item, index) => (
          <p key={`${item}-${index}`} className="whitespace-pre-wrap text-sm leading-6 text-ink-strong">{item}</p>
        ))}
      </div>
    </section>
  );
}

export default function NoteDetail({ noteId }: { noteId: string }) {
  const router = useRouter();
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.home.notes;
  const online = useOnline();
  const [currentUserId, setCurrentUserId] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(
    getInterfaceLanguageMeta(interfaceLanguage).code,
  );
  const [interpreting, setInterpreting] = useState(false);
  const [interpretError, setInterpretError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [copySaved, setCopySaved] = useState(false);
  const [copyError, setCopyError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const row = await fetchNote(supabase, user.id, noteId);
      setNote(row);
      setLoadError(!row);
      if (row) track("notes.opened", { shared: row.isSharedWithMe, language: row.originalLanguage });
    } catch (error) {
      console.error("Note detail load failed", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const interpretation = note?.interpretations.find(
    (item) => item.targetLanguage === selectedLanguage &&
      (item.model !== "legacy-import" || item.meaning),
  );

  async function interpret() {
    if (!note || !online || interpreting) return;
    setInterpreting(true);
    setInterpretError("");
    track("notes.interpretation_requested", { targetLanguage: selectedLanguage });

    try {
      const response = await fetch("/api/notes/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id, targetLanguage: selectedLanguage }),
      });
      const data = (await response.json()) as { interpretation?: NoteInterpretation; error?: string };
      if (!response.ok || !data.interpretation) throw new Error(data.error || "Interpretation failed");

      setNote((current) => current ? {
        ...current,
        interpretations: [
          ...current.interpretations.filter((item) => item.targetLanguage !== selectedLanguage),
          data.interpretation!,
        ],
      } : current);
      track("notes.interpretation_completed", { targetLanguage: selectedLanguage });
    } catch (error) {
      console.error("Note interpretation request failed", error);
      setInterpretError(copy.interpretError);
    } finally {
      setInterpreting(false);
    }
  }

  async function remove() {
    if (!note || note.isSharedWithMe || !window.confirm(copy.deleteConfirm)) return;
    if (await deleteNote(createClient(), note.id)) router.replace("/notes");
  }

  async function saveSharedCopy() {
    if (!note || !currentUserId || copySaved) return;
    setCopyError("");
    const saved = await createNote(createClient(), currentUserId, {
      originalText: note.originalText,
      originalLanguage: note.originalLanguage,
      personalMeaning: note.personalMeaning,
      context: note.context,
      tags: note.tags,
      privacy: "private",
      sourceKind: "shared",
      sourceNoteId: note.id,
      sourceOwnerId: note.ownerId,
      sourceOwnerName: note.sourceOwnerName,
      sourceName: note.sourceName,
      sourceUrl: note.sourceUrl,
    });

    if (!saved) {
      setCopyError(copy.saveCopyError);
      return;
    }
    setCopySaved(true);
    track("notes.shared_copy_saved", { sourceLanguage: note.originalLanguage });
  }

  if (loading) {
    return <Screen><div className="flex min-h-[70dvh] items-center justify-center"><LoaderCircle className="animate-spin" /></div></Screen>;
  }

  if (loadError || !note) {
    return (
      <Screen>
        <AppHeader title={copy.libraryTitle} backHref="/notes" backLabel={t.common.back} />
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-semibold">{copy.loadError}</p>
          <p className="mt-2 text-sm text-ink-soft">{copy.shareDescription}</p>
          <button type="button" onClick={() => void load()} className="mt-5 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">{copy.retry}</button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        backHref="/notes"
        backLabel={t.common.back}
        eyebrow={copy.detailEyebrow}
        title={getLanguageName(note.originalLanguage, interfaceLanguage)}
        action={
          !note.isSharedWithMe ? (
            <div className="flex gap-1">
              <button type="button" onClick={() => setShareOpen(true)} aria-label={t.common.share} title={t.common.share} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.05]"><Send size={17} strokeWidth={1.8} /></button>
              <button type="button" onClick={() => void remove()} aria-label={copy.deleteNote} className="flex h-10 w-10 items-center justify-center rounded-full text-red-600"><Trash2 size={17} /></button>
            </div>
          ) : null
        }
      />

      <div className="px-4 py-5">
        {note.isSharedWithMe ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-black/[0.04] p-3">
            <p className="min-w-0 text-xs font-semibold text-ink-soft">{copy.sharedBy.replace("{name}", note.sourceOwnerName || copy.sharedWithMe)}</p>
            <button type="button" onClick={() => void saveSharedCopy()} disabled={copySaved} className="shrink-0 rounded-full bg-black px-3 py-2 text-[0.6875rem] font-semibold text-white disabled:opacity-50">
              {copySaved ? copy.savedToMyNotes : copy.saveToMyNotes}
            </button>
          </div>
        ) : null}

        <article className="rounded-[28px] border border-line bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-ink-faint">{copy.originalLabel}</p>
            <button type="button" onClick={() => speak(note.originalText, getLanguage(note.originalLanguage).speechTag)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface" aria-label={copy.originalLabel}><Volume2 size={15} /></button>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-[1.25rem] font-semibold leading-8 tracking-[-0.02em]">{note.originalText}</p>

          {note.personalMeaning ? <div className="mt-5 rounded-2xl bg-surface p-4"><p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">{copy.personalMeaning}</p><p className="mt-2 text-sm leading-6">{note.personalMeaning}</p></div> : null}
          {note.context ? <div className="mt-3"><p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">{copy.contextLabel}</p><p className="mt-2 text-sm leading-6 text-ink-soft">{note.context}</p></div> : null}
          {note.tags.length ? <div className="mt-4 flex flex-wrap gap-2">{note.tags.map((tag) => <span key={tag} className="rounded-full bg-surface px-3 py-1.5 text-[0.6875rem] font-semibold text-ink-soft">#{tag}</span>)}</div> : null}
        </article>

        <section className="mt-5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-ink-faint">{copy.viewIn}</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {LANGUAGE_CODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setSelectedLanguage(code);
                  setInterpretError("");
                  track("notes.language_view_changed", { targetLanguage: code });
                }}
                aria-pressed={selectedLanguage === code}
                className={`h-10 shrink-0 rounded-full border px-4 text-xs font-semibold ${selectedLanguage === code ? "border-black bg-black text-white" : "border-line bg-white text-ink-soft"}`}
              >
                {getLanguageName(code, interfaceLanguage)}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[28px] border border-line bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white"><Sparkles size={17} /></span>
            <div>
              <h2 className="text-lg font-bold tracking-[-0.025em]">{copy.yumiTitle}</h2>
              <p className="mt-1 text-xs leading-5 text-ink-soft">{copy.yumiDescription}</p>
            </div>
          </div>

          {interpretation ? (
            <div className="mt-5">
              <DetailSection title={copy.naturalTranslation} value={interpretation.naturalTranslation} />
              <DetailSection title={copy.meaning} value={interpretation.meaning} />
              <DetailSection title={copy.localExpressions} value={interpretation.localExpressions} />
              <DetailSection title={copy.tone} value={interpretation.tone} />
              <DetailSection title={copy.culturalNuance} value={interpretation.culturalNuance} />
              <DetailSection title={copy.usageExamples} value={interpretation.usageExamples} />
              <DetailSection title={copy.warnings} value={interpretation.warnings} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void interpret()}
              disabled={!online || interpreting}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white disabled:opacity-40"
            >
              {interpreting ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {interpreting ? copy.interpreting : copy.interpret}
            </button>
          )}

          {!online && !interpretation ? <p className="mt-3 text-xs text-ink-soft">{t.offline.needsConnection}</p> : null}
          {interpretError ? <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{interpretError}</p> : null}
          {copyError ? <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{copyError}</p> : null}
        </section>
      </div>

      <NotesShareSheet open={shareOpen} onClose={() => setShareOpen(false)} noteId={note.id} ownerId={currentUserId} />
    </Screen>
  );
}
