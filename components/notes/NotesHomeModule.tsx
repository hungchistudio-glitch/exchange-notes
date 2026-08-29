"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { createNote, fetchNotes, importLegacyNotes, type Note, type NoteInput } from "@/lib/notes/repository";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics/track";

import NoteCard from "./NoteCard";
import NoteComposerSheet from "./NoteComposerSheet";

export default function NotesHomeModule() {
  const { t } = useTranslation();
  const copy = t.home.notes;
  const [notes, setNotes] = useState<Note[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await importLegacyNotes(supabase, user.id);
      setNotes(await fetchNotes(supabase, user.id, { limit: 3 }));
    } catch (loadError) {
      console.error("Notes home load failed", loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(input: NoteInput) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const note = await createNote(supabase, user.id, input);

    if (note) {
      setNotes((current) => [note, ...current].slice(0, 3));
      track("notes.created", { language: note.originalLanguage, source: note.sourceKind });
    }

    return note;
  }

  return (
    <section className="rounded-[28px] border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{copy.eyebrow}</p>
          <h2 className="mt-0.5 text-xl font-bold tracking-[-0.03em]">{copy.spaceTitle}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setComposerOpen(true);
            track("notes.composer_opened", { source: "home" });
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-black px-4 text-xs font-semibold text-white transition-transform active:scale-95"
        >
          <Plus size={15} />
          {copy.newNote}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-semibold text-ink-soft">{copy.recentTitle}</p>
        <Link href="/notes" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft">
          {copy.viewAll}
          <ArrowRight size={13} />
        </Link>
      </div>

      {loading ? (
        <div className="mt-3 grid gap-2" aria-label={t.common.loading}>
          {[0, 1].map((item) => <div key={item} className="h-24 animate-pulse rounded-[22px] bg-black/[0.04]" />)}
        </div>
      ) : error ? (
        <button type="button" onClick={() => void load()} className="mt-3 w-full rounded-2xl border border-line px-4 py-5 text-sm font-semibold">
          {copy.loadError} · {copy.retry}
        </button>
      ) : notes.length ? (
        <div className="mt-3 grid gap-2">
          {notes.map((note) => <NoteCard key={note.id} note={note} />)}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="mt-3 w-full rounded-[22px] border border-dashed border-black/[0.12] px-4 py-7 text-center"
        >
          <span className="block text-sm font-semibold">{copy.emptyTitle}</span>
          <span className="mt-1 block text-xs leading-5 text-ink-soft">{copy.emptyDescription}</span>
        </button>
      )}

      <NoteComposerSheet open={composerOpen} onClose={() => setComposerOpen(false)} onSave={save} />
    </section>
  );
}
