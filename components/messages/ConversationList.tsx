"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EyeOff, Search } from "lucide-react";

import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  hideConversationForUser,
  listConversationSummaries,
  type ConversationSummary,
} from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";

export default function ConversationList() {
  const { t } = useTranslation();
  const copy = t.messages;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

      try {
        const rows = await listConversationSummaries(supabase, userId);
        if (isMounted) setSummaries(rows);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : copy.errors.loadConversations,
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setHasLoadedOnce(true);
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        void loadForUser(session.user.id);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [copy.errors.loadConversations]);

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
      setErrorMessage(
        error instanceof Error
          ? error.message
          : copy.errors.removeFriend,
      );
    } finally {
      setHidingId(null);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-surface px-4 pb-28 pt-6 text-neutral-950">
      <div className="mx-auto w-full max-w-xl">
        <h1
          className="text-center text-[22px] font-bold tracking-[-0.02em]"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
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
                No conversations found.
              </p>
            );
          }

          return (
          <div className="mt-6 space-y-3">
            {filteredSummaries.map((summary) => {
              const name =
                summary.friend.displayName ?? summary.friend.exchangeId;
              const initial = name.charAt(0).toUpperCase();

              const row = (
                <Link
                  href={`/messages?with=${summary.friend.id}`}
                  className="flex items-center gap-3 rounded-[24px] bg-white p-4 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-base font-bold text-black">
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold text-black">{name}</p>
                      {summary.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-black px-1.5 text-[11px] font-semibold text-white">
                          {summary.unreadCount}
                        </span>
                      )}
                    </div>

                    <p className="truncate text-sm text-black/50">
                      @{summary.friend.exchangeId}
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
