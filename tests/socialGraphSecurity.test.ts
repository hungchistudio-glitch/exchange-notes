import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readMigration } from "./readMigration";

const push = vi.hoisted(() => ({ notifyPushEvent: vi.fn() }));

vi.mock("@/lib/push/eventsClient", () => push);

import {
  getOrCreateConversationWithFriend,
  listIncomingRequests,
  removeFriend,
  respondToRequest,
  sendFriendRequest,
} from "@/lib/friends";

function rpcClient(data: unknown = null, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return {
    client: { rpc } as unknown as SupabaseClient,
    rpc,
  };
}

beforeEach(() => {
  push.notifyPushEvent.mockReset();
});

describe("social graph RPC boundaries", () => {
  it("derives the sender in the database and pushes only a new request", async () => {
    const { client, rpc } = rpcClient("sent");

    await expect(sendFriendRequest(client, "friend-1")).resolves.toEqual({
      status: "sent",
    });
    expect(rpc).toHaveBeenCalledWith("send_friend_request", {
      p_receiver_id: "friend-1",
    });
    expect(push.notifyPushEvent).toHaveBeenCalledWith({
      kind: "friend-request",
      targetUserId: "friend-1",
    });

    const pending = rpcClient("already-pending");
    await sendFriendRequest(pending.client, "friend-1");
    expect(push.notifyPushEvent).toHaveBeenCalledTimes(1);
  });

  it("accepts, removes, and creates conversations only through RPCs", async () => {
    const accepted = rpcClient("conversation-1");
    await respondToRequest(accepted.client, "request-1", "accepted");
    expect(accepted.rpc).toHaveBeenCalledWith("respond_to_friend_request", {
      p_request_id: "request-1",
      p_response: "accepted",
    });

    const removed = rpcClient(true);
    await removeFriend(removed.client, "friend-1");
    expect(removed.rpc).toHaveBeenCalledWith("remove_friend", {
      p_friend_id: "friend-1",
    });

    const conversation = rpcClient("conversation-1");
    await expect(
      getOrCreateConversationWithFriend(conversation.client, "friend-1"),
    ).resolves.toBe("conversation-1");
    expect(conversation.rpc).toHaveBeenCalledWith(
      "get_or_create_direct_conversation",
      { p_friend_id: "friend-1" },
    );
  });

  it("loads incoming identities from the public directory and skips a missing profile", async () => {
    const requestQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "r1", created_at: "2026-09-10", sender_id: "visible" },
          { id: "r2", created_at: "2026-09-09", sender_id: "missing" },
        ],
        error: null,
      }),
    };
    requestQuery.select.mockReturnValue(requestQuery);
    requestQuery.eq.mockReturnValue(requestQuery);

    const profileQuery = {
      select: vi.fn(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: "visible",
            display_name: "Visible Friend",
            exchange_id: "visible_friend",
            avatar_url: null,
            native_language: "en",
            learning_language: "fr",
          },
        ],
        error: null,
      }),
    };
    profileQuery.select.mockReturnValue(profileQuery);

    const from = vi.fn((table: string) =>
      table === "friend_requests" ? requestQuery : profileQuery,
    );
    const client = { from } as unknown as SupabaseClient;

    await expect(listIncomingRequests(client, "reader-1")).resolves.toEqual([
      expect.objectContaining({
        requestId: "r1",
        sender: expect.objectContaining({ exchangeId: "visible_friend" }),
      }),
    ]);
    expect(from).toHaveBeenNthCalledWith(2, "public_profiles");
    expect(profileQuery.in).toHaveBeenCalledWith("id", ["visible", "missing"]);
  });
});

/*
 * The lock-down is deliberately two migrations, applied either side of the
 * deploy that stops writing to these tables directly. These tests are split
 * the same way, because the whole point of the split is that the first half
 * takes nothing away — a revoke that drifted back into it would be a window
 * in which the running app cannot send a friend request.
 */
describe("social graph migration, first half", () => {
  const sql = readMigration("lock_down_social_graph").toLowerCase();

  it("defines every relationship mutation as one locked transaction", () => {
    for (const rpc of [
      "send_friend_request",
      "respond_to_friend_request",
      "get_or_create_direct_conversation",
      "remove_friend",
    ]) {
      expect(sql).toContain(`create or replace function public.${rpc}`);
      expect(sql).toContain(`grant execute on function public.${rpc}(`);
    }

    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = \'\'");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toMatch(
      /insert into public\.friendships[\s\S]*?where not exists \([\s\S]*?user_one_id = v_sender and user_two_id = v_actor/,
    );
  });

  it("takes nothing away, so it can be applied before the deploy", () => {
    expect(sql).not.toContain("revoke all privileges on table");
    expect(sql).not.toContain("drop policy");
  });
});

describe("social graph migration, second half", () => {
  const sql = readMigration("lock_down_social_graph_grants").toLowerCase();

  it("removes direct writes and grants only safe membership/state columns", () => {
    expect(sql).toContain("and status is not null");
    expect(sql).toContain("revoke all privileges on table public.friendships");
    expect(sql).toContain("revoke all privileges on table public.conversation_members");
    expect(sql).toContain("grant update (last_read_at, hidden_at, muted_at)");
    expect(sql).toContain("grant update (read_at) on table public.notifications");
    expect(sql).toContain(
      'drop policy if exists "conversation members can create notifications for each other"',
    );
  });

  it("says out loud that it must not go first", () => {
    expect(sql).toContain("apply this only once the deploy");
  });
});
