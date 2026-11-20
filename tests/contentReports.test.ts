import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   Readers' reports (Chi, 2026-11-16: 回報問題)

   Anyone signed in may send one, a few dozen a day; only the owner
   (NEWS_OWNER_USER_ID) may read them or mark them done, and with no owner
   set nobody can. The reader's id always comes from the session, never
   from the body.
   ========================================================= */

const reader = "00000000-0000-4000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000009";
const reportId = "00000000-0000-4000-8000-0000000000aa";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  todayCount: 0,
  inserted: [] as unknown[],
  updated: [] as unknown[],
  rows: [] as unknown[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from() {
      let counting = false;
      const query = {
        select: (_columns: string, options?: { head?: boolean }) => {
          counting = Boolean(options?.head);
          return query;
        },
        eq: () => query,
        gte: () => query,
        is: () => query,
        order: () => query,
        limit: () => query,
        insert: async (value: unknown) => {
          state.inserted.push(value);
          return { error: null };
        },
        update: (value: unknown) => {
          state.updated.push(value);
          return query;
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(counting ? { count: state.todayCount, error: null } : { data: state.rows, error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

import { GET, PATCH, POST } from "@/app/api/reports/route";
import { DAILY_REPORT_LIMIT, isAppOwner, parseReport } from "@/lib/reports";

const post = (body: unknown) =>
  POST(new Request("https://example.com/api/reports", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  state.user = { id: reader };
  state.todayCount = 0;
  state.inserted = [];
  state.updated = [];
  state.rows = [];
  vi.stubEnv("NEWS_OWNER_USER_ID", owner);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseReport", () => {
  it("keeps a well-formed report, clipped, with only the page's path", () => {
    expect(
      parseReport({
        surface: "word",
        itemKey: " ko:도서관 ",
        language: "ko",
        quoted: "도서관 — 圖書館",
        note: "x".repeat(2000),
        page: "/vocabulary?q=secret#top",
        userId: "someone-else",
      }),
    ).toEqual({
      surface: "word",
      itemKey: "ko:도서관",
      language: "ko",
      quoted: "도서관 — 圖書館",
      note: "x".repeat(1000),
      page: "/vocabulary",
    });
  });

  it("refuses an unknown surface or an empty key, and drops a strange language", () => {
    expect(parseReport({ surface: "admin", itemKey: "x" })).toBeNull();
    expect(parseReport({ surface: "news", itemKey: "  " })).toBeNull();
    expect(parseReport(null)).toBeNull();
    expect(parseReport({ surface: "news", itemKey: "card-1", language: "<script>" })?.language).toBeNull();
    expect(parseReport({ surface: "news", itemKey: "card-1", language: "zh-TW" })?.language).toBe("zh-TW");
  });
});

describe("isAppOwner", () => {
  it("fails closed without an owner set", () => {
    vi.stubEnv("NEWS_OWNER_USER_ID", "");
    expect(isAppOwner(owner)).toBe(false);
    expect(isAppOwner(undefined)).toBe(false);
  });
});

describe("POST /api/reports", () => {
  it("files the report under the session's reader, whatever the body says", async () => {
    const response = await post({ surface: "game", itemKey: "ja:旅行", quoted: "旅行 — trip", userId: owner });
    expect(response.status).toBe(201);
    expect(state.inserted).toEqual([
      expect.objectContaining({ user_id: reader, surface: "game", item_key: "ja:旅行", quoted: "旅行 — trip" }),
    ]);
  });

  it("needs a sign-in, a real report, and room in today's limit", async () => {
    state.user = null;
    expect((await post({ surface: "word", itemKey: "x" })).status).toBe(401);

    state.user = { id: reader };
    expect((await post({ surface: "nope", itemKey: "x" })).status).toBe(400);

    state.todayCount = DAILY_REPORT_LIMIT;
    expect((await post({ surface: "word", itemKey: "x" })).status).toBe(429);
    expect(state.inserted).toEqual([]);
  });
});

describe("reading and closing reports", () => {
  it("tells anyone but the owner only that they are not the owner", async () => {
    state.rows = [{ id: reportId, note: "private" }];
    const response = await GET();
    expect(await response.json()).toEqual({ owner: false });

    const patch = await PATCH(new Request("https://example.com/api/reports", {
      method: "PATCH",
      body: JSON.stringify({ id: reportId, resolved: true }),
    }));
    expect(patch.status).toBe(403);
    expect(state.updated).toEqual([]);
  });

  it("gives the owner the open reports and lets them close one", async () => {
    state.user = { id: owner };
    state.rows = [{
      id: reportId, surface: "word", item_key: "ko:도서관", language: "ko", quoted: "도서관", note: "",
      page: "/vocabulary", created_at: "2026-11-20T10:00:00Z", resolved_at: null,
    }];
    const body = await (await GET()).json();
    expect(body.owner).toBe(true);
    expect(body.reports).toEqual([expect.objectContaining({ id: reportId, itemKey: "ko:도서관", surface: "word" })]);

    const patch = await PATCH(new Request("https://example.com/api/reports", {
      method: "PATCH",
      body: JSON.stringify({ id: reportId, resolved: true }),
    }));
    expect(patch.status).toBe(200);
    expect(state.updated).toEqual([{ resolved_at: expect.any(String) }]);
  });
});
