import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ responses: [] as unknown[][], queries: [] as Array<Array<[string, ...unknown[]]>> }));
vi.mock("next/server", () => ({ after: vi.fn(), NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } }));
vi.mock("@/lib/news/refillPool", () => ({ refillPoolIfThin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "reader" } } }) },
  from: (table: string) => {
    if (table === "profiles") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { learning_language: "fr" } }) }) }) };
    if (table === "daily_news_seen") return { select: () => ({ eq: async () => ({ data: [{ item_id: "seen" }] }) }) };
    const calls: Array<[string, ...unknown[]]> = [];
    db.queries.push(calls);
    const result = { data: db.responses.shift() ?? [], error: null };
    const builder = {
      select: (...args: unknown[]) => { calls.push(["select", ...args]); return builder; },
      or: (...args: unknown[]) => { calls.push(["or", ...args]); return builder; },
      order: (...args: unknown[]) => { calls.push(["order", ...args]); return builder; },
      limit: (...args: unknown[]) => { calls.push(["limit", ...args]); return builder; },
      eq: (...args: unknown[]) => { calls.push(["eq", ...args]); return builder; },
      not: (...args: unknown[]) => { calls.push(["not", ...args]); return builder; },
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return builder;
  },
}) }));
import { GET } from "@/app/api/daily-news/route";
const row = { id: "seen", published_at: "2026-10-07T12:00:00Z", card: { id: "story", sourceUrl: "https://publisher.example/story", titles: { fr: "Une histoire" }, category: "Art", vocabularyLevel: "C2" } };
beforeEach(() => { db.responses = []; db.queries = []; });
describe("C2 feed rollout and history", () => {
  it("serves unseen C2 cards in the reader's language with no-store", async () => {
    db.responses = [[row]];
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ exhausted: false, cards: [{ itemId: "seen", vocabularyLevel: "C2" }] });
    expect(db.queries[0]).toContainEqual(["eq", "card->>vocabularyLevel", "C2"]);
    expect(db.queries[0]).toContainEqual(["or", "card->titles->>fr.not.is.null"]);
    expect(db.queries[0]).toContainEqual(["not", "id", "in", "(seen)"]);
  });
  it("repeats C2 lessons with an honest flag once they are all read, instead of downgrading", async () => {
    db.responses = [[], [row]];
    expect(await (await GET()).json()).toMatchObject({ exhausted: true, cards: [{ vocabularyLevel: "C2" }] });
    expect(db.queries).toHaveLength(2);
    expect(db.queries[1]).toContainEqual(["eq", "card->>vocabularyLevel", "C2"]);
    expect(db.queries[1].some(call => call[0] === "not")).toBe(false);
  });
  it("preserves legacy content only while the first C2 batch is not yet available", async () => {
    db.responses = [[], [], [{ ...row, card: { ...row.card, vocabularyLevel: undefined } }]];
    const body = await (await GET()).json();
    expect(body.cards).toHaveLength(1);
    expect(body.exhausted).toBe(false);
    expect(db.queries[2].some(call => call[0] === "eq")).toBe(false);
  });
  it("reports an empty pool without returning an empty success", async () => {
    expect((await GET()).status).toBe(503);
  });
});
