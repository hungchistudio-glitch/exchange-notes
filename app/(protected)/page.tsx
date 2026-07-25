"use client";

import { useEffect, useState } from "react";

import DailyNews from "../components/DailyNews";
import LogoutButton from "../components/LogoutButton";

import CameraIcon from "@/components/foundation/icons/CameraIcon";
import MessageIcon from "@/components/foundation/icons/MessageIcon";
import AppHeader from "@/components/foundation/layout/AppHeader";
import BottomNavigation from "@/components/foundation/layout/BottomNavigation";
import Screen from "@/components/foundation/layout/Screen";

import LearningPartnerCard from "@/components/home/LearningPartnerCard";
import NotesComposer from "@/components/home/NotesComposer";

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

      <path
        strokeLinecap="round"
        d="M9 10h7M9 13.5h7M9 17h4"
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

function FriendsIcon() {
  return (
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
  const [notesLoaded, setNotesLoaded] = useState(false);

  useEffect(() => {
    setNotes(readStoredNotes());
    setNotesLoaded(true);
  }, []);

  useEffect(() => {
    if (!notesLoaded) {
      return;
    }

    window.localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify(notes)
    );
  }, [notes, notesLoaded]);

  function addNote(english: string, chinese: string) {
    const newNote: SavedNote = {
      id: crypto.randomUUID(),
      english,
      chinese,
      createdAt: new Date().toISOString(),
    };

    setNotes((currentNotes) => [newNote, ...currentNotes]);
  }

  function deleteNote(noteId: string) {
    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== noteId)
    );
  }

  return (
    <Screen>
      <AppHeader
        eyebrow="Exchange Notes"
        title="Learn from the world"
        action={<LogoutButton />}
      />

      <section className="px-4 pt-5">
        <LearningPartnerCard />
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
            <NotesComposer onSave={addNote} />

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

      <BottomNavigation
        items={[
          {
            href: "/capture",
            label: "Capture",
            icon: <CameraIcon />,
          },
          {
            href: "/messages",
            label: "Messages",
            icon: <MessageIcon />,
          },
          {
            href: "/friends",
            label: "Friends",
            icon: <FriendsIcon />,
          },
          {
            href: "/profile",
            label: "Profile",
            icon: <ProfileIcon />,
          },
        ]}
      />
    </Screen>
  );
}
