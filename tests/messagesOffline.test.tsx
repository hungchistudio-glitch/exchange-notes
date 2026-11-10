import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MessagesHub from "@/components/messages/MessagesHub";
import { STORES, clearStore } from "@/lib/offline/db";
import { keepConversation, readConversation, readConversationList } from "@/lib/offline/messages";

/*
 * With no signal, Messages shows the conversations already seen and sends
 * nothing (Chi, 2026-11-10: "只看不傳"). The list keeps what it last showed
 * and opens on it; a failed read with a copy on screen is not an error.
 */

const state = vi.hoisted(() => ({ requests: vi.fn(), rows: vi.fn(), auth: vi.fn() }));
vi.mock("@/contexts/InterfaceModeContext", () => ({ useInterfaceMode: () => ({ isCosmic: false }) }));
vi.mock("@/lib/friends", () => ({
  listIncomingRequests: state.requests,
  listConversationSummaries: state.rows,
  getArchivedConversationCount: vi.fn().mockResolvedValue(0),
  respondToRequest: vi.fn(),
  hideConversationForUser: vi.fn(),
  setConversationMuted: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: state.auth },
    removeChannel: vi.fn().mockResolvedValue("ok"),
    channel: () => {
      const api = { on: () => api, subscribe: () => api };
      return api;
    },
  }),
}));

const request = (name: string) => ({
  requestId: name,
  createdAt: "2026-10-08",
  sender: { id: name, displayName: name, exchangeId: name, avatarUrl: null },
});

async function settle() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

beforeEach(async () => {
  await clearStore(STORES.kv);
  sessionStorage.setItem("exchange-notes-messages-hub", JSON.stringify({ tab: "requests", query: "", scrollTop: 0 }));
  state.rows.mockReset().mockResolvedValue([]);
  state.requests.mockReset().mockResolvedValue([]);
  state.auth.mockReset().mockResolvedValue({ data: { session: { user: { id: "reader" } } } });
});

describe("Messages without a network", () => {
  it("keeps what the list showed", async () => {
    state.requests.mockResolvedValue([request("Kept Friend")]);
    render(<MessagesHub />);
    expect(await screen.findByText("Kept Friend")).toBeInTheDocument();
    await settle();

    const kept = await readConversationList<{ incoming: unknown[] }>("reader");
    expect(kept?.incoming).toHaveLength(1);
  });

  it("opens on the kept list, and says nothing is wrong, when the server cannot be reached", async () => {
    state.requests.mockResolvedValue([request("Kept Friend")]);
    const first = render(<MessagesHub />);
    await screen.findByText("Kept Friend");
    await settle();
    first.unmount();

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.requests.mockRejectedValue(new TypeError("Failed to fetch"));
    state.rows.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<MessagesHub />);
    await settle();

    expect(screen.getByText("Kept Friend")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load your conversations.")).not.toBeInTheDocument();
    log.mockRestore();
  });

  it("still says so when there is nothing kept either", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.requests.mockRejectedValue(new TypeError("Failed to fetch"));
    state.rows.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<MessagesHub />);
    await settle();

    expect(screen.getByText("Couldn't load your conversations.")).toBeInTheDocument();
    log.mockRestore();
  });

  it("hands a kept conversation back only to the reader it was kept for", async () => {
    await keepConversation("reader", "c1", { messages: ["hi"] });

    expect(await readConversation("reader", "c1")).toEqual({ messages: ["hi"] });
    expect(await readConversation("someone-else", "c1")).toBeNull();
  });
});
