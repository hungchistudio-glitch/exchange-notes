"use client";

import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Send,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { speak } from "@/lib/speech";
import { saveNewsArticle, getSavedArticleIds } from "@/lib/savedNews";
import { setPendingSharedArticle } from "@/lib/newsDraft";
import type { DailyNewsCard, VocabularyItem } from "@/lib/types/dailyNews";
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

    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeSeenIds(ids: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SEEN_STORAGE_KEY,
      JSON.stringify(ids.slice(-MAX_SEEN_ENTRIES))
    );
  } catch {
    // Storage can fail (private mode, quota). Safe to ignore.
  }
}

function formatPublishedDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("zh-TW", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function DiscoverPage() {
  const router = useRouter();
  const [cards, setCards] = useState<DailyNewsCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedVocabId, setExpandedVocabId] = useState<string | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [friendPickerCard, setFriendPickerCard] =
    useState<DailyNewsCard | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");

  const handleSendToPartner = useCallback((card: DailyNewsCard) => {
    setFriendPickerCard(card);
  }, []);

  const handlePickFriend = useCallback(
    (friendId: string) => {
      if (!friendPickerCard) return;
      setPendingSharedArticle(friendPickerCard);
      setFriendPickerCard(null);
      router.push(`/messages?with=${friendId}`);
    },
    [friendPickerCard, router]
  );

  const handleSave = useCallback(async (card: DailyNewsCard) => {
    setSavingIds((current) => new Set(current).add(card.id));

    try {
      await saveNewsArticle(card);
      setSavedIds((current) => new Set(current).add(card.id));
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(card.id);
        return next;
      });
    }
  }, []);

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

      const response = await fetch(
        `/api/daily-news?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = (await response.json()) as
        | DailyNewsSuccess
        | DailyNewsError;

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Daily News could not be loaded."
        );
      }

      setCards(data.cards);
      setBrokenImageIds(new Set());
      writeSeenIds([...seenIds, ...data.cards.map((card) => card.id)]);

      const ids = data.cards.map((card) => card.id);
      getSavedArticleIds(ids).then(setSavedIds);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Daily News could not be loaded. Please try again shortly."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStories(false);
  }, [loadStories]);

  useEffect(() => {
    if (!friendPickerCard || friends.length > 0 || friendsLoading) return;

    let cancelled = false;

    async function loadFriends() {
      setFriendsLoading(true);
      setFriendsError("");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setFriendsError("You are not logged in.");
          setFriendsLoading(false);
        }
        return;
      }

      try {
        const friendsData = await listFriends(supabase, user.id);
        if (!cancelled) setFriends(friendsData);
      } catch (loadError) {
        console.error("Failed to load friends:", loadError);
        if (!cancelled) setFriendsError("Couldn't load your friends.");
      } finally {
        if (!cancelled) setFriendsLoading(false);
      }
    }

    void loadFriends();
    return () => {
      cancelled = true;
    };
  }, [friendPickerCard, friends.length, friendsLoading]);

  return (
    <main className="min-h-screen bg-[#f5f2eb] px-5 pb-28 pt-8 text-black">
      <div className="mx-auto max-w-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em]">
              Exchange Notes
            </p>

            <h1 className="mt-3 text-5xl font-black">Discover</h1>

            <p className="mt-3 max-w-md text-lg leading-7 text-[#4f4f4f]">
              Real news, rewritten as a daily
              English lesson.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadStories(true)}
            disabled={refreshing || loading}
            aria-label="Load new stories"
            className="mt-1 flex min-h-14 min-w-14 items-center justify-center rounded-full bg-black text-white disabled:opacity-40"
          >
            <RefreshCw
              size={20}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
        </div>

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
                    current === card.id ? null : card.id
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
                saved={savedIds.has(card.id)}
                saving={savingIds.has(card.id)}
                onSave={() => void handleSave(card)}
                onSendToPartner={() => handleSendToPartner(card)}
              />
            ))}

          {!loading && !errorMessage && cards.length > 0 && (
            <button
              type="button"
              onClick={() => void loadStories(true)}
              disabled={refreshing}
              className="w-full rounded-[24px] border border-black/10 bg-white py-4 text-center font-black disabled:opacity-40"
            >
              {refreshing ? "Loading..." : "New Stories"}
            </button>
          )}
        </div>
      </div>

      {friendPickerCard && (
        <FriendPickerModal
          friends={friends}
          loading={friendsLoading}
          errorMessage={friendsError}
          onClose={() => setFriendPickerCard(null)}
          onPick={handlePickFriend}
        />
      )}
    </main>
  );
}

function FriendPickerModal({
  friends,
  loading,
  errorMessage,
  onClose,
  onPick,
}: {
  friends: FriendProfile[];
  loading: boolean;
  errorMessage: string;
  onClose: () => void;
  onPick: (friendId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-xl rounded-t-[30px] bg-white p-6 sm:rounded-[30px]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Send to Partner</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-black/10 p-2"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
          {loading && (
            <p className="py-6 text-center text-[#8a8a8a]">Loading friends…</p>
          )}

          {!loading && errorMessage && (
            <p className="py-6 text-center text-red-600">{errorMessage}</p>
          )}

          {!loading && !errorMessage && friends.length === 0 && (
            <p className="py-6 text-center text-[#8a8a8a]">
              No friends yet — add one to share this article.
            </p>
          )}

          {friends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              onClick={() => onPick(friend.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f2eb] p-3 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-black">
                {(friend.displayName ?? friend.exchangeId)
                  .slice(0, 1)
                  .toUpperCase()}
              </span>

              <div className="min-w-0">
                <p className="truncate font-bold">
                  {friend.displayName ?? `@${friend.exchangeId}`}
                </p>
                <p className="truncate text-sm text-[#8a8a8a]">
                  @{friend.exchangeId}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryListSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="animate-pulse rounded-[30px] bg-white p-6"
        >
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
        className="mt-5 rounded-full bg-black px-6 py-3 font-black text-white"
      >
        Try Again
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
  saved,
  saving,
  onSave,
  onSendToPartner,
}: {
  card: DailyNewsCard;
  expanded: boolean;
  onToggleVocabulary: () => void;
  imageBroken: boolean;
  onImageError: () => void;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
  onSendToPartner: () => void;
}) {
  const hasChinese = Boolean(card.chineseTitle && card.chineseSummary);
  const hasVocabulary = card.vocabulary.length > 0;
  const showImage = Boolean(card.imageUrl) && !imageBroken;

  return (
    <article className="overflow-hidden rounded-[30px] border border-black/5 bg-white">
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.imageUrl ?? undefined}
          alt=""
          onError={onImageError}
          className="h-48 w-full object-cover"
        />
      )}

      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a8a8a]">
            {card.category}
          </span>

          <span className="text-xs font-bold text-[#8a8a8a]">
            {formatPublishedDate(card.publishedAt)} · {card.sourceName}
          </span>
        </div>

        <div className="mt-4 flex items-start gap-2">
          <h2 className="flex-1 text-2xl font-black leading-tight">
            {card.englishTitle}
          </h2>

          <button
            type="button"
            aria-label="Listen to headline in English"
            onClick={() => speak(card.englishTitle, "en-US")}
            className="mt-1 shrink-0 rounded-full border border-black/10 p-2"
          >
            <Volume2 size={16} />
          </button>
        </div>

        {hasChinese && (
          <div className="mt-2 flex items-start gap-2">
            <p className="flex-1 leading-7 text-[#5f5f5f]">
              {card.chineseTitle}
            </p>

            <button
              type="button"
              aria-label="聆聽中文標題"
              onClick={() => speak(card.chineseTitle, "zh-TW")}
              className="mt-0.5 shrink-0 rounded-full border border-black/10 p-2"
            >
              <Volume2 size={14} />
            </button>
          </div>
        )}

        <div className="mt-5 flex items-start gap-2">
          <p className="flex-1 leading-7">{card.englishSummary}</p>

          <button
            type="button"
            aria-label="Listen to summary in English"
            onClick={() => speak(card.englishSummary, "en-US")}
            className="mt-1 shrink-0 rounded-full border border-black/10 p-2"
          >
            <Volume2 size={16} />
          </button>
        </div>

        {hasChinese && (
          <div className="mt-3 flex items-start gap-2">
            <p className="flex-1 leading-7 text-[#5f5f5f]">
              {card.chineseSummary}
            </p>

            <button
              type="button"
              aria-label="聆聽中文摘要"
              onClick={() => speak(card.chineseSummary, "zh-TW")}
              className="mt-0.5 shrink-0 rounded-full border border-black/10 p-2"
            >
              <Volume2 size={14} />
            </button>
          </div>
        )}

        {hasVocabulary && (
          <div className="mt-6 border-t border-black/5 pt-5">
            <button
              type="button"
              onClick={onToggleVocabulary}
              className="flex w-full items-center justify-between"
            >
              <span className="font-black">
                Vocabulary · {card.vocabulary.length}
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

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saved || saving}
            aria-label={saved ? "Saved to Notes" : "Save to Notes"}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-center font-black transition-colors ${
              saved
                ? "bg-[#f5f2eb] text-[#8a8a8a]"
                : "border border-black/10 bg-white text-black"
            } disabled:opacity-100`}
          >
            {saving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : saved ? (
              <BookmarkCheck size={16} />
            ) : (
              <Bookmark size={16} />
            )}
            {saving ? "Saving..." : saved ? "Saved" : "Save to Notes"}
          </button>

            <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-black py-3.5 text-center font-black text-white"
          >
            Original Source
            <ExternalLink size={16} />
          </a>
        </div>

        <button
          type="button"
          onClick={onSendToPartner}
          aria-label="Send to Partner"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white py-3.5 text-center font-black text-black"
        >
          <Send size={16} />
          Send to Partner
        </button>
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

        <button
          type="button"
          aria-label={`Listen to ${item.word}`}
          onClick={() => speak(item.word, "en-US")}
          className="shrink-0 rounded-full border border-black/10 bg-white p-2"
        >
          <Volume2 size={14} />
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2">
        <p className="flex-1 text-sm leading-6">{item.englishExample}</p>

        <button
          type="button"
          aria-label="Listen to example sentence"
          onClick={() => speak(item.englishExample, "en-US")}
          className="mt-0.5 shrink-0 rounded-full border border-black/10 bg-white p-2"
        >
          <Volume2 size={14} />
        </button>
      </div>

      <p className="mt-1 text-sm leading-6 text-[#5f5f5f]">
        {item.chineseExample}
      </p>
    </div>
  );
}
