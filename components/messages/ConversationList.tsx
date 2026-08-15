"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { BellOff, EyeOff, Search } from "lucide-react";

import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";
import MoodLogoSwiper from "@/components/messages/MoodLogoSwiper";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { TranslationDictionary } from "@/lib/i18n/types";
import {
  hideConversationForUser,
  listConversationSummaries,
  setConversationMuted,
  type ConversationSummary,
} from "@/lib/friends";
import { decodeWordCardMessage } from "@/lib/messages/wordCard";
import { subscribeToConversationRead } from "@/lib/messages/unreadSignal";
import { createClient } from "@/lib/supabase/client";

type MessagesCopy = TranslationDictionary["messages"];

function formatConversationTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const startOfMessageDay = new Date(date).setHours(0, 0, 0, 0);
  const daysAgo = Math.floor(
    (startOfToday - startOfMessageDay) / (1000 * 60 * 60 * 24),
  );

  if (daysAgo < 7) {
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
      date,
    );
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

// Renders whatever the last message actually was as a one-line preview:
// a shared word card reads as "Shared a word: {word}", an attachment gets
// a type label, everything else is just the message body, truncated by
// the surrounding `truncate` class.
function getPreviewText(
  summary: ConversationSummary,
  currentUserId: string | null,
  copy: MessagesCopy,
): string {
  const { lastMessage } = summary;
  if (!lastMessage) return "";

  const prefix =
    currentUserId && lastMessage.senderId === currentUserId
      ? copy.youPrefix
      : "";

  if (lastMessage.attachmentType === "image") {
    return `${prefix}${copy.attachmentLabel}`;
  }

  if (lastMessage.attachmentType === "voice") {
    return `${prefix}${copy.voiceLabel}`;
  }

  const wordCard = decodeWordCardMessage(lastMessage.body);
  if (wordCard) {
    return `${prefix}${wordCard.word}`;
  }

  return `${prefix}${lastMessage.body}`;
}

export default function ConversationList() {
  const { t } = useTranslation();
  const copy = t.messages;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /*
   * Mirrors currentUserId for the subscriptions below, which are set up once
   * and must not be torn down and rebuilt every time the id resolves.
   */
  const currentUserIdRef = useRef<string | null>(null);
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadForUser(userId: string) {
      setLoading(true);
      setErrorMessage("");
      setCurrentUserId(userId);
      currentUserIdRef.current = userId;

      try {
        const rows = await listConversationSummaries(supabase, userId);
        if (isMounted) setSummaries(rows);
      } catch (error) {
        if (isMounted) {
          console.error(error);
          setErrorMessage(copy.errors.loadConversations);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setHasLoadedOnce(true);
        }
      }
    }

    let channel: RealtimeChannel | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted || !session?.user) return;

      const userId = session.user.id;
      void loadForUser(userId);

      /*
       * Re-derives the list when a message lands anywhere.
       *
       * The whole list is refetched rather than patched in place: ordering,
       * the preview line and the unread count all depend on the message, and
       * `listConversationSummaries` already resolves them together. A message
       * arriving used to leave the list untouched until the page was
       * reloaded, so a new conversation neither surfaced nor moved.
       */
      channel = supabase
        .channel(`conversation-list:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          () => {
            void refreshQuietly(userId);
          },
        )
        .subscribe();
    });

    // Reading a thread changes its unread count; the list should not still be
    // showing a badge when the user comes back to it.
    const unsubscribeRead = subscribeToConversationRead(() => {
      if (currentUserIdRef.current) void refreshQuietly(currentUserIdRef.current);
    });

    async function refreshQuietly(userId: string) {
      try {
        const rows = await listConversationSummaries(supabase, userId);
        if (isMounted) setSummaries(rows);
      } catch (error) {
        // A background refresh failing should not replace what is on screen.
        console.error(error);
      }
    }

    return () => {
      isMounted = false;
      unsubscribeRead();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [copy.errors.loadConversations]);

  async function handleToggleMute(summary: ConversationSummary) {
    if (!currentUserId || !summary.conversationId) return;

    const conversationId = summary.conversationId;
    const nextMuted = !summary.mutedAt;
    const previous = summaries;

    setSummaries((current) =>
      current.map((row) =>
        row.friend.id === summary.friend.id
          ? { ...row, mutedAt: nextMuted ? new Date().toISOString() : null }
          : row,
      ),
    );

    try {
      const supabase = createClient();
      await setConversationMuted(supabase, currentUserId, conversationId, nextMuted);
    } catch (error) {
      setSummaries(previous);
      console.error(error);
      setErrorMessage(copy.errors.updateConversation);
    }
  }

  async function handleHide(summary: ConversationSummary) {
    if (!currentUserId || !summary.conversationId) return;

    const conversationId = summary.conversationId;
    setHidingId(summary.friend.id);
    const previous = summaries;

    setSummaries((current) =>
      current.filter((row) => row.friend.id !== summary.friend.id),
    );

    try {
      const supabase = createClient();
      await hideConversationForUser(supabase, currentUserId, conversationId);
    } catch (error) {
      setSummaries(previous);
      console.error(error);
      setErrorMessage(copy.errors.updateConversation);
    } finally {
      setHidingId(null);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-surface px-4 pb-28 pt-6 text-neutral-950">
      <div className="mx-auto w-full max-w-xl">
        <div style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <MoodLogoSwiper />
        </div>

        <h1 className="mt-1 text-center text-[22px] font-bold tracking-[-0.02em]">
          {copy.title}
        </h1>

        <div className="mt-6 flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm">
          <Search size={17} strokeWidth={1.8} className="shrink-0 text-black/35" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/35"
          />
        </div>

        {(!hasLoadedOnce || loading) && (
          <div className="mt-10 flex items-center justify-center text-sm text-neutral-500">
            {copy.loadingConversations}
          </div>
        )}

        {hasLoadedOnce && !loading && errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {hasLoadedOnce && !loading && !errorMessage && summaries.length === 0 && (
          <div className="mt-10 rounded-[24px] bg-white p-7 text-center shadow-sm">
            <p className="text-lg font-bold text-black">
              {copy.startConversationTitle}
            </p>
            <p className="mt-2 leading-6 text-black/60">
              {copy.startConversationDescription}
            </p>
            <Link
              href="/friends"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white"
            >
              {t.home.community.findFriends}
            </Link>
          </div>
        )}

        {hasLoadedOnce && !loading && !errorMessage && summaries.length > 0 && (() => {
          const query = searchQuery.trim().toLowerCase();
          const filteredSummaries = query
            ? summaries.filter((summary) => {
                const name = (
                  summary.friend.displayName ?? summary.friend.exchangeId
                ).toLowerCase();
                return (
                  name.includes(query) ||
                  summary.friend.exchangeId.toLowerCase().includes(query)
                );
              })
            : summaries;

          if (filteredSummaries.length === 0) {
            return (
              <p className="mt-10 text-center text-sm text-black/40">
                {copy.noConversationsFound}
              </p>
            );
          }

          return (
          <div className="mt-6 space-y-3">
            {filteredSummaries.map((summary) => {
              const name =
                summary.friend.displayName ?? summary.friend.exchangeId;
              const initial = name.charAt(0).toUpperCase();
              const hasUnread = summary.unreadCount > 0;
              const isMuted = Boolean(summary.mutedAt);
              const previewText = summary.lastMessage
                ? getPreviewText(summary, currentUserId, copy)
                : `@${summary.friend.exchangeId}`;

              const row = (
                <Link
                  href={`/messages?with=${summary.friend.id}`}
                  className={`flex items-center gap-3 rounded-[24px] p-4 shadow-sm transition-colors ${
                    hasUnread ? "bg-[var(--accent-amber-wash)]" : "bg-white"
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-base font-bold text-black">
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <p
                          className={`truncate ${
                            hasUnread ? "font-bold text-black" : "font-semibold text-black/85"
                          }`}
                        >
                          {name}
                        </p>
                        {isMuted && (
                          <BellOff
                            size={12}
                            strokeWidth={2}
                            className="shrink-0 text-black/30"
                            aria-label={copy.muted}
                          />
                        )}
                      </span>

                      <span className="flex shrink-0 items-center gap-1.5">
                        {summary.lastMessage && (
                          <time
                            dateTime={summary.lastMessage.createdAt}
                            className="text-[11px] text-black/35"
                          >
                            {formatConversationTime(summary.lastMessage.createdAt)}
                          </time>
                        )}
                        {hasUnread && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-amber)] px-1.5 text-[11px] font-semibold text-white">
                            {summary.unreadCount}
                          </span>
                        )}
                      </span>
                    </div>

                    <p
                      className={`truncate text-sm ${
                        hasUnread ? "text-black/70" : "text-black/45"
                      }`}
                    >
                      {previewText}
                    </p>
                  </div>
                </Link>
              );

              if (!summary.conversationId) {
                return <div key={summary.friend.id}>{row}</div>;
              }

              return (
                <SwipeActionRow
                  key={summary.friend.id}
                  leadingAction={{
                    label: isMuted ? copy.unmuteConversation : copy.muteConversation,
                    icon: <BellOff size={20} strokeWidth={1.8} />,
                    onAction: () => handleToggleMute(summary),
                    className: "bg-[var(--accent-amber)] text-white",
                  }}
                  trailingAction={{
                    label: copy.deleteFriend,
                    icon: <EyeOff size={22} strokeWidth={1.8} />,
                    onAction: () => handleHide(summary),
                  }}
                  disabled={hidingId === summary.friend.id}
                  className="rounded-[24px]"
                >
                  {row}
                </SwipeActionRow>
              );
            })}
          </div>
          );
        })()}
      </div>
    </main>
  );
}
