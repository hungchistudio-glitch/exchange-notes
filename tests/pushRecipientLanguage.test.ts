import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { encodeNewsCardMessage } from "@/lib/messages/newsCard";

/* =========================================================
   A notification in the language of the person who gets it

   Every push about a friend was an English sentence — "Sent you a new
   message.", "Accepted your friend request." — and a story a friend sent
   was announced by whichever headline the card listed first. A reader who
   had set the app to Traditional Chinese read both in English.
   ========================================================= */

const state = vi.hoisted(() => ({
  recipientPreferences: {} as Record<string, unknown>,
  privacy: "full" as "full" | "sender_only" | "hidden",
  body: "",
  send: vi.fn(),
}));

const actor = "00000000-0000-4000-8000-000000000001";
const peer = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000003";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: actor } } }) },
  }),
}));
vi.mock("@/lib/push/sendToUser", () => ({ sendWebPushToUser: state.send }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from(table: string) {
      const rows: Record<string, unknown> = {
        messages: { id: 1, conversation_id: "conversation", sender_id: actor, body: state.body },
        conversation_members: [{ user_id: peer, muted_at: null }],
        friend_requests: { id: requestId, sender_id: peer, receiver_id: actor, status: "accepted" },
        friendships: { id: "friendship" },
        notification_preferences: {
          notification_level: "all",
          privacy_preview: state.privacy,
          sound_enabled: true,
        },
      };
      let wantsList = false;
      const result = () => {
        if (table === "profiles") {
          // The sender's name is read one row at a time; the recipient's
          // languages come back as a list.
          return wantsList
            ? [{ id: peer, learning_language: "en", app_preferences: state.recipientPreferences }]
            : { display_name: "Chi" };
        }
        return rows[table];
      };
      const query = {
        select: () => query,
        eq: () => query,
        neq: () => query,
        or: () => query,
        in: () => {
          wantsList = true;
          return query;
        },
        maybeSingle: async () => ({ data: result(), error: null }),
        insert: async () => ({ error: null }),
        then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
          Promise.resolve({ data: result(), error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

const { POST } = await import("@/app/api/push/event/route");

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("https://example.com/api/push/event", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

function sentPayload() {
  expect(state.send).toHaveBeenCalledOnce();
  return state.send.mock.calls[0][2] as { title: string; body: string };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.recipientPreferences = {};
  state.privacy = "full";
  state.body = "hello";
  state.send.mockResolvedValue({ total: 1, delivered: 1, expired: 0, failed: 0 });
});

describe("push notifications about friends", () => {
  it("tells a Traditional Chinese reader in Traditional Chinese", async () => {
    state.recipientPreferences = { interfaceLanguage: "traditional-chinese" };

    await post({ kind: "friend-accepted", requestId });

    expect(sentPayload().body).toBe("接受了你的好友邀請。");
  });

  it("keeps the generic line in the reader's language when previews are hidden", async () => {
    state.recipientPreferences = { interfaceLanguage: "french" };
    state.privacy = "sender_only";

    await post({ kind: "message", messageId: 1 });

    expect(sentPayload().body).toBe("Vous a envoyé un nouveau message.");
  });

  it("announces a shared story by the headline the reader can read", async () => {
    state.recipientPreferences = { interfaceLanguage: "traditional-chinese" };
    state.body = encodeNewsCardMessage({
      titles: { en: "Chipmakers race abroad", "zh-TW": "晶片廠加速海外設廠" },
      summaries: {},
      vocabulary: [],
      sourceName: "Example",
      sourceUrl: "https://example.com/story",
    } as never);

    await post({ kind: "message", messageId: 1 });

    expect(sentPayload().body).toBe("晶片廠加速海外設廠");
  });

  it("falls back to English for a reader with no stored language", async () => {
    await post({ kind: "friend-accepted", requestId });

    expect(sentPayload().body).toBe("Accepted your friend request.");
  });
});
