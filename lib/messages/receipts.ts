import type { SupabaseClient } from "@supabase/supabase-js";

export type MessageReceiptStatus = "sent" | "delivered" | "read";

export type MessageReceiptInfo = {
  deliveredAt: string | null;
  readAt: string | null;
};

// Reads the *other* participant's receipt row for each message id (RLS
// only ever returns rows the caller is allowed to see: any member of the
// conversation may select receipts for its messages).
export async function fetchReceiptsForMessages(
  supabase: SupabaseClient,
  messageIds: number[],
): Promise<Map<number, MessageReceiptInfo>> {
  const map = new Map<number, MessageReceiptInfo>();
  if (messageIds.length === 0) return map;

  const { data, error } = await supabase
    .from("message_receipts")
    .select("message_id, delivered_at, read_at")
    .in("message_id", messageIds);

  if (error) throw error;

  for (const row of data ?? []) {
    map.set(row.message_id, { deliveredAt: row.delivered_at, readAt: row.read_at });
  }

  return map;
}

// Marks messages as read (and implicitly delivered) by the given user.
// Used when the recipient has the thread open, so any message they can
// currently see counts as both delivered and read.
export async function markMessagesRead(
  supabase: SupabaseClient,
  userId: string,
  messageIds: number[],
): Promise<void> {
  if (messageIds.length === 0) return;

  const now = new Date().toISOString();
  const rows = messageIds.map((messageId) => ({
    message_id: messageId,
    user_id: userId,
    delivered_at: now,
    read_at: now,
  }));

  const { error } = await supabase
    .from("message_receipts")
    .upsert(rows, { onConflict: "message_id,user_id" });

  if (error) throw error;
}

export function getReceiptStatus(info: MessageReceiptInfo | undefined): MessageReceiptStatus {
  if (!info) return "sent";
  if (info.readAt) return "read";
  if (info.deliveredAt) return "delivered";
  return "sent";
}
