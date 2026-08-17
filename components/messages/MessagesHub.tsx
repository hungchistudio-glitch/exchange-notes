"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Archive,
  BellOff,
  ChevronRight,
  EyeOff,
  Search,
  SquarePen,
} from "lucide-react";

import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";
import ConversationRow from "@/components/messages/ConversationRow";
import MoodLogoSwiper from "@/components/messages/MoodLogoSwiper";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  getArchivedConversationCount,
  hideConversationForUser,
  listConversationSummaries,
  listIncomingRequests,
  respondToRequest,
  setConversationMuted,
  type ConversationSummary,
  type IncomingRequest,
} from "@/lib/friends";
import { decodeWordCardMessage } from "@/lib/messages/wordCard";
import {
  DEFAULT_HUB_STATE,
  readHubState,
  writeHubState,
  type MessagesHubTab,
} from "@/lib/messages/hubState";
import { subscribeToConversationRead } from "@/lib/messages/unreadSignal";
import { createClient } from "@/lib/supabase/client";

/*
 * Page A. "Who do I want to talk to?"
 *
 * Everything that answers a different question now lives on /messages/[id]:
 * this page carries no thread, no composer and no message history, which is
 * what lets the rows be twice the height they were and the search be a real
 * search rather than a filter tucked above a sidebar.
 */

// Avoids React's warning about useLayoutEffect during the server render,
// while still restoring the saved tab synchronously once hydrated. Mirrors
// the same helper in components/foundation/layout/BottomNavigation.tsx.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Where a conversation row points, given what we know about it. */
function conversationHref(summary: ConversationSummary): string {
  return summary.conversationId
    ? `/messages/${summary.conversationId}`
    : `/messages/new?friend=${encodeURIComponent(summary.friend.id)}`;
}

export default function MessagesHub() {
  const { t } = useTranslation();
  const copy = t.messages;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /*
   * Mirrors currentUserId for the subscriptions below, which are set up once
   * and must not be torn down and rebuilt every time the id resolves.
   */
  const currentUserIdRef = useRef<string | null>(null);
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  /*
   * Defaulted here and restored in the layout effect below, rather than read
   * from the store in a lazy initialiser.
   *
   * /messages is a Server Component, so this tree gets a server render where
   * sessionStorage does not exist. Seeding state from the store would make
   * the server produce the default tab and the client produce the saved one,
   * and React would flag the hydration mismatch. useLayoutEffect runs before
   * the browser paints, so restoring there costs no visible flash.
   */
  const [tab, setTab] = useState<MessagesHubTab>(DEFAULT_HUB_STATE.tab);
  const [query, setQuery] = useState(DEFAULT_HUB_STATE.query);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasRestoredScroll = useRef(false);
  const scrollFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useIsomorphicLayoutEffect(() => {
    const stored = readHubState();
    setTab(stored.tab);
    setQuery(stored.query);
  }, []);

  useEffect(
    () => () => {
      if (scrollFlushRef.current) clearTimeout(scrollFlushRef.current);
    },
    [],
  );

  const persist = useCallback(
    (next: Partial<{ tab: MessagesHubTab; query: string }>) => {
      writeHubState({
        tab: next.tab ?? tab,
        query: next.query ?? query,
        scrollTop: scrollRef.current?.scrollTop ?? 0,
      });
    },
    [query, tab],
  );

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function refreshQuietly(userId: string) {
      try {
        const [rows, archived] = await Promise.all([
          listConversationSummaries(supabase, userId),
          getArchivedConversationCount(supabase, userId),
        ]);
        if (!isMounted) return;
        setSummaries(rows);
        setArchivedCount(archived);
      } catch (error) {
        // A background refresh failing should not replace what is on screen.
        console.error(error);
      }
    }

    async function loadForUser(userId: string) {
      setLoading(true);
      setErrorMessage("");
      setCurrentUserId(userId);
      currentUserIdRef.current = userId;

      try {
        const [rows, incoming, archived] = await Promise.all([
          listConversationSummaries(supabase, userId),
          listIncomingRequests(supabase, userId),
          getArchivedConversationCount(supabase, userId),
        ]);

        if (!isMounted) return;
        setSummaries(rows);
        setRequests(incoming);
        setArchivedCount(archived);
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
       * Re-derives the list when a message lands anywhere. The whole list is
       * refetched rather than patched in place: ordering, the preview line,
       * the phrase count and the unread badge all depend on the message, and
       * listConversationSummaries already resolves them together.
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
      if (currentUserIdRef.current) {
        void refreshQuietly(currentUserIdRef.current);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeRead();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [copy.errors.loadConversations]);

  /*
   * Scroll restoration, deliberately gated on the first load finishing.
   *
   * The list is client-fetched, so on mount it is a few hundred pixels tall
   * and cannot be scrolled to where the user left it. Waiting for the rows to
   * exist is what makes coming back from a conversation land on the same row
   * rather than at the top — the single thing that would have made the
   * two-page split feel like a downgrade.
   */
  useEffect(() => {
    if (!hasLoadedOnce || hasRestoredScroll.current) return;
    hasRestoredScroll.current = true;

    const { scrollTop } = readHubState();
    if (scrollTop <= 0) return;

    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollTop, behavior: "auto" });
    });
  }, [hasLoadedOnce]);

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
      await setConversationMuted(
        supabase,
        currentUserId,
        conversationId,
        nextMuted,
      );
    } catch (error) {
      setSummaries(previous);
      console.error(error);
      setErrorMessage(copy.errors.updateConversation);
    }
  }

  async function handleArchive(summary: ConversationSummary) {
    if (!currentUserId || !summary.conversationId) return;

    const conversationId = summary.conversationId;
    setPendingId(summary.friend.id);
    const previous = summaries;

    setSummaries((current) =>
      current.filter((row) => row.friend.id !== summary.friend.id),
    );
    setArchivedCount((current) => current + 1);

    try {
      const supabase = createClient();
      await hideConversationForUser(supabase, currentUserId, conversationId);
    } catch (error) {
      setSummaries(previous);
      setArchivedCount((current) => Math.max(0, current - 1));
      console.error(error);
      setErrorMessage(copy.errors.updateConversation);
    } finally {
      setPendingId(null);
    }
  }

  async function handleRespond(
    request: IncomingRequest,
    response: "accepted" | "declined",
  ) {
    if (!currentUserId) return;

    setRespondingId(request.requestId);
    const previous = requests;
    setRequests((current) =>
      current.filter((row) => row.requestId !== request.requestId),
    );

    try {
      const supabase = createClient();
      await respondToRequest(supabase, request.requestId, response);

      if (response === "accepted") {
        const rows = await listConversationSummaries(supabase, currentUserId);
        setSummaries(rows);
      }
    } catch (error) {
      setRequests(previous);
      console.error(error);
      setErrorMessage(t.friends.banners.respondFailed);
    } finally {
      setRespondingId(null);
    }
  }

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  /*
   * Search runs across everything the page holds, grouped by what was
   * matched rather than flattened into one list. Language content is part of
   * the corpus: the body of the latest message and the word on a shared card
   * both match, which is what makes "search a word you remember" work.
   */
  const searchResults = useMemo(() => {
    if (!isSearching) return { people: [], conversations: [] };

    const people: ConversationSummary[] = [];
    const conversations: ConversationSummary[] = [];

    for (const summary of summaries) {
      const name = (
        summary.friend.displayName ?? summary.friend.exchangeId
      ).toLowerCase();
      const handle = summary.friend.exchangeId.toLowerCase();

      if (name.includes(trimmedQuery) || handle.includes(trimmedQuery)) {
        people.push(summary);
        continue;
      }

      const body = summary.lastMessage?.body ?? "";
      const card = decodeWordCardMessage(body);
      const haystack = (
        card ? `${card.word} ${card.translation}` : body
      ).toLowerCase();

      if (haystack.includes(trimmedQuery)) {
        conversations.push(summary);
      }
    }

    return { people, conversations };
  }, [isSearching, summaries, trimmedQuery]);

  const recentSummaries = useMemo(
    () => summaries.filter((summary) => summary.lastMessage),
    [summaries],
  );

  function renderRow(summary: ConversationSummary, swipeable: boolean) {
    const row = (
      <ConversationRow
        summary={summary}
        href={conversationHref(summary)}
        currentUserId={currentUserId}
        copy={copy}
        onOpen={() => persist({})}
      />
    );

    if (!swipeable || !summary.conversationId) {
      return <div key={summary.friend.id}>{row}</div>;
    }

    return (
      <SwipeActionRow
        key={summary.friend.id}
        leadingAction={{
          label: summary.mutedAt
            ? copy.unmuteConversation
            : copy.muteConversation,
          icon: <BellOff size={20} strokeWidth={1.8} />,
          onAction: () => handleToggleMute(summary),
          className: "bg-[var(--msg-accent)] text-[var(--msg-accent-ink)]",
        }}
        trailingAction={{
          label: copy.hub.archive,
          icon: <EyeOff size={22} strokeWidth={1.8} />,
          onAction: () => handleArchive(summary),
        }}
        disabled={pendingId === summary.friend.id}
        className="rounded-[20px]"
      >
        {row}
      </SwipeActionRow>
    );
  }

  const tabs: { key: MessagesHubTab; label: string; badge?: number }[] = [
    { key: "recent", label: copy.hub.tabs.recent },
    { key: "friends", label: copy.hub.tabs.friends },
    {
      key: "requests",
      label: copy.hub.tabs.requests,
      badge: requests.length || undefined,
    },
  ];

  return (
    <main
      ref={scrollRef}
      /*
       * Tapping a conversation row is not the only way to leave this page —
       * the dock, the new-conversation button and the browser's own back all
       * do too, and every one of them should be returnable-to. So the scroll
       * position is saved shortly after scrolling stops rather than only in a
       * link's onClick. Debounced because otherwise this is a sessionStorage
       * write per frame for the length of a flick.
       */
      onScroll={(event) => {
        const scrollTop = event.currentTarget.scrollTop;
        if (scrollFlushRef.current) clearTimeout(scrollFlushRef.current);
        scrollFlushRef.current = setTimeout(() => {
          writeHubState({ tab, query, scrollTop });
        }, 150);
      }}
      className="h-[100dvh] overflow-y-auto overscroll-contain px-4 pb-32 pt-6 sm:px-6"
      style={{ background: "var(--msg-page)", color: "var(--msg-ink)" }}
    >
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[900px]">
        <div style={{ paddingTop: "env(safe-area-inset-top)" }} />

        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--msg-accent)" }}
            >
              {copy.hub.eyebrow}
            </p>
            <h1 className="mt-1.5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[34px]">
              {copy.title}
            </h1>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--msg-ink-soft)" }}
            >
              {copy.hub.subtitleFirst}
              <br />
              {copy.hub.subtitleSecond}
            </p>
          </div>

          {/*
            The orbital identity stays, a size down and off to the side. This
            page is for finding a person, so the mark is a signature here
            rather than the performance it is on the Command Deck.
          */}
          <div className="flex shrink-0 flex-col items-end gap-3">
            <div className="w-[104px] sm:w-[128px]">
              <MoodLogoSwiper />
            </div>

            <Link
              href="/friends"
              onClick={() => persist({})}
              aria-label={copy.hub.newConversation}
              title={copy.hub.newConversation}
              className="flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
              style={{
                background: "var(--msg-surface)",
                borderColor: "var(--msg-line)",
                color: "var(--msg-accent)",
                boxShadow: "var(--msg-glow)",
              }}
            >
              <SquarePen size={17} strokeWidth={1.9} />
            </Link>
          </div>
        </header>

        <div
          className="mt-7 flex items-center gap-2.5 rounded-full border px-4 py-3"
          style={{
            background: "var(--msg-surface)",
            borderColor: "var(--msg-line)",
          }}
        >
          <Search
            size={17}
            strokeWidth={1.8}
            className="shrink-0"
            style={{ color: "var(--msg-ink-faint)" }}
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              persist({ query: event.target.value });
            }}
            placeholder={copy.hub.searchPlaceholder}
            aria-label={copy.hub.searchLabel}
            className="w-full bg-transparent text-[15px] outline-none"
            style={{ color: "var(--msg-ink)" }}
          />
          {isSearching && (
            <ClearFieldButton
              label={copy.hub.clearSearch}
              onClear={() => {
                setQuery("");
                persist({ query: "" });
              }}
            />
          )}
        </div>

        {!isSearching && (
          <div
            role="tablist"
            aria-label={copy.title}
            className="mt-5 flex items-center gap-1.5"
          >
            {tabs.map((entry) => {
              const active = tab === entry.key;

              return (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(entry.key);
                    persist({ tab: entry.key });
                  }}
                  className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
                  style={{
                    background: active
                      ? "var(--msg-accent-soft)"
                      : "transparent",
                    borderColor: active ? "var(--msg-accent)" : "var(--msg-line)",
                    color: active ? "var(--msg-accent)" : "var(--msg-ink-soft)",
                  }}
                >
                  {entry.label}
                  {entry.badge !== undefined && (
                    <span
                      className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                      style={{
                        background: "var(--msg-accent)",
                        color: "var(--msg-accent-ink)",
                      }}
                    >
                      {entry.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {(!hasLoadedOnce || loading) && (
          <p
            className="mt-12 text-center text-sm"
            style={{ color: "var(--msg-ink-soft)" }}
          >
            {copy.loadingConversations}
          </p>
        )}

        {hasLoadedOnce && errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-500"
          >
            {errorMessage}
          </div>
        )}

        {hasLoadedOnce && !loading && (
          <div className="mt-6">
            {isSearching ? (
              searchResults.people.length === 0 &&
              searchResults.conversations.length === 0 ? (
                <div className="mt-10 text-center">
                  <p className="text-base font-semibold">
                    {copy.hub.noResultsTitle}
                  </p>
                  <p
                    className="mt-1.5 text-sm"
                    style={{ color: "var(--msg-ink-soft)" }}
                  >
                    {copy.hub.noResultsDescription}
                  </p>
                </div>
              ) : (
                <div className="space-y-7">
                  {searchResults.people.length > 0 && (
                    <section>
                      <h2
                        className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                        style={{ color: "var(--msg-ink-faint)" }}
                      >
                        {copy.hub.resultGroupPeople}
                      </h2>
                      <div className="mt-2.5 space-y-2.5">
                        {searchResults.people.map((summary) =>
                          renderRow(summary, false),
                        )}
                      </div>
                    </section>
                  )}

                  {searchResults.conversations.length > 0 && (
                    <section>
                      <h2
                        className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                        style={{ color: "var(--msg-ink-faint)" }}
                      >
                        {copy.hub.resultGroupConversations}
                      </h2>
                      <div className="mt-2.5 space-y-2.5">
                        {searchResults.conversations.map((summary) =>
                          renderRow(summary, false),
                        )}
                      </div>
                    </section>
                  )}
                </div>
              )
            ) : tab === "requests" ? (
              requests.length === 0 ? (
                <p
                  className="mt-10 text-center text-sm"
                  style={{ color: "var(--msg-ink-soft)" }}
                >
                  {copy.hub.emptyRequests}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {requests.map((request) => {
                    const name =
                      request.sender.displayName ?? request.sender.exchangeId;
                    const busy = respondingId === request.requestId;

                    return (
                      <div
                        key={request.requestId}
                        className="flex items-center gap-3.5 rounded-[20px] border px-4 py-3.5 sm:px-5"
                        style={{
                          background: "var(--msg-surface)",
                          borderColor: "var(--msg-line)",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold"
                          style={{
                            background: "var(--msg-surface-soft)",
                            border: "1px solid var(--msg-line)",
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold">
                            {name}
                          </p>
                          <p
                            className="truncate text-[12px]"
                            style={{ color: "var(--msg-ink-faint)" }}
                          >
                            @{request.sender.exchangeId}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handleRespond(request, "declined")
                            }
                            className="rounded-full border px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50"
                            style={{
                              borderColor: "var(--msg-line)",
                              color: "var(--msg-ink-soft)",
                            }}
                          >
                            {t.friends.incoming.decline}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handleRespond(request, "accepted")
                            }
                            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold disabled:opacity-50"
                            style={{
                              background: "var(--msg-accent)",
                              color: "var(--msg-accent-ink)",
                            }}
                          >
                            {busy
                              ? t.friends.incoming.responding
                              : t.friends.incoming.accept}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (() => {
              const rows = tab === "recent" ? recentSummaries : summaries;

              if (rows.length === 0) {
                return (
                  <div
                    className="mt-8 rounded-[24px] border p-7 text-center"
                    style={{
                      background: "var(--msg-surface)",
                      borderColor: "var(--msg-line)",
                    }}
                  >
                    <p className="text-lg font-bold">
                      {tab === "recent"
                        ? copy.startConversationTitle
                        : copy.hub.emptyFriendsTitle}
                    </p>
                    <p
                      className="mt-2 text-sm leading-6"
                      style={{ color: "var(--msg-ink-soft)" }}
                    >
                      {tab === "recent"
                        ? copy.startConversationDescription
                        : copy.hub.emptyFriendsDescription}
                    </p>
                    <Link
                      href="/friends"
                      onClick={() => persist({})}
                      className="mt-5 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"
                      style={{
                        background: "var(--msg-accent)",
                        color: "var(--msg-accent-ink)",
                      }}
                    >
                      {t.home.community.findFriends}
                    </Link>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  {rows.map((summary) => renderRow(summary, true))}
                </div>
              );
            })()}
          </div>
        )}

        {/*
          Archive stays a destination rather than a tab: it is where things go
          when you are done with them, and giving it equal billing with Recent
          would put a filing cabinet next to the front door.
        */}
        {hasLoadedOnce && !isSearching && archivedCount > 0 && (
          <Link
            href="/messages/archived"
            onClick={() => persist({})}
            className="mt-4 flex items-center gap-3 rounded-[20px] border px-5 py-4 transition-colors"
            style={{
              background: "var(--msg-surface)",
              borderColor: "var(--msg-line)",
            }}
          >
            <Archive
              size={18}
              strokeWidth={1.8}
              style={{ color: "var(--msg-ink-soft)" }}
              aria-hidden="true"
            />
            <span className="flex-1 text-[15px] font-semibold">
              {copy.hub.archived}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--msg-ink-faint)" }}
            >
              {archivedCount}
            </span>
            <ChevronRight
              size={17}
              strokeWidth={1.8}
              style={{ color: "var(--msg-ink-faint)" }}
              aria-hidden="true"
            />
          </Link>
        )}
      </div>
    </main>
  );
}
