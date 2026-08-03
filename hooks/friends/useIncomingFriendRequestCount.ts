"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { getPendingIncomingRequestCount } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";

type FriendRequestRow = {
  receiver_id: string;
  status: string;
};

/**
 * Live count of pending incoming friend requests, mirroring
 * useUnreadMessageCount's realtime-over-polling approach. Fixes a real gap:
 * friend_requests rows were already being written correctly and were fully
 * readable by the receiver under RLS, but nothing in the app ever counted
 * or badged them anywhere — so an incoming request only ever showed up if
 * the receiver happened to open /friends on their own, with zero prompt to
 * do so.
 */
export type IncomingFriendRequestCount = {
  count: number;
  pulseToken: number;
};

export default function useIncomingFriendRequestCount(): IncomingFriendRequestCount {
  const [count, setCount] = useState(0);
  const [pulseToken, setPulseToken] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      try {
        const initialCount = await getPendingIncomingRequestCount(
          supabase,
          user.id
        );
        if (!cancelled) setCount(initialCount);
      } catch {
        // Not signed in yet, or the table isn't reachable — badge just
        // stays at 0 rather than blocking the rest of the nav.
      }

      if (cancelled) return;

      channel = supabase
        .channel("incoming-friend-request-count")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "friend_requests",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            const request = payload.new as FriendRequestRow;
            if (request.status !== "pending") return;
            setCount((current) => current + 1);
            setPulseToken((token) => token + 1);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "friend_requests",
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            // Covers accept/decline (including from another device) —
            // cheap to just recount rather than trying to diff statuses.
            void getPendingIncomingRequestCount(supabase, user.id).then(
              (nextCount) => {
                if (!cancelled) setCount(nextCount);
              }
            );
          }
        )
        .subscribe();
    }

    void init();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return { count, pulseToken };
}
