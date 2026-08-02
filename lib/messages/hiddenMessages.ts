import type { SupabaseClient } from "@supabase/supabase-js";

export async function listHiddenMessageIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("hidden_messages")
    .select("message_id")
    .eq("user_id", userId);

  if (error) throw error;

  return new Set((data ?? []).map((row) => row.message_id as number));
}

export async function hideMessagesForUser(
  supabase: SupabaseClient,
  userId: string,
  messageIds: number[],
): Promise<void> {
  if (messageIds.length === 0) return;

  const { error } = await supabase
    .from("hidden_messages")
    .insert(messageIds.map((messageId) => ({ user_id: userId, message_id: messageId })));

  if (error) throw error;
}
