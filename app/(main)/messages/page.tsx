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
import { Paperclip, ImagePlus, BookmarkPlus, X, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  FriendProfile,
  getOrCreateConversationWithFriend,
  listFriends,
} from "@/lib/friends";
import { consumePendingSharedArticle } from "@/lib/newsDraft";
import type { DailyNewsCard } from "@/lib/types/dailyNews";
import LogoutButton from "../../components/LogoutButton";

type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  shared_article: DailyNewsCard | null;
};

const MESSAGE_COLUMNS =
  "id, conversation_id, sender_id, body, created_at, attachment_url, attachment_type, attachment_name, shared_article";

function detectLanguage(text: string): "traditional-chinese" | "english" {
  return /[\u4e00-\u9fff]/.test(text) ? "traditional-chinese" : "english";
}

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
    <main className="min-h-[100dvh] bg-[#f4f1ea] text-neutral-900">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col">
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
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ---- select-text-to-vocabulary state ----
  const [selectionPopup, setSelectionPopup] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const [savingSelection, setSavingSelection] = useState(false);
  const [savedToast, setSavedToast] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesSectionRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

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
        .select(MESSAGE_COLUMNS)
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
        setMessages((existingMessages ?? []) as Message[]);
        setLoading(false);

        // If the user tapped "Share" on a Daily News card, the article
        // is waiting in sessionStorage — send it as a card message now.
        //
        // NOTE: we await this insert (instead of firing-and-forgetting)
        // and manually push the result into local state. The Realtime
        // subscription lives in a separate effect and may not finish
        // subscribing before this insert lands in the database — if we
        // rely on Realtime alone, the event can be missed entirely and
        // the shared card silently never appears until a page refresh.
        const pendingArticle = consumePendingSharedArticle();
        if (pendingArticle) {
          const { data: insertedMessage, error: shareError } = await supabase
            .from("messages")
            .insert({
              conversation_id: roomId,
              sender_id: user.id,
              body: "",
              shared_article: pendingArticle,
            })
            .select(MESSAGE_COLUMNS)
            .single();

          if (shareError) {
            console.error("Failed to share article:", shareError);
            if (!cancelled) {
              setErrorMessage("Couldn't share that article. Try again.");
            }
          } else if (insertedMessage && !cancelled) {
            setMessages((current) => {
              const alreadyExists = current.some(
                (message) => message.id === insertedMessage.id
              );
              return alreadyExists
                ? current
                : [...current, insertedMessage as Message];
            });
          }
        }
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

  // ---- attachments (photo / file) ----

  async function handleAttachmentSelected(file: File | undefined) {
    if (!file || !conversationId || !currentUserId || uploading) return;

    setUploading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${conversationId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("message-attachments").getPublicUrl(path);

      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: "",
        attachment_url: publicUrl,
        attachment_type: file.type,
        attachment_name: file.name,
      });

      if (insertError) throw insertError;
    } catch (uploadError) {
      console.error("Attachment upload failed:", uploadError);
      setErrorMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Couldn't upload that file."
      );
    } finally {
      setUploading(false);
    }
  }

  // ---- select text -> vocabulary ----

  function handleSelectionChange() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";

    if (!text || !selection || selection.rangeCount === 0) {
      setSelectionPopup(null);
      return;
    }

    const container = messagesSectionRef.current;
    if (!container) return;

    // Only react to selections that live inside the messages list.
    const anchorNode = selection.anchorNode;
    if (!anchorNode || !container.contains(anchorNode)) {
      setSelectionPopup(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setSelectionPopup({
      text,
      top: rect.top - containerRect.top + container.scrollTop - 44,
      left: rect.left - containerRect.left + rect.width / 2,
    });
  }

  async function saveSelectionToVocabulary() {
    if (!selectionPopup || !currentUserId || savingSelection) return;

    setSavingSelection(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("vocabulary_items").insert({
        user_id: currentUserId,
        word: selectionPopup.text,
        translation: "",
        language: detectLanguage(selectionPopup.text),
        status: "new",
      });

      if (error) throw error;

      setSavedToast(`已加入單字本：${selectionPopup.text}`);
      setTimeout(() => setSavedToast(""), 2000);
    } catch (saveError) {
      console.error("Failed to save vocabulary item:", saveError);
      setErrorMessage(
        saveError instanceof Error
          ? saveError.message
          : "Couldn't save that word."
      );
    } finally {
      setSavingSelection(false);
      setSelectionPopup(null);
      window.getSelection()?.removeAllRanges();
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f4f1ea] text-neutral-900">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
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

        <section
          ref={messagesSectionRef}
          onMouseUp={handleSelectionChange}
          onTouchEnd={handleSelectionChange}
          className="relative flex-1 space-y-3 overflow-y-auto px-4 pb-[200px] pt-6"
        >
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
            const isImageAttachment = message.attachment_type?.startsWith(
              "image/"
            );

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
                  {message.attachment_url && isImageAttachment && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.attachment_url}
                      alt={message.attachment_name ?? "attachment"}
                      className="mb-2 max-h-72 w-full rounded-2xl object-cover"
                    />
                  )}

                  {message.attachment_url && !isImageAttachment && (
                      <a
                      href={message.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mb-2 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm underline ${
                        isMine ? "bg-white/10" : "bg-[#f4f1ea]"
                      }`}
                    >
                      <FileText size={16} />
                      <span className="truncate">
                        {message.attachment_name ?? "File"}
                      </span>
                    </a>
                  )}

                  {message.shared_article && (
                    <a
                      href={message.shared_article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mb-2 block overflow-hidden rounded-2xl ${
                        isMine ? "bg-white/10" : "bg-[#f4f1ea]"
                      }`}
                    >
                      {message.shared_article.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={message.shared_article.imageUrl}
                          alt={message.shared_article.chineseTitle}
                          className="h-32 w-full object-cover"
                        />
                      )}
                      <div className="p-3">
                        <p
                          className={`text-xs font-semibold uppercase tracking-wide ${
                            isMine ? "text-white/60" : "text-neutral-400"
                          }`}
                        >
                          {message.shared_article.category} ・{" "}
                          {message.shared_article.sourceName}
                        </p>
                        <p className="mt-1 font-bold leading-5">
                          {message.shared_article.chineseTitle}
                        </p>
                        <p
                          className={`mt-1 line-clamp-2 text-sm leading-5 ${
                            isMine ? "text-white/70" : "text-neutral-500"
                          }`}
                        >
                          {message.shared_article.chineseSummary}
                        </p>
                      </div>
                    </a>
                  )}

                  {message.body && (
                    <p className="whitespace-pre-wrap break-words leading-6">
                      {message.body}
                    </p>
                  )}

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

          {selectionPopup && (
            <button
              type="button"
              onClick={saveSelectionToVocabulary}
              disabled={savingSelection}
              style={{
                top: selectionPopup.top,
                left: selectionPopup.left,
                transform: "translateX(-50%)",
              }}
              className="absolute z-20 flex items-center gap-1.5 rounded-full bg-black px-3 py-2 text-xs font-bold text-white shadow-lg disabled:opacity-50"
            >
              <BookmarkPlus size={14} />
              {savingSelection ? "儲存中..." : "加入單字本"}
            </button>
          )}

          {savedToast && (
            <div className="pointer-events-none sticky bottom-2 z-20 flex justify-center">
              <span className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-lg">
                {savedToast}
              </span>
            </div>
          )}
        </section>

        <form
          onSubmit={sendMessage}
          className="fixed inset-x-0 bottom-[140px] z-40 mx-auto max-w-xl border-t border-neutral-200 bg-[#f4f1ea] p-4"
        >
          <div className="flex items-end gap-2 rounded-3xl bg-white p-2 shadow-sm">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                void handleAttachmentSelected(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleAttachmentSelected(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              aria-label="Attach photo"
              disabled={uploading || !conversationId}
              onClick={() => photoInputRef.current?.click()}
              className="shrink-0 rounded-full p-3 text-neutral-500 disabled:opacity-40"
            >
              <ImagePlus size={20} />
            </button>

            <button
              type="button"
              aria-label="Attach file"
              disabled={uploading || !conversationId}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-full p-3 text-neutral-500 disabled:opacity-40"
            >
              <Paperclip size={20} />
            </button>

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
              placeholder={uploading ? "Uploading..." : "Write a message..."}
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
