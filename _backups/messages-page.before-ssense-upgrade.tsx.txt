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
import {
  Paperclip,
  ImagePlus,
  BookmarkPlus,
  FileText,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getOrCreateConversationWithFriend,
  listFriends,
  type FriendProfile,
} from "@/lib/friends";
import { consumePendingSharedArticle } from "@/lib/newsDraft";
import { consumePendingSharedVocabulary } from "@/lib/vocabularyDraft";
import type { VocabularyItem } from "@/lib/types/app";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

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

const VOCABULARY_MESSAGE_PREFIX = "__SHARED_VOCABULARY__:";

function IconLogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loggingOut}
      aria-label="Log out"
      title="Log out"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40"
    >
      <LogOut size={15} strokeWidth={1.8} />
    </button>
  );
}


function encodeSharedVocabulary(item: VocabularyItem) {
  return `${VOCABULARY_MESSAGE_PREFIX}${JSON.stringify(item)}`;
}

function decodeSharedVocabulary(body: string): VocabularyItem | null {
  if (!body.startsWith(VOCABULARY_MESSAGE_PREFIX)) return null;

  try {
    return JSON.parse(body.slice(VOCABULARY_MESSAGE_PREFIX.length)) as VocabularyItem;
  } catch {
    return null;
  }
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
        <header className="sticky top-0 z-10 border-b border-black/10 bg-[#f4f1ea]/95 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/" className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">
                ← Exchange Notes
              </Link>
              <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Messages</h1>
            </div>
            <IconLogoutButton />
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
        const pendingArticle = consumePendingSharedArticle();
        if (pendingArticle) {
          const shareBody =
            pendingArticle.chineseTitle?.trim() ||
            pendingArticle.englishTitle?.trim() ||
            "分享了一篇新聞";

          const { error: shareError } = await supabase
            .from("messages")
            .insert({
              conversation_id: roomId,
              sender_id: user.id,
              body: `📰 ${shareBody}`,
              shared_article: pendingArticle,
            });

          if (shareError) {
            console.error("Failed to share article:", shareError);
            setErrorMessage("Couldn't share that article. Try again.");
          }
        }

        const pendingVocabulary = consumePendingSharedVocabulary();

        if (pendingVocabulary) {
          const {
            data: insertedVocabularyMessage,
            error: vocabularyShareError,
          } = await supabase
            .from("messages")
            .insert({
              conversation_id: roomId,
              sender_id: user.id,
              body: encodeSharedVocabulary(pendingVocabulary),
              attachment_url: null,
              attachment_type: null,
              attachment_name: null,
              shared_article: null,
            })
            .select(MESSAGE_COLUMNS)
            .single();

          if (vocabularyShareError) {
            console.error(
              "Failed to share vocabulary:",
              vocabularyShareError,
            );
            setErrorMessage(
              `Couldn't share that word: ${vocabularyShareError.message}`,
            );
          } else if (insertedVocabularyMessage && !cancelled) {
            const newMessage = insertedVocabularyMessage as Message;

            setMessages((currentMessages) => {
              const alreadyExists = currentMessages.some(
                (message) => message.id === newMessage.id,
              );

              if (alreadyExists) return currentMessages;

              return [...currentMessages, newMessage];
            });

            window.setTimeout(() => {
              bottomRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
              });
            }, 80);
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

    const selectedText = selectionPopup.text;

    try {
      const classifyResponse = await fetch("/api/classify-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText }),
      });

      const classifyData = (await classifyResponse.json()) as
        | {
            englishName: string;
            chineseName: string;
            partOfSpeech: string;
            englishExample: string;
            chineseExample: string;
            confidence: "high" | "medium" | "low";
            category: "people" | "objects" | "actions" | "other";
          }
        | { error: string };

      if (!classifyResponse.ok || "error" in classifyData) {
        throw new Error(
          "error" in classifyData
            ? classifyData.error
            : "Couldn't identify that word."
        );
      }

      const supabase = createClient();
      const { error } = await supabase.from("vocabulary_items").insert({
        user_id: currentUserId,
        word: classifyData.englishName.trim(),
        translation: classifyData.chineseName.trim(),
        language: "english",
        part_of_speech: classifyData.partOfSpeech.trim() || null,
        example_sentence: classifyData.englishExample.trim() || null,
        translated_example: classifyData.chineseExample.trim() || null,
        confidence: classifyData.confidence,
        category: classifyData.category,
        status: "new",
      });

      if (error) throw error;

      setSavedToast(`已加入單字本：${classifyData.englishName}`);
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
        <header className="sticky top-0 z-10 border-b border-black/10 bg-[#f4f1ea]/95 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/messages" className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">
                ← Messages
              </Link>

              <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em]">
                {friendProfile
                  ? friendProfile.displayName ?? `@${friendProfile.exchangeId}`
                  : "Chat"}
              </h1>
            </div>

            <IconLogoutButton />
          </div>
        </header>

        <section
          ref={messagesSectionRef}
          onMouseUp={handleSelectionChange}
          onTouchEnd={handleSelectionChange}
          className="relative flex-1 space-y-2.5 overflow-y-auto px-4 pb-[150px] pt-4"
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
            const sharedVocabulary = decodeSharedVocabulary(message.body);

            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <article
                  className={`max-w-[78%] rounded-[22px] px-3.5 py-2.5 text-[13px] leading-[1.45] ${
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

                  {sharedVocabulary && (
                    <div
                      className={`mb-0.5 min-w-0 rounded-[18px] p-3 ${
                        isMine ? "bg-white/10" : "bg-[#f4f1ea]"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          isMine ? "text-white/50" : "text-neutral-400"
                        }`}
                      >
                        Shared word
                      </p>
                      <div className="mt-2 flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <p className="break-words text-lg font-semibold leading-tight tracking-[-0.02em]">
                            {sharedVocabulary.word}
                          </p>
                          <p
                            className={`mt-0.5 break-words text-[14px] ${
                              isMine ? "text-white/75" : "text-neutral-600"
                            }`}
                          >
                            {sharedVocabulary.translation}
                          </p>
                          {sharedVocabulary.part_of_speech && (
                            <p
                              className={`mt-2 text-xs ${
                                isMine ? "text-white/45" : "text-neutral-400"
                              }`}
                            >
                              {sharedVocabulary.part_of_speech}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          aria-label={`Pronounce ${sharedVocabulary.word}`}
                          onClick={() =>
                            window.speechSynthesis.speak(
                              new SpeechSynthesisUtterance(sharedVocabulary.word)
                            )
                          }
                          className={`shrink-0 rounded-full p-2 ${
                            isMine ? "bg-white/10" : "bg-white"
                          }`}
                        >
                          🔊
                        </button>
                      </div>

                      {sharedVocabulary.example_sentence && (
                        <p
                          className={`mt-3 border-t pt-3 text-sm leading-5 ${
                            isMine
                              ? "border-white/10 text-white/70"
                              : "border-black/10 text-neutral-600"
                          }`}
                        >
                          {sharedVocabulary.example_sentence}
                        </p>
                      )}
                    </div>
                  )}

                  {message.body && !sharedVocabulary && (
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
          className="fixed inset-x-0 bottom-[84px] z-40 mx-auto max-w-xl border-t border-black/10 bg-[#f4f1ea]/95 px-3 py-2.5 backdrop-blur-xl"
        >
          <div className="flex h-12 items-center gap-1 rounded-full border border-black/10 bg-white px-1.5 shadow-sm">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 disabled:opacity-40"
            >
              <ImagePlus size={20} />
            </button>

            <button
              type="button"
              aria-label="Attach file"
              disabled={uploading || !conversationId}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 disabled:opacity-40"
            >
              <Paperclip size={20} />
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              maxLength={2000}
              placeholder={uploading ? "Uploading..." : "Write a message"}
              className="h-10 min-w-0 flex-1 truncate bg-transparent px-2 text-[13px] outline-none placeholder:text-neutral-400"
            />

            <button
              type="submit"
              disabled={sending || !newMessage.trim() || !conversationId}
              className="h-9 shrink-0 rounded-full bg-black px-4 text-[12px] font-semibold text-white disabled:opacity-30"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}