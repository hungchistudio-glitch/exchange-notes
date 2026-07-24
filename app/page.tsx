"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AuthGuard from "@/app/components/auth/AuthGuard";
import DailyNews from "./components/DailyNews";
import LogoutButton from "@/app/components/auth/LogoutButton";

type HomeTab = "news" | "notes";

type SavedNote = {
  id: string;
  english: string;
  chinese: string;
  createdAt: string;
};

const NOTES_STORAGE_KEY = "exchange-notes-home-notes";

function NewsIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 4.5h11.5A2.5 2.5 0 0119 7v12.5H7.5A2.5 2.5 0 015 17V4.5z"
      />
      <path
        strokeLinecap="round"
        d="M8.5 8h7M8.5 11.5h7M8.5 15h4"
      />
      {active && (
        <circle
          cx="18.5"
          cy="5.5"
          r="2.25"
          fill="currentColor"
          stroke="none"
        />
      )}
    </svg>
  );
}

function NotesIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 4.5h9.5L19 8v11.5H6V4.5z"
      />
      <path strokeLinecap="round" d="M9 10h7M9 13.5h7M9 17h4" />
      {active && (
        <circle
          cx="18.5"
          cy="5.5"
          r="2.25"
          fill="currentColor"
          stroke="none"
        />
      )}
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8.5A1.5 1.5 0 015.5 7h2l1-1.5h7L16.5 7h2A1.5 1.5 0 0120 8.5V17a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17V8.5z"
      />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5.5h14v10H9l-4 3v-13z"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3" />
      <path
        strokeLinecap="round"
        d="M5.5 19a6.5 6.5 0 0113 0"
      />
    </svg>
  );
}

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

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 7h14M9 7V4.5h6V7M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13"
      />
    </svg>
  );
}

function readStoredNotes(): SavedNote[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(NOTES_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (item): item is SavedNote =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SavedNote).id === "string" &&
        typeof (item as SavedNote).english === "string" &&
        typeof (item as SavedNote).chinese === "string" &&
        typeof (item as SavedNote).createdAt === "string"
    );
  } catch {
    return [];
  }
}

function formatNoteDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<HomeTab>("news");
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [englishDraft, setEnglishDraft] = useState("");
  const [chineseDraft, setChineseDraft] = useState("");
  const [showNoteComposer, setShowNoteComposer] = useState(false);

  useEffect(() => {
    setNotes(readStoredNotes());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify(notes)
    );
  }, [notes]);

  const canSaveNote = useMemo(
    () => Boolean(englishDraft.trim() || chineseDraft.trim()),
    [englishDraft, chineseDraft]
  );

  function saveNote() {
    if (!canSaveNote) {
      return;
    }

    const newNote: SavedNote = {
      id: crypto.randomUUID(),
      english: englishDraft.trim(),
      chinese: chineseDraft.trim(),
      createdAt: new Date().toISOString(),
    };

    setNotes((currentNotes) => [newNote, ...currentNotes]);
    setEnglishDraft("");
    setChineseDraft("");
    setShowNoteComposer(false);
  }

  function deleteNote(noteId: string) {
    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== noteId)
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-[100dvh] bg-[#f5f3ed] text-neutral-950">
        <div className="mx-auto min-h-[100dvh] w-full max-w-xl pb-28">
          <header
            className="sticky top-0 z-30 border-b border-black/[0.05] bg-[#f5f3ed]/90 px-4 backdrop-blur-xl"
            style={{
              paddingTop: "env(safe-area-inset-top)",
            }}
          >
            <div className="flex h-16 items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  Exchange Notes
                </p>

                <h1 className="mt-0.5 text-xl font-bold tracking-[-0.025em]">
                  Learn from the world
                </h1>
              </div>

              <LogoutButton />
            </div>
          </header>

          <section className="px-4 pt-5">
            <div className="rounded-[24px] border border-black/[0.05] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dbead6] text-sm font-bold text-[#2f6c38]">
                  LP
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-neutral-400">
                    Learning Partner
                  </p>

                  <p className="mt-0.5 truncate text-sm font-semibold">
                    Practice together every day
                  </p>
                </div>

                <Link
                  href="/messages"
                  className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95"
                >
                  Message
                </Link>
              </div>
            </div>
          </section>

          <div className="px-4 pt-6">
            <div className="grid grid-cols-2 rounded-2xl bg-black/[0.04] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("news")}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "news"
                    ? "bg-white text-neutral-950 shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                <NewsIcon active={activeTab === "news"} />
                Daily News
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "notes"
                    ? "bg-white text-neutral-950 shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                <NotesIcon active={activeTab === "notes"} />
                Notes
              </button>
            </div>
          </div>

          <div className="px-4">
            {activeTab === "news" && <DailyNews />}

            {activeTab === "notes" && (
              <section className="mt-8">
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
                    onClick={() =>
                      setShowNoteComposer((currentValue) => !currentValue)
                    }
                    className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-black/[0.07] bg-white px-4 text-xs font-semibold text-neutral-700 transition-transform active:scale-95"
                  >
                    <PlusIcon />
                    New note
                  </button>
                </div>

                {showNoteComposer && (
                  <div className="mt-5 rounded-[24px] border border-black/[0.06] bg-white p-4">
                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-500">
                        English
                      </span>

                      <textarea
                        value={englishDraft}
                        onChange={(event) =>
                          setEnglishDraft(event.target.value)
                        }
                        rows={3}
                        maxLength={1000}
                        placeholder="Write a word, sentence, or thought..."
                        className="mt-2 w-full resize-none rounded-2xl bg-[#f5f3ed] px-4 py-3 text-sm leading-6 outline-none placeholder:text-neutral-400"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="text-xs font-semibold text-neutral-500">
                        繁體中文
                      </span>

                      <textarea
                        value={chineseDraft}
                        onChange={(event) =>
                          setChineseDraft(event.target.value)
                        }
                        rows={3}
                        maxLength={1000}
                        placeholder="寫下翻譯、想法或補充..."
                        className="mt-2 w-full resize-none rounded-2xl bg-[#f5f3ed] px-4 py-3 text-sm leading-6 outline-none placeholder:text-neutral-400"
                      />
                    </label>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNoteComposer(false);
                          setEnglishDraft("");
                          setChineseDraft("");
                        }}
                        className="h-11 rounded-2xl border border-black/[0.06] bg-white text-sm font-semibold"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={saveNote}
                        disabled={!canSaveNote}
                        className="h-11 rounded-2xl bg-neutral-950 text-sm font-semibold text-white disabled:opacity-30"
                      >
                        Save note
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  {notes.length === 0 && (
                    <div className="rounded-[24px] border border-dashed border-black/[0.1] px-5 py-10 text-center">
                      <p className="text-sm font-semibold">
                        No notes yet
                      </p>

                      <p className="mt-1 text-sm leading-6 text-neutral-500">
                        Save a new word or idea from today&apos;s learning.
                      </p>
                    </div>
                  )}

                  {notes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-[24px] border border-black/[0.06] bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          {note.english && (
                            <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-7">
                              {note.english}
                            </p>
                          )}

                          {note.chinese && (
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-500">
                              {note.chinese}
                            </p>
                          )}

                          <p className="mt-4 text-[10px] text-neutral-400">
                            {formatNoteDate(note.createdAt)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteNote(note.id)}
                          aria-label="Delete note"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <nav
            className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-[#f5f3ed]/95 backdrop-blur-xl"
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="mx-auto grid h-16 max-w-xl grid-cols-4 px-2">
              <Link
                href="/capture"
                className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-neutral-500"
              >
                <CameraIcon />
                Capture
              </Link>

              <Link
                href="/messages"
                className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-neutral-500"
              >
                <MessageIcon />
                Messages
              </Link>

              <Link
                href="/friends"
                className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-neutral-500"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="16" cy="9" r="2.5" />
                  <path
                    strokeLinecap="round"
                    d="M3.5 19a5.5 5.5 0 0111 0M13 18.5a4.5 4.5 0 018 0"
                  />
                </svg>
                Friends
              </Link>

              <Link
                href="/profile"
                className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-neutral-500"
              >
                <ProfileIcon />
                Profile
              </Link>
            </div>
          </nav>
        </div>
      </main>
    </AuthGuard>
  );
}