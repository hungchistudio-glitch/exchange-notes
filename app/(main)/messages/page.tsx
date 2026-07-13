"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FriendProfile,
  getOrCreateConversationWithFriend,
  listFriends,
} from "@/lib/friends";
import LogoutButton from "../../components/LogoutButton";

type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesPageContent />
    </Suspense>
  );
}

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const friendId = searchParams.get("with");

  if (friendId) {
    return <ChatRoom friendId={friendId} />;
  }

  return <ConversationList />;
}

// ---- Conversation list (no ?with param) -----------------------------------

function ConversationList() {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setErrorMessage("You are not logged in.");
          setLoading(false);
        }
        return;
      }

      try {
        const friendsData = await listFriends(supabase, user.id);
        if (!cancelled) {
          setFriends(friendsData);
        }
      } catch (loadError) {
        console.error("Failed to load friends:", loadError);
        if (!cancelled) {
          setErrorMessage("Couldn't load your conversations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-[#f4f1ea]/95 px-4 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/" className="text-sm font-semibold text-neutral-500">
                ← Exchange Notes
              </Link>
              <h1 className="mt-1 text-2xl font-bold">Messages</h1>
            </div>
            <LogoutButton />
          </div>
        </header>

        <section className="flex-1 space-y-3 px-4 py-6">
          {loading && (
            <p className="text-center text-neutral-500">Loading…</p>
          )}

          {errorMessage && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && friends.length === 0 && (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
              <p className="font-semibold">No conversations yet</p>
              <p className="mt-2 text-sm text-neutral-500">
                Add a friend to start messaging.
              </p>
              <Link
                href="/friends"
                className="mt-4 inline-block rounded-full bg-black px-5 py-2 text-sm font-bold text-white"
              >
                Go to Friends
              </Link>
            </div>
          )}

          {friends.map((friend) => (
            <Link
              key={friend.id}
              href={`/messages?with=${friend.id}`}
              className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f1ea] font-bold text-black">
                {(friend.displayName ?? friend.exchangeId)
                  .slice(0, 1)
                  .toUpperCase()}
              </span>

              <div className="min-w-0">
                <p className="truncate font-bold text-black">
                  {friend.displayName ?? `@${friend.exchangeId}`}
                </p>
                <p className="truncate text-sm text-neutral-500">
                  @{friend.exchangeId}
                </p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

// ---- Chat room (?with={friendId}) ------------------------------------------

function ChatRoom({ friendId }: { friendId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(
    null
  );

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeChat() {
      setErrorMessage("");
      setLoading(true);
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setErrorMessage("You are not logged in.");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setCurrentUserId(user.id);

      const { data: friend, error: friendError } = await supabase
        .from("profiles")
        .select("id, exchange_id, display_name, avatar_url")
        .eq("id", friendId)
        .maybeSingle();

      if (friendError || !friend) {
        if (!cancelled) {
          setErrorMessage("Couldn't find that friend.");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setFriendProfile({
          id: friend.id,
          exchangeId: friend.exchange_id,
          displayName: friend.display_name,
          avatarUrl: friend.avatar_url,
        });
      }

      let roomId: string;
      try {
        roomId = await getOrCreateConversationWithFriend(
          supabase,
          user.id,
          friendId
        );
      } catch (conversationError) {
        console.error(
          "Failed to get or create conversation:",
          conversationError
        );
        if (!cancelled) {
          setErrorMessage("Couldn't open this conversation.");
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;
      setConversationId(roomId);

      const { data: existingMessages, error: messagesError } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", roomId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        if (!cancelled) {
          setErrorMessage(messagesError.message);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setMessages(existingMessages ?? []);
        setLoading(false);
      }
    }

    initializeChat();
    return () => {
      cancelled = true;
    };
  }, [friendId]);

  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();

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
              (message) => message.id === incomingMessage.id
            );
            if (alreadyExists) return currentMessages;
            return [...currentMessages, incomingMessage];
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setErrorMessage("Realtime connection failed.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const messageBody = newMessage.trim();
    if (!messageBody || !conversationId || !currentUserId || sending) {
      return;
    }

    setSending(true);
    setErrorMessage("");

    const supabase = createClient();

    const { error } = await supabase.from("messages").insert({
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
    <main className="min-h-screen bg-[#f4f1ea] text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-[#f4f1ea]/95 px-4 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/messages" className="text-sm font-semibold text-neutral-500">
                ← Messages
              </Link>

              <h1 className="mt-1 text-2xl font-bold">
                {friendProfile
                  ? friendProfile.displayName ?? `@${friendProfile.exchangeId}`
                  : "Chat"}
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

          {!loading && !errorMessage && messages.length === 0 && (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
              <p className="font-semibold">Start your first conversation</p>
              <p className="mt-2 text-sm text-neutral-500">
                Share a new word, sentence, or question with your partner.
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isMine = message.sender_id === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
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

                  <p className="mt-2 text-xs text-neutral-400">
                    {new Date(message.created_at).toLocaleTimeString([], {
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
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
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
              disabled={sending || !newMessage.trim() || !conversationId}
              className="rounded-full bg-orange-500 px-5 py-3 font-semibold text-white disabled:opacity-40"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}