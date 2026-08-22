"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  BellOff,
  Check as CheckMark,
  EyeOff,
  ListChecks,
  MoreVertical,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";
import HighlightedMessageBody from "@/components/messages/HighlightedMessageBody";
import NewsCardMessage from "@/components/messages/NewsCardMessage";
import YumiDecodeCard from "@/components/messages/YumiDecodeCard";
import WordCardMessage from "@/components/messages/WordCardMessage";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import {
  getConversationContext,
  hideConversationForUser,
  markConversationRead,
  setConversationMuted,
  type FriendProfile,
} from "@/lib/friends";
import {
  isWorthAnalysing,
  listAnalysisForMessages,
  requestMessageAnalysis,
  type DetectedPhrase,
  type MessageAnalysis,
} from "@/lib/messages/decode";
import { formatDateLabel, formatMessageTime } from "@/lib/messages/format";
import { hideMessagesForUser, listHiddenMessageIds } from "@/lib/messages/hiddenMessages";
import { decodeNewsCardMessage } from "@/lib/messages/newsCard";
import {
  fetchReceiptsForMessages,
  getReceiptStatus,
  markMessagesRead,
  type MessageReceiptInfo,
  type MessageReceiptStatus,
} from "@/lib/messages/receipts";
import {
  decodeWordCardMessage,
  encodeWordCardMessage,
  type SharedWordCard,
} from "@/lib/messages/wordCard";
import { notifyPushEvent } from "@/lib/push/eventsClient";
import { createClient } from "@/lib/supabase/client";
import {
  clearPendingSharedVocabulary,
  getPendingSharedVocabulary,
  setPendingSharedVocabulary,
} from "@/lib/vocabularyDraft";
import { insertVocabulary } from "@/lib/vocabulary/repository";

/*
 * Page B. "What are we saying to each other?"
 *
 * The conversation owns the whole screen now. That is the entire premise of
 * the rebuild, and most of the layout below is spending the space the friend
 * list used to take: a wider column, roomier bubbles, a composer that is not
 * squeezed against a sidebar, and margins on both sides that are deliberate
 * breathing room rather than a gap nobody got round to filling.
 */

type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type RealtimeStatus = "connecting" | "connected" | "disconnected";

const MAX_MESSAGE_LENGTH = 2000;

/*
 * Roughly seven lines before the composer starts scrolling internally, at
 * the 24px line-height it renders at. Seven is the top of the brief's range:
 * this is a language app, and the message someone is trying to get right is
 * exactly the one they want to see all of while writing it.
 */
const COMPOSER_MAX_HEIGHT = 168;

/** How close to the bottom still counts as "reading the latest". */
const NEAR_BOTTOM_THRESHOLD = 120;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Exchange Notes' own status glyph, not a copy of other apps' checkmarks:
// a single line once it's on the server, a double line once the friend's
// device has it, and a softly pulsing accent double line once they've read it.
function MessageStatusIcon({
  status,
  label,
}: {
  status: MessageReceiptStatus;
  label: string;
}) {
  if (status === "sent") {
    return (
      <span title={label} aria-label={label} className="inline-flex">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            d="M5 12.5l3.5 3.5L19 6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  const isRead = status === "read";

  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex"
      style={isRead ? { color: "var(--msg-accent)" } : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path
          d="M2 12.5l3.5 3.5L13 8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 12.5l3.5 3.5L20 8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isRead ? "animate-pulse" : ""}
        />
      </svg>
    </span>
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

function shouldShowDateDivider(messages: Message[], index: number) {
  if (index === 0) return true;

  const currentDate = new Date(messages[index].created_at);
  const previousDate = new Date(messages[index - 1].created_at);

  return (
    currentDate.getFullYear() !== previousDate.getFullYear() ||
    currentDate.getMonth() !== previousDate.getMonth() ||
    currentDate.getDate() !== previousDate.getDate()
  );
}

type ConversationRoomProps = {
  conversationId: string;
};

export default function ConversationRoom({
  conversationId,
}: ConversationRoomProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t } = useTranslation();
  const { isLearningChinese, languagePair } = useLearningLanguageContext();
  const copy = t.messages;

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [mutedAt, setMutedAt] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /*
   * True only once this conversation has actually opened.
   *
   * "Not loading any more" is not the same thing — a failed open also stops
   * loading, and the queued-word-card effect below must not treat that as its
   * cue to fire.
   */
  const [conversationReady, setConversationReady] = useState(false);

  /**
   * The outcome the channel last reported, tagged with the conversation it
   * belongs to. Tagging matters because a status callback from a channel that
   * is being torn down can otherwise land after the next conversation has
   * opened and label it with the old channel's state.
   */
  const [channelState, setChannelState] = useState<{
    conversationId: string;
    status: Exclude<RealtimeStatus, "connecting">;
  } | null>(null);

  /*
   * Yumi's reading of the messages on screen.
   *
   * Absent until it arrives and absent forever if it never does. Nothing in
   * the timeline waits on this map — the messages render, and cards appear
   * beside them later or not at all (§45).
   */
  const [analysisByMessageId, setAnalysisByMessageId] = useState<
    Map<number, MessageAnalysis>
  >(new Map());
  const [openDecodeId, setOpenDecodeId] = useState<number | null>(null);
  const [savedPhraseIds, setSavedPhraseIds] = useState<Set<string>>(new Set());
  const [savingPhraseId, setSavingPhraseId] = useState<string | null>(null);

  /** Messages already asked about, so a re-render never asks twice. */
  const requestedAnalysisRef = useRef<Set<number>>(new Set());

  const [savedCardIds, setSavedCardIds] = useState<Set<number>>(new Set());
  const [savingCardId, setSavingCardId] = useState<number | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteMotion = useSheetMotion({
    open: confirmOpen,
    onClose: () => setConfirmOpen(false),
    closeDisabled: deleting,
  });

  /*
   * Forwarding a card to a different friend. The picker stashes the card and
   * navigates to that friend's thread, which is the same path the vocabulary
   * page has always used — this screen is just another place a card can
   * start from.
   */
  const {
    friendPickerItem,
    shareCard,
    friends: pickerFriends,
    friendsLoading,
    friendsError,
    sendingFriendId,
    loadFriends,
    handleClosePicker,
    handlePickFriend,
  } = useVocabularyFriendPicker();

  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const [receiptsByMessageId, setReceiptsByMessageId] = useState<
    Map<number, MessageReceiptInfo>
  >(new Map());

  /*
   * Whether the reader is at the live edge, and whether something arrived
   * while they were not. Together these are the whole of §30: a message that
   * lands while you are reading older history must not move the page under
   * you, it must offer to take you there.
   */
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasUnseenBelow, setHasUnseenBelow] = useState(false);
  const isNearBottomRef = useRef(true);

  const timelineRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const friendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const messagesRef = useRef<Message[]>([]);
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /*
   * Advance conversation_members.last_read_at for messages that arrive while
   * this thread is on screen.
   *
   * The per-message path already treats an open thread as read — markMessagesRead
   * runs on every incoming message below. last_read_at was not keeping up, and
   * it is what the conversation list computes its unread badge from, so a
   * message you watched arrive came back as unread the moment you pressed back.
   *
   * Debounced because a burst of messages should cost one write, not one per
   * message, and flushed on the way out so leaving immediately still counts.
   */
  const scheduleConversationRead = useCallback(() => {
    if (!currentUserId) return;

    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(() => {
      markReadTimerRef.current = null;
      markConversationRead(supabase, currentUserId, conversationId).catch(
        (error) => {
          console.warn("Could not mark conversation as read:", error);
        },
      );
    }, 900);
  }, [conversationId, currentUserId, supabase]);

  useEffect(
    () => () => {
      if (!markReadTimerRef.current) return;
      clearTimeout(markReadTimerRef.current);
      markReadTimerRef.current = null;
      if (!currentUserId) return;

      // Fire-and-forget: the request outlives this component, which is the
      // point — the user is on their way back to the list that reads it.
      markConversationRead(supabase, currentUserId, conversationId).catch(
        (error) => {
          console.warn("Could not mark conversation as read:", error);
        },
      );
    },
    [conversationId, currentUserId, supabase],
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : behavior,
      block: "end",
    });
    setHasUnseenBelow(false);
  }, []);

  const handleTimelineScroll = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const distanceFromBottom =
      timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;

    isNearBottomRef.current = nearBottom;
    setIsNearBottom(nearBottom);
    if (nearBottom) setHasUnseenBelow(false);
  }, []);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [newMessage, resizeTextarea]);

  useEffect(() => {
    let cancelled = false;

    async function openConversation() {
      setLoading(true);
      setErrorMessage("");
      setMessages([]);
      setConversationReady(false);
      setAnalysisByMessageId(new Map());
      setOpenDecodeId(null);
      setSavedPhraseIds(new Set());
      requestedAnalysisRef.current = new Set();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userError || !user) {
        setErrorMessage(copy.room.notLoggedIn);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      try {
        const context = await getConversationContext(
          supabase,
          user.id,
          conversationId,
        );

        if (cancelled) return;

        /*
         * Not a member, or no such conversation. RLS makes those two cases
         * indistinguishable from here, and they mean the same thing to the
         * person reading the screen.
         */
        if (!context) {
          setErrorMessage(copy.errors.conversationNotFound);
          setLoading(false);
          return;
        }

        setFriend(context.friend);
        setMutedAt(context.mutedAt);

        // Best-effort: resets this conversation's unread badge. Non-fatal if
        // it fails (e.g. an RLS policy gap) — the thread should still open.
        markConversationRead(supabase, user.id, conversationId).catch(
          (markError) => {
            console.warn("Could not mark conversation as read:", markError);
          },
        );

        const [{ data: existingMessages, error: messagesError }, hiddenIds] =
          await Promise.all([
            supabase
              .from("messages")
              .select("id, conversation_id, sender_id, body, created_at")
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: true })
              .limit(500),
            listHiddenMessageIds(supabase, user.id),
          ]);

        if (cancelled) return;

        if (messagesError) {
          console.error(messagesError);
          setErrorMessage(copy.errors.openConversation);
          setLoading(false);
          return;
        }

        const visibleMessages = (existingMessages ?? []).filter(
          (message) => !hiddenIds.has(message.id),
        );
        setMessages(visibleMessages);
        setLoading(false);
        setConversationReady(true);

        window.requestAnimationFrame(() => {
          scrollToBottom("auto");
        });

        const ownMessageIds = visibleMessages
          .filter((message) => message.sender_id === user.id)
          .map((message) => message.id);
        const friendMessageIds = visibleMessages
          .filter((message) => message.sender_id !== user.id)
          .map((message) => message.id);

        // Best-effort, non-fatal: read receipts are a nice-to-have overlay on
        // top of the message list, not something that should block the
        // conversation from opening if either call fails.
        fetchReceiptsForMessages(supabase, ownMessageIds)
          .then((receipts) => {
            if (!cancelled) setReceiptsByMessageId(receipts);
          })
          .catch((receiptsError) => {
            console.warn("Could not load read receipts:", receiptsError);
          });

        markMessagesRead(supabase, user.id, friendMessageIds).catch(
          (readError) => {
            console.warn("Could not mark messages as read:", readError);
          },
        );
      } catch (error) {
        if (cancelled) return;
        // Never show the raw error (DB/network details) to the user — log it
        // for debugging and show friendly, translated copy instead.
        console.error(error);
        setErrorMessage(copy.errors.openConversation);
        setLoading(false);
      }
    }

    void openConversation();

    return () => {
      cancelled = true;
    };
  }, [
    conversationId,
    scrollToBottom,
    supabase,
    copy.errors.conversationNotFound,
    copy.errors.openConversation,
    copy.room.notLoggedIn,
  ]);

  /**
   * Derived rather than stored: "connecting" is simply the absence of a
   * reported outcome for the conversation currently open, so it does not need
   * to be assigned when the subscription starts.
   */
  const realtimeStatus: RealtimeStatus =
    channelState?.conversationId === conversationId
      ? channelState.status
      : "connecting";

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incomingMessage = payload.new as Message;
          setMessages((currentMessages) => {
            const alreadyExists = currentMessages.some(
              (message) => message.id === incomingMessage.id,
            );
            if (alreadyExists) return currentMessages;
            return [...currentMessages, incomingMessage];
          });

          // Arriving while the reader is further up the history is the case
          // the pill exists for. Their scroll position is theirs.
          if (!isNearBottomRef.current) setHasUnseenBelow(true);

          // The thread is open, so a message that just arrived from the
          // friend is immediately both delivered and read.
          if (currentUserId && incomingMessage.sender_id !== currentUserId) {
            markMessagesRead(supabase, currentUserId, [
              incomingMessage.id,
            ]).catch((readError) => {
              console.warn("Could not mark incoming message as read:", readError);
            });

            scheduleConversationRead();
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setChannelState({ conversationId, status: "connected" });
          return;
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setChannelState({ conversationId, status: "disconnected" });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, scheduleConversationRead, supabase]);

  // Listens for the friend's receipt writes on OUR sent messages (they opened
  // the thread, or their client marked something delivered) so our own
  // bubbles' status glyphs update live, without polling.
  useEffect(() => {
    const friendId = friend?.id;
    if (!friendId) return;

    const channel = supabase
      .channel(`message-receipts:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_receipts",
          filter: `user_id=eq.${friendId}`,
        },
        (payload) => {
          const row = payload.new as {
            message_id: number;
            delivered_at: string | null;
            read_at: string | null;
          } | null;
          if (!row) return;

          const belongsToThisThread = messagesRef.current.some(
            (message) =>
              message.id === row.message_id &&
              message.sender_id === currentUserId,
          );
          if (!belongsToThisThread) return;

          setReceiptsByMessageId((current) => {
            const next = new Map(current);
            next.set(row.message_id, {
              deliveredAt: row.delivered_at,
              readAt: row.read_at,
            });
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, friend?.id, currentUserId, supabase]);

  // Ephemeral "is typing" presence: broadcast-only, never written to the
  // database. Listens for the other participant's broadcast events and shows
  // a transient indicator that auto-clears after a short silence.
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    typingChannelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const senderId = (payload.payload as { userId?: string } | null)?.userId;
        if (!senderId || senderId === currentUserId) return;

        setFriendIsTyping(true);

        if (friendTypingTimeoutRef.current) {
          clearTimeout(friendTypingTimeoutRef.current);
        }
        friendTypingTimeoutRef.current = setTimeout(() => {
          setFriendIsTyping(false);
        }, 3000);
      })
      .on("broadcast", { event: "stopped-typing" }, (payload) => {
        const senderId = (payload.payload as { userId?: string } | null)?.userId;
        if (!senderId || senderId === currentUserId) return;

        if (friendTypingTimeoutRef.current) {
          clearTimeout(friendTypingTimeoutRef.current);
          friendTypingTimeoutRef.current = null;
        }
        setFriendIsTyping(false);
      })
      .subscribe();

    return () => {
      typingChannelRef.current = null;
      if (friendTypingTimeoutRef.current) {
        clearTimeout(friendTypingTimeoutRef.current);
        friendTypingTimeoutRef.current = null;
      }
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      setFriendIsTyping(false);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  /*
   * Follow the conversation only when the reader is already following it.
   *
   * The old thread scrolled on every render that added a message, which is
   * fine until someone scrolls up to re-read something and the page yanks
   * them back down mid-sentence.
   */
  useEffect(() => {
    if (messages.length === 0) return;
    if (!isNearBottomRef.current) return;

    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!friendIsTyping || !isNearBottomRef.current) return;
    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [friendIsTyping, scrollToBottom]);

  useEffect(() => {
    const draft = sessionStorage.getItem("exchange-notes-draft-message");
    if (!draft) return;

    sessionStorage.removeItem("exchange-notes-draft-message");

    /*
     * The draft is restored in the same frame callback that focuses the
     * textarea, rather than assigned straight from the effect body. A lazy
     * useState initialiser cannot do this instead: the server has no
     * sessionStorage, so it would render an empty textarea and then hydrate
     * against a filled one.
     */
    window.requestAnimationFrame(() => {
      setNewMessage(draft);
      textareaRef.current?.focus();
    });
  }, []);

  // Consumes a word queued from the Vocabulary "send to partner" flow
  // (components/vocabulary/FriendPickerModal.tsx via
  // hooks/useVocabularyFriendPicker.ts, which stashes it in sessionStorage and
  // navigates here). Sends it as a real word-card message as soon as this
  // thread is ready, then clears the queue so it can never resend on a later
  // visit to a different conversation.
  useEffect(() => {
    /*
     * Gated on the conversation having opened, not merely on loading having
     * finished. A failed open also clears `loading`, and this effect used to
     * take that as its cue: it consumed the queued card, tried to post it into
     * a conversation it could not read, and replaced the real "not available"
     * error with a misleading one. The card was gone either way.
     */
    if (!currentUserId || !conversationReady) return;

    const pendingVocabulary = getPendingSharedVocabulary();
    if (!pendingVocabulary) return;

    /*
     * Cleared before the insert rather than after, so a re-render cannot send
     * the same card twice — and put back below if the insert fails, so a
     * failure costs the user a retry instead of the word they chose.
     */
    clearPendingSharedVocabulary();

    const cardBody = encodeWordCardMessage(pendingVocabulary);

    void (async () => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          body: cardBody,
        })
        .select("id, conversation_id, sender_id, body, created_at")
        .single();

      if (error) {
        setPendingSharedVocabulary(pendingVocabulary);
        setErrorMessage(copy.errors.shareWord);
        return;
      }

      void notifyPushEvent({ kind: "message", messageId: data.id });

      setMessages((currentMessages) => {
        const alreadyExists = currentMessages.some(
          (message) => message.id === data.id,
        );
        return alreadyExists ? currentMessages : [...currentMessages, data];
      });
    })();
  }, [
    conversationId,
    currentUserId,
    conversationReady,
    supabase,
    copy.errors.shareWord,
  ]);

  /*
   * Load whatever Yumi has already read, then ask about what it has not.
   *
   * Runs after the messages are on screen, never before — the timeline does
   * not wait on this, which is the whole of §45. Requests go out one at a time
   * rather than as a burst: a conversation opened for the first time can hold
   * dozens of unanalysed messages, and firing dozens of model calls at once is
   * how a daily quota disappears in a single scroll.
   */
  useEffect(() => {
    if (!currentUserId || !conversationReady || messages.length === 0) return;

    let cancelled = false;

    void (async () => {
      // Only the most recent window. §43: older enrichment is not bundled by
      // default, and a card nobody has scrolled to is a call nobody needed.
      const window = messages.slice(-30);
      const ids = window.map((message) => message.id);

      try {
        const stored = await listAnalysisForMessages(supabase, currentUserId, ids);
        if (cancelled) return;

        if (stored.size > 0) {
          setAnalysisByMessageId((current) => {
            const next = new Map(current);
            for (const [messageId, analysis] of stored) next.set(messageId, analysis);
            return next;
          });
        }

        const pending = window.filter(
          (message) =>
            message.sender_id !== currentUserId &&
            isWorthAnalysing(message.body) &&
            !stored.has(message.id) &&
            !requestedAnalysisRef.current.has(message.id),
        );

        for (const message of pending) {
          if (cancelled) return;

          /*
           * Claimed before the call so two overlapping runs cannot both ask
           * about the same message, and released again on anything other than
           * success.
           *
           * Releasing is the part that matters. This effect re-runs whenever a
           * message arrives, which cancels the loop mid-flight; without the
           * release, every message the cancelled run had claimed but not yet
           * answered would stay claimed forever and never get a card.
           */
          requestedAnalysisRef.current.add(message.id);

          const analysis = await requestMessageAnalysis(message.id);

          if (cancelled || !analysis) {
            requestedAnalysisRef.current.delete(message.id);
            if (cancelled) return;
            continue;
          }

          setAnalysisByMessageId((current) =>
            new Map(current).set(message.id, analysis),
          );
        }
      } catch (error) {
        // Enrichment failing is not something to put on screen mid-conversation.
        console.warn("Could not load language help:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationReady, currentUserId, messages, supabase]);

  async function handleSavePhrase(phrase: DetectedPhrase) {
    if (!currentUserId || savingPhraseId || savedPhraseIds.has(phrase.id)) return;

    setSavingPhraseId(phrase.id);

    try {
      await insertVocabulary({
        user_id: currentUserId,
        word: phrase.phrase,
        translation: phrase.meaning,
        /*
         * The phrase is in the language being learned — it came out of a
         * message written in it — so that is what this row's language is.
         * Saving it into vocabulary rather than a parallel store is what puts
         * it into review alongside everything else, and what lets §46's
         * "already known" list be the vocabulary the user actually has.
         */
        word_language: languagePair[0],
        translation_language: languagePair[1],
        part_of_speech: "phrase",
        example_sentence: null,
        translated_example: phrase.expanded ?? null,
        confidence: "medium",
        category: "other",
        status: "new",
      });

      setSavedPhraseIds((current) => new Set(current).add(phrase.id));
    } catch (error) {
      console.error(error);
      setErrorMessage(copy.decode.saveFailed);
    } finally {
      setSavingPhraseId(null);
    }
  }

  /*
   * A chosen reply lands in the composer and stops there. §24 is explicit that
   * the user owns the final message, so this fills the box and focuses it —
   * sending is still a thing they have to do.
   */
  function handleInsertReply(text: string) {
    setNewMessage(text);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(text.length, text.length);
    });
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const messageBody = newMessage.trim();
    if (!messageBody || !currentUserId || sending) return;

    setSending(true);
    setErrorMessage("");

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    void typingChannelRef.current?.send({
      type: "broadcast",
      event: "stopped-typing",
      payload: { userId: currentUserId },
    });

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: messageBody,
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (error) {
      setErrorMessage(copy.room.sendFailed);
      setSending(false);
      return;
    }

    void notifyPushEvent({ kind: "message", messageId: data.id });

    setMessages((currentMessages) => {
      const alreadyExists = currentMessages.some(
        (message) => message.id === data.id,
      );
      return alreadyExists ? currentMessages : [...currentMessages, data];
    });

    setNewMessage("");
    setSending(false);

    // Sending is an explicit request to be at the live edge, whatever was on
    // screen a moment ago.
    isNearBottomRef.current = true;
    setIsNearBottom(true);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      scrollToBottom();
    });
  }

  function handleComposerChange(
    event: FormEvent<HTMLTextAreaElement> & { target: HTMLTextAreaElement },
  ) {
    const value = event.target.value;
    setNewMessage(value);

    const channel = typingChannelRef.current;
    if (!channel || !currentUserId) return;

    if (value.trim().length === 0) {
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      void channel.send({
        type: "broadcast",
        event: "stopped-typing",
        payload: { userId: currentUserId },
      });
      return;
    }

    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }
    typingStopTimeoutRef.current = setTimeout(() => {
      void channel.send({
        type: "broadcast",
        event: "stopped-typing",
        payload: { userId: currentUserId },
      });
    }, 2500);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function handleSaveCard(messageId: number, card: SharedWordCard) {
    if (!currentUserId || savingCardId !== null || savedCardIds.has(messageId)) {
      return;
    }

    setSavingCardId(messageId);

    const cardWordLanguage = card.wordLanguage ?? languagePair[0];
    const cardTranslationLanguage = card.translationLanguage ?? languagePair[1];

    try {
      await insertVocabulary({
        user_id: currentUserId,
        word: card.word.trim(),
        translation: card.translation.trim(),
        /*
         * The card says which languages its two sides are in, so the saved
         * row keeps them rather than assuming the receiver's own pair. A card
         * from someone learning something else is still a real word.
         */
        word_language: cardWordLanguage,
        translation_language: cardTranslationLanguage,
        part_of_speech: card.partOfSpeech?.trim() || null,
        example_sentence: card.examples?.[cardWordLanguage]?.trim() || null,
        translated_example:
          card.examples?.[cardTranslationLanguage]?.trim() || null,
        confidence: "medium",
        category: "other",
        status: "new",
      });

      setSavedCardIds((current) => new Set(current).add(messageId));
    } catch (error) {
      console.error(error);
      setErrorMessage(copy.errors.saveWord);
    } finally {
      setSavingCardId(null);
    }
  }

  async function handleToggleMute() {
    if (!currentUserId) return;

    const nextMuted = !mutedAt;
    const previous = mutedAt;
    setMutedAt(nextMuted ? new Date().toISOString() : null);
    setMenuOpen(false);

    try {
      await setConversationMuted(
        supabase,
        currentUserId,
        conversationId,
        nextMuted,
      );
    } catch (error) {
      setMutedAt(previous);
      console.error(error);
      setErrorMessage(copy.errors.updateConversation);
    }
  }

  async function handleArchive() {
    if (!currentUserId) return;
    setMenuOpen(false);

    try {
      await hideConversationForUser(supabase, currentUserId, conversationId);

      // Archiving the conversation you are reading means leaving it. A soft
      // navigation keeps the list's restored state intact on the way back.
      router.push("/messages");
    } catch (error) {
      console.error(error);
      setErrorMessage(copy.errors.updateConversation);
    }
  }

  const ownMessageIds = messages
    .filter((message) => message.sender_id === currentUserId)
    .map((message) => message.id);

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelected(messageId: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (!currentUserId || selectedIds.size === 0) return;

    setDeleting(true);
    setErrorMessage("");

    const idsToDelete = Array.from(selectedIds);

    try {
      await hideMessagesForUser(supabase, currentUserId, idsToDelete);

      setMessages((current) =>
        current.filter((message) => !selectedIds.has(message.id)),
      );
      setConfirmOpen(false);
      exitSelectMode();
    } catch (error) {
      console.error(error);
      setErrorMessage(copy.errors.deleteSelected);
    } finally {
      setDeleting(false);
    }
  }

  const canSend = Boolean(newMessage.trim()) && Boolean(currentUserId) && !sending;
  const showCharacterCount = newMessage.length > MAX_MESSAGE_LENGTH * 0.8;

  const friendName =
    friend?.displayName ?? friend?.exchangeId ?? copy.room.unknownParticipant;
  const friendInitial = friendName.charAt(0).toUpperCase();

  const statusLabel = friendIsTyping
    ? copy.typingIndicator.replace("{name}", friendName)
    : realtimeStatus === "connected"
      ? copy.room.connectionConnected
      : realtimeStatus === "connecting"
        ? copy.room.connectionConnecting
        : copy.room.connectionOffline;

  return (
    <main
      className="flex h-[100dvh] flex-col overflow-hidden"
      style={{ background: "var(--msg-page)", color: "var(--msg-ink)" }}
    >
      {/*
        Sticky, and carrying much more weight than it did in the split
        layout: with no friend list on screen it is the only thing that says
        who you are talking to and the only way back to the list.
      */}
      <header
        className="z-20 shrink-0 border-b backdrop-blur-xl"
        style={{
          background: "var(--msg-header)",
          borderColor: "var(--msg-line)",
        }}
      >
        <div
          className="mx-auto w-full max-w-[1100px] px-4 sm:px-8"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          {selectMode ? (
            <div className="flex min-h-[68px] items-center justify-between gap-3">
              <button
                type="button"
                onClick={exitSelectMode}
                className="text-sm font-medium"
                style={{ color: "var(--msg-ink-soft)" }}
              >
                {copy.cancel}
              </button>

              <span className="text-sm font-semibold">
                {selectedIds.size > 0
                  ? copy.selectedCount.replace(
                      "{count}",
                      String(selectedIds.size),
                    )
                  : copy.selectMessages}
              </span>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set(ownMessageIds))}
                className="text-sm font-medium"
                style={{ color: "var(--msg-ink-soft)" }}
              >
                {copy.selectAll}
              </button>
            </div>
          ) : (
            <div className="flex min-h-[68px] items-center gap-3 sm:gap-4">
              <Link
                href="/messages"
                aria-label={copy.room.back}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
                style={{ color: "var(--msg-ink-soft)" }}
              >
                <ArrowLeft size={20} strokeWidth={1.9} />
              </Link>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                {friend?.avatarUrl ? (
                  // Avatar hosts vary per account (any OAuth provider a friend
                  // signed up with), and next.config's remotePatterns is pinned
                  // to one host on purpose, so next/image can't serve these.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={friend.avatarUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      background: "var(--msg-surface-soft)",
                      border: "1px solid var(--msg-line)",
                    }}
                  >
                    {friendInitial}
                  </span>
                )}

                <div className="min-w-0">
                  <h1 className="truncate text-[17px] font-semibold tracking-[-0.015em]">
                    {friendName}
                  </h1>

                  <div
                    className="mt-0.5 flex items-center gap-1.5 text-[11px]"
                    style={{ color: "var(--msg-ink-soft)" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background:
                          realtimeStatus === "connected"
                            ? "var(--msg-presence)"
                            : realtimeStatus === "connecting"
                              ? "var(--accent-amber)"
                              : "var(--msg-ink-faint)",
                      }}
                    />
                    <span className="truncate">{statusLabel}</span>
                  </div>
                </div>
              </div>

              <span
                title={copy.room.privateHint}
                className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium min-[420px]:flex"
                style={{
                  borderColor: "var(--msg-line)",
                  color: "var(--msg-ink-soft)",
                }}
              >
                <ShieldCheck size={14} strokeWidth={1.8} aria-hidden="true" />
                {copy.room.privateLabel}
              </span>

              {/*
                Everything below the top two controls lives behind one menu.
                The brief asks for fewer icons crowded together, and a control
                that is used once a month should not be permanently occupying
                the header next to the person's name.
              */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label={copy.room.options}
                  aria-expanded={menuOpen}
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ color: "var(--msg-ink-soft)" }}
                >
                  <MoreVertical size={19} strokeWidth={1.9} />
                </button>

                {menuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label={copy.room.closeOptions}
                      onClick={() => setMenuOpen(false)}
                      className="fixed inset-0 z-10 cursor-default"
                    />

                    <div
                      role="menu"
                      className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-2xl border py-1.5"
                      style={{
                        background: "var(--msg-surface)",
                        borderColor: "var(--msg-line)",
                        boxShadow: "0 18px 48px rgba(0, 0, 0, 0.28)",
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          setSelectMode(true);
                          setSelectedIds(new Set());
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm"
                      >
                        <ListChecks size={16} strokeWidth={1.8} />
                        {copy.selectMessages}
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void handleToggleMute()}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm"
                      >
                        <BellOff size={16} strokeWidth={1.8} />
                        {mutedAt
                          ? copy.unmuteConversation
                          : copy.muteConversation}
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void handleArchive()}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm"
                      >
                        <EyeOff size={16} strokeWidth={1.8} />
                        {copy.hub.archive}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/*
        The timeline. Centred and capped rather than stretched: on a wide
        monitor a full-width message column produces lines nobody can track
        across, and the margins either side are the point rather than waste.
      */}
      <section
        ref={timelineRef}
        onScroll={handleTimelineScroll}
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-8 sm:py-8">
          {loading && (
            <div className="flex h-full items-center justify-center py-20">
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--msg-ink-soft)" }}
              >
                <Spinner />
                <span>{copy.loadingMessages}</span>
              </div>
            </div>
          )}

          {!loading && errorMessage && (
            <div
              role="alert"
              className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-500"
            >
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && messages.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="max-w-sm text-center">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border"
                  style={{
                    background: "var(--msg-surface)",
                    borderColor: "var(--msg-line)",
                    color: "var(--msg-ink-soft)",
                  }}
                >
                  <ShieldCheck size={20} strokeWidth={1.7} />
                </div>
                <h2 className="mt-4 text-base font-semibold">
                  {copy.startConversationTitle}
                </h2>
                <p
                  className="mt-1.5 text-sm leading-6"
                  style={{ color: "var(--msg-ink-soft)" }}
                >
                  {copy.startConversationDescription}
                </p>
                <p
                  className="mt-3 text-[11px] leading-5"
                  style={{ color: "var(--msg-ink-faint)" }}
                >
                  {copy.room.privateNote}
                </p>
              </div>
            </div>
          )}

          {!loading &&
            messages.map((message, index) => {
              const isMine = message.sender_id === currentUserId;
              const showDateDivider = shouldShowDateDivider(messages, index);
              const wordCard = decodeWordCardMessage(message.body);
              const newsCard = wordCard
                ? null
                : decodeNewsCardMessage(message.body);

              const analysis = analysisByMessageId.get(message.id);
              const hasDecode =
                !isMine &&
                analysis?.status === "ready" &&
                analysis.phrases.length > 0;
              const decodeOpen = hasDecode && openDecodeId === message.id;

              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="flex justify-center py-5">
                      <span
                        className="rounded-full border px-3 py-1 text-[11px] font-medium"
                        style={{
                          borderColor: "var(--msg-line)",
                          color: "var(--msg-ink-soft)",
                        }}
                      >
                        {formatDateLabel(
                          message.created_at,
                          copy.today,
                          copy.yesterday,
                        )}
                      </span>
                    </div>
                  )}

                  <div
                    onClick={() => {
                      if (selectMode && isMine) toggleSelected(message.id);
                    }}
                    className={`mb-2.5 flex items-center gap-2 ${
                      isMine ? "justify-end" : "justify-start"
                    } ${selectMode && !isMine ? "opacity-40" : ""} ${
                      selectMode && isMine ? "cursor-pointer" : ""
                    }`}
                  >
                    {selectMode && isMine && (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                        style={
                          selectedIds.has(message.id)
                            ? {
                                background: "var(--msg-accent)",
                                borderColor: "var(--msg-accent)",
                                color: "var(--msg-accent-ink)",
                              }
                            : {
                                borderColor: "var(--msg-line)",
                                color: "transparent",
                              }
                        }
                      >
                        <CheckMark size={11} strokeWidth={2.5} />
                      </span>
                    )}

                    {newsCard ? (
                      <NewsCardMessage
                        card={newsCard}
                        createdAt={message.created_at}
                      />
                    ) : wordCard ? (
                      <WordCardMessage
                        card={wordCard}
                        createdAt={message.created_at}
                        isLearningChinese={isLearningChinese}
                        t={t}
                        saved={savedCardIds.has(message.id)}
                        saving={savingCardId === message.id}
                        onSave={() => void handleSaveCard(message.id, wordCard)}
                        onShare={() => shareCard(wordCard)}
                      />
                    ) : (
                      /*
                       * Bubbles get more room inside and less of the screen
                       * across: 78–84% of the column on a phone, 62–68% on a
                       * desktop. A wider page must not become a wider bubble,
                       * or the redesign just produces very long lines.
                       */
                      <article
                        className="max-w-[82%] rounded-[20px] px-4 py-3 sm:max-w-[66%] sm:px-[18px]"
                        style={
                          isMine
                            ? {
                                background: "var(--msg-bubble-out)",
                                color: "var(--msg-bubble-out-ink)",
                                borderBottomRightRadius: 6,
                              }
                            : {
                                background: "var(--msg-bubble-in)",
                                color: "var(--msg-bubble-in-ink)",
                                border: "1px solid var(--msg-bubble-in-line)",
                                borderBottomLeftRadius: 6,
                              }
                        }
                      >
                        {hasDecode && analysis ? (
                          <HighlightedMessageBody
                            body={message.body}
                            phrases={analysis.phrases}
                            onSelectPhrase={() => setOpenDecodeId(message.id)}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.55]">
                            {message.body}
                          </p>
                        )}
                        <div
                          className="mt-1.5 flex items-center justify-end gap-1 text-[10px]"
                          style={{
                            color: isMine
                              ? "var(--msg-bubble-out-meta)"
                              : "var(--msg-ink-faint)",
                          }}
                        >
                          <time dateTime={message.created_at}>
                            {formatMessageTime(message.created_at)}
                          </time>
                          {isMine &&
                            (() => {
                              const status = getReceiptStatus(
                                receiptsByMessageId.get(message.id),
                              );
                              const label =
                                status === "read"
                                  ? copy.statusRead
                                  : status === "delivered"
                                    ? copy.statusDelivered
                                    : copy.statusSent;
                              return (
                                <MessageStatusIcon
                                  status={status}
                                  label={label}
                                />
                              );
                            })()}
                        </div>
                      </article>
                    )}
                  </div>

                  {/*
                    The Decode card, inline under the message it explains and
                    wider than the bubble above it — §19. Only for the friend's
                    messages, only when Yumi actually found something, and only
                    while the reader has asked for it.
                  */}
                  {hasDecode && analysis && !selectMode && (
                    <div className="mb-4 flex justify-start">
                      {decodeOpen ? (
                        <YumiDecodeCard
                          analysis={analysis}
                          conversationId={conversationId}
                          speechLanguage={isLearningChinese ? "zh-TW" : "en-US"}
                          savedPhraseIds={savedPhraseIds}
                          savingPhraseId={savingPhraseId}
                          onSavePhrase={(phrase) => void handleSavePhrase(phrase)}
                          onInsertReply={handleInsertReply}
                          onClose={() => setOpenDecodeId(null)}
                        />
                      ) : (
                        /*
                          Closed, the offer is one quiet line. §18 asks for a
                          conversation that still reads as a conversation, and a
                          card that opens itself under every message would be
                          the opposite of that.
                        */
                        <button
                          type="button"
                          onClick={() => setOpenDecodeId(message.id)}
                          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium"
                          style={{
                            borderColor: "var(--msg-line)",
                            color: "var(--msg-accent)",
                            background: "var(--msg-accent-soft)",
                          }}
                        >
                          <Sparkles size={13} strokeWidth={1.9} />
                          {copy.decode.open}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          {friendIsTyping && (
            <div className="flex items-end gap-2">
              <div
                className="flex items-center gap-1 rounded-[20px] px-4 py-3"
                style={{
                  background: "var(--msg-bubble-in)",
                  border: "1px solid var(--msg-bubble-in-line)",
                  borderBottomLeftRadius: 6,
                }}
              >
                <span className="sr-only">
                  {copy.typingIndicator.replace("{name}", friendName)}
                </span>
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]"
                  style={{ background: "var(--msg-ink-faint)" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]"
                  style={{ background: "var(--msg-ink-faint)" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full"
                  style={{ background: "var(--msg-ink-faint)" }}
                />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </section>

      {/*
        Composer. Wider and calmer than the sidebar version, with an explicit
        send button on every platform — Enter-to-send is a shortcut, not a
        thing anyone should have to discover.
      */}
      {/*
        The bottom padding is the dock, and it differs by breakpoint because
        the dock does. On a phone ProtectedNav hides itself inside a
        conversation, so there is nothing to clear and the composer sits on the
        safe area. From `sm` up the dock stays — subdued, but still fixed at
        bottom-0 and above this in the stacking order — so the composer has to
        step up over it or the send button ends up underneath.

        5.625rem is BottomNavigation measured rather than guessed: p-2 around a
        52px row plus 0.625rem of its own bottom padding is 78px, plus a 12px
        gap. The arithmetic is upstream's, from the commit that stopped the
        composer floating 38px above the dock.
      */}
      <div
        className="relative z-30 shrink-0 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:pb-[calc(5.625rem+env(safe-area-inset-bottom))]"
        style={{
          background: "var(--msg-header)",
          borderColor: "var(--msg-line)",
        }}
      >
        {/*
          Floats just above the composer, which is where the eye already is
          when a message arrives. Never shown while the reader is at the live
          edge, because then there is nothing to jump to.
        */}
        {(hasUnseenBelow || (!isNearBottom && messages.length > 0)) && (
          <div className="pointer-events-none absolute -top-14 left-0 right-0 flex justify-center">
            <button
              type="button"
              onClick={() => scrollToBottom()}
              className="pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold shadow-lg"
              style={{
                background: hasUnseenBelow
                  ? "var(--msg-accent)"
                  : "var(--msg-surface)",
                borderColor: hasUnseenBelow
                  ? "var(--msg-accent)"
                  : "var(--msg-line)",
                color: hasUnseenBelow
                  ? "var(--msg-accent-ink)"
                  : "var(--msg-ink-soft)",
              }}
            >
              <ArrowDown size={15} strokeWidth={2} />
              {hasUnseenBelow ? copy.room.newMessages : copy.room.jumpToLatest}
            </button>
          </div>
        )}

        <div className="mx-auto w-full max-w-[1100px] px-4 pt-2.5 sm:px-8">
          {selectMode ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={selectedIds.size === 0}
              className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-semibold text-white transition disabled:opacity-40"
            >
              <Trash2 size={16} strokeWidth={1.8} />
              {selectedIds.size === 1
                ? copy.deleteSelectedMessage.replace("{count}", "1")
                : copy.deleteSelectedMessages.replace(
                    "{count}",
                    String(selectedIds.size),
                  )}
            </button>
          ) : (
            <form onSubmit={sendMessage} className="pb-3">
              <div
                className="flex items-end gap-2 rounded-[26px] border p-1.5"
                style={{
                  background: "var(--msg-surface)",
                  borderColor: "var(--msg-line)",
                }}
              >
                <Link
                  href={
                    friend
                      ? `/capture?source=library&with=${encodeURIComponent(friend.id)}`
                      : "/capture?source=library"
                  }
                  aria-label={copy.room.addPhoto}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{ color: "var(--msg-ink-soft)" }}
                >
                  <Plus size={20} strokeWidth={1.9} aria-hidden="true" />
                </Link>

                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleComposerChange}
                  onKeyDown={handleComposerKeyDown}
                  rows={1}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder={copy.inputPlaceholder}
                  aria-label={copy.inputPlaceholder}
                  className="min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-[16px] leading-6 outline-none"
                  style={{ color: "var(--msg-ink)" }}
                />

                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label={copy.room.sendMessage}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-150"
                  style={
                    canSend
                      ? {
                          background: "var(--msg-accent)",
                          color: "var(--msg-accent-ink)",
                        }
                      : {
                          background: "var(--msg-surface-soft)",
                          color: "var(--msg-ink-faint)",
                        }
                  }
                >
                  {sending ? <Spinner /> : <Send size={17} strokeWidth={1.9} />}
                </button>
              </div>

              {/*
                Nothing under the composer unless there is something to say.
                The keyboard hint that used to live here named a key the phone
                this screen is built for does not have, and reserving a band
                for it cost vertical space on the screen with the least of it.
                The counter only appears near the 2000-character limit, so the
                row it sits in appears with it.
              */}
              {showCharacterCount && (
                <div className="flex justify-end px-3 pt-1.5">
                  <span
                    className="text-[10px]"
                    style={{
                      color:
                        newMessage.length >= MAX_MESSAGE_LENGTH
                          ? "#ef4444"
                          : "var(--msg-ink-faint)",
                    }}
                  >
                    {newMessage.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {deleteMotion.rendered && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label={copy.closeDeleteConfirmation}
            onClick={deleteMotion.requestClose}
            disabled={deleting}
            className={`absolute inset-0 bg-black/50 ${deleteMotion.backdropClassName}`}
            {...deleteMotion.backdropProps}
          />

          <div
            role="dialog"
            aria-modal="true"
            {...deleteMotion.panelProps}
            className={`${deleteMotion.panelClassName} relative z-10 w-full max-w-sm rounded-t-[28px] p-5 sm:rounded-[28px]`}
            style={{
              background: "var(--msg-surface)",
              color: "var(--msg-ink)",
            }}
          >
            <div
              className={`${deleteMotion.handleClassName} -mx-5 -mt-5 flex h-9 items-center justify-center sm:hidden`}
              {...deleteMotion.handleProps}
            >
              <span
                className="h-1 w-10 rounded-full"
                style={{ background: "var(--msg-line)" }}
              />
            </div>

            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">
                {selectedIds.size === 1
                  ? copy.deleteDialogMessage.replace("{count}", "1")
                  : copy.deleteDialogMessages.replace(
                      "{count}",
                      String(selectedIds.size),
                    )}
              </h2>
              <button
                type="button"
                onClick={deleteMotion.requestClose}
                disabled={deleting}
                aria-label={copy.closeDeleteConfirmation}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
                style={{
                  background: "var(--msg-surface-soft)",
                  color: "var(--msg-ink-soft)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--msg-ink-soft)" }}
            >
              {copy.deleteDialogDescription}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={deleteMotion.requestClose}
                disabled={deleting}
                className="flex-1 rounded-2xl border py-3 text-sm font-semibold disabled:opacity-50"
                style={{ borderColor: "var(--msg-line)" }}
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteSelected()}
                disabled={deleting}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? copy.deleting : copy.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {friendPickerItem && (
        <FriendPickerModal
          friends={pickerFriends}
          loading={friendsLoading}
          errorMessage={friendsError}
          sendingFriendId={sendingFriendId}
          onClose={handleClosePicker}
          onPick={handlePickFriend}
          onRetry={() => void loadFriends()}
        />
      )}
    </main>
  );
}
