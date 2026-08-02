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

import { Bookmark, Check as CheckMark, MoreVertical, Trash2, Volume2, X } from "lucide-react";

import { getProfileById, getOrCreateConversationWithFriend, type FriendProfile } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { insertVocabulary } from "@/lib/vocabulary/repository";
import { decodeWordCardMessage, type SharedWordCard } from "@/lib/messages/wordCard";
import { hideMessagesForUser, listHiddenMessageIds } from "@/lib/messages/hiddenMessages";
import { getPronunciationData } from "@/lib/pronunciation";
import { speak } from "@/lib/speech";
import useTranslation from "@/hooks/i18n/useTranslation";

type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type RealtimeStatus = "connecting" | "connected" | "disconnected";

const MAX_MESSAGE_LENGTH = 2000;

const MOBILE_NAV_OFFSET = "7.25rem";

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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M5 12.5l3.5 3.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const copy = t.messages;

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friend, setFriend] = useState<FriendProfile | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");

  const [savedCardIds, setSavedCardIds] = useState<Set<number>>(new Set());
  const [savingCardId, setSavingCardId] = useState<number | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

        setMessages((existingMessages ?? []).filter((message) => !hiddenIds.has(message.id)));
        setLoading(false);

        window.requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Could not open this conversation.");
        setLoading(false);
      }
    }

    void initializeChat();

    return () => {
      cancelled = true;
    };
  }, [friendId, scrollToBottom, supabase]);

  useEffect(() => {
    if (!conversationId) return;

    setRealtimeStatus("connecting");

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
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    if (messages.length === 0) return;
    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const draft = sessionStorage.getItem("exchange-notes-draft-message");
    if (!draft) return;

    setNewMessage(draft);
    sessionStorage.removeItem("exchange-notes-draft-message");

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const messageBody = newMessage.trim();
    if (!messageBody || !conversationId || !currentUserId || sending) return;

    setSending(true);
    setErrorMessage("");

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
      setErrorMessage(error instanceof Error ? error.message : "Could not save this word.");
    } finally {
      setSavingCardId(null);
    }
  }

  const ownMessageIds = messages.filter((message) => message.sender_id === currentUserId).map((message) => message.id);

  function startSelectMode() {
    setMenuOpen(false);
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
      setErrorMessage(error instanceof Error ? error.message : copy.errors.deleteSelected);
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d7ead2] text-sm font-bold text-[#236c32]">
                  {friendInitial}
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-[17px] font-semibold tracking-[-0.015em]">{friendName}</h1>

                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === "connected" ? "bg-emerald-500" : realtimeStatus === "connecting" ? "bg-amber-400" : "bg-neutral-300"}`} />
                    <span>{realtimeStatus === "connected" ? "Connected" : realtimeStatus === "connecting" ? "Connecting" : "Offline"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-neutral-600" title="Protected by authentication and database access controls. End-to-end encryption is not yet enabled.">
                <ShieldIcon />
                <span className="hidden min-[390px]:inline">Private</span>
              </div>

              <div className="relative">
                <button type="button" onClick={() => setMenuOpen((current) => !current)} aria-label="More options" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-black/[0.04] active:bg-black/[0.07]">
                  <MoreVertical size={19} strokeWidth={1.8} />
                </button>

                {menuOpen && (
                  <>
                    <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 cursor-default" />
                    <div className="absolute right-0 top-11 z-40 min-w-[180px] overflow-hidden rounded-2xl border border-black/[0.06] bg-white py-1 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
                      <button type="button" onClick={startSelectMode} className="block w-full px-4 py-3 text-left text-sm font-medium hover:bg-black/[0.04]">
                        {copy.selectMessages}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </header>

        <section aria-live="polite" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5" style={{ paddingBottom: "1.5rem" }}>
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
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
                <p className="mt-1.5 text-sm leading-6 text-neutral-500">{copy.startConversationDescription}</p>
                <p className="mt-3 text-[11px] leading-5 text-neutral-400">
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

              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="flex justify-center py-4">
                      <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium text-neutral-500">
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

                    {wordCard ? (() => {
                      const pronunciation = getPronunciationData({ english: wordCard.word, chinese: wordCard.translation });

                      return (
                      <article className="w-full max-w-[300px] rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">English</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-xl font-bold">{wordCard.word}</p>
                          <button type="button" onClick={() => speak(wordCard.word, "en-US")} aria-label="Play English word" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-black/60">
                            <Volume2 size={15} strokeWidth={1.8} />
                          </button>
                        </div>

                        <div className="mt-3 border-t border-black/[0.06] pt-3">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">Traditional Chinese</span>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="min-w-0 truncate text-xl font-bold">{wordCard.translation}</p>
                            <button type="button" onClick={() => speak(wordCard.translation, "zh-TW")} aria-label="播放中文單字" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-black/60">
                              <Volume2 size={15} strokeWidth={1.8} />
                            </button>
                          </div>
                          {(pronunciation.pinyin || pronunciation.zhuyin) && (
                            <p className="mt-0.5 text-xs text-black/40">
                              {[pronunciation.pinyin, pronunciation.zhuyin].filter(Boolean).join("  ")}
                            </p>
                          )}
                        </div>

                        {wordCard.partOfSpeech && <p className="mt-2 text-xs capitalize text-black/40">{wordCard.partOfSpeech}</p>}
                        {(wordCard.englishExample || wordCard.chineseExample) && (
                          <div className="mt-2.5 space-y-1.5">
                            {wordCard.englishExample && (
                              <div className="flex items-center justify-between gap-2 rounded-xl bg-surface p-2.5">
                                <p className="min-w-0 text-xs leading-5 text-black/75">{wordCard.englishExample}</p>
                                <button type="button" onClick={() => speak(wordCard.englishExample as string, "en-US")} aria-label="Play English example" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black/60">
                                  <Volume2 size={13} strokeWidth={1.8} />
                                </button>
                              </div>
                            )}
                            {wordCard.chineseExample && (
                              <div className="flex items-center justify-between gap-2 rounded-xl bg-surface p-2.5">
                                <p className="min-w-0 text-xs leading-5 text-black/45">{wordCard.chineseExample}</p>
                                <button type="button" onClick={() => speak(wordCard.chineseExample as string, "zh-TW")} aria-label="播放中文例句" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black/60">
                                  <Volume2 size={13} strokeWidth={1.8} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-2.5 flex items-center justify-between">
                          <time dateTime={message.created_at} className="text-[10px] text-black/35">{formatMessageTime(message.created_at)}</time>
                          <button
                            type="button"
                            onClick={() => handleSaveCard(message.id, wordCard)}
                            disabled={savingCardId === message.id || savedCardIds.has(message.id)}
                            aria-label="Save to Vocabulary"
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition ${savedCardIds.has(message.id) ? "bg-emerald-100 text-emerald-700" : "bg-black text-white"} disabled:opacity-60`}
                          >
                            {savedCardIds.has(message.id) ? <CheckMark size={13} strokeWidth={2} /> : <Bookmark size={13} strokeWidth={1.8} />}
                          </button>
                        </div>
                      </article>
                      );
                    })() : (
                      <article className={`max-w-[78%] px-4 py-2.5 sm:max-w-[72%] ${isMine ? "rounded-[22px] rounded-br-[6px] bg-neutral-950 text-white" : "rounded-[22px] rounded-bl-[6px] border border-black/[0.04] bg-white text-neutral-950"}`}>
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45]">{message.body}</p>
                        <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isMine ? "text-white/50" : "text-neutral-400"}`}>
                          <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
                          {isMine && <CheckIcon />}
                        </div>
                      </article>
                    )}
                  </div>
                </div>
              );
            })}

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
              <Link href={`/capture?source=library&with=${friendId}`} aria-label="Add a photo" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 active:bg-black/[0.07]">
                <PlusIcon />
              </Link>

              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={copy.inputPlaceholder}
                aria-label={copy.inputPlaceholder}
                className="min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-[16px] leading-5 text-neutral-950 outline-none placeholder:text-neutral-400"
              />

              <button type="submit" disabled={!canSend} aria-label="Send message" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${canSend ? "bg-neutral-950 text-white active:scale-90" : "bg-black/[0.05] text-neutral-300"}`}>
                {sending ? <Spinner /> : <SendIcon />}
              </button>
            </div>

            <div className="flex items-center justify-between px-3 pt-1.5">
              <span className="text-[10px] text-neutral-400">Shift + Enter for a new line</span>
              {newMessage.length > MAX_MESSAGE_LENGTH * 0.8 && (
                <span className={`text-[10px] ${newMessage.length >= MAX_MESSAGE_LENGTH ? "text-red-500" : "text-neutral-400"}`}>
                  {newMessage.length}/{MAX_MESSAGE_LENGTH}
                </span>
              )}
            </div>
          </form>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-[28px] bg-white p-5 sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">
                {selectedIds.size === 1 ? copy.deleteDialogMessage.replace("{count}", "1") : copy.deleteDialogMessages.replace("{count}", String(selectedIds.size))}
              </h2>
              <button type="button" onClick={() => setConfirmOpen(false)} aria-label={copy.closeDeleteConfirmation} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/60">
                <X size={16} />
              </button>
            </div>

            <p className="mt-2 text-sm leading-6 text-black/55">{copy.deleteDialogDescription}</p>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 rounded-2xl border border-black/[0.08] bg-white py-3 text-sm font-semibold">
                {copy.cancel}
              </button>
              <button type="button" onClick={() => void handleDeleteSelected()} disabled={deleting} className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {deleting ? copy.deleting : copy.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
