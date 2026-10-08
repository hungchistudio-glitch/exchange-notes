"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/supabase/sessionUser";

type Options = {
  topic: string;
  readCount: (client: SupabaseClient, userId: string) => Promise<number>;
  bindChanges: (channel: RealtimeChannel, userId: string, refresh: () => void) => void;
  subscribeLocal?: (refresh: () => void) => () => void;
};

/** Database counts are authoritative; events only request a refresh. */
export default function useRealtimeBadgeCount({ topic, readCount, bindChanges, subscribeLocal }: Options) {
  const [badge, setBadge] = useState({ count: 0, pulseToken: 0 });
  const instanceId = useId();
  const generation = useRef(0);

  useEffect(() => {
    const client = createClient();
    let active = true;
    let userId: string | null = null;
    let channel: RealtimeChannel | null = null;
    let running = false;
    let dirty = false;
    let initialized = false;
    let starting = false;

    const refresh = () => {
      if (!active) return;
      if (!userId) { void init(); return; }
      const currentUserId = userId;
      dirty = true;
      if (running) return;
      running = true;
      void (async () => {
        try {
          while (active && dirty) {
            dirty = false;
            try {
              const count = await readCount(client, currentUserId);
              // An event during the query makes its snapshot stale. Coalesce
              // those events into one follow-up query instead of racing them.
              if (!active || dirty) continue;
              const canPulse = initialized;
              initialized = true;
              setBadge(previous => ({
                count,
                pulseToken: previous.pulseToken + (canPulse && count > previous.count ? 1 : 0),
              }));
            } catch {
              // A failed refresh must neither clear the badge nor reject an
              // unobserved promise. The next event/resume retries normally.
            }
          }
        } finally {
          running = false;
        }
      })();
    };

    const topicName = `${topic}:${instanceId}:${++generation.current}`;
    async function init() {
      if (!active || starting || userId) return;
      starting = true;
      try {
        const user = await getSessionUser(client);
        if (!active || !user) return;
        userId = user.id;
        channel = client.channel(topicName);
        bindChanges(channel, user.id, refresh);
        channel.subscribe(status => {
          if (status === "SUBSCRIBED") refresh();
        });
        refresh();
      } catch {
        // Navigation and badges remain usable if auth or Realtime is offline.
        if (userId) refresh();
      } finally {
        starting = false;
      }
    }
    void init();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", refresh);
    const unsubscribe = subscribeLocal?.(refresh);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", refresh);
      unsubscribe?.();
      if (channel) void client.removeChannel(channel).catch(() => {});
    };
  }, [topic, instanceId, readCount, bindChanges, subscribeLocal]);

  return badge;
}
