"use client";

import WordCard from "@/components/learning/WordCard";
import SwipeableConversationCard from "@/components/messages/SwipeableConversationCard";
import ConversationCard from "@/components/messages/ConversationCard";
import ConversationEmptyState from "@/components/messages/ConversationEmptyState";
import SearchBar from "@/components/messages/SearchBar";
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
import useTranslation from "@/hooks/i18n/useTranslation";
import useMessageSelection from "@/hooks/messages/useMessageSelection";
import useMessageVisibility from "@/hooks/messages/useMessageVisibility";
import type {
  AttachmentIdentificationResult,
  Message,
} from "@/lib/messages/types";
import {
  formatMessageDate,
  getMessageDateKey,
} from "@/lib/messages/date";

const MESSAGE_COLUMNS =
  "id, conversation_id, sender_id, body, created_at, attachment_url, attachment_type, attachment_name, shared_article";

const VOCABULARY_MESSAGE_PREFIX = "__SHARED_VOCABULARY__:";

const AI_IMAGE_MAX_DIMENSION = 1600;
const AI_IMAGE_JPEG_QUALITY = 0.82;
const MESSAGE_BOTTOM_THRESHOLD = 80;

function SharedVocabularyMessage({
  item,
  currentUserId,
}: {
  item: VocabularyItem;
  currentUserId: string | null;
}) {
  const [, setLearningLanguage] = useState<AppLanguage>("english");
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

  const { t } = useTranslation();

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
      statusLabel={t.vocabulary.lookup.share}
      actions={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void saveSharedWordToVocabulary()}
            disabled={!currentUserId || savingSharedWord || sharedWordSaved}
            aria-label={
              sharedWordSaved ? t.capture.result.saved : t.capture.result.saveToVocabulary
            }
            title={
              sharedWordSaved ? t.capture.result.saved : t.capture.result.saveToVocabulary
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
  const { t } = useTranslation();
  const notLoggedInMessage = t.messages.errors.notLoggedIn;
  const loadConversationsMessage = t.messages.errors.loadConversations;

  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
          setErrorMessage(notLoggedInMessage);
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
          setErrorMessage(loadConversationsMessage);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [loadConversationsMessage, notLoggedInMessage]);

  async function removeFriend(friend: FriendProfile) {
    if (!currentUserId || deletingFriendId) return;

    const friendName = friend.displayName ?? `@${friend.exchangeId}`;

    const confirmed = window.confirm(
      t.messages.removeFriendConfirm.replace("{name}", friendName),
    );

    if (!confirmed) return;

    setDeletingFriendId(friend.id);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const [userOneId, userTwoId] =
        currentUserId < friend.id
          ? [currentUserId, friend.id]
          : [friend.id, currentUserId];

      console.info("[friendships/delete] request", {
        currentUserId,
        friendId: friend.id,
        userOneId,
        userTwoId,
      });

      const { data: deletedFriendships, error } = await supabase
        .from("friendships")
        .delete()
        .eq("user_one_id", userOneId)
        .eq("user_two_id", userTwoId)
        .select("id");

      console.info("[friendships/delete] response", {
        deletedFriendships,
        error,
      });

      if (error) throw error;

      if (!deletedFriendships || deletedFriendships.length === 0) {
        throw new Error("No friendship record was deleted.");
      }

      setFriends((current) => current.filter((item) => item.id !== friend.id));
    } catch (removeError) {
      console.error("Could not remove friend:", removeError);

      setErrorMessage(
        removeError instanceof Error
          ? removeError.message
          : t.messages.errors.removeFriend,
      );

      throw removeError;
    } finally {
      setDeletingFriendId(null);
    }
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredFriends = friends.filter((friend) => {
    if (!normalizedSearchQuery) return true;

    const displayName = friend.displayName?.toLowerCase() ?? "";
    const exchangeId = friend.exchangeId.toLowerCase();

    return (
      displayName.includes(normalizedSearchQuery) ||
      exchangeId.includes(normalizedSearchQuery)
    );
  });

  return (
    <main className="min-h-[100dvh] bg-[#f4f1ea] text-neutral-900">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col">
        <header className="sticky top-0 z-[999] border-b border-black/[0.07] bg-[#f4f1ea]/90 px-4 py-4 backdrop-blur-2xl">
          <h1 className="text-center text-[20px] font-semibold tracking-[-0.03em] text-black">
            {t.messages.title}
          </h1>
        </header>

        <section className="flex-1 space-y-3 px-4 py-6">
          {friends.length > 0 && (
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t.messages.searchPlaceholder}
            />
          )}

          {loading && (
            <p className="text-center text-neutral-500">
              {t.messages.loadingConversations}
            </p>
          )}

          {errorMessage && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && filteredFriends.length === 0 && (
            <ConversationEmptyState searchQuery={searchQuery} />
          )}

          {filteredFriends.map((friend) => (
            <SwipeableConversationCard
              key={friend.id}
              disabled={deletingFriendId === friend.id}
              onOpen={() => {
                window.location.assign(
                  `/messages?with=${encodeURIComponent(friend.id)}`,
                );
              }}
              onRemove={() => removeFriend(friend)}
            >
              <ConversationCard friend={friend} />
            </SwipeableConversationCard>
          ))}
        </section>
      </div>
    </main>
  );
}

// ---- Chat room (?with={friendId}) ------------------------------------------

function ChatRoom({ friendId }: { friendId: string }) {
  const { t, isTraditionalChinese } = useTranslation();
  const messageLocale = isTraditionalChinese ? "zh-TW" : "en-US";

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

  // ---- message selection state ----
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deletingMessages, setDeletingMessages] = useState(false);

  const selectableMessageIds = messages.map((message) => message.id);

  const {
    selectionMode,
    selectedMessageIds,
    selectedCount,
    allSelected,
    enterSelectionMode: startSelectionMode,
    exitSelectionMode: stopSelectionMode,
    toggleMessageSelection,
    selectAllMessages,
  } = useMessageSelection({
    messageIds: selectableMessageIds,
  });

  const {
    loadHiddenMessageIds,
    hideMessagesForUser,
  } = useMessageVisibility();

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
        .select(
          "id, exchange_id, display_name, avatar_url, native_language, learning_language",
        )
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
          nativeLanguage: friend.native_language,
          learningLanguage: friend.learning_language,
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

      const loadedHiddenMessageIds = await loadHiddenMessageIds(user.id);

      if (!cancelled) {
        const loadedMessages = (existingMessages ?? []) as Message[];

        setMessages(
          loadedMessages.filter(
            (message) => !loadedHiddenMessageIds.has(message.id),
          ),
        );
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
  }, [friendId, loadHiddenMessageIds]);

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
          favorite: false,
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

  function enterSelectionMode() {
    setConversationMenuOpen(false);
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
    startSelectionMode();
  }

  function exitSelectionMode() {
    setDeleteConfirmationOpen(false);
    stopSelectionMode();
  }

  function handleDeleteSelectedPreview() {
    if (selectedCount === 0) return;
    setDeleteConfirmationOpen(true);
  }

  async function deleteSelectedMessages() {
    if (!currentUserId || selectedCount === 0 || deletingMessages) {
      return;
    }

    const selectedIds = Array.from(selectedMessageIds);
    const selectedIdSet = new Set(selectedIds);

    console.info("[messages/delete-for-me] request", {
      currentUserId,
      selectedIds,
    });

    setDeletingMessages(true);
    setErrorMessage("");

    try {
      await hideMessagesForUser(currentUserId, selectedIds);

      setMessages((current) =>
        current.filter((message) => !selectedIdSet.has(message.id)),
      );

      setDeleteConfirmationOpen(false);
      stopSelectionMode();

      console.info("[messages/delete-for-me] complete", {
        currentUserId,
        hiddenMessageCount: selectedIds.length,
      });
    } catch (deleteError) {
      console.error("Could not hide messages:", deleteError);

      setErrorMessage(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not remove the selected messages for you.",
      );

      setDeleteConfirmationOpen(false);
    } finally {
      setDeletingMessages(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f4f1ea] text-neutral-900">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <header className="sticky top-0 z-[999] border-b border-black/[0.07] bg-[#f4f1ea]/90 px-4 py-3 backdrop-blur-2xl">
          {selectionMode ? (
            <div className="grid grid-cols-[72px_minmax(0,1fr)_72px] items-center">
              <button
                type="button"
                onClick={exitSelectionMode}
                className="justify-self-start text-sm font-semibold text-black/65 transition-opacity active:opacity-50"
              >
                {t.messages.cancel}
              </button>

              <p className="truncate px-2 text-center text-[15px] font-semibold tracking-[-0.015em] text-black">
                {t.messages.selectedCount.replace(
                  "{count}",
                  String(selectedCount),
                )}
              </p>

              <button
                type="button"
                onClick={selectAllMessages}
                disabled={
                  selectableMessageIds.length === 0 || allSelected
                }
                className="justify-self-end text-sm font-semibold text-black/65 transition-opacity disabled:opacity-30 active:opacity-50"
              >
                {t.messages.selectAll}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center">
              <Link
                href="/messages"
                aria-label={t.messages.backToMessages}
                title={t.messages.backToMessages}
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

              <div className="relative justify-self-end">
                <button
                  type="button"
                  onClick={() => setConversationMenuOpen((current) => !current)}
                  aria-label="Conversation details"
                  aria-expanded={conversationMenuOpen}
                  title="Conversation details"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-black/55 transition-all hover:bg-black/[0.04] active:scale-95"
                >
                  <span className="text-lg leading-none">•••</span>
                </button>

                {conversationMenuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close conversation menu"
                      onClick={() => setConversationMenuOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />

                    <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/95 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
                      <button
                        type="button"
                        onClick={enterSelectionMode}
                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-black transition-colors hover:bg-black/[0.045] active:bg-black/[0.08]"
                      >
                        {t.messages.selectMessages}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </header>

        <section
          ref={messagesSectionRef}
          onScroll={updateBottomState}
          onMouseUp={selectionMode ? undefined : handleSelectionChange}
          onTouchEnd={selectionMode ? undefined : handleSelectionChange}
          className="relative flex-1 space-y-2.5 overflow-y-auto px-4 pb-[150px] pt-4"
        >
          {loading && (
            <p className="text-center text-neutral-500">
              {t.messages.loadingMessages}
            </p>
          )}

          {errorMessage && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && messages.length === 0 && (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
              <p className="font-semibold">
                {t.messages.startConversationTitle}
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {t.messages.startConversationDescription}
              </p>
            </div>
          )}

          {messages.map((message, index) => {
            const isMine = message.sender_id === currentUserId;
            const canDelete = isMine;
            const isSelected = selectedMessageIds.has(message.id);
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
                      {formatMessageDate(
                        message.created_at,
                        messageLocale,
                        t.messages.today,
                        t.messages.yesterday,
                      )}
                    </time>

                    <span className="h-px flex-1 bg-black/[0.07]" />
                  </div>
                )}

                <div
                  role={selectionMode && canDelete ? "button" : undefined}
                  tabIndex={selectionMode && canDelete ? 0 : undefined}
                  aria-pressed={
                    selectionMode && canDelete ? isSelected : undefined
                  }
                  onClick={
                    selectionMode && canDelete
                      ? () => toggleMessageSelection(message.id)
                      : undefined
                  }
                  onKeyDown={
                    selectionMode && canDelete
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleMessageSelection(message.id);
                          }
                        }
                      : undefined
                  }
                  className={`message-bubble-enter group flex items-center gap-2 transition-all ${
                    isMine ? "justify-end" : "justify-start"
                  } ${
                    selectionMode
                      ? canDelete
                        ? "cursor-pointer select-none"
                        : "cursor-not-allowed select-none opacity-55"
                      : ""
                  }`}
                  style={{
                    animationDelay: `${Math.min(index * 18, 180)}ms`,
                  }}
                >
                  {selectionMode && canDelete && (
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                        isSelected
                          ? "border-black bg-black text-white"
                          : "border-black/20 bg-white/60 text-transparent"
                      } ${isMine ? "order-2" : "order-none"}`}
                    >
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                  )}

                  <article
                    className={
                      sharedVocabulary
                        ? `w-[94%] max-w-xl transition-all ${
                            isSelected ? "scale-[0.985] opacity-75" : ""
                          }`
                        : `max-w-[78%] rounded-[22px] px-3.5 py-2.5 text-[13px] leading-[1.45] transition-all ${
                            isMine
                              ? "rounded-br-md bg-neutral-900 text-white"
                              : "rounded-bl-md bg-white shadow-sm"
                          } ${
                            isSelected
                              ? "scale-[0.985] ring-2 ring-black/20 ring-offset-2 ring-offset-[#f4f1ea]"
                              : ""
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
                      {new Date(message.created_at).toLocaleTimeString(
                        messageLocale,
                        {
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

        {!selectionMode && (
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
                  uploading
                    ? t.messages.analyzingAndSending
                    : t.messages.inputPlaceholder
                }
                className="h-10 min-w-0 flex-1 truncate whitespace-nowrap bg-transparent px-2 text-[13px] tracking-[-0.01em] outline-none placeholder:text-black/35"
              />

              <button
                type="submit"
                disabled={sending || !newMessage.trim() || !conversationId}
                className="h-9 shrink-0 rounded-full bg-black px-4 text-[11px] font-semibold tracking-[-0.01em] text-white transition-transform active:scale-95 disabled:bg-black/20 disabled:text-white disabled:opacity-100"
              >
                {sending ? "..." : t.messages.send}
              </button>
            </div>
          </form>
        )}

        {selectionMode && (
          <div className="fixed inset-x-0 bottom-[84px] z-40 mx-auto max-w-xl border-t border-black/[0.07] bg-[#f4f1ea]/95 px-4 py-3 backdrop-blur-2xl">
            <button
              type="button"
              onClick={handleDeleteSelectedPreview}
              disabled={selectedCount === 0}
              className="flex h-12 w-full items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:bg-black/[0.08] disabled:text-black/25 active:scale-[0.985]"
            >
              {selectedCount > 0
                ? (
                    selectedCount === 1
                      ? t.messages.deleteSelectedMessage
                      : t.messages.deleteSelectedMessages
                  ).replace("{count}", String(selectedCount))
                : t.messages.delete}
            </button>
          </div>
        )}

        {deleteConfirmationOpen && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 px-4 pb-6 backdrop-blur-sm sm:items-center sm:pb-0">
            <button
              type="button"
              aria-label={t.messages.closeDeleteConfirmation}
              onClick={() => setDeleteConfirmationOpen(false)}
              className="absolute inset-0 cursor-default"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-message-title"
              className="relative z-10 w-full max-w-sm rounded-[28px] bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
            >
              <h2
                id="delete-message-title"
                className="text-center text-lg font-bold tracking-[-0.02em] text-black"
              >
                {(
                  selectedCount === 1
                    ? t.messages.deleteDialogMessage
                    : t.messages.deleteDialogMessages
                ).replace("{count}", String(selectedCount))}
              </h2>

              <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-5 text-black/50">
                {t.messages.deleteDialogDescription}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationOpen(false)}
                  disabled={deletingMessages}
                  className="h-11 rounded-full bg-black/[0.055] text-sm font-bold text-black transition-all disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  {t.messages.cancel}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void deleteSelectedMessages();
                  }}
                  disabled={deletingMessages}
                  className="h-11 rounded-full bg-red-600 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                >
                  {deletingMessages
                    ? t.messages.deleting
                    : t.messages.delete}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
