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
import {
  CosmicCommsBackdrop,
  CosmicYumiOrbit,
} from "@/components/messages/CosmicCommsHero";
import YumiCommsMark from "@/components/messages/YumiCommsMark";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
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
import {
  searchConversationMessages,
  type MessageSearchHit,
} from "@/lib/messages/search";
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
  const { isCosmic } = useInterfaceMode();
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
  const [realtimeLive, setRealtimeLive] = useState(false);

  /*
   * Remote message hits, tagged with the term that produced them.
   *
   * Carrying the term is what makes "still searching" derivable instead of a
   * second piece of state, and it is also correctness: results are only used
   * when their term matches the box, so a reply for "hello" can never be shown
   * against "world" while the newer request is still out.
   *
   * People are matched locally from data already on screen, so that half of
   * the results is instant; message bodies are not on the client.
   */
  const [messageHits, setMessageHits] = useState<{
    term: string;
    hits: MessageSearchHit[];
  }>({ term: "", hits: [] });

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
        .subscribe((status) => {
          if (!isMounted) return;
          setRealtimeLive(status === "SUBSCRIBED");
        });
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
   * Remote search, debounced into the 200–300ms the brief asks for.
   *
   * Keyed on the raw term rather than on each keystroke's request, and every
   * in-flight response checks `cancelled` before it lands, so a slow reply for
   * "he" can never overwrite the results for "hello".
   */
  /*
   * A stable key for "which conversations are searchable".
   *
   * The effect below cannot depend on `summaries` itself: that array is a new
   * reference after every realtime refresh, so a busy conversation would
   * restart the 250ms debounce on each incoming message and the search would
   * never fire. This only changes when the set of conversations actually does.
   */
  const searchableConversationIds = useMemo(
    () =>
      summaries
        .map((summary) => summary.conversationId)
        .filter((id): id is string => Boolean(id))
        .join(","),
    [summaries],
  );

  useEffect(() => {
    if (!isSearching) return;

    const conversationIds = searchableConversationIds
      .split(",")
      .filter(Boolean);

    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const hits =
            conversationIds.length === 0
              ? []
              : await searchConversationMessages(
                  createClient(),
                  conversationIds,
                  trimmedQuery,
                );
          if (!cancelled) setMessageHits({ term: trimmedQuery, hits });
        } catch (error) {
          // A failed search shows no message results rather than replacing the
          // page with an error — the people half still works.
          console.error(error);
          if (!cancelled) setMessageHits({ term: trimmedQuery, hits: [] });
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isSearching, trimmedQuery, searchableConversationIds]);

  /** Still waiting on the server for the term currently in the box. */
  const searching = isSearching && messageHits.term !== trimmedQuery;

  /*
   * Three groups, as the brief lays them out: who you might mean, what was
   * said, and the language that changed hands. A conversation appears in at
   * most one of them — matching the person is the strongest signal, so those
   * are removed from the message groups rather than listed twice.
   */
  const searchResults = useMemo(() => {
    if (!isSearching) {
      return { people: [], conversations: [], language: [] };
    }

    const byConversationId = new Map(
      summaries
        .filter((summary) => summary.conversationId)
        .map((summary) => [summary.conversationId as string, summary]),
    );

    const people: ConversationSummary[] = [];
    const matchedPeople = new Set<string>();

    for (const summary of summaries) {
      const name = (
        summary.friend.displayName ?? summary.friend.exchangeId
      ).toLowerCase();
      const handle = summary.friend.exchangeId.toLowerCase();

      if (name.includes(trimmedQuery) || handle.includes(trimmedQuery)) {
        people.push(summary);
        if (summary.conversationId) matchedPeople.add(summary.conversationId);
      }
    }

    // One row per conversation: the newest matching message wins, and the
    // query already came back newest-first.
    const seen = new Set<string>();
    const conversations: { summary: ConversationSummary; hit: MessageSearchHit }[] =
      [];
    const language: { summary: ConversationSummary; hit: MessageSearchHit }[] =
      [];

    const hits = messageHits.term === trimmedQuery ? messageHits.hits : [];

    for (const hit of hits) {
      if (seen.has(hit.conversationId)) continue;
      if (matchedPeople.has(hit.conversationId)) continue;

      const summary = byConversationId.get(hit.conversationId);
      if (!summary) continue;

      seen.add(hit.conversationId);
      (hit.isWordCard ? language : conversations).push({ summary, hit });
    }

    return { people, conversations, language };
  }, [isSearching, messageHits, summaries, trimmedQuery]);

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

        {/*
          The hero band. In Cosmic Mode this is an orbital observation deck
          above Earth; in Standard Mode it is a header with a logo in it, and
          deliberately nothing more — the brief asks the standard shell to stay
          lighter, and gating in React rather than CSS means it ships none of
          the cosmic DOM.
        */}
        <div
          className={`relative ${
            isCosmic
              ? // Full-bleed to the page's padding edge, because the planet's
                // limb has to reach the right edge to read as a horizon, and
                // deep enough below the header to have somewhere to rise from.
                "-mx-4 overflow-hidden px-4 pb-14 pt-2 sm:-mx-6 sm:px-6 sm:pb-16"
              : ""
          }`}
        >
          {isCosmic && <CosmicCommsBackdrop />}

          {/*
            Centred on the band, above the backdrop and below the text, with
            pointer events off so it never intercepts a tap meant for the
            header controls beside it.
          */}
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center [--yumi-mark-size:76px] sm:[--yumi-mark-size:104px]">
            {isCosmic ? (
              <CosmicYumiOrbit>
                <YumiCommsMark cosmic />
              </CosmicYumiOrbit>
            ) : (
              <YumiCommsMark />
            )}
          </div>

          {/*
            Three columns so Yumi is centred against the band, not merely
            placed between two blocks of unequal width. The side columns are
            1fr each and the middle is content-sized, so the figure holds the
            centre line whatever the title wraps to.
          */}
          <header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
            {/*
              Above the orbit. The rings are wider than the column Yumi sits
              in and reach across the title on a narrow screen; they are faint,
              but "faint over the word Messages" is still a thing the brief
              rules out. Raising the text is cheaper than shrinking the scene.
            */}
            <div className="relative z-20 min-w-0">
              <p
                className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--msg-accent)" }}
              >
                {copy.hub.eyebrow}
              </p>
              <h1 className="mt-1.5 text-[1.625rem] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[2.125rem]">
                {copy.title}
              </h1>
              <p
                className="mt-2 text-[0.8125rem] leading-5 sm:text-sm sm:leading-6"
                style={{ color: "var(--msg-ink-soft)" }}
              >
                {copy.hub.subtitleFirst}
                <br />
                {copy.hub.subtitleSecond}
              </p>
            </div>

            {/*
              A spacer, not the figure. Yumi is absolutely centred in the band
              below, because the band is taller than this header row — it has
              to be, for the planet to have somewhere to rise from — and
              sitting in the row would pin the figure to the top of the scene
              rather than the middle of it. The spacer is what still reserves
              the column so the title never grows into the centre.
            */}
            <div className="w-[76px] sm:w-[112px]" aria-hidden="true" />

            <div className="flex items-center justify-end gap-2">
              {/*
                A real readout, not a decorative badge: it reports whether this
                page's realtime subscription is actually live, so it can say
                "offline" and mean it.
              */}
              <span
                className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] min-[420px]:flex"
                style={{
                  background: "var(--msg-surface)",
                  borderColor: "var(--msg-line)",
                  color: "var(--msg-ink-soft)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: realtimeLive
                      ? "var(--msg-presence)"
                      : "var(--msg-ink-faint)",
                  }}
                />
                {realtimeLive
                  ? copy.room.connectionConnected
                  : copy.room.connectionConnecting}
              </span>

              <Link
                href="/friends"
                onClick={() => persist({})}
                aria-label={copy.hub.newConversation}
                title={copy.hub.newConversation}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors"
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
        </div>

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
            className="w-full bg-transparent text-[0.9375rem] outline-none"
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
                  className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors"
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
                      className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-bold"
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
            {isSearching ? (() => {
              const groups = [
                {
                  key: "people",
                  label: copy.hub.resultGroupPeople,
                  rows: searchResults.people.map((summary) => ({
                    summary,
                    preview: undefined as string | undefined,
                  })),
                },
                {
                  key: "conversations",
                  label: copy.hub.resultGroupConversations,
                  rows: searchResults.conversations.map(({ summary, hit }) => ({
                    summary,
                    preview: hit.snippet,
                  })),
                },
                {
                  key: "language",
                  label: copy.hub.resultGroupLanguage,
                  rows: searchResults.language.map(({ summary, hit }) => ({
                    summary,
                    preview: hit.snippet,
                  })),
                },
              ].filter((group) => group.rows.length > 0);

              if (groups.length === 0) {
                return (
                  <div className="mt-10 text-center">
                    <p className="text-base font-semibold">
                      {searching ? copy.hub.searching : copy.hub.noResultsTitle}
                    </p>
                    {!searching && (
                      <p
                        className="mt-1.5 text-sm"
                        style={{ color: "var(--msg-ink-soft)" }}
                      >
                        {copy.hub.noResultsDescription}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-7">
                  {groups.map((group) => (
                    <section key={group.key}>
                      <h2
                        className="px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.16em]"
                        style={{ color: "var(--msg-ink-faint)" }}
                      >
                        {group.label}
                      </h2>
                      <div className="mt-2.5 space-y-2.5">
                        {group.rows.map(({ summary, preview }) => (
                          <ConversationRow
                            key={summary.friend.id}
                            summary={summary}
                            href={conversationHref(summary)}
                            currentUserId={currentUserId}
                            copy={copy}
                            previewOverride={preview}
                            onOpen={() => persist({})}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              );
            })() : tab === "requests" ? (
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
                          <p className="truncate text-[0.9375rem] font-semibold">
                            {name}
                          </p>
                          <p
                            className="truncate text-[0.75rem]"
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
                            className="rounded-full border px-3 py-1.5 text-[0.8125rem] font-semibold disabled:opacity-50"
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
                            className="rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold disabled:opacity-50"
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
            <span className="flex-1 text-[0.9375rem] font-semibold">
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
