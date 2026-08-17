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

import { Bookmark, Check as CheckMark, ListChecks, Plus, Send, Trash2, Volume2, X } from "lucide-react";

import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";

import { getProfileById, getOrCreateConversationWithFriend, markConversationRead, type FriendProfile } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { notifyPushEvent } from "@/lib/push/eventsClient";
import { insertVocabulary } from "@/lib/vocabulary/repository";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
import { decodeWordCardMessage, encodeWordCardMessage, type SharedWordCard } from "@/lib/messages/wordCard";
import { getPendingSharedVocabulary, clearPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import { decodeNewsCardMessage } from "@/lib/messages/newsCard";
import { hideMessagesForUser, listHiddenMessageIds } from "@/lib/messages/hiddenMessages";
import {
  fetchReceiptsForMessages,
  getReceiptStatus,
  markMessagesRead,
  type MessageReceiptInfo,
  type MessageReceiptStatus,
} from "@/lib/messages/receipts";
import { getPronunciationData } from "@/lib/pronunciation";
import { speak } from "@/lib/speech";
import { insertValues } from "@/lib/utils";
import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import OrbitIconButton from "@/components/foundation/buttons/OrbitIconButton";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";

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
 * Clears the floating dock, which is measurable rather than guessed:
 * BottomNavigation is p-2 around a 52px row, then 0.625rem of its own bottom
 * padding — 8 + 52 + 8 + 10 = 78px — and the safe-area inset is added by both
 * it and the composer separately, so it is not part of this number.
 *
 * 5.625rem is that 78px plus a 12px gap. It was 7.25rem, which left a 38px
 * band of empty surface between the composer and the dock on every phone.
 */
const MOBILE_NAV_OFFSET = "5.625rem";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M12 3.5l7 3v5.2c0 4.3-2.8 7.4-7 8.8-4.2-1.4-7-4.5-7-8.8V6.5l7-3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12l1.7 1.7 3.5-3.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5" aria-hidden="true">
      <path d="M5 12h13M13 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Exchange Notes' own status glyph, not a copy of other apps' checkmarks:
// a single line once it's on the server, a double line once the friend's
// device has it, and a softly pulsing gold double line once they've read it.
function MessageStatusIcon({ status, label }: { status: MessageReceiptStatus; label: string }) {
  if (status === "sent") {
    return (
      <span title={label} aria-label={label} className="inline-flex">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M5 12.5l3.5 3.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  const isRead = status === "read";

  return (
    <span title={label} aria-label={label} className={`inline-flex ${isRead ? "text-[var(--accent-amber)]" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
        <path d="M2 12.5l3.5 3.5L13 8.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12.5l3.5 3.5L20 8.5" strokeLinecap="round" strokeLinejoin="round" className={isRead ? "animate-pulse" : ""} />
      </svg>
    </span>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDateLabel(value: string, todayLabel: string, yesterdayLabel: string) {
  const date = new Date(value);
  const today = new Date();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (isSameDay(date, today)) return todayLabel;
  if (isSameDay(date, yesterday)) return yesterdayLabel;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
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

type ConversationThreadProps = {
  friendId: string;
};

export default function ConversationThread({ friendId }: ConversationThreadProps) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useTranslation();
  const { isLearningChinese } = useLearningLanguageContext();
  const copy = t.messages;

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friend, setFriend] = useState<FriendProfile | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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

  const [savedCardIds, setSavedCardIds] = useState<Set<number>>(new Set());
  const [savingCardId, setSavingCardId] = useState<number | null>(null);

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
   * page has always used — this screen just becomes another place a card can
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
  const [receiptsByMessageId, setReceiptsByMessageId] = useState<Map<number, MessageReceiptInfo>>(new Map());

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const maximumHeight = 120;
    const nextHeight = Math.min(textarea.scrollHeight, maximumHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maximumHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [newMessage, resizeTextarea]);

  useEffect(() => {
    let cancelled = false;

    async function initializeChat() {
      setLoading(true);
      setErrorMessage("");
      setMessages([]);
      setConversationId(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userError || !user) {
        setErrorMessage("You are not logged in.");
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      try {
        const [friendProfile, roomId] = await Promise.all([
          getProfileById(supabase, friendId),
          getOrCreateConversationWithFriend(supabase, user.id, friendId),
        ]);

        if (cancelled) return;

        setFriend(friendProfile);
        setConversationId(roomId);

        // Best-effort: resets this conversation's unread badge. Non-fatal
        // if it fails (e.g. an RLS policy gap) — the thread should still
        // open normally either way.
        markConversationRead(supabase, user.id, roomId).catch((markError) => {
          console.warn("Could not mark conversation as read:", markError);
        });

        const [{ data: existingMessages, error: messagesError }, hiddenIds] = await Promise.all([
          supabase
            .from("messages")
            .select("id, conversation_id, sender_id, body, created_at")
            .eq("conversation_id", roomId)
            .order("created_at", { ascending: true })
            .limit(500),
          listHiddenMessageIds(supabase, user.id),
        ]);

        if (cancelled) return;

        if (messagesError) {
          setErrorMessage(messagesError.message);
          setLoading(false);
          return;
        }

        const visibleMessages = (existingMessages ?? []).filter((message) => !hiddenIds.has(message.id));
        setMessages(visibleMessages);
        setLoading(false);

        window.requestAnimationFrame(() => {
          scrollToBottom("auto");
        });

        const ownMessageIds = visibleMessages
          .filter((message) => message.sender_id === user.id)
          .map((message) => message.id);
        const friendMessageIds = visibleMessages
          .filter((message) => message.sender_id !== user.id)
          .map((message) => message.id);

        // Best-effort, non-fatal: read receipts are a nice-to-have overlay
        // on top of the message list, not something that should block the
        // conversation from opening if either call fails.
        fetchReceiptsForMessages(supabase, ownMessageIds)
          .then((receipts) => {
            if (!cancelled) setReceiptsByMessageId(receipts);
          })
          .catch((receiptsError) => {
            console.warn("Could not load read receipts:", receiptsError);
          });

        markMessagesRead(supabase, user.id, friendMessageIds).catch((readError) => {
          console.warn("Could not mark messages as read:", readError);
        });
      } catch (error) {
        if (cancelled) return;
        // Never show the raw error (DB/network details) to the user — log
        // it for debugging and show friendly, translated copy instead.
        console.error(error);
        setErrorMessage(copy.errors.openConversation);
        setLoading(false);
      }
    }

    void initializeChat();

    return () => {
      cancelled = true;
    };
  }, [friendId, scrollToBottom, supabase, copy.errors.openConversation]);

  /**
   * Derived rather than stored: "connecting" is simply the absence of a
   * reported outcome for the conversation currently open, so it does not need
   * to be assigned when the subscription starts.
   */
  const realtimeStatus: RealtimeStatus =
    conversationId && channelState?.conversationId === conversationId
      ? channelState.status
      : "connecting";

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const incomingMessage = payload.new as Message;
          setMessages((currentMessages) => {
            const alreadyExists = currentMessages.some((message) => message.id === incomingMessage.id);
            if (alreadyExists) return currentMessages;
            return [...currentMessages, incomingMessage];
          });

          // The thread is open, so a message that just arrived from the
          // friend is immediately both delivered and read.
          if (currentUserId && incomingMessage.sender_id !== currentUserId) {
            markMessagesRead(supabase, currentUserId, [incomingMessage.id]).catch((readError) => {
              console.warn("Could not mark incoming message as read:", readError);
            });
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setChannelState({ conversationId, status: "connected" });
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setChannelState({ conversationId, status: "disconnected" });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  // Listens for the friend's receipt writes on OUR sent messages (they
  // opened the thread, or their client marked something delivered) so our
  // own bubbles' status glyphs update live, without polling.
  useEffect(() => {
    if (!conversationId || !friendId) return;

    const channel = supabase
      .channel(`message-receipts:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_receipts", filter: `user_id=eq.${friendId}` },
        (payload) => {
          const row = payload.new as { message_id: number; delivered_at: string | null; read_at: string | null } | null;
          if (!row) return;

          const belongsToThisThread = messagesRef.current.some(
            (message) => message.id === row.message_id && message.sender_id === currentUserId,
          );
          if (!belongsToThisThread) return;

          setReceiptsByMessageId((current) => {
            const next = new Map(current);
            next.set(row.message_id, { deliveredAt: row.delivered_at, readAt: row.read_at });
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, friendId, currentUserId, supabase]);

  // Ephemeral "is typing" presence: broadcast-only, never written to the
  // database. Listens for the other participant's broadcast events and
  // shows a transient indicator that auto-clears after a short silence.
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

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

  useEffect(() => {
    if (messages.length === 0) return;
    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!friendIsTyping) return;
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
  // hooks/useVocabularyFriendPicker.ts, which stashes it in sessionStorage
  // and navigates here). Sends it as a real word-card message as soon as
  // this thread is ready, then clears the queue so it can never resend on
  // a later visit to a different conversation.
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const pendingVocabulary = getPendingSharedVocabulary();
    if (!pendingVocabulary) return;

    clearPendingSharedVocabulary();

    const cardBody = encodeWordCardMessage(pendingVocabulary);

    void (async () => {
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: currentUserId, body: cardBody })
        .select("id, conversation_id, sender_id, body, created_at")
        .single();

      if (error) {
        setErrorMessage(copy.errors.shareWord);
        return;
      }

      void notifyPushEvent({
        kind: "message",
        messageId: data.id,
      });

      setMessages((currentMessages) => {
        const alreadyExists = currentMessages.some((message) => message.id === data.id);
        return alreadyExists ? currentMessages : [...currentMessages, data];
      });
    })();
  }, [conversationId, currentUserId, supabase, copy.errors.shareWord]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const messageBody = newMessage.trim();
    if (!messageBody || !conversationId || !currentUserId || sending) return;

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
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body: messageBody })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (error) {
      setErrorMessage("Message could not be sent. Please try again.");
      setSending(false);
      return;
    }

    void notifyPushEvent({
      kind: "message",
      messageId: data.id,
    });

    setMessages((currentMessages) => {
      const alreadyExists = currentMessages.some((message) => message.id === data.id);
      return alreadyExists ? currentMessages : [...currentMessages, data];
    });

    setNewMessage("");
    setSending(false);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function handleComposerChange(event: FormEvent<HTMLTextAreaElement> & { target: HTMLTextAreaElement }) {
    const value = event.target.value;
    setNewMessage(value);

    const channel = typingChannelRef.current;
    if (!channel || !currentUserId) return;

    if (value.trim().length === 0) {
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      void channel.send({ type: "broadcast", event: "stopped-typing", payload: { userId: currentUserId } });
      return;
    }

    void channel.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId } });

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }
    typingStopTimeoutRef.current = setTimeout(() => {
      void channel.send({ type: "broadcast", event: "stopped-typing", payload: { userId: currentUserId } });
    }, 2500);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function handleSaveCard(messageId: number, card: SharedWordCard) {
    if (!currentUserId || savingCardId !== null || savedCardIds.has(messageId)) return;

    setSavingCardId(messageId);

    try {
      await insertVocabulary({
        user_id: currentUserId,
        word: card.word.trim(),
        translation: card.translation.trim(),
        language: "english",
        part_of_speech: card.partOfSpeech?.trim() || null,
        example_sentence: card.englishExample?.trim() || null,
        translated_example: card.chineseExample?.trim() || null,
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

  const ownMessageIds = messages.filter((message) => message.sender_id === currentUserId).map((message) => message.id);

  function startSelectMode() {
    setSelectMode(true);
    setSelectedIds(new Set());
  }

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

  function selectAllOwnMessages() {
    setSelectedIds(new Set(ownMessageIds));
  }

  async function handleDeleteSelected() {
    if (!currentUserId || selectedIds.size === 0) return;

    setDeleting(true);
    setErrorMessage("");

    const idsToDelete = Array.from(selectedIds);

    try {
      await hideMessagesForUser(supabase, currentUserId, idsToDelete);

      setMessages((current) => current.filter((message) => !selectedIds.has(message.id)));
      setConfirmOpen(false);
      exitSelectMode();
    } catch (error) {
      console.error(error);
      setErrorMessage(copy.errors.deleteSelected);
    } finally {
      setDeleting(false);
    }
  }

  const canSend = Boolean(newMessage.trim()) && Boolean(conversationId) && Boolean(currentUserId) && !sending;

  const friendName = friend?.displayName ?? friend?.exchangeId ?? "…";
  const friendInitial = friendName.charAt(0).toUpperCase();

  return (
    <main className="h-[100dvh] overflow-hidden bg-surface text-neutral-950">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col">
        <header className="z-20 shrink-0 border-b border-black/[0.06] bg-surface/90 px-4 backdrop-blur-xl">
          {selectMode ? (
            <div className="flex min-h-[68px] items-center justify-between gap-3" style={{ paddingTop: "env(safe-area-inset-top)" }}>
              <button type="button" onClick={exitSelectMode} className="text-sm font-medium text-neutral-600">
                {copy.cancel}
              </button>

              <span className="text-sm font-semibold">
                {selectedIds.size > 0 ? copy.selectedCount.replace("{count}", String(selectedIds.size)) : copy.selectMessages}
              </span>

              <button type="button" onClick={selectAllOwnMessages} className="text-sm font-medium text-neutral-600">
                {copy.selectAll}
              </button>
            </div>
          ) : (
            <div className="flex min-h-[68px] items-center gap-3" style={{ paddingTop: "env(safe-area-inset-top)" }}>
              <Link href="/messages" aria-label="Back" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-black/[0.04] active:bg-black/[0.07]">
                <BackIcon />
              </Link>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-sm font-bold text-[var(--success)]">
                  {friendInitial}
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-[17px] font-semibold tracking-[-0.015em]">{friendName}</h1>

                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-soft">
                    <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === "connected" ? "bg-emerald-500" : realtimeStatus === "connecting" ? "bg-amber-400" : "bg-neutral-300"}`} />
                    <span>{realtimeStatus === "connected" ? "Connected" : realtimeStatus === "connecting" ? "Connecting" : "Offline"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-neutral-600" title="Protected by authentication and database access controls. End-to-end encryption is not yet enabled.">
                <ShieldIcon />
                <span className="hidden min-[390px]:inline">Private</span>
              </div>

              <button
                type="button"
                onClick={startSelectMode}
                aria-label={copy.selectMessages}
                title={copy.selectMessages}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-black/[0.04] active:bg-black/[0.07]"
              >
                <ListChecks size={19} strokeWidth={1.8} />
              </button>
            </div>
          )}
        </header>

        <section aria-live="polite" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5" style={{ paddingBottom: "1.5rem" }}>
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <Spinner />
                <span>{copy.loadingMessages}</span>
              </div>
            </div>
          )}

          {!loading && errorMessage && (
            <div role="alert" className="mx-auto max-w-sm rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-xs text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] text-neutral-600">
                  <ShieldIcon />
                </div>
                <h2 className="mt-4 text-base font-semibold">{copy.startConversationTitle}</h2>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">{copy.startConversationDescription}</p>
                <p className="mt-3 text-[11px] leading-5 text-ink-faint">
                  Messages are protected by your account and database access rules. End-to-end encryption is not yet enabled.
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

              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="flex justify-center py-4">
                      <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium text-ink-soft">
                        {formatDateLabel(message.created_at, copy.today, copy.yesterday)}
                      </span>
                    </div>
                  )}

                  <div
                    onClick={() => {
                      if (selectMode && isMine) toggleSelected(message.id);
                    }}
                    className={`mb-2 flex items-center gap-2 ${isMine ? "justify-end" : "justify-start"} ${selectMode && !isMine ? "opacity-40" : ""} ${selectMode && isMine ? "cursor-pointer" : ""}`}
                  >
                    {selectMode && isMine && (
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selectedIds.has(message.id) ? "border-black bg-black text-white" : "border-black/20 bg-white text-transparent"}`}>
                        <CheckMark size={11} strokeWidth={2.5} />
                      </span>
                    )}

                    {newsCard ? (() => {
                      const titlePronunciation = getPronunciationData({ chinese: newsCard.chineseTitle });
                      const summaryPronunciation = getPronunciationData({ chinese: newsCard.chineseSummary });

                      return (
                        <article className="w-full max-w-[320px] rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-sm">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                            📰 News
                          </span>

                          <div className="mt-1.5 flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 text-[16px] font-bold leading-[1.3] text-black">{newsCard.englishTitle}</p>
                            <button type="button" onClick={() => speak(newsCard.englishTitle, "en-US")} aria-label="Play English title" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-black/60">
                              <Volume2 size={13} strokeWidth={1.8} />
                            </button>
                          </div>

                          <div className="mt-1 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-medium leading-[1.5] text-black/70">{newsCard.chineseTitle}</p>
                              {(titlePronunciation.pinyin || titlePronunciation.zhuyin) && (
                                <p className="mt-0.5 text-[10px] leading-4 text-black/40">
                                  {[titlePronunciation.pinyin, titlePronunciation.zhuyin].filter(Boolean).join("  ")}
                                </p>
                              )}
                            </div>
                            <button type="button" onClick={() => speak(newsCard.chineseTitle, "zh-TW")} aria-label="播放中文標題" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-black/60">
                              <Volume2 size={13} strokeWidth={1.8} />
                            </button>
                          </div>

                          <div className="mt-3 space-y-2 border-t border-black/[0.06] pt-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 text-xs leading-5 text-black/75">{newsCard.englishSummary}</p>
                              <button type="button" onClick={() => speak(newsCard.englishSummary, "en-US")} aria-label="Play English summary" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black/60">
                                <Volume2 size={13} strokeWidth={1.8} />
                              </button>
                            </div>

                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs leading-5 text-black/45">{newsCard.chineseSummary}</p>
                                {(summaryPronunciation.pinyin || summaryPronunciation.zhuyin) && (
                                  <p className="mt-0.5 text-[10px] leading-4 text-ink-faint">
                                    {[summaryPronunciation.pinyin, summaryPronunciation.zhuyin].filter(Boolean).join("  ")}
                                  </p>
                                )}
                              </div>
                              <button type="button" onClick={() => speak(newsCard.chineseSummary, "zh-TW")} aria-label="播放中文摘要" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black/60">
                                <Volume2 size={13} strokeWidth={1.8} />
                              </button>
                            </div>
                          </div>

                          {newsCard.vocabulary.length > 0 && (
                            <div className="mt-3 border-t border-black/[0.06] pt-3">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Vocabulary / 學習單字</span>

                              <div className="mt-1.5 space-y-1.5">
                                {newsCard.vocabulary.map((item, index) => {
                                  const wordPronunciation = getPronunciationData({ english: item.word, chinese: item.translation });

                                  return (
                                    <div key={`${item.word}-${index}`} className="rounded-xl bg-surface p-2.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="min-w-0 truncate text-xs font-semibold text-black">{item.word}</p>
                                        <button type="button" onClick={() => speak(item.word, "en-US")} aria-label="Play English word" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black/60">
                                          <Volume2 size={11} strokeWidth={1.8} />
                                        </button>
                                      </div>
                                      <div className="mt-0.5 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="truncate text-xs text-black/60">{item.translation}</p>
                                          {(wordPronunciation.pinyin || wordPronunciation.zhuyin) && (
                                            <p className="text-[10px] text-ink-faint">
                                              {[wordPronunciation.pinyin, wordPronunciation.zhuyin].filter(Boolean).join("  ")}
                                            </p>
                                          )}
                                        </div>
                                        <button type="button" onClick={() => speak(item.translation, "zh-TW")} aria-label="播放中文單字" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black/60">
                                          <Volume2 size={11} strokeWidth={1.8} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/[0.06] pt-2.5">
                            {newsCard.sourceUrl ? (
                              <a
                                href={newsCard.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-0 truncate text-[10px] text-black/40 underline"
                              >
                                {newsCard.sourceName || newsCard.sourceUrl}
                              </a>
                            ) : (
                              <span className="min-w-0 truncate text-[10px] text-black/40">{newsCard.sourceName}</span>
                            )}
                            <time dateTime={message.created_at} className="shrink-0 text-[10px] text-ink-faint">{formatMessageTime(message.created_at)}</time>
                          </div>
                        </article>
                      );
                    })() : wordCard ? (() => {
                      const pronunciation = getPronunciationData({ english: wordCard.word, chinese: wordCard.translation });

                      const englishIsPrimary = !isLearningChinese;
                      const primaryWordClass = "min-w-0 truncate text-xl font-bold text-black";
                      const secondaryWordClass = "min-w-0 truncate text-base font-normal text-black/45";
                      const primarySpeakerClass = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white";
                      const secondarySpeakerClass = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-black/60";

                      const englishBlock = (
                        <div key="english">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">English</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className={englishIsPrimary ? primaryWordClass : secondaryWordClass}>{wordCard.word}</p>
                            <button
                              type="button"
                              onClick={() => speak(wordCard.word, "en-US")}
                              aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, { text: wordCard.word })}
                              className={englishIsPrimary ? primarySpeakerClass : secondarySpeakerClass}
                            >
                              <Volume2 size={15} strokeWidth={1.8} />
                            </button>
                          </div>
                        </div>
                      );

                      const chineseBlock = (
                        <div key="chinese">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">中文</span>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className={englishIsPrimary ? secondaryWordClass : primaryWordClass}>{wordCard.translation}</p>
                            <button
                              type="button"
                              onClick={() => speak(wordCard.translation, "zh-TW")}
                              aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, { text: wordCard.translation })}
                              className={englishIsPrimary ? secondarySpeakerClass : primarySpeakerClass}
                            >
                              <Volume2 size={15} strokeWidth={1.8} />
                            </button>
                          </div>
                          {(pronunciation.pinyin || pronunciation.zhuyin) && (
                            <p className="mt-0.5 text-xs text-black/40">
                              {[pronunciation.pinyin, pronunciation.zhuyin].filter(Boolean).join("  ")}
                            </p>
                          )}
                        </div>
                      );

                      const [firstBlock, secondBlock] = isLearningChinese
                        ? [chineseBlock, englishBlock]
                        : [englishBlock, chineseBlock];

                      const [firstExample, secondExample] = isLearningChinese
                        ? [wordCard.chineseExample, wordCard.englishExample]
                        : [wordCard.englishExample, wordCard.chineseExample];
                      const firstExampleLang = isLearningChinese ? "zh-TW" : "en-US";
                      const secondExampleLang = isLearningChinese ? "en-US" : "zh-TW";
                      const firstExampleClass = isLearningChinese ? "text-black/45" : "text-black/75";
                      const secondExampleClass = isLearningChinese ? "text-black/75" : "text-black/45";

                      return (
                      <article className="w-full max-w-[300px] rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-sm">
                        {firstBlock}
                        <div className="mt-3 border-t border-black/[0.06] pt-3">
                          {secondBlock}
                        </div>

                        {wordCard.partOfSpeech && (
                          <p className="mt-2 text-xs text-black/40">
                            {t.vocabulary.detail.partOfSpeech[
                              normalizePartOfSpeech(wordCard.partOfSpeech)
                            ]}
                          </p>
                        )}
                        {(firstExample || secondExample) && (
                          <div className="mt-2.5 space-y-1.5">
                            {firstExample && (
                              <div className="flex items-center justify-between gap-2 rounded-xl bg-surface p-2.5">
                                <p className={`min-w-0 text-xs leading-5 ${firstExampleClass}`}>{firstExample}</p>
                                <button
                                  type="button"
                                  onClick={() => speak(firstExample as string, firstExampleLang)}
                                  aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, { text: firstExample as string })}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black/60"
                                >
                                  <Volume2 size={13} strokeWidth={1.8} />
                                </button>
                              </div>
                            )}
                            {secondExample && (
                              <div className="flex items-center justify-between gap-2 rounded-xl bg-surface p-2.5">
                                <p className={`min-w-0 text-xs leading-5 ${secondExampleClass}`}>{secondExample}</p>
                                <button
                                  type="button"
                                  onClick={() => speak(secondExample as string, secondExampleLang)}
                                  aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, { text: secondExample as string })}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black/60"
                                >
                                  <Volume2 size={13} strokeWidth={1.8} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-2.5 flex items-center justify-between">
                          <time dateTime={message.created_at} className="text-[10px] text-ink-faint">{formatMessageTime(message.created_at)}</time>
                          <div className="flex items-center gap-1.5">
                          {/* Forwarding a card someone sent you is how a good
                              word travels. The picker holds the card itself,
                              so this needs nothing saved first. */}
                          <OrbitIconButton
                            onClick={() => shareCard(wordCard)}
                            aria-label={t.vocabulary.lookup.shareWithFriend}
                            sizeClassName="h-7 w-7"
                          >
                            <Send size={13} strokeWidth={1.9} />
                          </OrbitIconButton>

                          <button
                            type="button"
                            onClick={() => handleSaveCard(message.id, wordCard)}
                            disabled={savingCardId === message.id || savedCardIds.has(message.id)}
                            aria-label={t.capture.result.saveToVocabulary}
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition ${savedCardIds.has(message.id) ? "bg-emerald-100 text-emerald-700" : "bg-black text-white"} disabled:opacity-60`}
                          >
                            {savedCardIds.has(message.id) ? <CheckMark size={13} strokeWidth={2} /> : <Bookmark size={13} strokeWidth={1.8} />}
                          </button>
                          </div>
                        </div>
                      </article>
                      );
                    })() : (
                      <article className={`max-w-[78%] px-4 py-2.5 sm:max-w-[72%] ${isMine ? "rounded-[22px] rounded-br-[6px] bg-neutral-950 text-white" : "rounded-[22px] rounded-bl-[6px] border border-black/[0.04] bg-white text-neutral-950"}`}>
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45]">{message.body}</p>
                        <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isMine ? "text-ink-invert-faint" : "text-ink-faint"}`}>
                          <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
                          {isMine && (() => {
                            const status = getReceiptStatus(receiptsByMessageId.get(message.id));
                            const label =
                              status === "read"
                                ? copy.statusRead
                                : status === "delivered"
                                  ? copy.statusDelivered
                                  : copy.statusSent;
                            return <MessageStatusIcon status={status} label={label} />;
                          })()}
                        </div>
                      </article>
                    )}
                  </div>
                </div>
              );
            })}

          {friendIsTyping && (
            <div className="flex items-end gap-2 px-1">
              <div className="flex items-center gap-1 rounded-[22px] rounded-bl-[6px] border border-black/[0.04] bg-white px-4 py-3">
                <span className="sr-only">
                  {copy.typingIndicator.replace(
                    "{name}",
                    friend?.displayName ?? friend?.exchangeId ?? "",
                  )}
                </span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        <div className="z-30 shrink-0 border-t border-black/[0.05] bg-surface/95 px-3 pt-2 backdrop-blur-xl" style={{ paddingBottom: `calc(${MOBILE_NAV_OFFSET} + env(safe-area-inset-bottom))` }}>
          {selectMode ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={selectedIds.size === 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-semibold text-white transition disabled:opacity-40"
            >
              <Trash2 size={16} strokeWidth={1.8} />
              {selectedIds.size === 1 ? copy.deleteSelectedMessage.replace("{count}", "1") : copy.deleteSelectedMessages.replace("{count}", String(selectedIds.size))}
            </button>
          ) : (
          <form onSubmit={sendMessage}>
            <div className="flex items-end gap-2 rounded-[26px] border border-black/[0.06] bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <Link href={`/capture?source=library&with=${friendId}`} aria-label="Add a photo" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-neutral-900 active:bg-black/[0.07]">
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
                className="min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-[16px] leading-5 text-neutral-950 outline-none placeholder:text-ink-faint"
              />

              <button type="submit" disabled={!canSend} aria-label="Send message" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${canSend ? "bg-neutral-950 text-white active:scale-90" : "bg-black/[0.05] text-neutral-300"}`}>
                {sending ? <Spinner /> : <SendIcon />}
              </button>
            </div>

            {/* The "Shift + Enter for a new line" hint that used to sit here
                was hardcoded English, and on the phone this screen is built
                for there is no Shift key to press. The row now appears only
                when the counter has something to say — near the 2000-character
                limit — instead of reserving height on every render. */}
            {newMessage.length > MAX_MESSAGE_LENGTH * 0.8 && (
              <div className="flex items-center justify-end px-3 pt-1.5">
                <span className={`text-[10px] ${newMessage.length >= MAX_MESSAGE_LENGTH ? "text-red-500" : "text-ink-faint"}`}>
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
            className={`absolute inset-0 bg-black/40 ${deleteMotion.backdropClassName}`}
            {...deleteMotion.backdropProps}
          />

          <div
            role="dialog"
            aria-modal="true"
            {...deleteMotion.panelProps}
            className={`${deleteMotion.panelClassName} relative z-10 w-full max-w-sm rounded-t-[28px] bg-white p-5 sm:rounded-[28px]`}
          >
            <div
              className={`${deleteMotion.handleClassName} -mx-5 -mt-5 flex h-9 items-center justify-center sm:hidden`}
              {...deleteMotion.handleProps}
            >
              <span className="h-1 w-10 rounded-full bg-black/15" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">
                {selectedIds.size === 1 ? copy.deleteDialogMessage.replace("{count}", "1") : copy.deleteDialogMessages.replace("{count}", String(selectedIds.size))}
              </h2>
              <button type="button" onClick={deleteMotion.requestClose} disabled={deleting} aria-label={copy.closeDeleteConfirmation} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/60 disabled:opacity-50">
                <X size={16} />
              </button>
            </div>

            <p className="mt-2 text-sm leading-6 text-black/55">{copy.deleteDialogDescription}</p>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={deleteMotion.requestClose} disabled={deleting} className="flex-1 rounded-2xl border border-black/[0.08] bg-white py-3 text-sm font-semibold disabled:opacity-50">
                {copy.cancel}
              </button>
              <button type="button" onClick={() => void handleDeleteSelected()} disabled={deleting} className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
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
