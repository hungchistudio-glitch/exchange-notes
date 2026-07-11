"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type TouchEvent,
} from "react";

import AuthGuard from "./components/AuthGuard";
import LogoutButton from "./components/LogoutButton";
import { createClient } from "@/lib/supabase/client";

type Language = "english" | "traditional-chinese";
type ActiveTab = "notes" | "news";

type Note = {
  id: number;
  language: Language;
  text: string;
  time: string;
  replies: number;
};

type NewsArticle = {
  id: number;
  category: string;
  englishTitle: string;
  chineseTitle: string;
  summary: string;
  vocabulary: string[];
};

const starterNotes: Note[] = [
  {
    id: 1,
    language: "english",
    text: 'I heard someone say "hang in there" today.',
    time: "3:42 PM",
    replies: 1,
  },
  {
    id: 2,
    language: "traditional-chinese",
    text: "今天學到：「見招拆招」",
    time: "8:15 PM",
    replies: 2,
  },
];

const starterNews: NewsArticle[] = [
  {
    id: 1,
    category: "Technology",
    englishTitle:
      "Cities explore new ways to use artificial intelligence",
    chineseTitle: "城市探索人工智慧的新應用方式",
    summary:
      "Local governments are testing AI tools to improve transportation, public services, and communication.",
    vocabulary: [
      "explore",
      "artificial intelligence",
      "public services",
    ],
  },
  {
    id: 2,
    category: "Culture",
    englishTitle:
      "Museums create more interactive exhibitions",
    chineseTitle: "博物館推出更多互動式展覽",
    summary:
      "Museums are using digital displays and immersive experiences to attract younger visitors.",
    vocabulary: ["interactive", "exhibition", "immersive"],
  },
  {
    id: 3,
    category: "Life",
    englishTitle:
      "More people choose bicycles for short daily trips",
    chineseTitle: "更多人選擇騎自行車進行短程通勤",
    summary:
      "Cities are adding protected bike lanes as more residents choose cycling for transportation.",
    vocabulary: [
      "daily trips",
      "protected bike lanes",
      "residents",
    ],
  },
];

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>(starterNotes);
  const [newNote, setNewNote] = useState("");
  const [language, setLanguage] =
    useState<Language>("english");
  const [activeTab, setActiveTab] =
    useState<ActiveTab>("notes");
  const [loaded, setLoaded] = useState(false);
  const [touchStartX, setTouchStartX] =
    useState<number | null>(null);
  const [displayName, setDisplayName] =
    useState("Welcome back");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    const savedNotes = localStorage.getItem("exchange-notes");

    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes) as Note[]);
      } catch {
        console.error("Could not load saved notes.");
      }
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      "exchange-notes",
      JSON.stringify(notes)
    );
  }, [notes, loaded]);

  useEffect(() => {
    async function loadUserName() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const metadataName =
          typeof user.user_metadata?.display_name === "string"
            ? user.user_metadata.display_name.trim()
            : "";

        if (metadataName) {
          setDisplayName(metadataName);
          return;
        }

        const emailName = user.email?.split("@")[0];

        if (emailName) {
          setDisplayName(emailName);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, display_name")
          .eq("id", user.id)
          .single();

        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }

        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
      } catch {
        setDisplayName("Welcome back");
      }
    }

    loadUserName();
  }, []);

  const totalReplies = useMemo(
    () =>
      notes.reduce(
        (sum, note) => sum + note.replies,
        0
      ),
    [notes]
  );

  const totalWords = useMemo(() => {
    return notes.reduce((sum, note) => {
      return (
        sum +
        note.text
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
      );
    }, 0);
  }, [notes]);

  function addNote() {
    const text = newNote.trim();

    if (!text) return;

    const note: Note = {
      id: Date.now(),
      language,
      text,
      time: getCurrentTime(),
      replies: 0,
    };

    setNotes((currentNotes) => [
      note,
      ...currentNotes,
    ]);

    setNewNote("");
  }

  function saveNewsToNotes(article: NewsArticle) {
    const note: Note = {
      id: Date.now(),
      language: "english",
      text: `${article.englishTitle}

${article.chineseTitle}

Vocabulary:
${article.vocabulary.join(", ")}`,
      time: getCurrentTime(),
      replies: 0,
    };

    setNotes((currentNotes) => [
      note,
      ...currentNotes,
    ]);

    setActiveTab("notes");
  }

  function handleTouchStart(
    event: TouchEvent<HTMLElement>
  ) {
    setTouchStartX(
      event.changedTouches[0]?.clientX ?? null
    );
  }

  function handleTouchEnd(
    event: TouchEvent<HTMLElement>
  ) {
    if (touchStartX === null) return;

    const endX =
      event.changedTouches[0]?.clientX ?? touchStartX;

    const swipeDistance = touchStartX - endX;

    if (swipeDistance > 90) {
      router.push("/camera");
    }

    setTouchStartX(null);
  }

  return (
    <AuthGuard>
      <main
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="min-h-screen bg-[#f4f1ea] px-4 pb-28 pt-6 text-black sm:px-6 sm:pb-12 sm:pt-10"
      >
        <div className="mx-auto max-w-2xl">
          <header>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-black">
                  {getGreeting()}
                </p>

                <h1 className="mt-1 break-words text-4xl font-bold tracking-tight text-black sm:text-5xl">
                  {displayName}
                </h1>

                <p className="mt-3 font-semibold text-black">
                  English × 繁體中文
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-300 bg-white text-lg font-bold text-black"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Your profile photo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </Link>

                <LogoutButton />
              </div>
            </div>

            <p className="mt-5 text-lg leading-7 text-black">
              Keep one useful word, sentence, or
              question from today.
            </p>
          </header>

          <section className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab("notes");
                document
                  .getElementById("new-note")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }}
              className="rounded-3xl bg-black p-5 text-left text-white shadow-sm"
            >
              <span className="text-2xl">＋</span>

              <p className="mt-6 text-lg font-bold">
                Add Note
              </p>

              <p className="mt-1 text-sm text-white">
                Save what you learned
              </p>
            </button>

            <Link
              href="/camera"
              className="rounded-3xl bg-white p-5 text-left text-black shadow-sm"
            >
              <span className="text-2xl">◉</span>

              <p className="mt-6 text-lg font-bold">
                Camera
              </p>

              <p className="mt-1 text-sm text-black">
                Discover a word
              </p>
            </Link>

            <Link
              href="/friends"
              className="rounded-3xl bg-white p-5 text-left text-black shadow-sm"
            >
              <span className="text-2xl">◎</span>

              <p className="mt-6 text-lg font-bold">
                Friends
              </p>

              <p className="mt-1 text-sm text-black">
                Add a learning partner
              </p>
            </Link>

            <Link
              href="/messages"
              className="rounded-3xl bg-white p-5 text-left text-black shadow-sm"
            >
              <span className="text-2xl">◌</span>

              <p className="mt-6 text-lg font-bold">
                Messages
              </p>

              <p className="mt-1 text-sm text-black">
                Continue a conversation
              </p>
            </Link>
          </section>

          <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-black">
                  Today
                </p>

                <h2 className="mt-2 text-2xl font-bold text-black">
                  Your learning snapshot
                </h2>
              </div>

              <span className="text-2xl">↗</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[#f4f1ea] p-4">
                <p className="text-2xl font-bold text-black">
                  {notes.length}
                </p>

                <p className="mt-1 text-sm font-semibold text-black">
                  Notes
                </p>
              </div>

              <div className="rounded-2xl bg-[#f4f1ea] p-4">
                <p className="text-2xl font-bold text-black">
                  {totalWords}
                </p>

                <p className="mt-1 text-sm font-semibold text-black">
                  Words
                </p>
              </div>

              <div className="rounded-2xl bg-[#f4f1ea] p-4">
                <p className="text-2xl font-bold text-black">
                  {totalReplies}
                </p>

                <p className="mt-1 text-sm font-semibold text-black">
                  Replies
                </p>
              </div>
            </div>
          </section>

          <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-black">
                  Learning partner
                </p>

                <h2 className="mt-2 text-2xl font-bold text-black">
                  Learning is better together
                </h2>

                <p className="mt-2 leading-7 text-black">
                  Add a friend by Exchange ID, email,
                  or QR code.
                </p>
              </div>
            </div>

            <Link
              href="/friends"
              className="mt-5 block rounded-2xl bg-black px-5 py-4 text-center font-bold text-white"
            >
              Add Your First Friend
            </Link>
          </section>

          <nav className="mt-7 grid grid-cols-2 rounded-3xl bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`rounded-2xl px-4 py-4 font-bold transition ${
                activeTab === "notes"
                  ? "bg-black text-white"
                  : "bg-white text-black"
              }`}
            >
              Notes
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("news")}
              className={`rounded-2xl px-4 py-4 font-bold transition ${
                activeTab === "news"
                  ? "bg-black text-white"
                  : "bg-white text-black"
              }`}
            >
              Daily News
            </button>
          </nav>

          {activeTab === "notes" && (
            <>
              <section
                id="new-note"
                className="mt-7 scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7"
              >
                <h2 className="text-2xl font-bold text-black">
                  What did you learn?
                </h2>

                <p className="mt-2 leading-7 text-black">
                  Save a word, sentence, question, or
                  expression.
                </p>

                <textarea
                  value={newNote}
                  onChange={(event) =>
                    setNewNote(event.target.value)
                  }
                  placeholder="Write something useful from today..."
                  rows={5}
                  maxLength={2000}
                  className="mt-5 w-full resize-none rounded-2xl border border-neutral-500 bg-white p-4 text-lg text-black placeholder:text-neutral-600 outline-none transition focus:border-black"
                />

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setLanguage("english")
                    }
                    className={`rounded-2xl border px-4 py-4 font-bold ${
                      language === "english"
                        ? "border-black bg-black text-white"
                        : "border-neutral-400 bg-white text-black"
                    }`}
                  >
                    English
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLanguage(
                        "traditional-chinese"
                      )
                    }
                    className={`rounded-2xl border px-4 py-4 font-bold ${
                      language ===
                      "traditional-chinese"
                        ? "border-black bg-black text-white"
                        : "border-neutral-400 bg-white text-black"
                    }`}
                  >
                    繁體中文
                  </button>
                </div>

                <button
                  type="button"
                  onClick={addNote}
                  disabled={!newNote.trim()}
                  className="mt-4 w-full rounded-2xl bg-orange-500 px-5 py-4 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save Note
                </button>
              </section>

              <section className="mt-9">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-black">
                      Shared Notes
                    </h2>

                    <p className="mt-1 font-semibold text-black">
                      {notes.length} saved{" "}
                      {notes.length === 1
                        ? "note"
                        : "notes"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {notes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="rounded-full bg-[#f4f1ea] px-3 py-1 text-sm font-bold text-black">
                          {note.language === "english"
                            ? "English"
                            : "繁體中文"}
                        </span>

                        <span className="text-sm font-semibold text-black">
                          {note.time}
                        </span>
                      </div>

                      <p className="mt-5 whitespace-pre-wrap break-words text-lg leading-8 text-black">
                        {note.text}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-neutral-200 pt-4 text-sm text-black">
                        <span className="font-semibold">
                          {note.replies}{" "}
                          {note.replies === 1
                            ? "reply"
                            : "replies"}
                        </span>

                        <Link
                          href="/messages"
                          className="font-bold text-black underline"
                        >
                          Discuss
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === "news" && (
            <section className="mt-7">
              <h2 className="text-3xl font-bold text-black">
                Daily News
              </h2>

              <p className="mt-2 leading-7 text-black">
                Learn through simple current topics.
              </p>

              <div className="mt-5 space-y-4">
                {starterNews.map((article) => (
                  <article
                    key={article.id}
                    className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"
                  >
                    <span className="inline-block rounded-full bg-[#f4f1ea] px-3 py-1 text-sm font-bold text-black">
                      {article.category}
                    </span>

                    <h3 className="mt-5 text-2xl font-bold leading-8 text-black">
                      {article.englishTitle}
                    </h3>

                    <p className="mt-3 text-lg font-bold text-black">
                      {article.chineseTitle}
                    </p>

                    <p className="mt-5 leading-7 text-black">
                      {article.summary}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {article.vocabulary.map((word) => (
                        <span
                          key={word}
                          className="rounded-full bg-[#f4f1ea] px-3 py-2 text-sm font-semibold text-black"
                        >
                          {word}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        saveNewsToNotes(article)
                      }
                      className="mt-6 w-full rounded-2xl border border-black bg-white px-4 py-4 font-bold text-black"
                    >
                      Save to Notes
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <nav className="fixed inset-x-3 bottom-3 z-50 mx-auto grid max-w-md grid-cols-4 rounded-3xl border border-neutral-200 bg-white p-2 shadow-lg sm:hidden">
          <Link
            href="/"
            className="rounded-2xl bg-black px-2 py-3 text-center text-xs font-bold text-white"
          >
            Home
          </Link>

          <Link
            href="/friends"
            className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-black"
          >
            Friends
          </Link>

          <Link
            href="/camera"
            className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-black"
          >
            Camera
          </Link>

          <Link
            href="/messages"
            className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-black"
          >
            Messages
          </Link>
        </nav>
      </main>
    </AuthGuard>
  );
}