"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Volume2 } from "lucide-react";

import Card from "@/components/foundation/cards/Card";
import Screen from "@/components/foundation/layout/Screen";
import BookIcon from "@/components/foundation/icons/BookIcon";
import UniversalSearchField from "@/components/lexicon/UniversalSearchField";
import LearningPartnerCard from "@/components/home/LearningPartnerCard";
import YumiHomeStage from "@/components/home/yumi/YumiHomeStage";
import NotesComposer from "@/components/home/NotesComposer";
import DailyFocusCard from "@/components/dashboard/DailyFocusCard";
import HomeInstallPrompt from "@/components/pwa/HomeInstallPrompt";
import PronunciationHub from "@/components/pronunciation/PronunciationHub";
import TutorialLauncher from "@/components/tutorial/TutorialLauncher";
import TodayWordCard from "@/components/pronunciation/TodayWordCard";

import { useVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import type { HomeMood } from "@/lib/pet/homeMoodEngine";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/notes/repository";
import {
  createNote,
  deleteNote as deleteNoteRow,
  fetchNotes,
  importLegacyNotes,
} from "@/lib/notes/repository";
import { speak } from "@/lib/speech";

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
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-[-0.02em]">{value}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{sublabel}</p>
    </Card>
  );
}

/*
 * The reader's hour, read the only way it can be read without lying to the
 * server: as an external value that simply does not exist there.
 *
 * useSyncExternalStore hands the third argument to the server render *and* to
 * the hydrating one, then switches to the second once hydration is done — so
 * both sides agree on "no greeting yet" and the real one arrives a moment
 * later, instead of the server guessing an hour and the browser disagreeing
 * with it.
 *
 * Nothing subscribes: the hour does not change while a screen is being looked
 * at, and a greeting that flips at noon under the reader's eyes would be a
 * stranger thing than one that waits for the next render.
 */
const subscribeToNothing = () => () => {};
const readLocalHour = () => new Date().getHours();
const noHourOnTheServer = () => null;

export default function StandardHome() {
  const { t } = useTranslation();

  /*
   * The app-wide library, not a second fetch of it.
   *
   * This screen used to read the vocabulary table itself, which meant a word
   * saved from the search sheet did not change the counts underneath until
   * the next reload — the sheet and the screen were looking at two different
   * copies of the same rows.
   */
  const { items, loading: itemsLoading } = useVocabulary();
  const { reviewStats } = useVocabularyStats(items);
  const [yumiMood, setYumiMood] = useState<HomeMood>("waiting");

  /*
   * The hour is the reader's, and the server does not have it.
   *
   * `new Date().getHours()` during the server render is the hour where the
   * server is standing — UTC in production — so for most of the day it
   * disagrees with the browser, and a disagreement in rendered text is a
   * hydration mismatch. React answers one of those by throwing away the
   * server's tree and rebuilding the page on the client, which is a whole
   * document repainting to correct two characters at the top of the screen.
   *
   * So the first render deliberately has no greeting at all, on both sides,
   * and the reader's own clock fills it in on mount. The line holds its height
   * either way, and on a cold load the opening animation is still covering
   * this screen when the effect runs.
   */
  const hour = useSyncExternalStore(
    subscribeToNothing,
    readLocalHour,
    noHourOnTheServer,
  );

  const greeting =
    hour === null
      ? ""
      : hour < 12
        ? t.home.greeting.morning
        : hour < 18
          ? t.home.greeting.afternoon
          : t.home.greeting.evening;

  // Only the notable/celebratory moods get a distinct hero title — the
  // quiet ones (waiting, hungry, sad, grumpy, lonely, sleeping) keep the
  // default "Keep learning" copy, since Yumi's own status line right
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

  const heroCopy = heroCopyByMood[yumiMood] ?? {
    title: t.home.hero.title,
    description: t.home.hero.description,
  };

  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    let active = true;

    async function loadNotes() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      // Hands over anything this device saved back when notes were local
      // only. Runs once per device and is a no-op afterwards.
      await importLegacyNotes(supabase, user.id);

      const rows = await fetchNotes(supabase);

      if (!active) return;

      setNotes(rows);
    }

    void loadNotes();

    return () => {
      active = false;
    };
  }, []);

  async function addNote(english: string, chinese: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const saved = await createNote(supabase, user.id, { english, chinese });

    // Nothing optimistic here: a note that only appeared to save is the
    // failure this whole change exists to remove.
    if (!saved) return;

    setNotes((currentNotes) => [saved, ...currentNotes]);
  }

  async function deleteNote(noteId: string) {
    const supabase = createClient();

    if (!(await deleteNoteRow(supabase, noteId))) return;

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
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {/* A non-breaking space rather than nothing while the reader's hour
              is still unknown: an empty <p> has no line box, so the whole
              screen below would jump down by a line the moment the greeting
              arrived. */}
          {greeting || "\u00A0"}
        </p>
      </div>

      <div className="mt-1.5">
        <YumiHomeStage items={items} onMoodChange={setYumiMood} />
      </div>

      <div className="px-4 pt-3">
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">
          {heroCopy.title}
        </h1>
        <p className="mt-1 text-ink-soft">{heroCopy.description}</p>
      </div>

      {/*
        Above the review card, above everything.

        The order of this screen is an argument about what the app is for,
        and it used to argue for reviewing what you already know. Looking up
        a word you have just met is the more common intention and was the
        harder of the two to reach; now it is the first thing under Yumi and
        review is directly beneath it. See UniversalSearchField.
      */}
      <div className="px-4 pt-5">
        <UniversalSearchField />
      </div>

      <div id="daily-focus-card" className="px-4 pt-6 scroll-mt-6">
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {t.home.quickStart.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold">{t.home.quickStart.title}</h2>

        {/*
          Capture used to be the second tile here. It is one of the four
          doors into the search now — the camera button sits inside the field
          above — and a screen that offers the same destination twice is a
          screen teaching the reader that its layout does not mean anything.
        */}
        <div className="mt-4">
          <Link
            href="/review"
            className="flex items-center justify-between gap-4 rounded-[24px] bg-black p-5 text-white transition active:scale-[0.99]"
          >
            <span className="min-w-0">
              <span className="block font-bold">{t.home.quickStart.review}</span>
              <span className="mt-0.5 block text-xs text-ink-invert-faint">
                {itemsLoading
                  ? "…"
                  : `${reviewStats.due} ${
                      reviewStats.due === 1
                        ? t.home.progress.word
                        : t.home.progress.words
                    }`}
              </span>
            </span>

            <BookIcon className="h-5 w-5 shrink-0" />
          </Link>
        </div>

        <div className="mt-3">
          <PronunciationHub />
        </div>
      </div>

      <div className="px-4 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {t.home.progress.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold">{t.home.progress.title}</h2>

        <Card className="mt-4 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
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
          <p className="mt-1 text-sm text-ink-soft">
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {t.home.community.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold">{t.home.community.title}</h2>

        <div className="mt-4">
          <LearningPartnerCard />
        </div>
      </div>

      <div className="px-4 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {t.home.notes.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold">{t.home.notes.title}</h2>

        <div className="mt-4">
          <NotesComposer onSave={addNote} />

          <div className="mt-5 space-y-3">
            {notes.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-black/[0.1] px-5 py-10 text-center">
                <p className="text-sm font-semibold">{t.home.notes.emptyTitle}</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
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
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft transition-transform active:scale-90"
                        >
                          <Volume2 size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                    )}

                    {note.chinese && (
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-ink-soft">
                          {note.chinese}
                        </p>
                        <button
                          type="button"
                          onClick={() => speak(note.chinese, "zh-TW")}
                          aria-label="播放中文筆記"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft transition-transform active:scale-90"
                        >
                          <Volume2 size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                    )}

                    <p className="mt-4 text-[10px] text-ink-faint">
                      {formatNoteDate(note.createdAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    aria-label={t.home.notes.deleteNote}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-transform hover:bg-red-50 hover:text-red-600 active:scale-90"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <TutorialLauncher />
      </div>
    </Screen>
  );
}
