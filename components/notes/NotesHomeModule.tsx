"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import {
  createNote,
  fetchNotes,
  getNotesSessionUserId,
  importLegacyNotes,
  type Note,
  type NoteInput,
} from "@/lib/notes/clientRepository";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/supabase/sessionUser";
import { track } from "@/lib/analytics/track";

import NoteCard from "./NoteCard";
import NoteComposerSheet from "./NoteComposerSheet";
import styles from "./NotesHomeModule.module.css";

export default function NotesHomeModule() {
  const { t } = useTranslation();
  const copy = t.home.notes;
  const [notes, setNotes] = useState<Note[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /*
   * Whether this module is still on screen.
   *
   * Both paths below set state after awaiting the network, and until now
   * nothing stopped either of them. The effect's clearTimeout only stops
   * `load` from starting — once it has, nothing cancels it — and `save` is
   * called from the composer sheet, so it is not tied to an effect at all.
   *
   * React tolerates a state update on an unmounted component; a torn-down
   * test environment does not. It surfaced as `window is not defined` out of
   * dispatchSetState, from a save that resolved a moment too late, reaching
   * CI as an unhandled rejection with all 1,129 tests still passing. It is a
   * race either way: the work is wasted in a browser and fatal in a harness.
   *
   * Assigned on the way in as well as the way out, because Strict Mode mounts
   * this twice and the first cleanup would otherwise leave it false forever.
   */
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const supabase = createClient();

    try {
      const userId = await getNotesSessionUserId(supabase);
      if (!userId) return;
      // Import is online-only; failure is non-destructive and fetchNotes can
      // still open the encrypted mirror below.
      if (typeof navigator === "undefined" || navigator.onLine !== false) {
        await importLegacyNotes(supabase, userId);
      }
      const fetched = await fetchNotes(supabase, userId, { limit: 3 });
      if (mounted.current) setNotes(fetched);
    } catch (loadError) {
      console.error("Notes home load failed", loadError);
      if (mounted.current) setError(true);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(input: NoteInput) {
    const supabase = createClient();
    const user = await getSessionUser(supabase);
    if (!user) return null;
    const note = await createNote(supabase, user.id, input);

    if (note) {
      // The list only if this module is still here; the event either way,
      // because the note was created whether or not anyone is looking.
      if (mounted.current) setNotes((current) => [note, ...current].slice(0, 3));
      track("notes.created", { language: note.originalLanguage, source: note.sourceKind });
    }

    return note;
  }

  /*
   * A quiet panel on the obsidian bridge (Chi, 2026-11-12), the home's own
   * materials rather than a tinted card: the title with its two ways in,
   * then the notes. With none, one short line says so, not a large empty
   * box; the new-note key above is the way to start.
   */
  return (
    <section className={styles.panel} aria-labelledby="home-notes-title">
      <div className={styles.head}>
        <h2 id="home-notes-title" className={styles.title}>{copy.spaceTitle}</h2>
        <Link href="/notes" className={styles.all}>
          {copy.viewAll}
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => {
            setComposerOpen(true);
            track("notes.composer_opened", { source: "home" });
          }}
          className={styles.add}
        >
          <Plus size={15} aria-hidden="true" />
          {copy.newNote}
        </button>
      </div>

      {loading ? (
        <div className={styles.list} aria-label={t.common.loading}>
          {[0, 1].map((item) => <div key={item} className={styles.placeholder} />)}
        </div>
      ) : error ? (
        <button type="button" onClick={() => void load()} className={styles.retry}>
          {copy.loadError} · {copy.retry}
        </button>
      ) : notes.length ? (
        <div className={styles.list}>
          {notes.map((note) => <NoteCard key={note.id} note={note} className={styles.note} />)}
        </div>
      ) : (
        <p className={styles.empty}>
          <span className={styles.emptyTitle}>{copy.emptyTitle}</span>
          <span className={styles.emptyText}>{copy.emptyDescription}</span>
        </p>
      )}

      <NoteComposerSheet open={composerOpen} onClose={() => setComposerOpen(false)} onSave={save} />
    </section>
  );
}
