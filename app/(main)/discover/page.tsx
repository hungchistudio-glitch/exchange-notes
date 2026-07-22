"use client";

import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Send,
  Share,
  Volume2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";

import useTranslation from "@/hooks/i18n/useTranslation";
import type {
  TranslationDictionary,
  TranslationLanguage,
} from "@/lib/i18n";

import { speak } from "@/lib/speech";
import { setPendingSharedArticle } from "@/lib/newsDraft";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import type { DailyNewsCard, VocabularyItem } from "@/lib/types/dailyNews";
import type {
  VocabularyCategory,
  VocabularyItem as AppVocabularyItem,
} from "@/lib/types/app";
import { createClient } from "@/lib/supabase/client";
import { FriendProfile, listFriends } from "@/lib/friends";

type DailyNewsSuccess = {
  cards: DailyNewsCard[];
  generatedAt: string;
  cacheStatus: "hit" | "miss" | "stale";
};

type DailyNewsError = {
  error: string;
};

const SEEN_STORAGE_KEY = "daily-news-seen";
const MAX_SEEN_ENTRIES = 40;

function readSeenIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writeSeenIds(ids: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SEEN_STORAGE_KEY,
      JSON.stringify(ids.slice(-MAX_SEEN_ENTRIES)),
    );
  } catch {
    // Storage can fail (private mode, quota). Safe to ignore.
  }
}

function formatPublishedDate(
  value: string,
  language: TranslationLanguage,
): string {
  try {
    const locale =
      language === "traditional-chinese"
        ? "zh-TW"
        : "en-US";

    return new Date(value).toLocaleDateString(
      locale,
      {
        month: "short",
        day: "numeric",
      },
    );
  } catch {
    return "";
  }
}

function getTranslatedCategory(
  category: string,
  t: TranslationDictionary,
): string {
  const normalized = category
    .trim()
    .toLowerCase();

  const categories = t.discover.categories;

  switch (normalized) {
    case "world":
      return categories.world;

    case "business":
      return categories.business;

    case "technology":
    case "tech":
      return categories.technology;

    case "science":
      return categories.science;

    case "health":
      return categories.health;

    case "culture":
    case "arts":
    case "entertainment":
      return categories.culture;

    case "environment":
    case "climate":
      return categories.environment;

    case "politics":
    case "political":
      return categories.politics;

    default:
      return categories.general;
  }
}

export default function DiscoverPage() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const [cards, setCards] = useState<DailyNewsCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedVocabId, setExpandedVocabId] = useState<string | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const [friendPickerCard, setFriendPickerCard] =
    useState<DailyNewsCard | null>(null);
  const [friendPickerVocabulary, setFriendPickerVocabulary] =
    useState<AppVocabularyItem | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [sendingFriendId, setSendingFriendId] = useState<string | null>(null);

  const friendsRequestedRef = useRef(false);

  const handleSendToFriend = useCallback((card: DailyNewsCard) => {
    setFriendPickerCard(card);
  }, []);

  const loadFriends = useCallback(async () => {
    friendsRequestedRef.current = true;
    setFriendsLoading(true);
    setFriendsError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFriendsError("You're not logged in. Log in to share with a partner.");
      setFriendsLoading(false);
      friendsRequestedRef.current = false;
      return;
    }

    try {
      const friendsData = await listFriends(supabase, user.id);
      setFriends(friendsData);
    } catch (loadError) {
      console.error("Failed to load friends:", loadError);
      setFriendsError("Couldn't load your friends. Try again.");
      friendsRequestedRef.current = false;
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      (!friendPickerCard && !friendPickerVocabulary) ||
      friendsRequestedRef.current
    ) {
      return;
    }

    void loadFriends();
  }, [friendPickerCard, friendPickerVocabulary, loadFriends]);

  const handleClosePicker = useCallback(() => {
    setFriendPickerCard(null);
    setFriendPickerVocabulary(null);
    setSendingFriendId(null);
  }, []);

  const handlePickFriend = useCallback(
    (friendId: string) => {
      if ((!friendPickerCard && !friendPickerVocabulary) || sendingFriendId) {
        return;
      }

      setSendingFriendId(friendId);

      if (friendPickerVocabulary) {
        setPendingSharedVocabulary(friendPickerVocabulary);
      } else if (friendPickerCard) {
        setPendingSharedArticle(friendPickerCard);
      }

      router.push(`/messages?with=${friendId}`);
    },
    [friendPickerCard, friendPickerVocabulary, router, sendingFriendId],
  );

  const loadStories = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const seenIds = readSeenIds();
      const params = new URLSearchParams({ nonce: Date.now().toString() });

      if (seenIds.length > 0) {
        params.set("seen", seenIds.join("|"));
      }

      const response = await fetch(`/api/daily-news?${params.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as DailyNewsSuccess | DailyNewsError;

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Daily News could not be loaded.",
        );
      }

      setCards(data.cards);
      setBrokenImageIds(new Set());
      writeSeenIds([...seenIds, ...data.cards.map((card) => card.id)]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Daily News could not be loaded. Please try again shortly.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStories(false);
  }, [loadStories]);

  return (
    <main className="app-page">
      <div className="app-page__content max-w-xl">
        <button
          type="button"
          onClick={() => void loadStories(true)}
          disabled={refreshing || loading}
          aria-label={t.discover.loadNewStoriesAriaLabel}
          className="w-full text-left transition-opacity disabled:opacity-60"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em]">
            {t.discover.eyebrow}
          </p>

          <h1 className="mt-3 flex items-center gap-3 text-5xl font-black">
            {t.discover.title}
            <RefreshCw
              size={22}
              className={`text-[#8a8a8a] ${
                refreshing ? "animate-spin" : "opacity-0"
              }`}
            />
          </h1>

          <p className="mt-3 max-w-md text-lg leading-7 text-[#4f4f4f]">
            {t.discover.subtitle}
          </p>
        </button>

        <div className="mt-8 space-y-5">
          {loading && <StoryListSkeleton />}

          {!loading && errorMessage && cards.length === 0 && (
            <ErrorState
              message={errorMessage}
              onRetry={() => void loadStories(false)}
            />
          )}

          {!loading &&
            cards.map((card) => (
              <NewsCard
                key={card.id}
                card={card}
                expanded={expandedVocabId === card.id}
                onToggleVocabulary={() =>
                  setExpandedVocabId((current) =>
                    current === card.id ? null : card.id,
                  )
                }
                imageBroken={brokenImageIds.has(card.id)}
                onImageError={() =>
                  setBrokenImageIds((current) => {
                    const next = new Set(current);
                    next.add(card.id);
                    return next;
                  })
                }
                onSendToFriend={() => handleSendToFriend(card)}
                onSendVocabularyToFriend={(item) => {
                  setFriendPickerCard(null);
                  setFriendPickerVocabulary(item);
                }}
                language={language}
                t={t}
              />
            ))}

          {!loading && !errorMessage && cards.length > 0 && (
            <button
              type="button"
              onClick={() => void loadStories(true)}
              disabled={refreshing}
              className="w-full rounded-[24px] border border-black/10 bg-white py-4 text-center font-black transition-colors hover:bg-black/[0.03] disabled:opacity-40"
            >
              {refreshing
                ? t.discover.loadingNewStories
                : t.discover.newStories}
            </button>
          )}
        </div>
      </div>

      {(friendPickerCard || friendPickerVocabulary) && (
        <FriendPickerModal
          friends={friends}
          loading={friendsLoading}
          errorMessage={friendsError}
          sendingFriendId={sendingFriendId}
          onClose={handleClosePicker}
          onPick={handlePickFriend}
          onRetry={() => {
            friendsRequestedRef.current = false;
            void loadFriends();
          }}
        />
      )}
    </main>
  );
}

function FriendPickerModal({
  friends,
  loading,
  errorMessage,
  sendingFriendId,
  onClose,
  onPick,
  onRetry,
}: {
  friends: FriendProfile[];
  loading: boolean;
  errorMessage: string;
  sendingFriendId: string | null;
  onClose: () => void;
  onPick: (friendId: string) => void;
  onRetry: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-to-partner-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`flex w-full max-w-xl flex-col rounded-t-[28px] border border-white/40 bg-white/75 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out sm:rounded-[28px] ${
          mounted
            ? "translate-y-0"
            : "translate-y-full sm:translate-y-4 sm:opacity-0"
        }`}
        style={{
          maxHeight: "min(78vh, 640px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        }}
      >
        <div className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-black/15 sm:hidden" />

        <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-3">
          <h2
            id="send-to-partner-title"
            className="text-base font-semibold tracking-tight text-black/90"
          >
            傳送給夥伴
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-2">
          {loading && (
            <div className="space-y-1.5 px-2 py-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex animate-pulse items-center gap-3 rounded-2xl bg-black/[0.03] p-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-black/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 rounded-full bg-black/10" />
                    <div className="h-2.5 w-16 rounded-full bg-black/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && errorMessage && (
            <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
              <p className="text-sm text-red-600">{errorMessage}</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5"
              >
                重試
              </button>
            </div>
          )}

          {!loading && !errorMessage && friends.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-black/40">
              還沒有朋友——先加一位才能分享文章。
            </p>
          )}

          {!loading &&
            !errorMessage &&
            friends.map((friend) => {
              const isSending = sendingFriendId === friend.id;
              const isDisabled = sendingFriendId !== null;

              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => onPick(friend.id)}
                  disabled={isDisabled}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-sm font-semibold text-black/70">
                    {(friend.displayName ?? friend.exchangeId)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black/85">
                      {friend.displayName ?? `@${friend.exchangeId}`}
                    </p>
                    <p className="truncate text-xs text-black/40">
                      @{friend.exchangeId}
                    </p>
                  </div>

                  {isSending && (
                    <LoaderCircle
                      size={16}
                      className="shrink-0 animate-spin text-black/40"
                    />
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function StoryListSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((index) => (
        <div key={index} className="animate-pulse rounded-[30px] bg-white p-6">
          <div className="h-3 w-20 rounded-full bg-[#ece8de]" />
          <div className="mt-5 h-6 w-full rounded-full bg-[#ece8de]" />
          <div className="mt-3 h-6 w-3/4 rounded-full bg-[#ece8de]" />
          <div className="mt-6 h-4 w-full rounded-full bg-[#ece8de]" />
          <div className="mt-2 h-4 w-5/6 rounded-full bg-[#ece8de]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[30px] bg-white p-7 text-center">
      <p className="text-lg leading-7">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-full bg-black px-6 py-3 font-black text-white transition-transform active:scale-95"
      >
        Try Again
      </button>
    </div>
  );
}

/** Small icon button that reads a piece of text aloud. Keeps every speak
 * trigger in the card visually and behaviorally consistent. */
function SpeakButton({
  text,
  lang,
  label,
  size = 16,
  tone = "light",
}: {
  text: string;
  lang: "en-US" | "zh-TW";
  label: string;
  size?: number;
  tone?: "light" | "solid";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => speak(text, lang)}
      className={`mt-0.5 shrink-0 rounded-full border border-black/10 p-2 transition-colors ${
        tone === "solid" ? "bg-white hover:bg-black/5" : "hover:bg-black/5"
      }`}
    >
      <Volume2 size={size} />
    </button>
  );
}

type SelectionState = { text: string; top: number; left: number };

/** Tracks the current text selection *inside* a given container, exposing
 * its bounding position (relative to the container) so a toolbar can be
 * positioned right above it — mirrors the iOS native selection popover. */
function useTextSelection(containerRef: RefObject<HTMLDivElement | null>) {
  const [selection, setSelection] = useState<SelectionState | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection();
      const container = containerRef.current;

      if (!sel || sel.isCollapsed || !container) {
        setSelection(null);
        return;
      }

      const anchorNode = sel.anchorNode;
      if (!anchorNode || !container.contains(anchorNode)) {
        setSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (!text) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setSelection({
        text,
        top: rangeRect.top - containerRect.top,
        left: rangeRect.left - containerRect.left + rangeRect.width / 2,
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [containerRef]);

  return [selection, setSelection] as const;
}

function SelectionToolbar({
  selection,
  addingWord,
  addedWord,
  onAddWord,
  onSendToFriend,
}: {
  selection: SelectionState | null;
  addingWord: boolean;
  addedWord: boolean;
  onAddWord: () => void;
  onSendToFriend: () => void;
}) {
  if (!selection) return null;

  return (
    <div
      className="absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-full border border-white/20 bg-black/40 p-1.5 text-white shadow-xl backdrop-blur-xl"
      style={{ top: selection.top - 12, left: selection.left }}
    >
      <button
        type="button"
        onClick={onAddWord}
        disabled={addingWord}
        aria-label={addedWord ? "已加入單字本" : "加入單字本"}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-60"
      >
        {addingWord ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : addedWord ? (
          <Check size={16} />
        ) : (
          <BookmarkPlus size={16} />
        )}
      </button>

      <span className="h-4 w-px bg-white/20" />

      <button
        type="button"
        onClick={onSendToFriend}
        aria-label="傳送給夥伴"
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
      >
        <Send size={16} />
      </button>
    </div>
  );
}

function NewsCard({
  card,
  expanded,
  onToggleVocabulary,
  imageBroken,
  onImageError,
  onSendToFriend,
  onSendVocabularyToFriend,
  language,
  t,
}: {
  card: DailyNewsCard;
  expanded: boolean;
  onToggleVocabulary: () => void;
  imageBroken: boolean;
  onImageError: () => void;
  onSendToFriend: () => void;
  onSendVocabularyToFriend: (
    item: AppVocabularyItem,
  ) => void;
  language: TranslationLanguage;
  t: TranslationDictionary;
}) {
  const hasChinese = Boolean(card.chineseTitle && card.chineseSummary);
  const hasVocabulary = card.vocabulary.length > 0;
  const showImage = Boolean(card.imageUrl) && !imageBroken;

  const contentRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useTextSelection(contentRef);
  const [addingWord, setAddingWord] = useState(false);
  const [addedWord, setAddedWord] = useState(false);

  async function handleAddSelectionToVocabulary() {
    if (!selection || addingWord) return;
    const text = selection.text;
    setAddingWord(true);

    try {
      const response = await fetch("/api/classify-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Couldn't look up that word.",
        );
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in before saving a word.");
      }

      const { error: insertError } = await supabase
        .from("vocabulary_items")
        .insert({
          user_id: user.id,
          word: (data.englishName ?? text).trim(),
          translation: (data.chineseName ?? "").trim(),
          language: "english",
          part_of_speech: data.partOfSpeech?.trim() || null,
          example_sentence: data.englishExample?.trim() || null,
          translated_example: data.chineseExample?.trim() || null,
          confidence: data.confidence ?? "medium",
          category: (data.category ?? "other") as VocabularyCategory,
          status: "new",
        });

      if (insertError) throw insertError;

      setAddedWord(true);
      window.getSelection()?.removeAllRanges();
      setTimeout(() => {
        setSelection(null);
        setAddedWord(false);
      }, 1100);
    } catch (addError) {
      console.error("Failed to add word:", addError);
      setSelection(null);
    } finally {
      setAddingWord(false);
    }
  }

  async function handleSelectionSendToFriend() {
    if (!selection || addingWord) return;

    const selectedText = selection.text.trim();
    if (!selectedText) return;

    setAddingWord(true);

    try {
      const response = await fetch("/api/classify-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText }),
      });

      const data = await response.json();

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data
            ? data.error
            : "Couldn't create a word card from that selection.",
        );
      }

      const now = new Date().toISOString();

      const selectedVocabulary = {
        id: `selection-${crypto.randomUUID()}`,
        user_id: "",
        word: (data.englishName ?? selectedText).trim(),
        translation: (data.chineseName ?? "").trim(),
        language: "english",
        part_of_speech: data.partOfSpeech?.trim() || null,
        example_sentence: data.englishExample?.trim() || null,
        translated_example: data.chineseExample?.trim() || null,
        confidence: data.confidence ?? "medium",
        category: data.category ?? "other",
        status: "new",
        image_url: null,
        created_at: now,
        updated_at: now,
      } as AppVocabularyItem;

      window.getSelection()?.removeAllRanges();
      setSelection(null);
      onSendVocabularyToFriend(selectedVocabulary);
    } catch (selectionError) {
      console.error("Failed to prepare selected vocabulary:", selectionError);
    } finally {
      setAddingWord(false);
    }
  }

  async function handleShare() {
    const shareData = {
      title: card.englishTitle,
      text: card.englishSummary,
      url: card.sourceUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed — no action needed.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(card.sourceUrl);
    } catch {
      // Clipboard can fail without permission; safe to ignore.
    }
  }

  return (
    <article className="overflow-hidden rounded-[30px] border border-black/5 bg-white transition-shadow hover:shadow-sm">
      {showImage && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl ?? undefined}
            alt=""
            loading="lazy"
            onError={onImageError}
            className="h-64 w-full object-cover sm:h-72"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a8a8a]">
            {getTranslatedCategory(
              card.category,
              t,
            )}
          </span>

          <span className="text-xs font-bold text-[#8a8a8a]">
            {formatPublishedDate(
              card.publishedAt,
              language,
            )}{" "}
            · {card.sourceName}
          </span>
        </div>

        <div ref={contentRef} className="relative">
          <SelectionToolbar
            selection={selection}
            addingWord={addingWord}
            addedWord={addedWord}
            onAddWord={() => void handleAddSelectionToVocabulary()}
            onSendToFriend={handleSelectionSendToFriend}
          />

          <div className="mt-4 flex items-start gap-2">
            <h2 className="flex-1 text-2xl font-black leading-tight">
              {card.englishTitle}
            </h2>

            <SpeakButton
              text={card.englishTitle}
              lang="en-US"
              label={t.discover.listenHeadlineAriaLabel}
            />
          </div>

          {hasChinese && (
            <div className="mt-2 flex items-start gap-2">
              <p className="flex-1 leading-7 text-[#5f5f5f]">
                {card.chineseTitle}
              </p>
              <SpeakButton
                text={card.chineseTitle}
                lang="zh-TW"
                label="聆聽中文標題"
                size={14}
              />
            </div>
          )}

          <div className="mt-5 flex items-start gap-2">
            <p className="flex-1 leading-7">{card.englishSummary}</p>
            <SpeakButton
              text={card.englishSummary}
              lang="en-US"
              label={t.discover.listenSummaryAriaLabel}
            />
          </div>

          {hasChinese && (
            <div className="mt-3 flex items-start gap-2">
              <p className="flex-1 leading-7 text-[#5f5f5f]">
                {card.chineseSummary}
              </p>
              <SpeakButton
                text={card.chineseSummary}
                lang="zh-TW"
                label="聆聽中文摘要"
                size={14}
              />
            </div>
          )}
        </div>

        {hasVocabulary && (
          <div className="mt-6 border-t border-black/5 pt-5">
            <button
              type="button"
              onClick={onToggleVocabulary}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between"
            >
              <span className="font-black">
                {t.discover.vocabulary} ·{" "}
                {card.vocabulary.length}
              </span>

              <ChevronDown
                size={18}
                className={`transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {expanded && (
              <div className="mt-4 space-y-3">
                {card.vocabulary.map((item, index) => (
                  <VocabularyRow key={`${card.id}-${index}`} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2">
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.discover.originalSourceAriaLabel}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-black py-3 text-white transition-transform active:scale-95"
          >
            <ExternalLink size={17} />
            <span className="text-[11px] font-bold">
              {t.common.source}
            </span>
          </a>

          <button
            type="button"
            onClick={onSendToFriend}
            aria-label={t.discover.sendToFriendAriaLabel}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-black/10 bg-white py-3 text-black transition-colors hover:bg-black/[0.03]"
          >
            <Send size={17} />
            <span className="text-[11px] font-bold">
              {t.discover.sendToFriend}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label={t.discover.shareAriaLabel}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-black/10 bg-white py-3 text-black transition-colors hover:bg-black/[0.03]"
          >
            <Share size={17} />
            <span className="text-[11px] font-bold">
              {t.common.share}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

function VocabularyRow({ item }: { item: VocabularyItem }) {
  return (
    <div className="rounded-[20px] bg-[#f5f2eb] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-black">{item.word}</span>
          <span className="text-xs font-bold uppercase text-[#8a8a8a]">
            {item.partOfSpeech}
          </span>
          <span className="text-[#5f5f5f]">{item.translation}</span>
        </div>

        <SpeakButton
          text={item.word}
          lang="en-US"
          label={`Listen to ${item.word}`}
          size={14}
          tone="solid"
        />
      </div>

      <div className="mt-3 flex items-start gap-2">
        <p className="flex-1 text-sm leading-6">{item.englishExample}</p>
        <SpeakButton
          text={item.englishExample}
          lang="en-US"
          label="Listen to example sentence"
          size={14}
          tone="solid"
        />
      </div>

      <p className="mt-1 text-sm leading-6 text-[#5f5f5f]">
        {item.chineseExample}
      </p>
    </div>
  );
}
