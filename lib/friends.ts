import { SupabaseClient } from "@supabase/supabase-js";

import { WORD_CARD_MARKER } from "@/lib/messages/wordCard";
import { notifyConversationRead } from "@/lib/messages/unreadSignal";
import { notifyPushEvent } from "@/lib/push/eventsClient";
import { normalizeExchangeId } from "@/lib/utils";

export type FriendProfile = {
  id: string;
  displayName: string | null;
  exchangeId: string;
  avatarUrl: string | null;
  nativeLanguage: "english" | "traditional-chinese";
  learningLanguage: "english" | "traditional-chinese";
};

export type LastMessagePreview = {
  body: string;
  createdAt: string;
  senderId: string;
  attachmentType: string | null;
};

export type ConversationSummary = {
  friend: FriendProfile;
  conversationId: string | null;
  lastReadAt: string | null;
  unreadCount: number;
  lastMessage: LastMessagePreview | null;
  mutedAt: string | null;

  /*
   * How many shared word cards this conversation holds — the "1 phrase" chip
   * on a conversation row.
   *
   * Deliberately a count of language that actually changed hands rather than a
   * prediction: nothing here claims a phrase is worth learning, only that one
   * was sent. 0 when the count could not be read, which is why the chip is
   * hidden rather than shown as zero.
   */
  learningSignalCount: number;
};

/** A conversation opened by its own id, rather than by who it is with. */
export type ConversationContext = {
  conversationId: string;
  friend: FriendProfile | null;
  mutedAt: string | null;
  archivedAt: string | null;
  lastReadAt: string | null;
};

export type IncomingRequest = {
  requestId: string;
  createdAt: string;
  sender: FriendProfile;
};

export type OutgoingRequest = {
  requestId: string;
  createdAt: string;
  receiver: FriendProfile;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  exchange_id: string;
  avatar_url: string | null;
  native_language: "english" | "traditional-chinese";
  learning_language: "english" | "traditional-chinese";
};

/**
 * public.profiles is owner-only, so reading anyone else goes through this
 * view. It carries exactly the columns below and nothing private — see the
 * migration that creates it. Every lookup here is about someone other than
 * the signed-in user, which is why none of them touch the table directly.
 */
const PUBLIC_PROFILES = "public_profiles";
const PUBLIC_PROFILE_COLUMNS =
  "id, display_name, exchange_id, avatar_url, native_language, learning_language";

function toFriendProfile(row: ProfileRow): FriendProfile {
  return {
    id: row.id,

    /*
     * An empty display name is normalised to null here rather than at the
     * places that render it.
     *
     * Every one of those falls back with `displayName ?? exchangeId`, which
     * only catches null — and the column holds "" for accounts that finished
     * sign-up without typing a name. The result was a conversation row with
     * no name and no handle at all: blank where the person should be. Doing
     * it once, at the point the row becomes a FriendProfile, fixes the
     * message list, the thread header and the friend picker together, and
     * keeps the existing `??` at each of those sites correct.
     */
    displayName: row.display_name?.trim() ? row.display_name.trim() : null,
    exchangeId: row.exchange_id,
    avatarUrl: row.avatar_url,
    nativeLanguage: row.native_language,
    learningLanguage: row.learning_language,
  };
}

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export const FRIEND_INVITE_PARAM = "add";

/**
 * Survives only the round trip through Google's OAuth screen, so it is scoped
 * as tightly as that allows: httpOnly so no script can read who invited whom,
 * and Lax rather than Strict because the browser arrives back here as a
 * top-level navigation from accounts.google.com, which Strict would drop.
 */
export const PENDING_FRIEND_INVITE_COOKIE = "exchange-notes-pending-invite";
export const PENDING_FRIEND_INVITE_MAX_AGE_SECONDS = 15 * 60;

/**
 * Where a scanned friend QR ultimately lands. Callers pass an already
 * normalized Exchange ID; normalizeExchangeId caps it at 24 characters of
 * [a-z0-9_], so there is nothing here that could steer the redirect.
 */
export function friendInvitePath(exchangeId: string): string {
  return `/friends?${FRIEND_INVITE_PARAM}=${encodeURIComponent(exchangeId)}`;
}

/**
 * The friend QR code encodes an ordinary https link, not `exchangenotes://`.
 * A custom scheme is only openable by the sideloaded native app — which needs
 * Developer Mode and a provisioning profile that expires weekly — and even
 * there `add-friend` was not a known route, so it landed on Home. An https
 * link is recognised by the system camera on any phone and opens the installed
 * PWA, or the browser.
 *
 * It points at /invite rather than straight at /friends because /friends is
 * behind the login wall: a route handler is the only place that can park the
 * pending invite in a cookie so it survives signing in.
 *
 * The origin comes from the caller rather than a build-time constant so a
 * Vercel Preview build produces a QR that points back at that same preview.
 */
export function friendInviteUrl(
  exchangeId: string,
  origin: string
): string {
  return `${origin}/invite/${encodeURIComponent(normalizeExchangeId(exchangeId))}`;
}

/**
 * Pulls the Exchange ID back out of whatever a QR code decoded to — both the
 * /invite/<id> links this app generates and the older /friends?add=<id> form.
 * Returns "" for anything else, including a valid URL from somewhere entirely
 * unrelated, which is what the scanner needs to tell "not our code" apart from
 * "our code, unreadable".
 */
export function exchangeIdFromInviteUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return "";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "";
  }

  const inviteMatch = url.pathname.match(/^\/invite\/([^/]+)\/?$/);

  if (inviteMatch) {
    return normalizeExchangeId(decodeURIComponent(inviteMatch[1]));
  }

  if (url.pathname.replace(/\/$/, "") === "/friends") {
    return normalizeExchangeId(
      url.searchParams.get(FRIEND_INVITE_PARAM) ?? ""
    );
  }

  return "";
}

/** Look up a single profile by its user id. */
export async function getProfileById(
  supabase: SupabaseClient,
  userId: string
): Promise<FriendProfile | null> {
  const { data, error } = await supabase
    .from(PUBLIC_PROFILES)
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toFriendProfile(data as ProfileRow) : null;
}

/** Look up a single profile by its public Exchange ID (case-insensitive). */
export async function findProfileByExchangeId(
  supabase: SupabaseClient,
  exchangeId: string
): Promise<FriendProfile | null> {
  const clean = exchangeId.trim().replace(/^@/, "").toLowerCase();
  if (!clean) return null;

  const { data, error } = await supabase
    .from(PUBLIC_PROFILES)
    .select(PUBLIC_PROFILE_COLUMNS)
    .ilike("exchange_id", clean)
    .maybeSingle();

  if (error) throw error;
  return data ? toFriendProfile(data as ProfileRow) : null;
}

export type SendRequestResult =
  | { status: "sent" }
  | { status: "already-friends" }
  | { status: "already-pending" }
  | { status: "self" };

/** Send a friend request, handling the "already connected" cases gracefully. */
export async function sendFriendRequest(
  supabase: SupabaseClient,
  currentUserId: string,
  targetUserId: string
): Promise<SendRequestResult> {
  if (currentUserId === targetUserId) {
    return { status: "self" };
  }

  const [userOneId, userTwoId] = orderedPair(currentUserId, targetUserId);

  const { data: existingFriendship, error: friendshipError } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_one_id", userOneId)
    .eq("user_two_id", userTwoId)
    .maybeSingle();

  if (friendshipError) throw friendshipError;
  if (existingFriendship) {
    return { status: "already-friends" };
  }

  const { data: existing, error: existingError } = await supabase
    .from("friend_requests")
    .select("id, status, sender_id, receiver_id")
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (existing.status === "pending") return { status: "already-pending" };

    // Old request is accepted/declined. UPDATE would be blocked by RLS
    // unless we happen to be the receiver of that old row, so instead we
    // delete it (either party may delete) and insert a fresh one.
    const { error: deleteError } = await supabase
      .from("friend_requests")
      .delete()
      .eq("id", existing.id);

    if (deleteError) throw deleteError;

    const { error: reinsertError } = await supabase.from("friend_requests").insert({
      sender_id: currentUserId,
      receiver_id: targetUserId,
      status: "pending",
    });

    if (reinsertError) throw reinsertError;

    void notifyPushEvent({
      kind: "friend-request",
      targetUserId,
    });

    return { status: "sent" };
  }

  const { error: insertError } = await supabase.from("friend_requests").insert({
    sender_id: currentUserId,
    receiver_id: targetUserId,
    status: "pending",
  });

  if (insertError) throw insertError;

  void notifyPushEvent({
    kind: "friend-request",
    targetUserId,
  });

  return { status: "sent" };
}

export async function listIncomingRequests(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<IncomingRequest[]> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select(
      "id, created_at, sender:profiles!friend_requests_sender_id_fkey(id, display_name, exchange_id, avatar_url, native_language, learning_language)"
    )
    .eq("receiver_id", currentUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];

  return rows.map((row) => {
    // sender_id -> profiles.id is many-to-one (each request has exactly
    // one sender), so PostgREST embeds it as a single object at runtime —
    // indexing it with [0] (as this used to) always read `undefined` off
    // the object and threw on every row. supabase-js's structural type
    // inference here (no generated Database types passed to createClient)
    // can't read cardinality off the select string though, so it types
    // this as ProfileRow[] regardless of the true runtime shape — hence
    // the cast rather than a plain assignment.
    const sender = row.sender as unknown as ProfileRow;

    if (!sender) {
      throw new Error("Incoming friend request is missing its sender profile.");
    }

    return {
      requestId: row.id,
      createdAt: row.created_at,
      sender: toFriendProfile(sender),
    };
  });
}

/**
 * Count of pending incoming friend requests, for badges (nav dot, home
 * card). The requests themselves were always correctly written and
 * readable under RLS — this was simply never counted or surfaced anywhere
 * outside the /friends page itself, so an incoming request could sit
 * unnoticed unless the receiver happened to open that page on their own.
 */
export async function getPendingIncomingRequestCount(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("friend_requests")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", currentUserId)
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}

export async function listOutgoingRequests(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<OutgoingRequest[]> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select(
      "id, created_at, receiver:profiles!friend_requests_receiver_id_fkey(id, display_name, exchange_id, avatar_url, native_language, learning_language)"
    )
    .eq("sender_id", currentUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];

  return rows.map((row) => {
    // Same fix as listIncomingRequests above: receiver_id -> profiles.id is
    // many-to-one, so this embeds as a single object at runtime, not an
    // array — the type is cast for the same reason (see the comment
    // there).
    const receiver = row.receiver as unknown as ProfileRow;

    if (!receiver) {
      throw new Error("Outgoing friend request is missing its receiver profile.");
    }

    return {
      requestId: row.id,
      createdAt: row.created_at,
      receiver: toFriendProfile(receiver),
    };
  });
}

export async function listFriends(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<FriendProfile[]> {
  const { data: links, error: linksError } = await supabase
    .from("friendships")
    .select("user_one_id, user_two_id")
    .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`);

  if (linksError) throw linksError;
  if (!links || links.length === 0) return [];

  const otherIds = links.map((row) =>
    row.user_one_id === currentUserId ? row.user_two_id : row.user_one_id
  );

  const { data: profiles, error: profilesError } = await supabase
    .from(PUBLIC_PROFILES)
    .select(PUBLIC_PROFILE_COLUMNS)
    .in("id", otherIds);

  if (profilesError) throw profilesError;

  const byId = new Map(
    (profiles ?? []).map((row) => [row.id, toFriendProfile(row as ProfileRow)])
  );

  return otherIds
    .map((id) => byId.get(id))
    .filter((profile): profile is FriendProfile => Boolean(profile));
}

/**
 * Which shelf of the message list to build.
 *
 * "active" is the Recent list on /messages; "archived" is the separate
 * /messages/archived screen. They are the same query against opposite sides
 * of `hidden_at`, so they share one implementation rather than drifting into
 * two subtly different definitions of what a conversation is.
 */
export type ConversationScope = "active" | "archived";

export async function listConversationSummaries(
  supabase: SupabaseClient,
  currentUserId: string,
  scope: ConversationScope = "active"
): Promise<ConversationSummary[]> {
  const friends = await listFriends(supabase, currentUserId);

  if (friends.length === 0) {
    return [];
  }

  const membershipQuery = supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at, hidden_at, muted_at")
    .eq("user_id", currentUserId);

  const { data: myMemberships, error: membershipsError } =
    scope === "archived"
      ? await membershipQuery.not("hidden_at", "is", null)
      : await membershipQuery.is("hidden_at", null);

  if (membershipsError) throw membershipsError;

  if (!myMemberships || myMemberships.length === 0) {
    /*
     * An archived list with no archived memberships is empty, full stop.
     * The active list still has something to say: every friend you have not
     * written to yet is someone you could write to, which is what makes the
     * Friends tab and the empty-state list useful on a new account.
     */
    if (scope === "archived") return [];

    return friends.map((friend) => ({
      friend,
      conversationId: null,
      lastReadAt: null,
      unreadCount: 0,
      lastMessage: null,
      mutedAt: null,
      learningSignalCount: 0,
    }));
  }

  const conversationIds = myMemberships.map(
    (membership) => membership.conversation_id
  );

  const friendIds = new Set(friends.map((friend) => friend.id));

  const { data: otherMemberships, error: otherMembershipsError } =
    await supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds)
      .neq("user_id", currentUserId);

  if (otherMembershipsError) throw otherMembershipsError;

  const conversationByFriendId = new Map<string, string>();

  for (const membership of otherMemberships ?? []) {
    if (
      friendIds.has(membership.user_id) &&
      !conversationByFriendId.has(membership.user_id)
    ) {
      conversationByFriendId.set(
        membership.user_id,
        membership.conversation_id
      );
    }
  }

  const lastReadByConversationId = new Map<string, string | null>(
    myMemberships.map((membership) => [
      membership.conversation_id,
      membership.last_read_at,
    ])
  );

  const mutedAtByConversationId = new Map<string, string | null>(
    myMemberships.map((membership) => [
      membership.conversation_id,
      membership.muted_at,
    ])
  );

  const relevantConversationIds = Array.from(
    new Set(conversationByFriendId.values())
  );

  // One most-recent-message-per-conversation preview, for the "116 saved..."
  // style dashboard-y list to instead read like an actual conversation
  // list. Fetches a bounded window of the newest messages across all
  // relevant conversations (newest-first) and keeps just the first one seen
  // per conversation — cheaper than a per-conversation query, and 500 rows
  // comfortably covers "at least the latest message" for any conversation
  // count a friends-based 1:1 messaging app is likely to have.
  const lastMessageByConversationId = new Map<string, LastMessagePreview>();

  /*
   * Shared word cards per conversation, from their own query rather than from
   * the preview window above.
   *
   * Counting them inside that window looked free and was wrong: the window is
   * the newest 500 messages across *all* of the user's conversations, which is
   * enough to guarantee a latest message for each one but says nothing about
   * how many cards each holds. Past 500 messages in total, a quiet
   * conversation's count silently fell to zero, and any conversation's count
   * changed when an unrelated one got busy.
   *
   * This query is bounded by the number of cards rather than the number of
   * messages — a far smaller and slower-growing quantity — and runs alongside
   * the preview fetch so it costs no extra latency.
   */
  const learningSignalByConversationId = new Map<string, number>();

  if (relevantConversationIds.length > 0) {
    const [
      { data: recentMessages, error: recentMessagesError },
      { data: wordCardRows, error: wordCardError },
    ] = await Promise.all([
      supabase
        .from("messages")
        .select("conversation_id, sender_id, body, created_at, attachment_type")
        .in("conversation_id", relevantConversationIds)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", relevantConversationIds)
        .like("body", `${WORD_CARD_MARKER}%`)
        .limit(2000),
    ]);

    if (recentMessagesError) throw recentMessagesError;

    /*
     * Tolerated rather than thrown. The count drives one decorative chip; the
     * conversation list is the page. A chip that fails to appear is a smaller
     * problem than a Messages screen that will not load.
     */
    if (wordCardError) {
      console.warn("Could not count shared phrases:", wordCardError);
    } else {
      for (const row of wordCardRows ?? []) {
        learningSignalByConversationId.set(
          row.conversation_id,
          (learningSignalByConversationId.get(row.conversation_id) ?? 0) + 1
        );
      }
    }

    for (const message of recentMessages ?? []) {
      if (lastMessageByConversationId.has(message.conversation_id)) continue;

      lastMessageByConversationId.set(message.conversation_id, {
        body: message.body,
        createdAt: message.created_at,
        senderId: message.sender_id,
        attachmentType: message.attachment_type,
      });
    }
  }

  const unreadCountByConversationId = new Map<string, number>();

  if (relevantConversationIds.length > 0) {
    const lastReadTimes = relevantConversationIds
      .map((conversationId) =>
        lastReadByConversationId.get(conversationId)
      )
      .filter((value): value is string => Boolean(value));

    const earliestLastReadAt =
      lastReadTimes.length > 0
        ? lastReadTimes.reduce((earliest, current) =>
            current < earliest ? current : earliest
          )
        : new Date(0).toISOString();

    const { data: unreadMessages, error: unreadMessagesError } =
      await supabase
        .from("messages")
        .select("conversation_id, sender_id, created_at")
        .in("conversation_id", relevantConversationIds)
        .neq("sender_id", currentUserId)
        .gt("created_at", earliestLastReadAt);

    if (unreadMessagesError) throw unreadMessagesError;

    for (const message of unreadMessages ?? []) {
      const lastReadAt =
        lastReadByConversationId.get(message.conversation_id) ??
        new Date(0).toISOString();

      if (message.created_at <= lastReadAt) continue;

      unreadCountByConversationId.set(
        message.conversation_id,
        (unreadCountByConversationId.get(message.conversation_id) ?? 0) + 1
      );
    }
  }

  const summaries = friends
    // An archived conversation is a conversation. A friend you have simply
    // never written to has nothing to un-archive, so they do not belong here.
    .filter(
      (friend) => scope === "active" || conversationByFriendId.has(friend.id)
    )
    .map((friend) => {
      const conversationId = conversationByFriendId.get(friend.id) ?? null;

      return {
        friend,
        conversationId,
        lastReadAt: conversationId
          ? lastReadByConversationId.get(conversationId) ?? null
          : null,
        unreadCount: conversationId
          ? unreadCountByConversationId.get(conversationId) ?? 0
          : 0,
        lastMessage: conversationId
          ? lastMessageByConversationId.get(conversationId) ?? null
          : null,
        mutedAt: conversationId
          ? mutedAtByConversationId.get(conversationId) ?? null
          : null,
        learningSignalCount: conversationId
          ? learningSignalByConversationId.get(conversationId) ?? 0
          : 0,
      };
    });

  /*
   * Most recent conversation first.
   *
   * These used to come back in friend order, which is the order friendships
   * were accepted in — so a friend who had never sent a message sat above a
   * thread with something unread in it, and a new message never moved its
   * conversation anywhere. The list is sorted by activity now, which is what
   * a messages list is for.
   *
   * Friends with no messages yet keep their relative order at the bottom:
   * they are people you could write to, not conversations you are having.
   */
  return summaries.sort((a, b) => {
    const aAt = a.lastMessage?.createdAt ?? null;
    const bAt = b.lastMessage?.createdAt ?? null;

    if (aAt && bAt) return bAt.localeCompare(aAt);
    if (aAt) return -1;
    if (bAt) return 1;
    return 0;
  });
}

/**
 * Total unread message count across every conversation, for the nav bar's
 * badge. Uses a single-round-trip Postgres function (get_total_unread_count)
 * that mirrors listConversationSummaries's per-conversation unread logic,
 * rather than re-fetching every friend/membership/message client-side just
 * to sum a number.
 */
export async function getTotalUnreadCount(
  supabase: SupabaseClient
): Promise<number> {
  const { data, error } = await supabase.rpc("get_total_unread_count");
  if (error) throw error;
  return data ?? 0;
}

export async function respondToRequest(
  supabase: SupabaseClient,
  requestId: string,
  response: "accepted" | "declined"
): Promise<void> {
  const { data: request, error: requestError } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id")
    .eq("id", requestId)
    .single();

  if (requestError) throw requestError;

  const { error: updateError } = await supabase
    .from("friend_requests")
    .update({ status: response })
    .eq("id", requestId);

  if (updateError) throw updateError;

  if (response !== "accepted") return;

  const [userOneId, userTwoId] = orderedPair(
    request.sender_id,
    request.receiver_id
  );

  const { error: friendshipError } = await supabase
    .from("friendships")
    .upsert(
      { user_one_id: userOneId, user_two_id: userTwoId },
      { onConflict: "user_one_id,user_two_id", ignoreDuplicates: true }
    );

  if (friendshipError) throw friendshipError;

  await getOrCreateConversationWithFriend(
    supabase,
    request.sender_id,
    request.receiver_id
  );

  void notifyPushEvent({
    kind: "friend-accepted",
    requestId,
  });
}

export async function cancelRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<void> {
  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId);

  if (error) throw error;
}

/** Remove an existing friendship (unfriend). Does not delete past messages. */
export async function removeFriend(
  supabase: SupabaseClient,
  currentUserId: string,
  friendId: string
): Promise<void> {
  const [userOneId, userTwoId] = orderedPair(currentUserId, friendId);

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_one_id", userOneId)
    .eq("user_two_id", userTwoId);

  if (error) throw error;
}

/**
 * Marks a conversation as read for the current user, resetting the
 * unread-count badge shown in ConversationList. Previously nothing ever
 * updated `last_read_at` after the row was first created (it only had a
 * DB-side `default now()`), so unread counts could get stuck forever even
 * after the user had actually read the messages — this is the missing
 * write, called when a thread is opened.
 */
export async function markConversationRead(
  supabase: SupabaseClient,
  currentUserId: string,
  conversationId: string
): Promise<void> {
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId);

  if (error) throw error;

  // Announced here rather than at the call site so every caller — now and
  // later — brings the badge down with it.
  notifyConversationRead(conversationId);
}

/**
 * Toggle mute for a conversation, for the current user only. Muted
 * conversations still update unread counts and sync normally — mute only
 * means "don't sound/vibrate/push for this one," never "stop tracking."
 */
export async function setConversationMuted(
  supabase: SupabaseClient,
  currentUserId: string,
  conversationId: string,
  muted: boolean
): Promise<void> {
  const { error } = await supabase
    .from("conversation_members")
    .update({ muted_at: muted ? new Date().toISOString() : null })
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId);

  if (error) throw error;
}

/**
 * Hide a conversation from the current user's own message list. This does
 * not delete the conversation or its messages — the other participant is
 * unaffected and still sees the full history.
 */
export async function hideConversationForUser(
  supabase: SupabaseClient,
  currentUserId: string,
  conversationId: string
): Promise<void> {
  const { error } = await supabase
    .from("conversation_members")
    .update({ hidden_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId);

  if (error) throw error;
}

/**
 * Whether these two accounts are actually friends.
 *
 * Conversation creation is reachable by URL now that /messages/new resolves a
 * friend id server-side, so the thing it creates a conversation with is worth
 * checking rather than assuming. The friendships table is the same source
 * listFriends reads; this only asks about one row.
 */
export async function areFriends(
  supabase: SupabaseClient,
  currentUserId: string,
  otherUserId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("friendships")
    .select("user_one_id, user_two_id")
    .or(
      `and(user_one_id.eq.${currentUserId},user_two_id.eq.${otherUserId}),` +
        `and(user_one_id.eq.${otherUserId},user_two_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

/**
 * How many conversations the current user has archived.
 *
 * The Archived entry on /messages needs a number, not a list — building the
 * full archived list just to call `.length` on it would pull every friend
 * profile and a window of messages for a count shown in an 11px chip.
 */
export async function getArchivedConversationCount(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("conversation_members")
    .select("conversation_id", { count: "exact", head: true })
    .eq("user_id", currentUserId)
    .not("hidden_at", "is", null);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Return a hidden conversation to the main list.
 *
 * The counterpart to hideConversationForUser, and the reason Archive is a
 * place rather than a one-way door.
 */
export async function unhideConversationForUser(
  supabase: SupabaseClient,
  currentUserId: string,
  conversationId: string
): Promise<void> {
  const { error } = await supabase
    .from("conversation_members")
    .update({ hidden_at: null })
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId);

  if (error) throw error;
}

/**
 * Resolve a conversation from its own id — who it is with, and the current
 * user's state in it.
 *
 * This is what the two-page architecture needs and the friend-keyed lookups
 * above cannot give: /messages/[conversationId] arrives knowing only the
 * conversation, so everything else has to be derived from it.
 *
 * Returns null when the conversation does not exist or the current user is
 * not a member. RLS already refuses to return other people's conversations,
 * so a null here is a 404 for this user regardless of which of the two it is.
 */
export async function getConversationContext(
  supabase: SupabaseClient,
  currentUserId: string,
  conversationId: string
): Promise<ConversationContext | null> {
  const { data: membership, error: membershipError } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at, hidden_at, muted_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) return null;

  const { data: others, error: othersError } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", currentUserId);

  if (othersError) throw othersError;

  const otherUserId = others?.[0]?.user_id ?? null;

  /*
   * A conversation with no other member is not corrupt — a friendship can be
   * removed while its history stays readable. The thread still opens; it just
   * has nobody on the other end, and the page says so instead of failing.
   */
  const friend = otherUserId
    ? await getProfileById(supabase, otherUserId)
    : null;

  return {
    conversationId,
    friend,
    mutedAt: membership.muted_at,
    archivedAt: membership.hidden_at,
    lastReadAt: membership.last_read_at,
  };
}

/**
 * Finds the existing conversation between two friends, or creates one.
 * IMPORTANT: inserts the current user's own membership row first, then the
 * friend's — this matches the conversation_members RLS policy, which only
 * allows adding a second member once you're already a member yourself.
 */
export async function getOrCreateConversationWithFriend(
  supabase: SupabaseClient,
  currentUserId: string,
  friendId: string
): Promise<string> {
  const { data: myMemberships, error: myError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", currentUserId);

  if (myError) throw myError;

  const myConversationIds = (myMemberships ?? []).map(
    (row) => row.conversation_id
  );

  if (myConversationIds.length > 0) {
    const { data: sharedMember, error: sharedError } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", friendId)
      .in("conversation_id", myConversationIds)
      .maybeSingle();

    if (sharedError) throw sharedError;
    if (sharedMember) {
      return sharedMember.conversation_id;
    }
  }

  const conversationId = crypto.randomUUID();

  const { error: createError } = await supabase
    .from("conversations")
    .insert({ id: conversationId });

  if (createError) throw createError;

  const { error: selfError } = await supabase.from("conversation_members").insert({
    conversation_id: conversationId,
    user_id: currentUserId,
  });

  if (selfError) throw selfError;

  const { error: friendError } = await supabase.from("conversation_members").insert({
    conversation_id: conversationId,
    user_id: friendId,
  });

  if (friendError) throw friendError;

  return conversationId;
}
