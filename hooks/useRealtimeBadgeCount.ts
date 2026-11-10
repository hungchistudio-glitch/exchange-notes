"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/supabase/sessionUser";

type Options = {
  topic: string;
  readCount: (client: SupabaseClient, userId: string) => Promise<number>;
  bindChanges: (channel: RealtimeChannel, userId: string, refresh: () => void) => void;
  subscribeLocal?: (refresh: () => void) => () => void;
};

type Badge = { count: number; pulseToken: number };

/*
 * One count per badge, however many places show it.
 *
 * Each caller used to run its own copy: its own channel, its own query on
 * start, another when the channel joined and another on `pageshow`. Home and
 * the navigation both show the unread and friend-request counts, so opening
 * the app asked the database for each of them five times (measured on
 * production, 2026-11-10) — ten of the eighteen requests a cold start made,
 * all for two numbers, and on a weak signal ahead of the words.
 *
 * Now the first screen to want a badge starts it and the last to leave
 * stops it; everyone between shares the channel and the answer. Database
 * counts are still authoritative and events still only ask for a recount.
 */
type Store = {
  badge: Badge;
  listeners: Set<() => void>;
  stop: (() => void) | null;
};

const INITIAL: Badge = { count: 0, pulseToken: 0 };
const stores = new Map<string, Store>();
let generation = 0;

function start(store: Store, { topic, readCount, bindChanges, subscribeLocal }: Options): () => void {
  const client = createClient();
  let active = true;
  let userId: string | null = null;
  let channel: RealtimeChannel | null = null;
  let running = false;
  let dirty = false;
  let initialized = false;
  let starting = false;

  const publish = (badge: Badge) => {
    store.badge = badge;
    for (const listener of store.listeners) listener();
  };

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
            const previous = store.badge;
            publish({
              count,
              pulseToken: previous.pulseToken + (canPulse && count > previous.count ? 1 : 0),
            });
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

  const topicName = `${topic}:${++generation}`;
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
  /*
   * Only a page restored from the back/forward cache. `pageshow` also fires
   * on every ordinary load, a moment after the start above has already
   * asked: that was one of the duplicates.
   */
  const onPageShow = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) refresh();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", refresh);
  window.addEventListener("pageshow", onPageShow);
  const unsubscribe = subscribeLocal?.(refresh);

  return () => {
    active = false;
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", refresh);
    window.removeEventListener("pageshow", onPageShow);
    unsubscribe?.();
    if (channel) void client.removeChannel(channel).catch(() => {});
  };
}

/** Database counts are authoritative; events only request a refresh. */
export default function useRealtimeBadgeCount(options: Options): Badge {
  const { topic } = options;

  const subscribe = useCallback(
    (listener: () => void) => {
      let store = stores.get(topic);
      if (!store) {
        store = { badge: INITIAL, listeners: new Set(), stop: null };
        stores.set(topic, store);
      }
      store.listeners.add(listener);
      if (!store.stop) store.stop = start(store, options);

      const own = store;
      return () => {
        own.listeners.delete(listener);
        if (own.listeners.size > 0) return;
        own.stop?.();
        own.stop = null;
        if (stores.get(topic) === own) stores.delete(topic);
      };
    },
    // The options are module-level functions in every caller; the topic is
    // what identifies the badge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic],
  );

  const getSnapshot = useCallback(() => stores.get(topic)?.badge ?? INITIAL, [topic]);

  return useSyncExternalStore(subscribe, getSnapshot, () => INITIAL);
}
