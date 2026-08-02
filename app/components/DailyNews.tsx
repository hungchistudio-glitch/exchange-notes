"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type VocabularyItem = {
  word: string;
  translation: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
};

type DailyNewsCard = {
  id: string;
  category: string;
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  vocabulary: VocabularyItem[];
};

type DailyNewsResponse = {
  cards: DailyNewsCard[];
  generatedAt: string;
};

type StoredNote = {
  id: string;
  english: string;
  chinese: string;
  createdAt: string;
};

type SpeechRate = 0.75 | 1 | 1.25;

const NOTES_STORAGE_KEY =
  "exchange-notes-home-notes";

// Daily News is now sourced entirely from The Guardian (see lib/dailyNews.ts),
// so the old multi-region (US/Taiwan/international/Europe/culture) badge no
// longer reflects anything real — every card would show the same source.
// The category badge (World/Business/Technology/Science/Culture) carries
// the variety instead.
const CATEGORY_BADGE_CLASS = "bg-surface text-neutral-700";

function RefreshIcon({
  spinning,
}: {
  spinning: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-4 w-4 ${
        spinning ? "animate-spin" : ""
      }`}
      aria-hidden="true"
    >
      <path
        d="M20 11a8 8 0 10-2.3 5.7"
        strokeLinecap="round"
      />

      <path
        d="M20 5v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpeakerIcon({
  active,
}: {
  active: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-4 w-4 ${
        active ? "animate-pulse" : ""
      }`}
      aria-hidden="true"
    >
      <path
        d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M16 8.5a5 5 0 010 7"
        strokeLinecap="round"
      />

      <path
        d="M18.5 6a8.5 8.5 0 010 12"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BookmarkIcon({
  filled,
}: {
  filled: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M7 4.5h10v15l-5-3-5 3v-15z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
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
        d="M4 5l16 7-16 7 3-7-3-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M7 12h13"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
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
        d="M14 5h5v5M19 5l-8 8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M18 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M9.5 4.5a3 3 0 00-3 3v.4A3.5 3.5 0 005 14.5a3 3 0 003 3h1.5M14.5 4.5a3 3 0 013 3v.4a3.5 3.5 0 011.5 6.6 3 3 0 01-3 3h-1.5M12 4v16M8.5 10H12M12 14h3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function LoadingCard() {
  return (
    <div className="rounded-[26px] border border-black/[0.05] bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="h-6 w-20 animate-pulse rounded-full bg-black/[0.06]" />

        <div className="h-4 w-16 animate-pulse rounded bg-black/[0.05]" />
      </div>

      <div className="mt-5 h-7 w-full animate-pulse rounded-lg bg-black/[0.07]" />

      <div className="mt-3 h-5 w-4/5 animate-pulse rounded-lg bg-black/[0.05]" />

      <div className="mt-6 h-4 w-full animate-pulse rounded bg-black/[0.05]" />

      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-black/[0.05]" />

      <div className="mt-6 flex gap-2">
        <div className="h-10 flex-1 animate-pulse rounded-2xl bg-black/[0.05]" />
        <div className="h-10 flex-1 animate-pulse rounded-2xl bg-black/[0.05]" />
      </div>
    </div>
  );
}

function readStoredNotes(): StoredNote[] {
  try {
    const rawValue =
      window.localStorage.getItem(
        NOTES_STORAGE_KEY
      );

    if (!rawValue) {
      return [];
    }

    const parsedValue =
      JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (item): item is StoredNote =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as StoredNote)
          .id === "string" &&
        typeof (item as StoredNote)
          .english === "string" &&
        typeof (item as StoredNote)
          .chinese === "string" &&
        typeof (item as StoredNote)
          .createdAt === "string"
    );
  } catch {
    return [];
  }
}

function formatPublishedTime(
  value: string
) {
  const publishedDate =
    new Date(value);

  if (
    Number.isNaN(
      publishedDate.getTime()
    )
  ) {
    return "Recently";
  }

  const difference =
    Date.now() -
    publishedDate.getTime();

  const minutes = Math.max(
    0,
    Math.floor(
      difference / 60_000
    )
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  ).format(publishedDate);
}

function createNoteContent(
  card: DailyNewsCard
) {
  const englishVocabulary =
    card.vocabulary
      .map(
        (item) =>
          `• ${item.word} (${item.partOfSpeech}) — ${item.englishExample}`
      )
      .join("\n");

  const chineseVocabulary =
    card.vocabulary
      .map(
        (item) =>
          `• ${item.word}：${item.translation}\n  ${item.chineseExample}`
      )
      .join("\n");

  const english = `📰 ${card.englishTitle}

${card.englishSummary}

Vocabulary
${englishVocabulary}

Source: ${card.sourceName}
${card.sourceUrl}`;

  const chinese = `${card.chineseTitle}

${card.chineseSummary}

學習單字
${chineseVocabulary}`;

  return {
    english,
    chinese,
  };
}

function createPartnerMessage(
  card: DailyNewsCard
) {
  const vocabulary =
    card.vocabulary
      .map(
        (item) =>
          `• ${item.word} — ${item.translation}`
      )
      .join("\n");

  return `📰 ${card.englishTitle}

${card.chineseTitle}

${card.englishSummary}

${card.chineseSummary}

Vocabulary / 學習單字
${vocabulary}

Source / 來源：${card.sourceName}
${card.sourceUrl}`;
}

export default function DailyNews() {
  const router = useRouter();

  const [cards, setCards] =
    useState<DailyNewsCard[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [
    speakingKey,
    setSpeakingKey,
  ] = useState<string | null>(null);

  const [
    savedCardIds,
    setSavedCardIds,
  ] = useState<Set<string>>(
    new Set()
  );

  const [
    savingCardId,
    setSavingCardId,
  ] = useState<string | null>(null);

  const [
    speechRate,
    setSpeechRate,
  ] = useState<SpeechRate>(1);

  const requestControllerRef =
    useRef<AbortController | null>(
      null
    );

  // Daily News is now generated once on a fixed schedule (see
  // app/api/cron/daily-news/route.ts) instead of per request, so there's
  // no more per-user "seen stories" exclusion — everyone reads the same
  // pre-generated batch. We keep track of the last generatedAt we saw so
  // the refresh button can tell the person when they're already looking
  // at the latest batch, instead of implying something went wrong.
  const lastGeneratedAtRef = useRef<string | null>(null);

  const loadNews = useCallback(
    async (
      isRefresh = false
    ) => {
      requestControllerRef.current?.abort();

      const controller =
        new AbortController();

      requestControllerRef.current =
        controller;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setNotice("");

      try {
        const response =
          await fetch(
            "/api/daily-news",
            {
              method: "GET",
              cache: "no-store",
              signal:
                controller.signal,
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        const payload =
          (await response.json()) as
            | DailyNewsResponse
            | { error: string };

        if (
          !response.ok ||
          "error" in payload
        ) {
          throw new Error(
            "error" in payload
              ? payload.error
              : "Unable to load daily news."
          );
        }

        if (
          isRefresh &&
          lastGeneratedAtRef.current ===
            payload.generatedAt
        ) {
          setNotice(
            "You're already seeing today's stories — a new batch is published once a day."
          );
        }

        lastGeneratedAtRef.current =
          payload.generatedAt;

        setCards(payload.cards);
      } catch (requestError) {
        if (
          requestError instanceof
            DOMException &&
          requestError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof
            Error
            ? requestError.message
            : "Daily news is temporarily unavailable."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadNews();

    return () => {
      requestControllerRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, [loadNews]);

  function speak(
    key: string,
    text: string,
    language:
      | "en-US"
      | "zh-TW"
  ) {
    if (
      typeof window ===
        "undefined" ||
      !(
        "speechSynthesis" in
        window
      ) ||
      !text.trim()
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    if (speakingKey === key) {
      setSpeakingKey(null);
      return;
    }

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    utterance.lang = language;

    utterance.rate =
      speechRate *
      (language === "zh-TW"
        ? 0.92
        : 1);

    utterance.pitch = 1;

    utterance.onstart = () => {
      setSpeakingKey(key);
    };

    utterance.onend = () => {
      setSpeakingKey(null);
    };

    utterance.onerror = () => {
      setSpeakingKey(null);
    };

    window.speechSynthesis.speak(
      utterance
    );
  }

  async function saveToNotes(
    card: DailyNewsCard
  ) {
    if (savingCardId) {
      return;
    }

    setSavingCardId(card.id);
    setError("");

    const noteContent =
      createNoteContent(card);

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      /*
       * This attempts a Supabase save using common note columns.
       * If your notes table has a different schema, it safely
       * falls back to the existing localStorage Notes system.
       */
      if (user) {
        const { error: insertError } =
          await supabase
            .from("notes")
            .insert({
              user_id: user.id,
              english:
                noteContent.english,
              chinese:
                noteContent.chinese,
              source_name:
                card.sourceName,
              source_url:
                card.sourceUrl,
            });

        if (insertError) {
          console.warn(
            "Supabase note save failed; using local fallback:",
            insertError.message
          );
        } else {
          setSavedCardIds(
            (currentIds) => {
              const nextIds =
                new Set(currentIds);

              nextIds.add(card.id);

              return nextIds;
            }
          );

          return;
        }
      }

      const existingNotes =
        readStoredNotes();

      const alreadySaved =
        existingNotes.some((note) =>
          note.english.includes(
            card.sourceUrl
          )
        );

      if (!alreadySaved) {
        const note: StoredNote = {
          id: crypto.randomUUID(),
          english:
            noteContent.english,
          chinese:
            noteContent.chinese,
          createdAt:
            new Date().toISOString(),
        };

        window.localStorage.setItem(
          NOTES_STORAGE_KEY,
          JSON.stringify([
            note,
            ...existingNotes,
          ])
        );
      }

      setSavedCardIds(
        (currentIds) => {
          const nextIds =
            new Set(currentIds);

          nextIds.add(card.id);

          return nextIds;
        }
      );

      window.dispatchEvent(
        new CustomEvent(
          "exchange-notes-notes-updated"
        )
      );
    } catch (saveError) {
      console.error(
        "Save note error:",
        saveError
      );

      setError(
        "This story could not be saved. Please try again."
      );
    } finally {
      setSavingCardId(null);
    }
  }

  function sendToPartner(
    card: DailyNewsCard
  ) {
    window.sessionStorage.setItem(
      "exchange-notes-draft-message",
      createPartnerMessage(card)
    );

    router.push("/messages");
  }

  if (loading) {
    return (
      <section className="mt-8">
        <div className="mb-5">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-black/[0.07]" />

          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-black/[0.05]" />
        </div>

        <div className="space-y-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Live global stories
          </p>

          <h2 className="mt-1 text-[28px] font-bold tracking-[-0.035em] text-neutral-950">
            Daily News
          </h2>

          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Learn English from
            today&apos;s major stories.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadNews(true)
          }
          disabled={refreshing}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-black/[0.07] bg-white px-4 text-xs font-semibold text-neutral-700 transition-transform active:scale-95 disabled:opacity-50"
        >
          <RefreshIcon
            spinning={refreshing}
          />

          <span>
            {refreshing
              ? "Loading"
              : "New stories"}
          </span>
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-black/[0.035] px-3 py-2">
        <span className="text-[11px] font-medium text-neutral-500">
          Speech speed
        </span>

        <div className="flex gap-1">
          {(
            [
              0.75,
              1,
              1.25,
            ] as SpeechRate[]
          ).map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() =>
                setSpeechRate(rate)
              }
              className={`h-7 rounded-full px-3 text-[10px] font-semibold ${
                speechRate === rate
                  ? "bg-neutral-950 text-white"
                  : "bg-white text-neutral-500"
              }`}
            >
              {rate}×
            </button>
          ))}
        </div>
      </div>

      {notice && !error && (
        <div
          role="status"
          className="mb-4 rounded-2xl bg-black/[0.035] px-4 py-3 text-sm leading-6 text-neutral-600"
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              void loadNews(true)
            }
            className="mt-2 font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}

      {!error &&
        cards.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-black/[0.1] px-5 py-10 text-center">
            <p className="text-sm font-semibold">
              No news is available
              right now
            </p>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Please try again in a
              few minutes.
            </p>
          </div>
        )}

      <div className="space-y-4">
        {cards.map((card) => {
          const isSaved =
            savedCardIds.has(card.id);

          const isSaving =
            savingCardId === card.id;

          return (
            <article
              key={card.id}
              className="overflow-hidden rounded-[26px] border border-black/[0.06] bg-white"
            >
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold ${CATEGORY_BADGE_CLASS}`}
                    >
                      {card.category}
                    </span>
                  </div>

                  <span className="text-[10px] text-neutral-400">
                    {formatPublishedTime(
                      card.publishedAt
                    )}
                  </span>
                </div>

                <div className="mt-4 flex items-start gap-2">
                  <h3 className="min-w-0 flex-1 text-[22px] font-bold leading-[1.22] tracking-[-0.025em] text-neutral-950">
                    {card.englishTitle}
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      speak(
                        `story-en-${card.id}`,
                        `${card.englishTitle}. ${card.englishSummary}`,
                        "en-US"
                      )
                    }
                    aria-label="Read English story aloud"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white text-neutral-600 transition-transform active:scale-90"
                  >
                    <SpeakerIcon
                      active={
                        speakingKey ===
                        `story-en-${card.id}`
                      }
                    />
                  </button>
                </div>

                <div className="mt-2 flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-[16px] font-semibold leading-7 text-neutral-800">
                    {card.chineseTitle}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      speak(
                        `story-zh-${card.id}`,
                        `${card.chineseTitle}。${card.chineseSummary}`,
                        "zh-TW"
                      )
                    }
                    aria-label="朗讀中文新聞"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white text-neutral-600 transition-transform active:scale-90"
                  >
                    <SpeakerIcon
                      active={
                        speakingKey ===
                        `story-zh-${card.id}`
                      }
                    />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[14px] leading-6 text-neutral-700">
                    {card.englishSummary}
                  </p>

                  <p className="text-[14px] leading-6 text-neutral-500">
                    {card.chineseSummary}
                  </p>
                </div>

                <div className="mt-5 border-t border-black/[0.06] pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      Vocabulary
                    </p>

                    <span className="text-[10px] text-neutral-400">
                      Tap to expand
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {card.vocabulary.map(
                      (item, index) => {
                        const baseKey = `${card.id}-${index}`;

                        return (
                          <details
                            key={baseKey}
                            className="group rounded-2xl bg-surface"
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-baseline gap-2">
                                  <span className="font-semibold text-neutral-900">
                                    {item.word}
                                  </span>

                                  <span className="text-[10px] text-neutral-400">
                                    {
                                      item.partOfSpeech
                                    }
                                  </span>
                                </div>

                                <p className="mt-0.5 text-sm text-neutral-500">
                                  {
                                    item.translation
                                  }
                                </p>
                              </div>

                              <span className="text-lg leading-none text-neutral-400 transition-transform group-open:rotate-45">
                                +
                              </span>
                            </summary>

                            <div className="border-t border-black/[0.05] px-4 py-3">
                              <div className="flex items-start gap-2">
                                <p className="min-w-0 flex-1 text-sm leading-6 text-neutral-700">
                                  {
                                    item.englishExample
                                  }
                                </p>

                                <button
                                  type="button"
                                  onClick={(
                                    event
                                  ) => {
                                    event.preventDefault();

                                    speak(
                                      `vocab-en-${baseKey}`,
                                      `${item.word}. ${item.englishExample}`,
                                      "en-US"
                                    );
                                  }}
                                  aria-label={`Read ${item.word} and its example`}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-neutral-600 transition-transform active:scale-90"
                                >
                                  <SpeakerIcon
                                    active={
                                      speakingKey ===
                                      `vocab-en-${baseKey}`
                                    }
                                  />
                                </button>
                              </div>

                              <div className="mt-2 flex items-start gap-2">
                                <p className="min-w-0 flex-1 text-sm leading-6 text-neutral-500">
                                  {
                                    item.chineseExample
                                  }
                                </p>

                                <button
                                  type="button"
                                  onClick={(
                                    event
                                  ) => {
                                    event.preventDefault();

                                    speak(
                                      `vocab-zh-${baseKey}`,
                                      `${item.translation}。${item.chineseExample}`,
                                      "zh-TW"
                                    );
                                  }}
                                  aria-label={`朗讀${item.translation}與中文例句`}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-neutral-600 transition-transform active:scale-90"
                                >
                                  <SpeakerIcon
                                    active={
                                      speakingKey ===
                                      `vocab-zh-${baseKey}`
                                    }
                                  />
                                </button>
                              </div>
                            </div>
                          </details>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void saveToNotes(card)
                    }
                    disabled={
                      isSaving ||
                      isSaved
                    }
                    className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-xs font-semibold transition-transform active:scale-[0.98] disabled:opacity-70 ${
                      isSaved
                        ? "bg-emerald-50 text-emerald-700"
                        : "border border-black/[0.07] bg-white text-neutral-800"
                    }`}
                  >
                    {isSaving ? (
                      <Spinner />
                    ) : (
                      <BookmarkIcon
                        filled={isSaved}
                      />
                    )}

                    <span>
                      {isSaving
                        ? "Saving"
                        : isSaved
                          ? "Saved"
                          : "Save to Notes"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      sendToPartner(card)
                    }
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-neutral-950 text-xs font-semibold text-white transition-transform active:scale-[0.98]"
                  >
                    <SendIcon />

                    <span>
                      Send to Partner
                    </span>
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled
                    title="Quiz will be added in the next phase."
                    className="flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-black/[0.04] text-xs font-semibold text-neutral-400"
                  >
                    <BrainIcon />

                    <span>
                      Quiz · Soon
                    </span>
                  </button>

                  <a
                    href={card.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/[0.07] bg-white px-3 text-xs font-semibold text-neutral-800 transition-transform active:scale-[0.98]"
                  >
                    <span className="truncate">
                      {card.sourceName}
                    </span>

                    <ExternalLinkIcon />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}