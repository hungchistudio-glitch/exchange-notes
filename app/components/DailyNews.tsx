"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { createNote } from "@/lib/notes/repository";
import { notifyPushEvent } from "@/lib/push/eventsClient";
import { getVoiceForLanguage } from "@/lib/speech";
import { encodeNewsCardMessage } from "@/lib/messages/newsCard";
import { listFriends, getOrCreateConversationWithFriend, type FriendProfile } from "@/lib/friends";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { TranslationDictionary } from "@/lib/i18n/types";

import CompactStoryRow from "@/components/discover/CompactStoryRow";
import FeaturedStoryCard from "@/components/discover/FeaturedStoryCard";
import SpeechSpeedControl from "@/components/discover/SpeechSpeedControl";
import StoryDetailSheet from "@/components/discover/StoryDetailSheet";
import VocabularyDrawer from "@/components/discover/VocabularyDrawer";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import {
  DISCOVER_COLORS,
  isImageFriendlyCategory,
  type AudioPlaybackMode,
  type DailyNewsCard,
  type SpeechRate,
} from "@/components/discover/types";

type DailyNewsResponse = {
  cards: DailyNewsCard[];
  generatedAt: string;
};

function LoadingHero() {
  return (
    <section className="mt-8">
      <div className="mb-6">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-black/[0.06]" />

        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-black/[0.05]" />
      </div>

      <div className="space-y-3">
        <div
          className="h-64 animate-pulse rounded-[24px]"
          style={{ backgroundColor: DISCOVER_COLORS.card }}
        />

        <div
          className="h-40 animate-pulse rounded-[24px]"
          style={{ backgroundColor: DISCOVER_COLORS.card }}
        />
      </div>
    </section>
  );
}


function formatPublishedTime(
  value: string,
  copy: TranslationDictionary["discover"]
) {
  const publishedDate = new Date(value);

  if (Number.isNaN(publishedDate.getTime())) {
    return copy.recently;
  }

  const difference = Date.now() - publishedDate.getTime();
  const minutes = Math.max(0, Math.floor(difference / 60_000));

  if (minutes < 1) {
    return copy.justNow;
  }

  if (minutes < 60) {
    return copy.minutesAgo.replace("{count}", String(minutes));
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return copy.hoursAgo.replace("{count}", String(hours));
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(publishedDate);
}

function categoryLabel(
  category: string,
  copy: TranslationDictionary["discover"]
) {
  const key = category
    .trim()
    .toLowerCase() as keyof TranslationDictionary["discover"]["categories"];

  return copy.categories[key] ?? category;
}

function createNoteContent(card: DailyNewsCard) {
  const englishVocabulary = card.vocabulary
    .map((item) => `• ${item.word} (${item.partOfSpeech}) — ${item.englishExample}`)
    .join("\n");

  const chineseVocabulary = card.vocabulary
    .map((item) => `• ${item.word}：${item.translation}\n  ${item.chineseExample}`)
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

  return { english, chinese };
}

function createPartnerMessage(card: DailyNewsCard) {
  return encodeNewsCardMessage({
    englishTitle: card.englishTitle,
    chineseTitle: card.chineseTitle,
    englishSummary: card.englishSummary,
    chineseSummary: card.chineseSummary,
    vocabulary: card.vocabulary.map((item) => ({
      word: item.word,
      translation: item.translation,
      partOfSpeech: item.partOfSpeech,
      englishExample: item.englishExample,
      chineseExample: item.chineseExample,
    })),
    sourceName: card.sourceName,
    sourceUrl: card.sourceUrl,
  });
}

export default function DailyNews() {
  const { t } = useTranslation();
  const copy = t.discover;

  const [cards, setCards] = useState<DailyNewsCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [savedCardIds, setSavedCardIds] = useState<Set<string>>(new Set());
  const [savingCardId, setSavingCardId] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1);

  // "Hide story" is a lightweight, session-only affordance — there's no
  // backend column for it, so it simply filters the current view rather
  // than persisting a dismissal.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  // Decoupled from detailCardId so the featured card's "Explore this
  // image" action can open the vocabulary drawer directly, without also
  // opening the full detail sheet.
  const [vocabDrawerCardId, setVocabDrawerCardId] = useState<string | null>(
    null
  );

  // Unified "send to partner" flow — a friend-picker modal shared with the
  // Vocabulary page (components/vocabulary/FriendPickerModal.tsx) rather
  // than the old sessionStorage-draft + navigate-to-/messages detour.
  const [sendModalCardId, setSendModalCardId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [sendingFriendId, setSendingFriendId] = useState<string | null>(null);
  const friendsLoadedRef = useRef(false);

  // Featured-story "audio rail" playback (Play full story / language
  // toggle / progress). Separate from `speakingKey`, which still drives
  // the per-sentence speakers inside the detail sheet and vocabulary
  // drawer.
  const [audioMode, setAudioMode] = useState<AudioPlaybackMode>("en");
  const [playingStoryId, setPlayingStoryId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const requestControllerRef = useRef<AbortController | null>(null);
  const lastGeneratedAtRef = useRef<string | null>(null);

  const loadNews = useCallback(
    async (isRefresh = false) => {
      requestControllerRef.current?.abort();

      const controller = new AbortController();

      requestControllerRef.current = controller;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setNotice("");

      try {
        const response = await fetch("/api/daily-news", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        const payload = (await response.json()) as
          | DailyNewsResponse
          | { error: string };

        if (!response.ok || "error" in payload) {
          throw new Error(
            "error" in payload ? payload.error : copy.loadNewsError
          );
        }

        if (
          isRefresh &&
          lastGeneratedAtRef.current === payload.generatedAt
        ) {
          setNotice(copy.sameBatchNotice);
        }

        lastGeneratedAtRef.current = payload.generatedAt;

        setCards(payload.cards);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : copy.loadFallbackError
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [copy]
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
    language: "en-US" | "zh-TW"
  ) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !text.trim()
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    if (speakingKey === key) {
      setSpeakingKey(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = language;
    // Chinese TTS reads noticeably more "rushed"/synthetic than English at
    // the same rate value, so it gets an extra slowdown on top of whatever
    // speed preset (Slow/Natural/Fast) the user picked.
    utterance.rate = speechRate * (language === "zh-TW" ? 0.8 : 1);
    utterance.pitch = 1;

    // Explicitly resolving a voice (rather than only setting
    // utterance.lang) is what actually makes this reliable — see
    // getVoiceForLanguage's comment for why.
    const voice = getVoiceForLanguage(language);

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setSpeakingKey(key);
    utterance.onend = () => setSpeakingKey(null);
    utterance.onerror = () => setSpeakingKey(null);

    window.speechSynthesis.speak(utterance);
  }

  // Consolidated "Play full story" control for the featured card's audio
  // rail. Unlike `speak`, this can queue up to two utterances (English
  // then Chinese, for bilingual mode) and reports overall progress across
  // the whole queue via each utterance's `boundary` event.
  function toggleFullStoryPlayback(card: DailyNewsCard) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingKey(null);

    if (playingStoryId === card.id) {
      setPlayingStoryId(null);
      setPlaybackProgress(0);
      return;
    }

    const segments: { text: string; lang: "en-US" | "zh-TW" }[] =
      audioMode === "en"
        ? [
            {
              text: `${card.englishTitle}. ${card.englishSummary}`,
              lang: "en-US",
            },
          ]
        : [
            {
              text: `${card.chineseTitle}。${card.chineseSummary}`,
              lang: "zh-TW",
            },
          ];

    const totalLength =
      segments.reduce((sum, segment) => sum + segment.text.length, 0) || 1;
    let completedLength = 0;

    setPlayingStoryId(card.id);
    setPlaybackProgress(0);

    function speakSegment(index: number) {
      if (index >= segments.length) {
        setPlayingStoryId(null);
        setPlaybackProgress(0);
        return;
      }

      const segment = segments[index];
      const utterance = new SpeechSynthesisUtterance(segment.text);

      utterance.lang = segment.lang;
      utterance.rate = speechRate * (segment.lang === "zh-TW" ? 0.8 : 1);
      utterance.pitch = 1;

      const voice = getVoiceForLanguage(segment.lang);

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onboundary = (event) => {
        const charIndex =
          "charIndex" in event && typeof event.charIndex === "number"
            ? event.charIndex
            : 0;

        setPlaybackProgress(
          Math.min(1, (completedLength + charIndex) / totalLength)
        );
      };

      utterance.onend = () => {
        completedLength += segment.text.length;
        speakSegment(index + 1);
      };

      utterance.onerror = () => {
        setPlayingStoryId(null);
        setPlaybackProgress(0);
      };

      window.speechSynthesis.speak(utterance);
    }

    speakSegment(0);
  }

  async function saveToNotes(card: DailyNewsCard) {
    if (savingCardId) {
      return;
    }

    setSavingCardId(card.id);
    setError("");

    const noteContent = createNoteContent(card);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(copy.saveError);
        return;
      }

      const saved = await createNote(supabase, user.id, {
        english: noteContent.english,
        chinese: noteContent.chinese,
        sourceName: card.sourceName,
        sourceUrl: card.sourceUrl,
      });

      // No local fallback any more. The old one masked a save that could
      // never succeed — the table had a different shape and no RLS policy —
      // so notes silently lived on one device. Surfacing the failure is the
      // point.
      if (!saved) {
        setError(copy.saveError);
        return;
      }

      setSavedCardIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(card.id);
        return nextIds;
      });

      window.dispatchEvent(
        new CustomEvent("exchange-notes-notes-updated")
      );
    } catch (saveError) {
      console.error("Save note error:", saveError);
      setError(copy.saveError);
    } finally {
      setSavingCardId(null);
    }
  }

  async function loadFriends() {
    setFriendsLoading(true);
    setFriendsError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFriendsError(copy.loginRequiredError);
        return;
      }

      const list = await listFriends(supabase, user.id);
      setFriends(list);
      friendsLoadedRef.current = true;
    } catch (loadError) {
      setFriendsError(
        loadError instanceof Error
          ? loadError.message
          : copy.loadFriendsError
      );
    } finally {
      setFriendsLoading(false);
    }
  }

  function sendToPartner(card: DailyNewsCard) {
    setSendModalCardId(card.id);

    if (!friendsLoadedRef.current) {
      void loadFriends();
    }
  }

  async function handlePickFriend(friendId: string) {
    const card = visibleCards.find((item) => item.id === sendModalCardId);

    if (!card || sendingFriendId) {
      return;
    }

    setSendingFriendId(friendId);
    setFriendsError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFriendsError(copy.loginRequiredError);
        return;
      }

      const conversationId = await getOrCreateConversationWithFriend(
        supabase,
        user.id,
        friendId
      );

      const {
        data: insertedMessage,
        error: insertError,
      } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body: createPartnerMessage(card),
        })
        .select("id")
        .single();

      if (insertError || !insertedMessage) {
        throw (
          insertError ??
          new Error(
            "The shared news message was not returned.",
          )
        );
      }

      void notifyPushEvent({
        kind: "message",
        messageId: insertedMessage.id,
      });

      setSendModalCardId(null);
      setNotice(copy.sentToPartner);
    } catch (sendError) {
      setFriendsError(
        sendError instanceof Error
          ? sendError.message
          : copy.loadFriendsError
      );
    } finally {
      setSendingFriendId(null);
    }
  }

  async function shareStory(card: DailyNewsCard) {
    const shareData = {
      title: card.englishTitle,
      text: card.chineseTitle,
      url: card.sourceUrl,
    };

    if (
      typeof navigator !== "undefined" &&
      "share" in navigator
    ) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fall through to clipboard fallback (also covers the user
        // cancelling the native share sheet).
      }
    }

    try {
      await navigator.clipboard.writeText(card.sourceUrl);
      setNotice(copy.shareCopied);
    } catch {
      // Clipboard access can fail silently in unsupported contexts; the
      // source link is still reachable from the detail sheet's overflow
      // menu, so there's nothing further to recover here.
    }
  }

  function hideStory(cardId: string) {
    setHiddenIds((current) => {
      const next = new Set(current);
      next.add(cardId);
      return next;
    });

    setDetailCardId((current) => (current === cardId ? null : current));
  }

  if (loading) {
    return <LoadingHero />;
  }

  const visibleCards = cards.filter((card) => !hiddenIds.has(card.id));
  const featuredCard = visibleCards[0] ?? null;
  const latestCards = visibleCards.slice(1);
  const detailCard =
    visibleCards.find((card) => card.id === detailCardId) ?? null;
  const vocabDrawerCard =
    visibleCards.find((card) => card.id === vocabDrawerCardId) ?? null;

  // Selective thumbnails: only a handful of the latest-story rows get a
  // photo (world/science/culture, up to 3), so the list keeps an
  // image/text/image rhythm rather than every row looking identical.
  // Written as a pure reduce (rather than mutating a counter across a
  // .map()) so nothing about this derivation depends on render order.
  const latestCardsWithThumbnail = latestCards.reduce<
    { items: { card: DailyNewsCard; showThumbnail: boolean }[]; budget: number }
  >(
    (accumulator, card) => {
      const eligible =
        Boolean(card.imageUrl) && isImageFriendlyCategory(card.category);
      const showThumbnail = eligible && accumulator.budget > 0;

      return {
        items: [...accumulator.items, { card, showThumbnail }],
        budget: showThumbnail ? accumulator.budget - 1 : accumulator.budget,
      };
    },
    { items: [], budget: 3 }
  ).items;

  return (
    <section className="mt-10">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em]"
            style={{ color: DISCOVER_COLORS.text }}
          >
            {copy.dailyNewsTitle}
          </h2>

          <p
            className="mt-2 text-[15px] leading-[1.5]"
            style={{ color: DISCOVER_COLORS.textSecondary }}
          >
            {copy.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadNews(true)}
          disabled={refreshing}
          aria-label={refreshing ? copy.loadingNewStories : copy.refreshAction}
          title={refreshing ? copy.loadingNewStories : copy.refreshAction}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-50"
          style={{
            border: `1px solid ${DISCOVER_COLORS.divider}`,
            color: DISCOVER_COLORS.accent,
            backgroundColor: DISCOVER_COLORS.card,
          }}
        >
          {refreshing ? (
            <LoaderCircle size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <RefreshCw size={14} strokeWidth={2} />
          )}
        </button>
      </div>

      <div className="mb-7">
        <SpeechSpeedControl
          value={speechRate}
          onChange={setSpeechRate}
          copy={copy}
        />
      </div>

      {notice && !error && (
        <div
          role="status"
          className="mb-4 rounded-2xl px-4 py-3 text-sm leading-6"
          style={{
            backgroundColor: DISCOVER_COLORS.accentSoft,
            color: DISCOVER_COLORS.accent,
          }}
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
            onClick={() => void loadNews(true)}
            className="mt-2 font-semibold underline underline-offset-4"
          >
            {copy.tryAgain}
          </button>
        </div>
      )}

      {!error && visibleCards.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-black/[0.1] px-5 py-10 text-center">
          <p className="text-sm font-semibold">{copy.emptyTitle}</p>

          <p className="mt-1 text-sm leading-6 text-neutral-500">
            {copy.emptyDescription}
          </p>
        </div>
      )}

      {featuredCard ? (
        <FeaturedStoryCard
          card={featuredCard}
          copy={copy}
          categoryText={categoryLabel(featuredCard.category, copy)}
          formattedTime={formatPublishedTime(
            featuredCard.publishedAt,
            copy
          )}
          onOpen={() => setDetailCardId(featuredCard.id)}
          isAudioPlaying={playingStoryId === featuredCard.id}
          audioProgress={
            playingStoryId === featuredCard.id ? playbackProgress : 0
          }
          audioMode={audioMode}
          onAudioModeChange={setAudioMode}
          onToggleAudio={() => toggleFullStoryPlayback(featuredCard)}
          onExploreImage={() => setVocabDrawerCardId(featuredCard.id)}
        />
      ) : null}

      {latestCardsWithThumbnail.length > 0 ? (
        <div className="mt-9">
          <p
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: DISCOVER_COLORS.textSecondary }}
          >
            {copy.latestStoriesLabel}
          </p>

          <div
            className="rounded-[21px] px-5"
            style={{ backgroundColor: DISCOVER_COLORS.card }}
          >
            {latestCardsWithThumbnail.map(({ card, showThumbnail }, index) => (
              <CompactStoryRow
                key={card.id}
                card={card}
                categoryText={categoryLabel(card.category, copy)}
                formattedTime={formatPublishedTime(card.publishedAt, copy)}
                isLast={index === latestCardsWithThumbnail.length - 1}
                showThumbnail={showThumbnail}
                onOpen={() => setDetailCardId(card.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <StoryDetailSheet
        card={detailCard}
        open={detailCardId !== null && detailCard !== null}
        onClose={() => setDetailCardId(null)}
        copy={copy}
        isSaved={detailCard ? savedCardIds.has(detailCard.id) : false}
        isSaving={detailCard ? savingCardId === detailCard.id : false}
        speakingKey={speakingKey}
        categoryText={
          detailCard ? categoryLabel(detailCard.category, copy) : ""
        }
        formattedTime={
          detailCard ? formatPublishedTime(detailCard.publishedAt, copy) : ""
        }
        onSpeak={speak}
        onSave={() => detailCard && void saveToNotes(detailCard)}
        onSend={() => detailCard && sendToPartner(detailCard)}
        onOpenVocabulary={() =>
          detailCard && setVocabDrawerCardId(detailCard.id)
        }
        onOpenSource={() =>
          detailCard &&
          window.open(detailCard.sourceUrl, "_blank", "noopener,noreferrer")
        }
        onShare={() => detailCard && void shareStory(detailCard)}
        onHide={() => detailCard && hideStory(detailCard.id)}
      />

      <VocabularyDrawer
        card={vocabDrawerCard}
        open={vocabDrawerCardId !== null}
        onClose={() => setVocabDrawerCardId(null)}
        copy={copy}
        speakingKey={speakingKey}
        onSpeak={speak}
      />

      {sendModalCardId !== null ? (
        <FriendPickerModal
          friends={friends}
          loading={friendsLoading}
          errorMessage={friendsError}
          sendingFriendId={sendingFriendId}
          onClose={() => setSendModalCardId(null)}
          onPick={(friendId) => void handlePickFriend(friendId)}
          onRetry={() => void loadFriends()}
        />
      ) : null}
    </section>
  );
}
