import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { findProfileByExchangeId } from "@/lib/friends";

import { readMigration } from "./readMigration";

/* =========================================================
   The public directory shows the reader's own people
   (Chi, 2026-11-22: 收緊公開資料)

   public_profiles showed six columns of every profile to anyone signed in,
   so one account could list every reader. Now it shows the reader, their
   friends, request parties, conversation partners and note-share partners,
   and a stranger is reached only by exact Exchange ID through
   find_profile_by_exchange_id.

   Two migrations, either side of the deploy: the function first (it takes
   nothing away), the view's restriction after the app reads strangers
   through the function. Both were checked against production inside a
   transaction that was rolled back: each of the 18 readers saw exactly
   their own people, and each could still find a stranger by exact ID.
   ========================================================= */

describe("finding a stranger", () => {
  function clientReturning(row: unknown) {
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const rpc = vi.fn(() => ({ maybeSingle }));
    const from = vi.fn();
    return { client: { rpc, from } as unknown as SupabaseClient, rpc, from };
  }

  it("asks the database for that exact ID, never searches the directory", async () => {
    const { client, rpc, from } = clientReturning({
      id: "u1",
      display_name: "Ana",
      exchange_id: "ana_lee",
      avatar_url: null,
      native_language: "es",
      learning_language: "zh-TW",
    });

    const found = await findProfileByExchangeId(client, "  @Ana_Lee ");

    expect(rpc).toHaveBeenCalledWith("find_profile_by_exchange_id", { p_exchange_id: "ana_lee" });
    expect(from).not.toHaveBeenCalled();
    expect(found).toEqual(expect.objectContaining({ id: "u1", exchangeId: "ana_lee" }));
  });

  it("is nobody for an empty ID, without asking", async () => {
    const { client, rpc } = clientReturning(null);
    expect(await findProfileByExchangeId(client, " @ ")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("the lookup migration, first half", () => {
  const sql = readMigration("find_profile_by_exchange_id").toLowerCase();
  /* Its header explains the ilike it replaces; the statements must not use one. */
  const statements = sql.replace(/--.*$/gm, "");

  it("matches by equality, so _ and % are only characters", () => {
    expect(sql).toContain("p.exchange_id = pg_catalog.lower(");
    expect(statements).not.toMatch(/\bi?like\b/);
    expect(sql).toContain("limit 1");
  });

  it("is for signed-in readers only, and runs with a fixed search path", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("(select auth.uid()) is not null");
    expect(sql).toContain("revoke all on function public.find_profile_by_exchange_id(text) from public, anon");
    expect(sql).toContain("grant execute on function public.find_profile_by_exchange_id(text) to authenticated");
  });

  it("takes nothing away, so it can be applied before the deploy", () => {
    expect(sql).not.toContain("create or replace view");
    expect(sql).not.toMatch(/revoke [^;]*public\.public_profiles/);
  });
});

describe("the directory migration, second half", () => {
  const sql = readMigration("public_profiles_own_people").toLowerCase();

  it("keeps the same six columns, still past the owner-only policy", () => {
    expect(sql).toContain("with (security_invoker = false)");
    expect(sql).toContain(
      "select p.id, p.display_name, p.exchange_id, p.avatar_url, p.native_language, p.learning_language",
    );
    expect(sql).toContain("grant select on public.public_profiles to authenticated");
  });

  it("shows the reader and each kind of person the app names", () => {
    expect(sql).toContain("where p.id = (select auth.uid())");
    for (const table of ["friendships", "friend_requests", "conversation_members", "note_shares"]) {
      expect(sql).toContain(`from public.${table}`);
    }
  });

  it("says out loud that it must not go first", () => {
    expect(sql).toContain("apply only after the deploy");
  });
});
