"use client";

import WordCard from "@/components/learning/WordCard";
import SwipeableConversationCard from "@/components/messages/SwipeableConversationCard";
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
  ArrowLeft,
  BookmarkPlus,
  Check,
  ChevronDown,
  FileText,
  LogOut,
  Paperclip,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getOrCreateConversationWithFriend,
  listFriends,
  type FriendProfile,
} from "@/lib/friends";
import { consumePendingSharedArticle } from "@/lib/newsDraft";
import {
  clearPendingSharedVocabulary,
  getPendingSharedVocabulary,
} from "@/lib/vocabularyDraft";
import type { AppLanguage, VocabularyItem } from "@/lib/types/app";
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

type AttachmentIdentificationResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
  category: "people" | "objects" | "actions" | "other";
};

const MESSAGE_COLUMNS =
  "id, conversation_id, sender_id, body, created_at, attachment_url, attachment_type, attachment_name, shared_article";

const VOCABULARY_MESSAGE_PREFIX = "__SHARED_VOCABULARY__:";

const AI_IMAGE_MAX_DIMENSION = 1600;
const AI_IMAGE_JPEG_QUALITY = 0.82;
const MESSAGE_BOTTOM_THRESHOLD = 80;

function getMessageDateKey(value: string) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatMessageDate(value: string) {
  const messageDate = new Date(value);
  const today = new Date();

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const startOfMessageDate = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate(),
  );

  const differenceInDays = Math.round(
    (startOfToday.getTime() - startOfMessageDate.getTime()) / 86_400_000,
  );

  if (differenceInDays === 0) return "Today";
  if (differenceInDays === 1) return "Yesterday";

  return messageDate.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year:
      messageDate.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function SharedVocabularyMessage({
  item,
  currentUserId,
}: {
  item: VocabularyItem;
  currentUserId: string | null;
}) {
  const [learningLanguage, setLearningLanguage] =
    useState<AppLanguage>("english");
  const [savingSharedWord, setSavingSharedWord] = useState(false);
  const [sharedWordSaved, setSharedWordSaved] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLearningLanguage() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("learning_language")
          .eq("id", user.id)
          .single();

        if (active && data?.learning_language) {
          setLearningLanguage(data.learning_language as AppLanguage);
        }
      } catch (error) {
        console.warn("Could not load message learning language:", error);
      }
    }

    void loadLearningLanguage();

    return () => {
      active = false;
    };
  }, []);

  const englishText = item.word?.trim() || "";
  const chineseText = item.translation?.trim() || "";
  const englishExample = item.example_sentence?.trim() || "";
  const chineseExample = item.translated_example?.trim() || "";

  async function saveSharedWordToVocabulary() {
    if (!currentUserId || savingSharedWord || sharedWordSaved) {
      return;
    }

    if (!englishText || !chineseText) return;

    setSavingSharedWord(true);

    try {
      const supabase = createClient();

      const { data: existingItems, error: lookupError } = await supabase
        .from("vocabulary_items")
        .select("id")
        .eq("user_id", currentUserId)
        .ilike("word", englishText)
        .ilike("translation", chineseText)
        .limit(1);

      if (lookupError) throw lookupError;

      if (existingItems && existingItems.length > 0) {
        setSharedWordSaved(true);
        return;
      }

      const { error: insertError } = await supabase
        .from("vocabulary_items")
        .insert({
          user_id: currentUserId,
          word: englishText,
          translation: chineseText,
          language: item.language || "english",
          part_of_speech: item.part_of_speech || null,
          example_sentence: item.example_sentence || null,
          translated_example: item.translated_example || null,
          confidence: item.confidence || null,
          category: item.category || "other",
          status: "new",
          image_url: item.image_url || null,
        });

      if (insertError) throw insertError;

      setSharedWordSaved(true);
    } catch (error) {
      console.error("Could not save shared word to vocabulary:", error);
    } finally {
      setSavingSharedWord(false);
    }
  }

  return (
    <WordCard
      english={englishText}
      chinese={chineseText}
      englishExample={englishExample}
      chineseExample={chineseExample}
      partOfSpeech={item.part_of_speech}
      imageUrl={item.image_url}
      learningLanguage={learningLanguage}
      headerLabel="Shared word"
      statusLabel="Shared"
      actions={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void saveSharedWordToVocabulary()}
            disabled={!currentUserId || savingSharedWord || sharedWordSaved}
            aria-label={
              sharedWordSaved ? "Saved to vocabulary" : "Save to vocabulary"
            }
            title={
              sharedWordSaved ? "Saved to vocabulary" : "Save to vocabulary"
            }
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 disabled:cursor-default ${
              sharedWordSaved
                ? "bg-black text-white"
                : "bg-[#f1eee7] text-black/65 hover:bg-[#e7e2d8]"
            }`}
          >
            {savingSharedWord ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : sharedWordSaved ? (
              <Check size={18} strokeWidth={2} />
            ) : (
              <BookmarkPlus size={18} strokeWidth={1.8} />
            )}
          </button>
        </div>
      }
    />
  );
}

function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Could not read this photo."));
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read this photo."));
        return;
      }

      const image = new Image();

      image.onerror = () => {
        reject(new Error("Could not open this photo."));
      };

      image.onload = () => {
        const scale = Math.min(
          1,
          AI_IMAGE_MAX_DIMENSION / Math.max(image.width, image.height),
        );

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Could not prepare this photo for AI."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", AI_IMAGE_JPEG_QUALITY));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white/70 text-black/60 shadow-[0_1px_4px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-colors hover:bg-white disabled:opacity-40"
    >
      <LogOut size={14} strokeWidth={1.7} />
    </button>
  );
}

function encodeSharedVocabulary(item: VocabularyItem) {
  return `${VOCABULARY_MESSAGE_PREFIX}${JSON.stringify(item)}`;
}

function decodeSharedVocabulary(body: string): VocabularyItem | null {
  if (!body.startsWith(VOCABULARY_MESSAGE_PREFIX)) return null;

  try {
    return JSON.parse(
      body.slice(VOCABULARY_MESSAGE_PREFIX.length),
    ) as VocabularyItem;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingFriendId, setDeletingFriendId] = useState<string | null>(null);
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

      if (!cancelled) {
        setCurrentUserId(user.id);
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

  async function removeFriend(friend: FriendProfile) {
    if (!currentUserId || deletingFriendId) return;

    const friendName = friend.displayName ?? `@${friend.exchangeId}`;

    const confirmed = window.confirm(`Remove ${friendName} from your friends?`);

    if (!confirmed) return;

    setDeletingFriendId(friend.id);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const [userOneId, userTwoId] =
        currentUserId < friend.id
          ? [currentUserId, friend.id]
          : [friend.id, currentUserId];

      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("user_one_id", userOneId)
        .eq("user_two_id", userTwoId);

      if (error) throw error;

      setFriends((current) => current.filter((item) => item.id !== friend.id));
    } catch (removeError) {
      console.error("Could not remove friend:", removeError);

      setErrorMessage(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this friend.",
      );

      throw removeError;
    } finally {
      setDeletingFriendId(null);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f4f1ea] text-neutral-900">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col">
        <header className="sticky top-0 z-30 border-b border-black/[0.07] bg-[#f4f1ea]/90 px-4 py-3 backdrop-blur-2xl">
          <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center">
            <Link
              href="/"
              aria-label="Back to Exchange Notes"
              title="Back"
              className="flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/[0.04] active:scale-95"
            >
              <ArrowLeft size={18} strokeWidth={1.7} />
            </Link>

            <h1 className="min-w-0 truncate px-3 text-center text-[17px] font-semibold tracking-[-0.02em] text-black">
              Messages
            </h1>

            <div className="justify-self-end">
              <IconLogoutButton />
            </div>
          </div>
        </header>

        <section className="flex-1 space-y-3 px-4 py-6">
          {loading && <p className="text-center text-neutral-500">Loading…</p>}

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
            <SwipeableConversationCard
              key={friend.id}
              disabled={deletingFriendId === friend.id}
              onOpen={() => {
                window.location.assign(
                  `/messages?with=${encodeURIComponent(friend.id)}`,
                );
              }}
              onDelete={() => removeFriend(friend)}
            >
              <div
                className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-sm"
                aria-label={`Open conversation with ${
                  friend.displayName ?? friend.exchangeId
                }`}
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
              </div>
            </SwipeableConversationCard>
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
    null,
  );

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const previousMessageCountRef = useRef(0);
  const initialMessagesLoadedRef = useRef(false);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });

    setUnreadCount(0);
    setIsAtBottom(true);
  }, []);

  const updateBottomState = useCallback(() => {
    const container = messagesSectionRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    const nextIsAtBottom = distanceFromBottom <= MESSAGE_BOTTOM_THRESHOLD;

    setIsAtBottom(nextIsAtBottom);

    if (nextIsAtBottom) {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeChat() {
      setUnreadCount(0);
      setIsAtBottom(true);
      previousMessageCountRef.current = 0;
      initialMessagesLoadedRef.current = false;

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
          friendId,
        );
      } catch (conversationError) {
        console.error(
          "Failed to get or create conversation:",
          conversationError,
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

          const { error: shareError } = await supabase.from("messages").insert({
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

        const pendingVocabulary = getPendingSharedVocabulary();

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
            console.error("Failed to share vocabulary:", {
              message: vocabularyShareError.message,
              code: vocabularyShareError.code,
              details: vocabularyShareError.details,
              hint: vocabularyShareError.hint,
            });
            setErrorMessage(
              `Couldn't share that word: ${vocabularyShareError.message}`,
            );
          } else if (insertedVocabularyMessage && !cancelled) {
            clearPendingSharedVocabulary();

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
              (message) => message.id === incomingMessage.id,
            );
            if (alreadyExists) return currentMessages;
            return [...currentMessages, incomingMessage];
          });
        },
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
    const currentCount = messages.length;
    const previousCount = previousMessageCountRef.current;

    if (!initialMessagesLoadedRef.current) {
      if (loading) return;

      initialMessagesLoadedRef.current = true;
      previousMessageCountRef.current = currentCount;

      window.requestAnimationFrame(() => {
        scrollToBottom(false);
      });

      return;
    }

    if (currentCount <= previousCount) {
      previousMessageCountRef.current = currentCount;
      return;
    }

    const newMessages = messages.slice(previousCount);

    const containsOwnMessage = newMessages.some(
      (message) => message.sender_id === currentUserId,
    );

    const incomingMessageCount = newMessages.filter(
      (message) => message.sender_id !== currentUserId,
    ).length;

    if (isAtBottom || containsOwnMessage) {
      window.requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    } else if (incomingMessageCount > 0) {
      setUnreadCount((current) => current + incomingMessageCount);
    }

    previousMessageCountRef.current = currentCount;
  }, [messages, currentUserId, isAtBottom, loading, scrollToBottom]);

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

  async function identifyPhoto(
    file: File,
  ): Promise<AttachmentIdentificationResult> {
    const image = await imageFileToDataUrl(file);

    const response = await fetch("/api/identify-object", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image }),
    });

    const data = (await response.json()) as
      AttachmentIdentificationResult | { error: string };

    if (response.status === 429) {
      throw new Error(
        "AI usage limit reached. Please wait about one minute and try again.",
      );
    }

    if (!response.ok || "error" in data) {
      throw new Error(
        "error" in data ? data.error : "AI could not identify this photo.",
      );
    }

    return data;
  }

  async function handleAttachmentSelected(file: File | undefined) {
    if (!file || !conversationId || !currentUserId || uploading) return;

    const isImage = file.type.startsWith("image/");

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("Files must be smaller than 15 MB.");
      return;
    }

    setUploading(true);
    setErrorMessage("");

    const supabase = createClient();
    let uploadedPath: string | null = null;

    try {
      let identification: AttachmentIdentificationResult | null = null;

      // Analyze the image before creating the message.
      if (isImage) {
        identification = await identifyPhoto(file);
      }

      const safeName =
        file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_") || "attachment";

      uploadedPath = `${conversationId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(uploadedPath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(uploadedPath);

      if (isImage && identification) {
        const now = new Date().toISOString();

        const sharedItem: VocabularyItem = {
          id: `shared-photo-${crypto.randomUUID()}`,
          user_id: currentUserId,
          word: identification.englishName.trim(),
          translation: identification.chineseName.trim(),
          language: "english",
          part_of_speech: identification.partOfSpeech.trim() || null,
          example_sentence: identification.englishExample.trim() || null,
          translated_example: identification.chineseExample.trim() || null,
          image_url: publicUrl,
          confidence: identification.confidence,
          category: identification.category,
          status: "new",
          created_at: now,
          updated_at: now,
        };

        const { error: insertError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          body: encodeSharedVocabulary(sharedItem),
          attachment_url: publicUrl,
          attachment_type: file.type || "image/jpeg",
          attachment_name: file.name,
          shared_article: null,
        });

        if (insertError) throw insertError;
      } else {
        const { error: insertError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          body: "",
          attachment_url: publicUrl,
          attachment_type: file.type || "application/octet-stream",
          attachment_name: file.name,
          shared_article: null,
        });

        if (insertError) throw insertError;
      }
    } catch (uploadError) {
      console.error("Attachment processing failed:", uploadError);

      if (uploadedPath) {
        await supabase.storage
          .from("message-attachments")
          .remove([uploadedPath]);
      }

      setErrorMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not send that attachment.",
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
            : "Couldn't identify that word.",
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
          : "Couldn't save that word.",
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
        <header className="sticky top-0 z-30 border-b border-black/[0.07] bg-[#f4f1ea]/90 px-4 py-3 backdrop-blur-2xl">
          <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center">
            <Link
              href="/messages"
              aria-label="Back to Messages"
              title="Back to Messages"
              className="flex h-9 w-9 items-center justify-center rounded-full text-black/65 transition-colors hover:bg-black/[0.04] active:scale-95"
            >
              <ArrowLeft size={18} strokeWidth={1.7} />
            </Link>

            <div className="min-w-0 px-3 text-center">
              <p className="truncate text-[15px] font-semibold tracking-[-0.015em] text-black">
                {friendProfile
                  ? (friendProfile.displayName ??
                    `@${friendProfile.exchangeId}`)
                  : "Chat"}
              </p>

              {friendProfile?.exchangeId && (
                <p className="mt-0.5 truncate text-[10px] tracking-[0.08em] text-black/35">
                  @{friendProfile.exchangeId}
                </p>
              )}
            </div>

            <button
              type="button"
              aria-label="Conversation details"
              title="Conversation details"
              className="flex h-9 w-9 items-center justify-center justify-self-end rounded-full text-black/55 transition-all hover:bg-black/[0.04] active:scale-95"
            >
              <span className="text-lg leading-none">•••</span>
            </button>
          </div>
        </header>

        <section
          ref={messagesSectionRef}
          onScroll={updateBottomState}
          onMouseUp={handleSelectionChange}
          onTouchEnd={handleSelectionChange}
          className="relative flex-1 space-y-2.5 overflow-y-auto px-4 pb-[150px] pt-4"
        >
          {loading && (
            <p className="text-center text-neutral-500">Loading messages...</p>
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

          {messages.map((message, index) => {
            const isMine = message.sender_id === currentUserId;
            const isImageAttachment =
              message.attachment_type?.startsWith("image/");
            const sharedVocabulary = decodeSharedVocabulary(message.body);

            const previousMessage = index > 0 ? messages[index - 1] : null;

            const showDateDivider =
              !previousMessage ||
              getMessageDateKey(previousMessage.created_at) !==
                getMessageDateKey(message.created_at);

            return (
              <div key={message.id}>
                {showDateDivider && (
                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-black/[0.07]" />

                    <time
                      dateTime={message.created_at}
                      className="shrink-0 rounded-full bg-black/[0.045] px-3 py-1 text-[10px] font-semibold tracking-[0.06em] text-black/40"
                    >
                      {formatMessageDate(message.created_at)}
                    </time>

                    <span className="h-px flex-1 bg-black/[0.07]" />
                  </div>
                )}

                <div
                  className={`message-bubble-enter flex ${
                    isMine ? "justify-end" : "justify-start"
                  }`}
                  style={{
                    animationDelay: `${Math.min(index * 18, 180)}ms`,
                  }}
                >
                  <article
                    className={
                      sharedVocabulary
                        ? "w-[94%] max-w-xl"
                        : `max-w-[78%] rounded-[22px] px-3.5 py-2.5 text-[13px] leading-[1.45] ${
                            isMine
                              ? "rounded-br-md bg-neutral-900 text-white"
                              : "rounded-bl-md bg-white shadow-sm"
                          }`
                    }
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
                      <SharedVocabularyMessage
                        item={sharedVocabulary}
                        currentUserId={currentUserId}
                      />
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
              </div>
            );
          })}

          <div ref={bottomRef} />

          {unreadCount > 0 && !isAtBottom && (
            <div className="pointer-events-none sticky bottom-3 z-20 flex justify-center">
              <button
                type="button"
                onClick={() => scrollToBottom(true)}
                aria-label={`Jump to ${unreadCount} new ${
                  unreadCount === 1 ? "message" : "messages"
                }`}
                className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-black/10 bg-white/95 px-3.5 py-2 text-xs font-semibold text-black shadow-[0_8px_28px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all active:scale-95"
              >
                {unreadCount === 1
                  ? "1 new message"
                  : `${unreadCount} new messages`}

                <ChevronDown size={15} strokeWidth={2} />
              </button>
            </div>
          )}

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
          className="fixed inset-x-0 bottom-[84px] z-40 mx-auto max-w-xl border-t border-black/[0.06] bg-[#f4f1ea]/90 px-3 py-2.5 backdrop-blur-2xl"
        >
          <div className="flex h-12 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/85 px-2 shadow-[0_4px_18px_rgba(0,0,0,0.05)] backdrop-blur-xl">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.rtf,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
              className="hidden"
              onChange={(event) => {
                void handleAttachmentSelected(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              aria-label="Add photo or file"
              title="Add photo or file"
              disabled={uploading || !conversationId}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-black/[0.04] hover:text-black/70 disabled:opacity-30"
            >
              <Paperclip size={18} strokeWidth={1.8} />
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              maxLength={2000}
              placeholder={
                uploading ? "Analyzing and sending…" : "Write a message"
              }
              className="h-10 min-w-0 flex-1 truncate whitespace-nowrap bg-transparent px-2 text-[13px] tracking-[-0.01em] outline-none placeholder:text-black/35"
            />

            <button
              type="submit"
              disabled={sending || !newMessage.trim() || !conversationId}
              className="h-9 shrink-0 rounded-full bg-black px-4 text-[11px] font-semibold tracking-[-0.01em] text-white transition-transform active:scale-95 disabled:bg-black/20 disabled:text-white disabled:opacity-100"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
