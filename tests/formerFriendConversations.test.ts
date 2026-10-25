import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { listConversationSummaries } from "@/lib/friends";

/* =========================================================
   A friendship ends; its conversation stays (2026-10-24)

   The list used to start from the friends list, so a conversation with
   someone no longer a friend vanished, history and all: a reader with one
   conversation saw "Start your first conversation". Now it stays, marked
   as history (the room already opens it read-only, and the database only
   lets friends send).
   ========================================================= */

type Row = Record<string, unknown>;

/** Just the queries listConversationSummaries makes, over in-memory tables. */
function fakeClient(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { rows = rows.filter((row) => row[column] === value); return query; },
        neq: (column: string, value: unknown) => { rows = rows.filter((row) => row[column] !== value); return query; },
        in: (column: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[column])); return query; },
        is: (column: string, value: unknown) => { rows = rows.filter((row) => (row[column] ?? null) === value); return query; },
        not: (column: string, _op: string, value: unknown) => { rows = rows.filter((row) => (row[column] ?? null) !== value); return query; },
        or: (filter: string) => {
          const clauses = filter.split(",").map((clause) => clause.split(".eq."));
          rows = rows.filter((row) => clauses.some(([column, value]) => row[column] === value));
          return query;
        },
        like: (column: string, pattern: string) => { rows = rows.filter((row) => String(row[column]).startsWith(pattern.replace(/%$/, ""))); return query; },
        gt: (column: string, value: string) => { rows = rows.filter((row) => String(row[column]) > value); return query; },
        order: (column: string, { ascending }: { ascending: boolean }) => {
          rows.sort((a, b) => (ascending ? 1 : -1) * String(a[column]).localeCompare(String(b[column])));
          return query;
        },
        limit: (count: number) => { rows = rows.slice(0, count); return query; },
        then: (resolve: (value: { data: Row[]; error: null }) => unknown) => resolve({ data: rows, error: null }),
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

const me = "me";
const profile = (id: string, name: string) => ({
  id, display_name: name, exchange_id: name.toLowerCase(), avatar_url: null, native_language: "en", learning_language: "zh-TW",
});

describe("conversations with someone no longer a friend", () => {
  const tables = {
    friendships: [{ user_one_id: me, user_two_id: "ana" }],
    public_profiles: [profile("ana", "Ana"), profile("ben", "Ben"), profile("cai", "Cai")],
    conversation_members: [
      { conversation_id: "with-ana", user_id: me, hidden_at: null }, { conversation_id: "with-ana", user_id: "ana" },
      { conversation_id: "with-ben", user_id: me, hidden_at: null }, { conversation_id: "with-ben", user_id: "ben" },
      { conversation_id: "with-cai", user_id: me, hidden_at: null }, { conversation_id: "with-cai", user_id: "cai" },
    ],
    messages: [
      { conversation_id: "with-ana", sender_id: "ana", body: "hola", created_at: "2026-10-20T10:00:00Z", attachment_type: null },
      { conversation_id: "with-ben", sender_id: me, body: "see you", created_at: "2026-10-22T10:00:00Z", attachment_type: null },
    ],
  };

  it("keeps a former friend's conversation as history, newest first", async () => {
    const rows = await listConversationSummaries(fakeClient(tables), me);
    expect(rows.map((row) => [row.friend.displayName, row.isFriend, row.conversationId])).toEqual([
      ["Ben", false, "with-ben"],
      ["Ana", true, "with-ana"],
    ]);
  });

  it("leaves out a former friend with nothing to read", async () => {
    const rows = await listConversationSummaries(fakeClient(tables), me);
    expect(rows.some((row) => row.friend.displayName === "Cai")).toBe(false);
  });

  it("still shows the history with no friends left at all", async () => {
    const rows = await listConversationSummaries(fakeClient({ ...tables, friendships: [] }), me);
    expect(rows.map((row) => [row.friend.displayName, row.isFriend])).toEqual([["Ben", false], ["Ana", false]]);
  });
});
