"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import useRealtimeBadgeCount from "@/hooks/useRealtimeBadgeCount";
import { getPendingIncomingRequestCount } from "@/lib/friends";

export type IncomingFriendRequestCount = { count: number; pulseToken: number };

function bindChanges(channel: RealtimeChannel, userId: string, refresh: () => void) {
  channel.on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "friend_requests",
    filter: `receiver_id=eq.${userId}`,
  }, refresh);
}

export default function useIncomingFriendRequestCount(): IncomingFriendRequestCount {
  return useRealtimeBadgeCount({
    topic: "incoming-friend-request-count",
    readCount: getPendingIncomingRequestCount,
    bindChanges,
  });
}
