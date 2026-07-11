"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AuthGuard from "./components/AuthGuard";
import LogoutButton from "./components/LogoutButton";

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

export default function Home() {
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
    event: React.TouchEvent<HTMLElement>
  ) {
    setTouchStartX(
      event.changedTouches[0]?.clientX ?? null
    );
  }

  function handleTouchEnd(
    event: React.TouchEvent<HTMLElement>
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
        className="min-h-screen bg-[#f4f1ea] px-4 py-7 text-neutral-900 sm:px-6 sm:py-10"
      >
        <div className="mx-auto max-w-2xl">
          <header className="mb-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-500 sm:text-sm">
                  English × 繁體中文
                </p>

                <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                  Exchange Notes
                </h1>
              </div>

              <LogoutButton />
            </div>

            <p className="mt-5 text-lg text-neutral-600">
              Learn together. One note at a time.
            </p>
          </header>

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/messages"
              className="flex items-center justify-between rounded-3xl bg-neutral-900 px-5 py-5 text-white shadow-sm transition hover:opacity-90"
            >
              <div>
                <p className="text-sm text-neutral-400">
                  Private learning space
                </p>

                <p className="mt-1 text-lg font-semibold">
                  Partner Messages
                </p>
              </div>

              <span className="text-2xl">→</span>
            </Link>

            <Link
              href="/camera"
              className="flex items-center justify-between rounded-3xl bg-white px-5 py-5 shadow-sm transition hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm text-neutral-400">
                  Camera or image
                </p>

                <p className="mt-1 text-lg font-semibold">
                  Discover a Word
                </p>
              </div>

              <span className="text-neutral-400">← Swipe</span>
            </Link>
          </div>

          <nav className="mb-7 grid grid-cols-2 rounded-2xl bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`rounded-xl px-4 py-3 font-semibold transition ${
                activeTab === "notes"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              Notes
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("news")}
              className={`rounded-xl px-4 py-3 font-semibold transition ${
                activeTab === "news"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              Daily News
            </button>
          </nav>

          {activeTab === "notes" && (
            <>
              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-bold">
                  Add a new note
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Save a word, sentence, question, or
                  real-life expression.
                </p>

                <textarea
                  value={newNote}
                  onChange={(event) =>
                    setNewNote(event.target.value)
                  }
                  placeholder="What did you learn today?"
                  rows={5}
                  maxLength={2000}
                  className="mt-5 w-full resize-none rounded-2xl border border-neutral-200 p-4 text-lg outline-none transition focus:border-neutral-700"
                />

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setLanguage("english")
                    }
                    className={`rounded-xl px-4 py-3 font-medium transition ${
                      language === "english"
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-700"
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
                    className={`rounded-xl px-4 py-3 font-medium transition ${
                      language ===
                      "traditional-chinese"
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    繁體中文
                  </button>
                </div>

                <button
                  type="button"
                  onClick={addNote}
                  disabled={!newNote.trim()}
                  className="mt-4 w-full rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Post Note
                </button>
              </section>

              <section className="mt-9">
                <h2 className="text-2xl font-bold">
                  Shared Notes
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {notes.length} saved{" "}
                  {notes.length === 1 ? "note" : "notes"}
                </p>

                <div className="mt-4 space-y-4">
                  {notes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium">
                          {note.language === "english"
                            ? "English"
                            : "繁體中文"}
                        </span>

                        <span className="text-sm text-neutral-400">
                          {note.time}
                        </span>
                      </div>

                      <p className="mt-5 whitespace-pre-wrap break-words text-lg leading-8">
                        {note.text}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4 text-sm text-neutral-500">
                        <span>
                          💬 {note.replies}{" "}
                          {note.replies === 1
                            ? "reply"
                            : "replies"}
                        </span>

                        <Link
                          href="/messages"
                          className="font-semibold text-neutral-700"
                        >
                          Discuss →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === "news" && (
            <section>
              <h2 className="text-3xl font-bold">
                Daily News
              </h2>

              <p className="mt-2 text-neutral-600">
                Learn through current topics.
              </p>

              <div className="mt-5 space-y-4">
                {starterNews.map((article) => (
                  <article
                    key={article.id}
                    className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"
                  >
                    <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold">
                      {article.category}
                    </span>

                    <h3 className="mt-5 text-2xl font-bold leading-8">
                      {article.englishTitle}
                    </h3>

                    <p className="mt-3 text-lg font-medium text-neutral-700">
                      {article.chineseTitle}
                    </p>

                    <p className="mt-5 leading-7 text-neutral-600">
                      {article.summary}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {article.vocabulary.map((word) => (
                        <span
                          key={word}
                          className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm"
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
                      className="mt-6 w-full rounded-xl border border-neutral-300 px-4 py-3 font-semibold transition hover:bg-neutral-50"
                    >
                      Save to Notes
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}