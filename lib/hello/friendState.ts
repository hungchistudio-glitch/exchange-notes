import type { SupabaseClient } from "@supabase/supabase-js";

import { areFriends, sendFriendRequest } from "@/lib/friends";

/* =========================================================
   Where a visitor stands with a hello's sender

   Read, not changed: friends already, a request waiting either way, or
   nothing yet. The visitor's own session reads it, so row-level security
   decides what they may see (sender and receiver can each read their own
   requests). Sending is a separate act, behind the one button, through the
   app's existing send_friend_request — which is idempotent and refuses
   "self", so a hello is not a new way around any rule the friends screen
   already keeps.
   ========================================================= */

export type FriendStanding = "none" | "sent" | "incoming" | "friends";

export async function friendStanding(
  supabase: SupabaseClient,
  me: string,
  them: string,
): Promise<FriendStanding> {
  if (await areFriends(supabase, me, them)) return "friends";

  const { data, error } = await supabase
    .from("friend_requests")
    .select("sender_id")
    .eq("status", "pending")
    .or(`and(sender_id.eq.${me},receiver_id.eq.${them}),and(sender_id.eq.${them},receiver_id.eq.${me})`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return "none";
  return data.sender_id === me ? "sent" : "incoming";
}

/** The button: one request, and the standing it leaves. */
export async function requestFriendship(
  supabase: SupabaseClient,
  me: string,
  them: string,
): Promise<FriendStanding> {
  const result = await sendFriendRequest(supabase, them);
  if (result.status === "sent") return "sent";
  if (result.status === "already-friends") return "friends";
  /* Already pending — but which way decides what to say. */
  return friendStanding(supabase, me, them);
}
