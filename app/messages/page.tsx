"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
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

export default function MessagesPage() {
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] =
    useState<string | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    async function initializeChat() {
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("You are not logged in.");
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .limit(1)
        .maybeSingle();

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
        });

      if (messagesError) {
        setErrorMessage(messagesError.message);
        setLoading(false);
        return;
      }

      setMessages(existingMessages ?? []);
      setLoading(false);
    }

    initializeChat();
  }, [supabase]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

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
        if (status === "CHANNEL_ERROR") {
          setErrorMessage(
            "Realtime connection failed."
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: messageBody,
      });

    if (error) {
      setErrorMessage(error.message);
      setSending(false);
      return;
    }

    setNewMessage("");
    setSending(false);
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#f4f1ea] text-neutral-900">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col">
          <header className="sticky top-0 z-10 border-b border-neutral-200 bg-[#f4f1ea]/95 px-4 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Link
                  href="/"
                  className="text-sm font-semibold text-neutral-500"
                >
                  ← Exchange Notes
                </Link>

                <h1 className="mt-1 text-2xl font-bold">
                  Partner Messages
                </h1>
              </div>

              <LogoutButton />
            </div>
          </header>

          <section className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
            {loading && (
              <p className="text-center text-neutral-500">
                Loading messages...
              </p>
            )}

            {errorMessage && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {!loading &&
              !errorMessage &&
              messages.length === 0 && (
                <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
                  <p className="font-semibold">
                    Start your first conversation
                  </p>

                  <p className="mt-2 text-sm text-neutral-500">
                    Share a new word, sentence, or
                    question with your partner.
                  </p>
                </div>
              )}

            {messages.map((message) => {
              const isMine =
                message.sender_id === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <article
                    className={`max-w-[82%] rounded-3xl px-4 py-3 ${
                      isMine
                        ? "rounded-br-md bg-neutral-900 text-white"
                        : "rounded-bl-md bg-white shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-6">
                      {message.body}
                    </p>

                    <p
                      className={`mt-2 text-xs ${
                        isMine
                          ? "text-neutral-400"
                          : "text-neutral-400"
                      }`}
                    >
                      {new Date(
                        message.created_at
                      ).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </article>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </section>

          <form
            onSubmit={sendMessage}
            className="sticky bottom-0 border-t border-neutral-200 bg-[#f4f1ea] p-4"
          >
            <div className="flex items-end gap-2 rounded-3xl bg-white p-2 shadow-sm">
              <textarea
                value={newMessage}
                onChange={(event) =>
                  setNewMessage(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Write a message..."
                className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 outline-none"
              />

              <button
                type="submit"
                disabled={
                  sending ||
                  !newMessage.trim() ||
                  !conversationId
                }
                className="rounded-full bg-orange-500 px-5 py-3 font-semibold text-white disabled:opacity-40"
              >
                {sending ? "..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </AuthGuard>
  );
}
