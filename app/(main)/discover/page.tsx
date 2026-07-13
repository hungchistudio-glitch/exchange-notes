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
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [sendingFriendId, setSendingFriendId] = useState<string | null>(null);

  const friendsRequestedRef = useRef(false);

  const handleSendToPartner = useCallback((card: DailyNewsCard) => {
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
    if (!friendPickerCard || friendsRequestedRef.current) return;
    void loadFriends();
  }, [friendPickerCard, loadFriends]);

  const handleClosePicker = useCallback(() => {
    setFriendPickerCard(null);
    setSendingFriendId(null);
  }, []);

  const handlePickFriend = useCallback(
    (friendId: string) => {
      if (!friendPickerCard || sendingFriendId) return;

      setSendingFriendId(friendId);
      setPendingSharedArticle(friendPickerCard);
      router.push(`/messages?with=${friendId}`);
    },
    [friendPickerCard, router, sendingFriendId]
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

      const response = await fetch(`/api/daily-news?${params.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as DailyNewsSuccess | DailyNewsError;

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
              Real news, rewritten as a daily English lesson.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadStories(true)}
            disabled={refreshing || loading}
            aria-label="Load new stories"
            className="mt-1 flex min-h-14 min-w-14 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-95 disabled:opacity-40"
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="mt-8 space-y-5">
          {loading && <StoryListSkeleton />}

          {!loading && errorMessage && cards.length === 0 && (
            <ErrorState message={errorMessage} onRetry={() => void loadStories(false)} />
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
              className="w-full rounded-[24px] border border-black/10 bg-white py-4 text-center font-black transition-colors hover:bg-black/[0.03] disabled:opacity-40"
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-to-partner-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl rounded-t-[30px] bg-white p-6 outline-none transition-transform duration-200 sm:rounded-[30px]"
      >
        <div className="flex items-center justify-between">
          <h2 id="send-to-partner-title" className="text-xl font-black">
            Send to Partner
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-black/10 p-2 transition-colors hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
          {loading && (
            <div className="space-y-2 py-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex animate-pulse items-center gap-3 rounded-2xl bg-[#f5f2eb] p-3"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#ece8de]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded-full bg-[#ece8de]" />
                    <div className="h-3 w-16 rounded-full bg-[#ece8de]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && errorMessage && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-red-600">{errorMessage}</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-black transition-colors hover:bg-black/5"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !errorMessage && friends.length === 0 && (
            <p className="py-6 text-center text-[#8a8a8a]">
              No friends yet — add one to share this article.
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
                  className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f2eb] p-3 text-left transition-colors hover:bg-[#efeade] disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-black">
                    {(friend.displayName ?? friend.exchangeId)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {friend.displayName ?? `@${friend.exchangeId}`}
                    </p>
                    <p className="truncate text-sm text-[#8a8a8a]">
                      @{friend.exchangeId}
                    </p>
                  </div>

                  {isSending && (
                    <LoaderCircle size={18} className="shrink-0 animate-spin" />
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
    <article className="overflow-hidden rounded-[30px] border border-black/5 bg-white transition-shadow hover:shadow-sm">
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.imageUrl ?? undefined}
          alt=""
          loading="lazy"
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

          <SpeakButton
            text={card.englishTitle}
            lang="en-US"
            label="Listen to headline in English"
          />
        </div>

        {hasChinese && (
          <div className="mt-2 flex items-start gap-2">
            <p className="flex-1 leading-7 text-[#5f5f5f]">{card.chineseTitle}</p>
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
            label="Listen to summary in English"
          />
        </div>

        {hasChinese && (
          <div className="mt-3 flex items-start gap-2">
            <p className="flex-1 leading-7 text-[#5f5f5f]">{card.chineseSummary}</p>
            <SpeakButton
              text={card.chineseSummary}
              lang="zh-TW"
              label="聆聽中文摘要"
              size={14}
            />
          </div>
        )}

        {hasVocabulary && (
          <div className="mt-6 border-t border-black/5 pt-5">
            <button
              type="button"
              onClick={onToggleVocabulary}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between"
            >
              <span className="font-black">
                Vocabulary · {card.vocabulary.length}
              </span>

              <ChevronDown
                size={18}
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
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
                : "border border-black/10 bg-white text-black hover:bg-black/[0.03]"
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
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-black py-3.5 text-center font-black text-white transition-transform active:scale-95"
          >
            Original Source
            <ExternalLink size={16} />
          </a>
        </div>

        <button
          type="button"
          onClick={onSendToPartner}
          aria-label="Send to Partner"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white py-3.5 text-center font-black text-black transition-colors hover:bg-black/[0.03]"
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
