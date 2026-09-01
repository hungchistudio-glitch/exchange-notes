"use client";

import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppHeader from "@/components/foundation/layout/AppHeader";
import Screen from "@/components/foundation/layout/Screen";
import useTranslation from "@/hooks/i18n/useTranslation";
import useOnline from "@/hooks/useOnline";
import { createNote, fetchNotes, searchNotes, type Note, type NoteInput } from "@/lib/notes/repository";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics/track";

import NoteCard from "./NoteCard";
import NoteComposerSheet from "./NoteComposerSheet";

type Filter = "all" | "mine" | "shared";

export default function NotesLibrary() {
  const { t } = useTranslation();
  const copy = t.home.notes;
  const online = useOnline();
  const [currentUserId, setCurrentUserId] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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
      setCurrentUserId(user.id);
      setNotes(await fetchNotes(supabase, user.id));
    } catch (loadError) {
      console.error("Notes library load failed", loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => searchNotes(notes, query).filter((note) => {
    if (filter === "mine") return !note.isSharedWithMe;
    if (filter === "shared") return note.isSharedWithMe;
    return true;
  }), [filter, notes, query]);

  async function save(input: NoteInput) {
    if (!currentUserId) return null;
    const note = await createNote(createClient(), currentUserId, input);
    if (note) {
      setNotes((current) => [note, ...current]);
      track("notes.created", { language: note.originalLanguage, source: "library" });
    }
    return note;
  }

  return (
    <Screen>
      <AppHeader
        backHref="/home"
        backLabel={t.common.back}
        eyebrow={copy.eyebrow}
        title={copy.libraryTitle}
        action={
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white"
            aria-label={copy.newNote}
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="px-4 py-5">
        <p className="text-sm leading-6 text-ink-soft">{copy.libraryDescription}</p>

        <label className="mt-5 flex h-13 items-center gap-3 rounded-full border border-line bg-white px-4 shadow-sm">
          <Search size={18} className="shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim().length === 2) track("notes.searched", { scope: filter });
            }}
            placeholder={copy.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-ink-faint"
          />
        </label>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {([
            ["all", copy.allNotes],
            ["mine", copy.mine],
            ["shared", copy.sharedWithMe],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`h-10 shrink-0 rounded-full border px-4 text-xs font-semibold ${filter === value ? "border-black bg-black text-white" : "border-line bg-white text-ink-soft"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {!online ? (
          <p className="mt-4 rounded-2xl bg-black/[0.04] px-4 py-3 text-xs text-ink-soft">{t.offline.body}</p>
        ) : null}

        {loading ? (
          <div className="mt-5 grid gap-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-[24px] bg-black/[0.04]" />)}
          </div>
        ) : error ? (
          <button type="button" onClick={() => void load()} className="mt-5 w-full rounded-2xl border border-line px-5 py-8 text-sm font-semibold">
            {copy.loadError} · {copy.retry}
          </button>
        ) : visible.length ? (
          <div className="mt-5 grid gap-3">
            {visible.map((note) => <NoteCard key={note.id} note={note} />)}
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-line px-5 py-10 text-center">
            <p className="text-sm font-semibold">{query ? copy.noResults : copy.emptyTitle}</p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">{copy.emptyDescription}</p>
          </div>
        )}
      </div>

      <NoteComposerSheet open={composerOpen} onClose={() => setComposerOpen(false)} onSave={save} />
    </Screen>
  );
}
