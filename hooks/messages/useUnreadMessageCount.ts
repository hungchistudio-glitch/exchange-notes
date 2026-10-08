"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import useRealtimeBadgeCount from "@/hooks/useRealtimeBadgeCount";
import { getTotalUnreadCount } from "@/lib/friends";
import { subscribeToConversationRead } from "@/lib/messages/unreadSignal";

export type UnreadMessageCount = { unreadCount: number; pulseToken: number };

function bindChanges(channel: RealtimeChannel, userId: string, refresh: () => void) {
  channel
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
    .on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}`,
    }, refresh);
}

export default function useUnreadMessageCount(): UnreadMessageCount {
  const { count, pulseToken } = useRealtimeBadgeCount({
    topic: "unread-message-count",
    readCount: getTotalUnreadCount,
    bindChanges,
    subscribeLocal: subscribeToConversationRead,
  });
  return { unreadCount: count, pulseToken };
}
