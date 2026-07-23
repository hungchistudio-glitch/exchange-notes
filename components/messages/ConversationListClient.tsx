"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ConversationCard from "@/components/messages/ConversationCard";
import ConversationEmptyState from "@/components/messages/ConversationEmptyState";
import SearchBar from "@/components/messages/SearchBar";
import SwipeableConversationCard from "@/components/messages/SwipeableConversationCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  listConversationSummaries,
  type ConversationSummary,
  type FriendProfile,
} from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";

export function ConversationList() {
  const { t } = useTranslation();
  const router = useRouter();
  const notLoggedInMessage = t.messages.errors.notLoggedIn;
  const loadConversationsMessage = t.messages.errors.loadConversations;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingFriendId, setDeletingFriendId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const refreshConversations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const supabase = createClient();
      const conversationData = await listConversationSummaries(
        supabase,
        currentUserId
      );

      setConversations(conversationData);
    } catch (refreshError) {
      console.error(
        "Failed to refresh conversation summaries:",
        refreshError
      );
    }
  }, [currentUserId]);

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
        const conversationData = await listConversationSummaries(
          supabase,
          user.id
        );

        if (!cancelled) {
          setConversations(conversationData);
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

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`conversation-list:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const incomingMessage = payload.new as {
            conversation_id?: string;
            sender_id?: string;
          };

          if (
            !incomingMessage.conversation_id ||
            incomingMessage.sender_id === currentUserId
          ) {
            return;
          }

          setConversations((current) =>
            current.map((conversation) =>
              conversation.conversationId ===
              incomingMessage.conversation_id
                ? {
                    ...conversation,
                    unreadCount: conversation.unreadCount + 1,
                  }
                : conversation
            )
          );
        }
      )
      .subscribe();

    function handleWindowFocus() {
      void refreshConversations();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshConversations();
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      void supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshConversations]);

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

      setConversations((current) =>
        current.filter((item) => item.friend.id !== friend.id)
      );
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

  const filteredConversations = conversations.filter(({ friend }) => {
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
          {conversations.length > 0 && (
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

          {!loading && !errorMessage && filteredConversations.length === 0 && (
            <ConversationEmptyState searchQuery={searchQuery} />
          )}

          {filteredConversations.map(({ friend, unreadCount }) => (
            <SwipeableConversationCard
              key={friend.id}
              disabled={deletingFriendId === friend.id}
              onOpen={() => {
                router.push(`/messages/${encodeURIComponent(friend.id)}`);
              }}
              onRemove={() => removeFriend(friend)}
            >
              <ConversationCard
                friend={friend}
                unreadCount={unreadCount}
              />
            </SwipeableConversationCard>
          ))}
        </section>
      </div>
    </main>
  );
}
