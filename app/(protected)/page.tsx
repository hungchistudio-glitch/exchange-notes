"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Volume2 } from "lucide-react";

import Card from "@/components/foundation/cards/Card";
import Screen from "@/components/foundation/layout/Screen";
import BookIcon from "@/components/foundation/icons/BookIcon";
import CameraIcon from "@/components/foundation/icons/CameraIcon";
import LearningPartnerCard from "@/components/home/LearningPartnerCard";
import MurphHomeStage from "@/components/home/murph/MurphHomeStage";
import NotesComposer from "@/components/home/NotesComposer";
import DailyFocusCard from "@/components/dashboard/DailyFocusCard";
import HomeInstallPrompt from "@/components/pwa/HomeInstallPrompt";
import PronunciationHub from "@/components/pronunciation/PronunciationHub";
import TodayWordCard from "@/components/pronunciation/TodayWordCard";

import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import type { HomeMood } from "@/lib/pet/homeMoodEngine";
import { fetchVocabulary, getCurrentUser } from "@/lib/vocabulary/repository";
import { speak } from "@/lib/speech";
import type { VocabularyItem } from "@/lib/types/app";

type SavedNote = {
  id: string;
  english: string;
  chinese: string;
  createdAt: string;
};

const NOTES_STORAGE_KEY = "exchange-notes-home-notes";

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h13M13 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
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
        typeof (item as SavedNote).createdAt === "string",
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

const STAT_TILE_TONES = {
  amber: "border-[#f3ddb0] bg-gradient-to-br from-[#fdf6e6] to-white",
  sky: "border-[#c9e2f5] bg-gradient-to-br from-[#eef7fd] to-white",
  green: "border-[#cdeac4] bg-gradient-to-br from-[#f2faee] to-white",
  rose: "border-[#f3d3d9] bg-gradient-to-br from-[#fdf0f2] to-white",
} as const;

function StatTile({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone: keyof typeof STAT_TILE_TONES;
}) {
  return (
    <Card className={`border p-4 ${STAT_TILE_TONES[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-[-0.02em]">{value}</p>
      <p className="mt-0.5 text-xs text-black/40">{sublabel}</p>
    </Card>
  );
}

export default function HomePage() {
  const { t } = useTranslation();

  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const { reviewStats } = useVocabularyStats(items);
  const [murphMood, setMurphMood] = useState<HomeMood>("waiting");

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t.home.greeting.morning
      : hour < 18
        ? t.home.greeting.afternoon
        : t.home.greeting.evening;

  // Only the notable/celebratory moods get a distinct hero title — the
  // quiet ones (waiting, hungry, sad, grumpy, lonely, sleeping) keep the
  // default "Keep learning" copy, since Murphy's own status line right
  // below already carries that feeling; repeating it here would just be
  // the same sentence twice.
  const heroCopyByMood: Partial<Record<HomeMood, { title: string; description: string }>> = {
    curious: {
      title: t.home.hero.titleCurious,
      description: t.home.hero.descriptionCurious,
    },
    happy: {
      title: t.home.hero.titleCelebrate,
      description: t.home.hero.descriptionCelebrate,
    },
    dancing: {
      title: t.home.hero.titleDancing,
      description: t.home.hero.descriptionDancing,
    },
    excited: {
      title: t.home.hero.titleCelebrate,
      description: t.home.hero.descriptionCelebrate,
    },
    welcomeBack: {
      title: t.home.hero.titleWelcomeBack,
      description: t.home.hero.descriptionWelcomeBack,
    },
  };

  const heroCopy = heroCopyByMood[murphMood] ?? {
    title: t.home.hero.title,
    description: t.home.hero.description,
  };

  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { user } = await getCurrentUser();

      if (!user) {
        if (active) setItemsLoading(false);
        return;
      }

      const vocabulary = await fetchVocabulary(user.id);

      if (active) {
        setItems((vocabulary ?? []) as VocabularyItem[]);
        setItemsLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setNotes(readStoredNotes());
    setNotesLoaded(true);
  }, []);

  useEffect(() => {
    if (!notesLoaded) {
      return;
    }

    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
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
      currentNotes.filter((note) => note.id !== noteId),
    );
  }

  return (
    <Screen>
      <HomeInstallPrompt />

      <div
        className="px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">
          {greeting}
        </p>
      </div>

      <div className="mt-1.5">
        <MurphHomeStage items={items} onMoodChange={setMurphMood} />
      </div>

      <div className="px-4 pt-3">
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">
          {heroCopy.title}
        </h1>
        <p className="mt-1 text-black/50">{heroCopy.description}</p>
      </div>

      <div id="daily-focus-card" className="px-4 pt-4 scroll-mt-6">
        <DailyFocusCard
          due={itemsLoading ? 0 : reviewStats.due}
          retention={reviewStats.retention}
          accuracy={reviewStats.accuracy}
          loading={itemsLoading}
        />
      </div>

      <div className="px-4 pt-6">
        <TodayWordCard />
      </div>

      <div className="px-4 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
          {t.home.quickStart.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold">{t.home.quickStart.title}</h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href="/review"
            className="rounded-[24px] bg-black p-4 text-white transition active:scale-[0.99]"
          >
            <BookIcon className="h-5 w-5" />
            <p className="mt-6 font-bold">{t.home.quickStart.review}</p>
            <p className="mt-0.5 text-xs text-white/50">
              {itemsLoading ? "…" : `${reviewStats.due} words ready`}
            </p>
          </Link>

          <Link
            href="/capture"
            className="rounded-[24px] border border-[#f3ddb0] bg-gradient-to-br from-[#fdf6e6] to-white p-4 transition active:scale-[0.99]"
          >
            <CameraIcon className="h-5 w-5" />
            <p className="mt-6 font-bold">{t.home.quickStart.capture}</p>
            <p className="mt-0.5 text-xs text-black/40">
              {t.home.quickStart.captureDescription}
            </p>
          </Link>
        </div>

        <div className="mt-3">
          <PronunciationHub />
        </div>
      </div>

      <div className="px-4 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
          {t.home.progress.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold">{t.home.progress.title}</h2>

        <Card className="mt-4 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
            {t.home.progress.todaysReview}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {itemsLoading
              ? "…"
              : `${reviewStats.due} ${
                  reviewStats.due === 1
                    ? t.home.progress.word
                    : t.home.progress.words
                }`}
          </p>
          <p className="mt-1 text-sm text-black/50">
            {t.home.progress.readyDescription}
          </p>

          <Link
            href="/review"
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white"
          >
            {t.home.progress.continueReview}
            <ArrowRightIcon />
          </Link>
        </Card>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatTile
            label={t.home.progress.accuracy}
            value={itemsLoading ? "…" : `${reviewStats.accuracy}%`}
            sublabel={t.home.progress.totalReviews.replace(
              "{count}",
              String(reviewStats.reviewed),
            )}
            tone="amber"
          />
          <StatTile
            label={t.home.progress.retention}
            value={itemsLoading ? "…" : `${reviewStats.retention}%`}
            sublabel={t.home.progress.memoryStrength}
            tone="sky"
          />
          <StatTile
            label={t.home.progress.mastered}
            value={itemsLoading ? "…" : String(reviewStats.mastered)}
            sublabel={t.home.progress.wordsCompleted}
            tone="green"
          />
          <StatTile
            label={t.home.progress.practice}
            value={itemsLoading ? "…" : String(reviewStats.weak)}
            sublabel={t.home.progress.wordsToRevisit}
            tone="rose"
          />
        </div>
      </div>

      <div className="px-4 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
          {t.home.community.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold">{t.home.community.title}</h2>

        <div className="mt-4">
          <LearningPartnerCard />
        </div>
      </div>

      <div className="px-4 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
          {t.home.notes.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold">{t.home.notes.title}</h2>

        <div className="mt-4">
          <NotesComposer onSave={addNote} />

          <div className="mt-5 space-y-3">
            {notes.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-black/[0.1] px-5 py-10 text-center">
                <p className="text-sm font-semibold">{t.home.notes.emptyTitle}</p>
                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  {t.home.notes.emptyDescription}
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
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 whitespace-pre-wrap break-words text-[15px] font-medium leading-7">
                          {note.english}
                        </p>
                        <button
                          type="button"
                          onClick={() => speak(note.english, "en-US")}
                          aria-label="Play English note"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-black/60 transition-transform active:scale-90"
                        >
                          <Volume2 size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                    )}

                    {note.chinese && (
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-500">
                          {note.chinese}
                        </p>
                        <button
                          type="button"
                          onClick={() => speak(note.chinese, "zh-TW")}
                          aria-label="播放中文筆記"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-black/60 transition-transform active:scale-90"
                        >
                          <Volume2 size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                    )}

                    <p className="mt-4 text-[10px] text-neutral-400">
                      {formatNoteDate(note.createdAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    aria-label={t.home.notes.deleteNote}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-transform hover:bg-red-50 hover:text-red-600 active:scale-90"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}
