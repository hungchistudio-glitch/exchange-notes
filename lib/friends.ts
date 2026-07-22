import { SupabaseClient } from "@supabase/supabase-js";

export type FriendProfile = {
  id: string;
  displayName: string | null;
  exchangeId: string;
  avatarUrl: string | null;
  nativeLanguage: "english" | "traditional-chinese";
  learningLanguage: "english" | "traditional-chinese";
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

function toFriendProfile(row: ProfileRow): FriendProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    exchangeId: row.exchange_id,
    avatarUrl: row.avatar_url,
    nativeLanguage: row.native_language,
    learningLanguage: row.learning_language,
  };
}

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Look up a single profile by its public Exchange ID (case-insensitive). */
export async function findProfileByExchangeId(
  supabase: SupabaseClient,
  exchangeId: string
): Promise<FriendProfile | null> {
  const clean = exchangeId.trim().replace(/^@/, "").toLowerCase();
  if (!clean) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, exchange_id, avatar_url, native_language, learning_language")
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
    return { status: "sent" };
  }

  const { error: insertError } = await supabase.from("friend_requests").insert({
    sender_id: currentUserId,
    receiver_id: targetUserId,
    status: "pending",
  });

  if (insertError) throw insertError;
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
    const sender = row.sender[0];

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
    const receiver = row.receiver[0];

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
    .from("profiles")
    .select("id, display_name, exchange_id, avatar_url, native_language, learning_language")
    .in("id", otherIds);

  if (profilesError) throw profilesError;

  const byId = new Map(
    (profiles ?? []).map((row) => [row.id, toFriendProfile(row as ProfileRow)])
  );

  return otherIds
    .map((id) => byId.get(id))
    .filter((profile): profile is FriendProfile => Boolean(profile));
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
