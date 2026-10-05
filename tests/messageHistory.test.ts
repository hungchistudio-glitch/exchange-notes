import { expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readMessagePage } from "@/lib/messages/history";
it("opens the newest messages beyond 500 and pages backward without repeats", async () => {
  const rows = Array.from({ length: 601 }, (_, i) => ({ id: i + 1, created_at: "2026-10-04T00:00:00Z" }));
  const orders: string[] = [];
  const client = { from: () => {
    let before = Infinity;
    const query = { select: () => query, eq: () => query,
      order: (column: string, options: { ascending: boolean }) => { expect(options.ascending).toBe(false); orders.push(column); return query; },
      or: (filter: string) => { before = Number(/id.lt.(\d+)/.exec(filter)?.[1]); return query; },
      limit: async (size: number) => ({ data: rows.filter(row => row.id < before).sort((a,b) => b.id-a.id).slice(0,size), error: null }),
    }; return query;
  } } as unknown as SupabaseClient;
  const newest = await readMessagePage(client, "conversation");
  expect(newest.data?.[0].id).toBe(601);
  expect(newest.data?.at(-1)?.id).toBe(502);
  const older = await readMessagePage(client, "conversation", newest.data?.at(-1));
  expect(older.data?.[0].id).toBe(501);
  expect(orders).toEqual(["created_at", "id", "created_at", "id"]);
});
