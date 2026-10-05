import type { SupabaseClient } from "@supabase/supabase-js";
export type ConversationMessage = { id: number; conversation_id: string; sender_id: string; body: string; created_at: string };
export const MESSAGE_PAGE_SIZE = 100;
/** Newest page first, then keyset pagination so incoming messages cannot shift older pages. */
export async function readMessagePage(client: SupabaseClient, conversationId: string, before?: Pick<ConversationMessage, "id" | "created_at">) {
  let query = client.from("messages").select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (before) query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
  return query.limit(MESSAGE_PAGE_SIZE);
}
