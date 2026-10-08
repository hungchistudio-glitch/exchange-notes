import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MessagesHub from "@/components/messages/MessagesHub";

type Channel = { handlers: { filter: { table: string; filter?: string }; callback: () => void }[]; status?: (status: string) => void };
const state = vi.hoisted(() => ({ channels: [] as Channel[], requests: vi.fn(), rows: vi.fn(), auth: vi.fn(), remove: vi.fn() }));
vi.mock("@/contexts/InterfaceModeContext", () => ({ useInterfaceMode: () => ({ isCosmic: false }) }));
vi.mock("@/lib/friends", () => ({
  listIncomingRequests: state.requests, listConversationSummaries: state.rows,
  getArchivedConversationCount: vi.fn().mockResolvedValue(0),
  respondToRequest: vi.fn(), hideConversationForUser: vi.fn(), setConversationMuted: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  auth: { getSession: state.auth }, removeChannel: state.remove,
  channel: () => {
    const channel: Channel = { handlers: [] };
    const api = {
      on: (_event: string, filter: { table: string }, callback: () => void) => { channel.handlers.push({ filter, callback }); return api; },
      subscribe: (status: (value: string) => void) => { channel.status = status; return api; },
    };
    state.channels.push(channel); return api;
  },
}) }));
const request = (name: string) => ({ requestId: name, createdAt: "2026-10-08", sender: { id: name, displayName: name, exchangeId: name, avatarUrl: null } });
async function flush() { await act(async () => { await Promise.resolve(); }); }
beforeEach(() => {
  sessionStorage.setItem("exchange-notes-messages-hub", JSON.stringify({ tab: "requests", query: "", scrollTop: 0 }));
  state.channels.length = 0;
  state.rows.mockReset().mockResolvedValue([]);
  state.requests.mockReset().mockResolvedValue([]);
  state.auth.mockReset().mockResolvedValue({ data: { session: { user: { id: "reader" } } } });
  state.remove.mockReset().mockResolvedValue("ok");
});
describe("messages list synchronization", () => {
  it("shows new incoming requests while the list stays open", async () => {
    render(<MessagesHub />); await flush();
    const handler = state.channels[0].handlers.find(h => h.filter.table === "friend_requests")!;
    expect(handler.filter.filter).toBe("receiver_id=eq.reader");
    state.requests.mockResolvedValue([request("New Friend")]);
    act(() => handler.callback());
    expect(await screen.findByText("New Friend")).toBeInTheDocument();
    state.requests.mockResolvedValue([]);
    act(() => handler.callback());
    await waitFor(() => expect(screen.queryByText("New Friend")).not.toBeInTheDocument());
  });
  it("refreshes requests on reconnect and foreground, then removes listeners on unmount", async () => {
    const view = render(<MessagesHub />); await flush();
    state.requests.mockResolvedValue([request("Reconnected Friend")]);
    act(() => state.channels[0].status?.("SUBSCRIBED"));
    expect(await screen.findByText("Reconnected Friend")).toBeInTheDocument();
    state.requests.mockResolvedValue([request("Foreground Friend")]);
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(await screen.findByText("Foreground Friend")).toBeInTheDocument();
    view.unmount();
    const calls = state.requests.mock.calls.length;
    act(() => { window.dispatchEvent(new Event("online")); window.dispatchEvent(new Event("pageshow")); });
    await flush();
    expect(state.requests).toHaveBeenCalledTimes(calls);
    expect(state.remove).toHaveBeenCalledOnce();
  });
  it("discards a response overtaken by an incoming request event", async () => {
    let resolve!: (value: ReturnType<typeof request>[]) => void;
    state.requests.mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValue([request("Latest Friend")]);
    render(<MessagesHub />); await flush();
    act(() => state.channels[0].handlers[1].callback());
    await act(async () => resolve([request("Old Friend")]));
    expect(await screen.findByText("Latest Friend")).toBeInTheDocument();
    expect(screen.queryByText("Old Friend")).not.toBeInTheDocument();
  });
  it("recovers from an initial session failure when connectivity returns", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.auth.mockRejectedValueOnce(new Error("offline"));
    render(<MessagesHub />); await flush();
    state.requests.mockResolvedValue([request("Recovered Friend")]);
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(await screen.findByText("Recovered Friend")).toBeInTheDocument();
    log.mockRestore();
  });
});
