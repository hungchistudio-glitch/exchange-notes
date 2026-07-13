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

import { createClient } from "@/lib/supabase/client";
import AuthGuard from "../components/AuthGuard";
import LogoutButton from "../components/LogoutButton";

type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type RealtimeStatus =
  | "connecting"
  | "connected"
  | "disconnected";

const MAX_MESSAGE_LENGTH = 2000;

/*
 * Adjust this value if your fixed bottom navigation has a different height.
 * The screenshot suggests approximately 104px including spacing.
 */
const MOBILE_NAV_OFFSET = "7.25rem";

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M15 18l-6-6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M12 3.5l7 3v5.2c0 4.3-2.8 7.4-7 8.8-4.2-1.4-7-4.5-7-8.8V6.5l7-3z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12l1.7 1.7 3.5-3.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M5 12h13M13 7l5 5-5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
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

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (isSameDay(date, today)) {
    return "Today";
  }

  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === today.getFullYear()
        ? undefined
        : "numeric",
  }).format(date);
}

function shouldShowDateDivider(
  messages: Message[],
  index: number
) {
  if (index === 0) {
    return true;
  }

  const currentDate = new Date(
    messages[index].created_at
  );
  const previousDate = new Date(
    messages[index - 1].created_at
  );

  return (
    currentDate.getFullYear() !==
      previousDate.getFullYear() ||
    currentDate.getMonth() !==
      previousDate.getMonth() ||
    currentDate.getDate() !==
      previousDate.getDate()
  );
}

export default function MessagesPage() {
  /*
   * Memoizing the client prevents effects from restarting
   * after every render.
   */
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<Message[]>(
    []
  );
  const [conversationId, setConversationId] =
    useState<string | null>(null);
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connecting");

  const bottomRef = useRef<HTMLDivElement | null>(
    null
  );
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);
  const initializedRef = useRef(false);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      bottomRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });
    },
    []
  );

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    const maximumHeight = 120;
    const nextHeight = Math.min(
      textarea.scrollHeight,
      maximumHeight
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maximumHeight
        ? "auto"
        : "hidden";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [newMessage, resizeTextarea]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    let cancelled = false;

    async function initializeChat() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (userError || !user) {
        setErrorMessage("You are not logged in.");
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      /*
       * RLS must ensure that the authenticated user can
       * only see their own conversation memberships.
       */
      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (membershipError) {
        setErrorMessage(membershipError.message);
        setLoading(false);
        return;
      }

      if (!membership) {
        setErrorMessage(
          "You have not been connected with a learning partner yet."
        );
        setLoading(false);
        return;
      }

      const roomId = membership.conversation_id;

      setConversationId(roomId);

      const {
        data: existingMessages,
        error: messagesError,
      } = await supabase
        .from("messages")
        .select(
          "id, conversation_id, sender_id, body, created_at"
        )
        .eq("conversation_id", roomId)
        .order("created_at", {
          ascending: true,
        })
        .limit(500);

      if (cancelled) {
        return;
      }

      if (messagesError) {
        setErrorMessage(messagesError.message);
        setLoading(false);
        return;
      }

      setMessages(existingMessages ?? []);
      setLoading(false);

      window.requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    }

    void initializeChat();

    return () => {
      cancelled = true;
    };
  }, [scrollToBottom, supabase]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    setRealtimeStatus("connecting");

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
          const incomingMessage =
            payload.new as Message;

          setMessages((currentMessages) => {
            const alreadyExists =
              currentMessages.some(
                (message) =>
                  message.id === incomingMessage.id
              );

            if (alreadyExists) {
              return currentMessages;
            }

            return [
              ...currentMessages,
              incomingMessage,
            ];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages, scrollToBottom]);

  /*
   * Retrieve a draft created by the capture page.
   */
  useEffect(() => {
    const draft = sessionStorage.getItem(
      "exchange-notes-draft-message"
    );

    if (!draft) {
      return;
    }

    setNewMessage(draft);
    sessionStorage.removeItem(
      "exchange-notes-draft-message"
    );

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const messageBody = newMessage.trim();

    if (
      !messageBody ||
      !conversationId ||
      !currentUserId ||
      sending
    ) {
      return;
    }

    setSending(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: messageBody,
      })
      .select(
        "id, conversation_id, sender_id, body, created_at"
      )
      .single();

    if (error) {
      setErrorMessage(
        "Message could not be sent. Please try again."
      );
      setSending(false);
      return;
    }

    /*
     * Add immediately for responsive feedback.
     * The realtime handler deduplicates the same row.
     */
    setMessages((currentMessages) => {
      const alreadyExists = currentMessages.some(
        (message) => message.id === data.id
      );

      return alreadyExists
        ? currentMessages
        : [...currentMessages, data];
    });

    setNewMessage("");
    setSending(false);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function handleComposerKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const canSend =
    Boolean(newMessage.trim()) &&
    Boolean(conversationId) &&
    Boolean(currentUserId) &&
    !sending;

  return (
    <AuthGuard>
      <main className="h-[100dvh] overflow-hidden bg-[#f5f3ed] text-neutral-950">
        <div className="mx-auto flex h-full w-full max-w-xl flex-col">
          <header className="z-20 shrink-0 border-b border-black/[0.06] bg-[#f5f3ed]/90 px-4 backdrop-blur-xl">
            <div
              className="flex min-h-[68px] items-center gap-3"
              style={{
                paddingTop:
                  "env(safe-area-inset-top)",
              }}
            >
              <Link
                href="/"
                aria-label="Back"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-black/[0.04] active:bg-black/[0.07]"
              >
                <BackIcon />
              </Link>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d7ead2] text-sm font-bold text-[#236c32]">
                  P
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-[17px] font-semibold tracking-[-0.015em]">
                    Learning Partner
                  </h1>

                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        realtimeStatus ===
                        "connected"
                          ? "bg-emerald-500"
                          : realtimeStatus ===
                              "connecting"
                            ? "bg-amber-400"
                            : "bg-neutral-300"
                      }`}
                    />

                    <span>
                      {realtimeStatus ===
                      "connected"
                        ? "Connected"
                        : realtimeStatus ===
                            "connecting"
                          ? "Connecting"
                          : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-neutral-600"
                title="Protected by authentication and database access controls. End-to-end encryption is not yet enabled."
              >
                <ShieldIcon />
                <span className="hidden min-[390px]:inline">
                  Private
                </span>
              </div>

              <LogoutButton />
            </div>
          </header>

          <section
            aria-live="polite"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5"
            style={{
              paddingBottom: "1.5rem",
            }}
          >
            {loading && (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Spinner />
                  <span>Loading messages</span>
                </div>
              </div>
            )}

            {!loading && errorMessage && (
              <div
                role="alert"
                className="mx-auto max-w-sm rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
              >
                {errorMessage}
              </div>
            )}

            {!loading &&
              !errorMessage &&
              messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-xs text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] text-neutral-600">
                      <ShieldIcon />
                    </div>

                    <h2 className="mt-4 text-base font-semibold">
                      Start the conversation
                    </h2>

                    <p className="mt-1.5 text-sm leading-6 text-neutral-500">
                      Share a word, sentence, or question
                      with your learning partner.
                    </p>

                    <p className="mt-3 text-[11px] leading-5 text-neutral-400">
                      Messages are protected by your
                      account and database access rules.
                      End-to-end encryption is not yet
                      enabled.
                    </p>
                  </div>
                </div>
              )}

            {!loading &&
              messages.map((message, index) => {
                const isMine =
                  message.sender_id === currentUserId;

                const showDateDivider =
                  shouldShowDateDivider(
                    messages,
                    index
                  );

                return (
                  <div key={message.id}>
                    {showDateDivider && (
                      <div className="flex justify-center py-4">
                        <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium text-neutral-500">
                          {formatDateLabel(
                            message.created_at
                          )}
                        </span>
                      </div>
                    )}

                    <div
                      className={`mb-2 flex ${
                        isMine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <article
                        className={`max-w-[78%] px-4 py-2.5 sm:max-w-[72%] ${
                          isMine
                            ? "rounded-[22px] rounded-br-[6px] bg-neutral-950 text-white"
                            : "rounded-[22px] rounded-bl-[6px] border border-black/[0.04] bg-white text-neutral-950"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45]">
                          {message.body}
                        </p>

                        <div
                          className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                            isMine
                              ? "text-white/50"
                              : "text-neutral-400"
                          }`}
                        >
                          <time
                            dateTime={
                              message.created_at
                            }
                          >
                            {formatMessageTime(
                              message.created_at
                            )}
                          </time>

                          {isMine && <CheckIcon />}
                        </div>
                      </article>
                    </div>
                  </div>
                );
              })}

            <div ref={bottomRef} />
          </section>

          <div
            className="z-30 shrink-0 border-t border-black/[0.05] bg-[#f5f3ed]/95 px-3 pt-2 backdrop-blur-xl"
            style={{
              paddingBottom: `calc(${MOBILE_NAV_OFFSET} + env(safe-area-inset-bottom))`,
            }}
          >
            <form onSubmit={sendMessage}>
              <div className="flex items-end gap-2 rounded-[26px] border border-black/[0.06] bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                <Link
                  href="/capture?source=library"
                  aria-label="Add a photo"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 active:bg-black/[0.07]"
                >
                  <PlusIcon />
                </Link>

                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(event) => {
                    setNewMessage(
                      event.target.value
                    );
                  }}
                  onKeyDown={handleComposerKeyDown}
                  rows={1}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Message"
                  aria-label="Message"
                  className="min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-[16px] leading-5 text-neutral-950 outline-none placeholder:text-neutral-400"
                />

                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Send message"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${
                    canSend
                      ? "bg-neutral-950 text-white active:scale-90"
                      : "bg-black/[0.05] text-neutral-300"
                  }`}
                >
                  {sending ? (
                    <Spinner />
                  ) : (
                    <SendIcon />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between px-3 pt-1.5">
                <span className="text-[10px] text-neutral-400">
                  Shift + Enter for a new line
                </span>

                {newMessage.length >
                  MAX_MESSAGE_LENGTH * 0.8 && (
                  <span
                    className={`text-[10px] ${
                      newMessage.length >=
                      MAX_MESSAGE_LENGTH
                        ? "text-red-500"
                        : "text-neutral-400"
                    }`}
                  >
                    {newMessage.length}/
                    {MAX_MESSAGE_LENGTH}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}