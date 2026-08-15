"use client";

import { useEffect, useId, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { getTotalUnreadCount } from "@/lib/friends";
import { subscribeToConversationRead } from "@/lib/messages/unreadSignal";
import { createClient } from "@/lib/supabase/client";

type MessageRow = {
  sender_id: string;
};

/**
 * Total unread message count for the nav bar's badge, kept live via two
 * Realtime subscriptions rather than polling:
 *   - new INSERTs on `messages` bump the count by one (skipping messages
 *     the current user sent themselves);
 *   - UPDATEs on the current user's own `conversation_members` rows (i.e.
 *     `markConversationRead` firing when a thread is opened) trigger a
 *     fresh count, since "how many messages did I just read" isn't known
 *     client-side without re-deriving it.
 * The channel is only opened once the current user id is known, so the
 * conversation_members filter is never accidentally built as "no filter"
 * from a still-empty id.
 */
export type UnreadMessageCount = {
  unreadCount: number;
  // Bumped only when unreadCount goes UP (never on read/decrease) — the
  // nav bar uses a change in this value as the trigger to replay its
  // one-shot "pulse ring" animation, per the brief's "outer ring expands
  // once, then stays quiet" spec.
  pulseToken: number;
};

export default function useUnreadMessageCount(): UnreadMessageCount {
  const [unreadCount, setUnreadCount] = useState(0);
  const [pulseToken, setPulseToken] = useState(0);

  /*
   * One topic per hook instance rather than a shared literal.
   *
   * supabase-js hands back the existing channel when two callers ask for the
   * same topic, and a channel that has already been subscribed refuses new
   * postgres_changes callbacks — so the moment a second place on screen
   * wanted the unread count (the Command Deck's Comms node, alongside the
   * dock's badge) the second one threw and never became live.
   */
  const channelTopic = `unread-message-count-${useId()}`;

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    /*
     * Re-derives the count from the database rather than adjusting it
     * locally: "how many of the unread messages did that read just clear"
     * is not knowable client-side without redoing the whole calculation.
     */
    const recount = () => {
      void getTotalUnreadCount(supabase)
        .then((count) => {
          if (cancelled) return;
          setUnreadCount((previous) => {
            if (count > previous) setPulseToken((token) => token + 1);
            return count;
          });
        })
        .catch(() => {
          // Leave the badge as it is rather than guessing.
        });
    };

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      try {
        const count = await getTotalUnreadCount(supabase);
        if (!cancelled) setUnreadCount(count);
      } catch {
        // Not signed in yet, or the RPC isn't reachable — badge just stays
        // at 0 rather than blocking the rest of the nav.
      }

      if (cancelled) return;

      channel = supabase
        .channel(channelTopic)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const message = payload.new as MessageRow;
            if (message.sender_id === user.id) return;
            setUnreadCount((count) => count + 1);
            setPulseToken((token) => token + 1);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversation_members",
            filter: `user_id=eq.${user.id}`,
          },
          recount,
        )
        .subscribe();
    }

    void init();

    /*
     * The same recount, driven locally by whichever tab did the reading.
     *
     * The Realtime subscription above covers reads made on another device,
     * but it only fires if `conversation_members` is in the
     * `supabase_realtime` publication — and it was not, so the badge counted
     * up on every incoming message and never came back down. This path does
     * not depend on that, and it reacts as soon as the thread is opened
     * instead of after a server round trip.
     */
    const unsubscribe = subscribeToConversationRead(recount);

    return () => {
      cancelled = true;
      unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [channelTopic]);

  return { unreadCount, pulseToken };
}
