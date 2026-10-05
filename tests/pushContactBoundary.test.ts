import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  friends: false,
  claimed: vi.fn(),
  send: vi.fn(),
}));
const actor = "00000000-0000-4000-8000-000000000001";
const peer = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000003";
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: actor } } }) },
}) }));
vi.mock("@/lib/push/sendToUser", () => ({ sendWebPushToUser: state.send }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({
  from(table: string) {
    const data: Record<string, unknown> = {
      messages: { id: 1, conversation_id: "conversation", sender_id: actor, body: "hello" },
      conversation_members: [{ user_id: peer, muted_at: null }],
      friend_requests: { id: requestId, sender_id: peer, receiver_id: actor, status: "accepted" },
      friendships: state.friends ? { id: "friendship" } : null,
      profiles: { display_name: "Reader" },
      notification_preferences: null,
    };
    const result = { data: data[table], error: null };
    const query = {
      select: () => query, eq: () => query, neq: () => query, or: () => query,
      maybeSingle: async () => result,
      insert: async (value: unknown) => { state.claimed(value); return { error: null }; },
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return query;
  },
}) }));

import { POST } from "@/app/api/push/event/route";

beforeEach(() => {
  vi.clearAllMocks();
  state.friends = false;
  state.send.mockResolvedValue({ total: 1, delivered: 1, expired: 0, failed: 0 });
});

describe("push contact boundary", () => {
  it.each([
    { kind: "message", messageId: 1 },
    { kind: "friend-accepted", requestId },
  ])("blocks replayed $kind notifications after unfriend", async body => {
    const response = await POST(new NextRequest("https://example.com/api/push/event", {
      method: "POST", body: JSON.stringify(body),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ recipients: 1, skipped: 1, delivered: 0 });
    expect(state.claimed).not.toHaveBeenCalled();
    expect(state.send).not.toHaveBeenCalled();
  });

  it("still delivers the accepted event while the friendship exists", async () => {
    state.friends = true;
    const response = await POST(new NextRequest("https://example.com/api/push/event", {
      method: "POST", body: JSON.stringify({ kind: "friend-accepted", requestId }),
    }));
    expect(await response.json()).toMatchObject({ recipients: 1, delivered: 1 });
    expect(state.send).toHaveBeenCalledOnce();
  });
});
