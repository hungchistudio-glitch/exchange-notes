import { beforeEach, describe, expect, it, vi } from "vitest";

import { readMigration } from "./readMigration";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: mocks.createClient,
}));

import { saveReviewResult } from "@/lib/review/saveReviewResult";

const savedReview = {
  status: "learning",
  next_review_at: "2026-09-12T12:00:00.000Z",
  last_reviewed_at: "2026-09-11T12:00:00.000Z",
  review_interval: 1,
  review_ease: 2.5,
  review_count: 3,
  correct_count: 2,
  review_repetitions: 1,
  review_lapses: 1,
  retention_score: 58,
} as const;

function rpcClient(data: unknown = savedReview, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { rpc, client: { rpc } };
}

beforeEach(() => {
  mocks.createClient.mockReset();
});

describe("atomic review client", () => {
  it("saves a grade through one RPC instead of a browser read/modify/write", async () => {
    const { client, rpc } = rpcClient();
    mocks.createClient.mockReturnValue(client);

    await expect(saveReviewResult("word-1", "good")).resolves.toEqual(
      savedReview,
    );

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("save_review_result_atomic", {
      p_vocabulary_item_id: "word-1",
      p_grade: "good",
    });
  });

  it("keeps concurrent requests inside independently atomic RPC calls", async () => {
    const first = { ...savedReview, review_count: 4 };
    const second = { ...savedReview, review_count: 5 };
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: first, error: null })
      .mockResolvedValueOnce({ data: second, error: null });
    mocks.createClient.mockReturnValue({ rpc });

    await expect(
      Promise.all([
        saveReviewResult("word-1", "hard"),
        saveReviewResult("word-1", "easy"),
      ]),
    ).resolves.toEqual([first, second]);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls).toEqual([
      ["save_review_result_atomic", {
        p_vocabulary_item_id: "word-1",
        p_grade: "hard",
      }],
      ["save_review_result_atomic", {
        p_vocabulary_item_id: "word-1",
        p_grade: "easy",
      }],
    ]);
  });

  it("surfaces a database rejection so the current review card can retry", async () => {
    const rejection = {
      code: "P0002",
      message: "Vocabulary item not found.",
    };
    const { client } = rpcClient(null, rejection);
    mocks.createClient.mockReturnValue(client);

    await expect(saveReviewResult("somebody-elses-word", "good"))
      .rejects.toBe(rejection);
  });

  it("rejects a malformed success instead of advancing on partial state", async () => {
    const { client } = rpcClient({
      ...savedReview,
      review_count: "3",
    });
    mocks.createClient.mockReturnValue(client);

    await expect(saveReviewResult("word-1", "good")).rejects.toThrow(
      "Review save returned an invalid result.",
    );
  });
});

describe("atomic review SQL contract", () => {
  const sql = readMigration("atomic_review_save").toLowerCase();

  it("repairs the missing production event table idempotently", () => {
    expect(sql).toContain(
      "create table if not exists public.review_events",
    );
    expect(sql).toContain(
      "alter table public.review_events enable row level security",
    );
    expect(sql).toContain("review_events_user_created_idx");
    expect(sql).toContain("review_events_vocabulary_idx");
    expect(sql).toContain(
      'create policy "users can view own review events"',
    );
  });

  it("keeps privileged code private and exposes only an authenticated wrapper", () => {
    const privateStart = sql.indexOf(
      "create or replace function private.apply_review_result_atomic",
    );
    const publicStart = sql.indexOf(
      "create or replace function public.save_review_result_atomic",
    );
    const privateBody = sql.slice(privateStart, publicStart);
    const publicBody = sql.slice(publicStart);

    expect(privateStart).toBeGreaterThan(-1);
    expect(publicStart).toBeGreaterThan(privateStart);
    expect(privateBody).toContain("security definer");
    expect(privateBody).toContain("set search_path = ''");
    expect(publicBody).toContain("security invoker");
    expect(publicBody).toContain("set search_path = ''");
    expect(sql).toContain(
      "revoke all on schema private from public, anon, authenticated",
    );
    expect(sql).toContain("grant usage on schema private to authenticated");
    expect(sql).toContain(
      "grant execute on function public.save_review_result_atomic(uuid, text)",
    );
    expect(sql).toMatch(
      /revoke all on function public\.save_review_result_atomic\(uuid, text\)[\s\S]*?from public, anon, authenticated/,
    );
  });

  it("authorizes ownership before locking or writing", () => {
    expect(sql).toContain("v_user_id := auth.uid()");
    expect(sql).toMatch(
      /where item\.id = p_vocabulary_item_id\s+and item\.user_id = v_user_id\s+for update/,
    );
    expect(sql).toContain("errcode = '42501'");
    expect(sql).toContain("errcode = 'p0002'");
  });

  it("serializes concurrent grades and timestamps them after the lock", () => {
    const lock = sql.indexOf("for update;");
    const timestamp = sql.indexOf("v_now := pg_catalog.clock_timestamp();");
    const counterRead = sql.indexOf(
      "coalesce(v_item.review_count, 0)",
    );

    expect(lock).toBeGreaterThan(-1);
    expect(timestamp).toBeGreaterThan(lock);
    expect(counterRead).toBeGreaterThan(timestamp);
  });

  it("updates the schedule and inserts its event before returning", () => {
    const update = sql.indexOf("update public.vocabulary_items");
    const event = sql.indexOf("insert into public.review_events");
    const result = sql.indexOf("return pg_catalog.jsonb_build_object");

    expect(update).toBeGreaterThan(-1);
    expect(event).toBeGreaterThan(update);
    expect(result).toBeGreaterThan(event);
    expect(sql).not.toContain("exception when");
  });

  it("makes review events immutable from the browser", () => {
    expect(sql).toMatch(
      /revoke all privileges on table public\.review_events\s+from public, anon, authenticated/,
    );
    expect(sql).toContain(
      'drop policy if exists "users can insert own review events"',
    );
    expect(sql).toContain(
      "grant select on table public.review_events to authenticated",
    );
  });
});
