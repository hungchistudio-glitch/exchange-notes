import type { SupabaseClient } from "@supabase/supabase-js";

import { decodeWordCardMessage, WORD_CARD_MARKER } from "@/lib/messages/wordCard";

/*
 * Searching what was actually said.
 *
 * The list page used to search `summary.lastMessage.body` — the single newest
 * message per conversation — while offering a field labelled "search people,
 * conversations, or language" and an empty state suggesting "a word you
 * remember". A word two messages old did not match and the same word did if it
 * happened to be the newest, which reads as broken rather than limited.
 *
 * This searches message bodies server-side instead, scoped to the
 * conversations the caller already resolved, so RLS and the scope filter are
 * both doing their jobs.
 */

export type MessageSearchHit = {
  conversationId: string;
  messageId: number;
  /** What to show as the matched line — the card's word, or the message. */
  snippet: string;
  createdAt: string;
  /** Word cards are grouped as "Language"; everything else as "Conversations". */
  isWordCard: boolean;
};

/**
 * Neutralise the LIKE wildcards inside a term the user typed.
 *
 * Without this, typing `%` matches every message in every conversation and a
 * `_` silently matches any character. Backslash is the default LIKE escape
 * character in Postgres, and has to be escaped first or it would escape the
 * escapes. Verified against the database: `'50% off' ilike '%\%%'` is true
 * while `'50 off' ilike '%\%%'` is false.
 */
export function escapeLikeTerm(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function searchConversationMessages(
  supabase: SupabaseClient,
  conversationIds: string[],
  term: string,
  limit = 60,
): Promise<MessageSearchHit[]> {
  const trimmed = term.trim();
  if (conversationIds.length === 0 || trimmed.length === 0) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, body, created_at")
    .in("conversation_id", conversationIds)
    .ilike("body", `%${escapeLikeTerm(trimmed)}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const card = decodeWordCardMessage(row.body);

    return {
      conversationId: row.conversation_id,
      messageId: row.id,
      /*
       * A word card's body is marker-prefixed JSON, so showing it raw would
       * put a blob of braces in the results. The card's own word is the
       * honest snippet — and it is what the term matched inside anyway.
       */
      snippet: card ? `${card.word} · ${card.translation}` : row.body,
      createdAt: row.created_at,
      isWordCard: Boolean(card) || row.body.startsWith(WORD_CARD_MARKER),
    };
  });
}
