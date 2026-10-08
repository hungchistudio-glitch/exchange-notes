import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useIncomingFriendRequestCount from "@/hooks/friends/useIncomingFriendRequestCount";
import useUnreadMessageCount from "@/hooks/messages/useUnreadMessageCount";

type Handler = { filter: { table: string; event: string; filter?: string }; callback: () => void };
type Channel = {
  topic: string;
  handlers: Handler[];
  joined: boolean;
  status?: (status: string) => void;
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};
const state = vi.hoisted(() => ({
  channels: [] as Channel[],
  friends: vi.fn(), unread: vi.fn(), user: vi.fn(), remove: vi.fn(),
  local: new Set<() => void>(),
}));
vi.mock("@/lib/friends", () => ({ getPendingIncomingRequestCount: state.friends, getTotalUnreadCount: state.unread }));
vi.mock("@/lib/supabase/sessionUser", () => ({ getSessionUser: state.user }));
vi.mock("@/lib/messages/unreadSignal", () => ({ subscribeToConversationRead: (callback: () => void) => {
  state.local.add(callback); return () => state.local.delete(callback);
} }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  channel: (topic: string) => {
    const existing = state.channels.find(c => c.topic === topic);
    if (existing) return existing;
    const channel: Channel = { topic, handlers: [], joined: false, on: vi.fn(), subscribe: vi.fn() };
    channel.on.mockImplementation((_event, filter, callback) => {
      if (channel.joined) throw Error("cannot add postgres_changes callbacks after subscribe");
      channel.handlers.push({ filter, callback }); return channel;
    });
    channel.subscribe.mockImplementation(callback => { channel.joined = true; channel.status = callback; return channel; });
    state.channels.push(channel); return channel;
  },
  removeChannel: state.remove,
}) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function settled() { await act(async () => { await Promise.resolve(); }); }

beforeEach(() => {
  state.channels.length = 0;
  state.local.clear();
  state.friends.mockReset().mockResolvedValue(2);
  state.unread.mockReset().mockResolvedValue(4);
  state.user.mockReset().mockResolvedValue({ id: "reader" });
  state.remove.mockReset().mockResolvedValue("ok");
});

describe("live badges across home, navigation and app resume", () => {
  it("keeps simultaneous friend badges on independent channels and cleans up only its own", async () => {
    const first = renderHook(useIncomingFriendRequestCount);
    const second = renderHook(useIncomingFriendRequestCount);
    await waitFor(() => expect(second.result.current.count).toBe(2));
    expect(first.result.current.count).toBe(2);
    expect(new Set(state.channels.map(c => c.topic)).size).toBe(2);
    expect(state.channels.every(c => c.handlers[0].filter.filter === "receiver_id=eq.reader")).toBe(true);
    first.unmount();
    expect(state.remove).toHaveBeenCalledWith(state.channels[0]);
    expect(state.remove).not.toHaveBeenCalledWith(state.channels[1]);
    state.friends.mockResolvedValue(3);
    act(() => state.channels[1].handlers[0].callback());
    await waitFor(() => expect(second.result.current).toEqual({ count: 3, pulseToken: 1 }));
  });

  it("recounts duplicate inserts and accept/decline changes without drifting or repeated pulses", async () => {
    const view = renderHook(useIncomingFriendRequestCount);
    await settled();
    state.friends.mockResolvedValue(3);
    act(() => { state.channels[0].handlers[0].callback(); state.channels[0].handlers[0].callback(); });
    await waitFor(() => expect(view.result.current).toEqual({ count: 3, pulseToken: 1 }));
    act(() => state.channels[0].handlers[0].callback());
    await settled();
    expect(view.result.current).toEqual({ count: 3, pulseToken: 1 });
    state.friends.mockResolvedValue(0);
    act(() => state.channels[0].handlers[0].callback());
    await waitFor(() => expect(view.result.current).toEqual({ count: 0, pulseToken: 1 }));
  });

  it("discards a stale count when a change arrives during an in-flight query", async () => {
    const view = renderHook(useIncomingFriendRequestCount);
    await settled();
    const older = deferred<number>();
    const latest = deferred<number>();
    state.friends.mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise);
    act(() => state.channels[0].handlers[0].callback());
    act(() => state.channels[0].handlers[0].callback());
    await act(async () => older.resolve(8));
    expect(view.result.current.count).toBe(2);
    await act(async () => latest.resolve(1));
    expect(view.result.current).toEqual({ count: 1, pulseToken: 0 });
  });

  it("refreshes after reconnect, foreground, network recovery and back/forward restoration", async () => {
    const view = renderHook(useIncomingFriendRequestCount);
    await settled();
    for (const trigger of [
      () => state.channels[0].status?.("SUBSCRIBED"),
      () => document.dispatchEvent(new Event("visibilitychange")),
      () => window.dispatchEvent(new Event("online")),
      () => window.dispatchEvent(new Event("pageshow")),
    ]) {
      const count = view.result.current.count + 1;
      state.friends.mockResolvedValue(count);
      act(() => { trigger(); });
      await waitFor(() => expect(view.result.current.count).toBe(count));
    }
  });

  it("retains the last count on errors and recovers on the next event", async () => {
    const view = renderHook(useIncomingFriendRequestCount);
    await settled();
    state.friends.mockRejectedValueOnce(Error("offline"));
    act(() => state.channels[0].handlers[0].callback());
    await settled();
    expect(view.result.current.count).toBe(2);
    state.friends.mockResolvedValue(0);
    act(() => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(view.result.current.count).toBe(0));
  });

  it("stops resume listeners and late results after unmount", async () => {
    const view = renderHook(useIncomingFriendRequestCount);
    await settled();
    const pending = deferred<number>();
    state.friends.mockReturnValue(pending.promise);
    act(() => state.channels[0].handlers[0].callback());
    view.unmount();
    state.friends.mockClear();
    act(() => { window.dispatchEvent(new Event("online")); state.channels[0].handlers[0].callback(); });
    await act(async () => pending.resolve(99));
    expect(state.friends).not.toHaveBeenCalled();
  });

  it("keeps unread badges exact for local reads, own messages and repeated delivery", async () => {
    const view = renderHook(useUnreadMessageCount);
    await settled();
    expect(view.result.current).toEqual({ unreadCount: 4, pulseToken: 0 });
    act(() => state.channels[0].handlers[0].callback());
    await settled();
    expect(view.result.current).toEqual({ unreadCount: 4, pulseToken: 0 });
    state.unread.mockResolvedValue(0);
    act(() => state.local.forEach(callback => callback()));
    await waitFor(() => expect(view.result.current.unreadCount).toBe(0));
    state.unread.mockResolvedValue(2);
    act(() => state.channels[0].status?.("SUBSCRIBED"));
    await waitFor(() => expect(view.result.current).toEqual({ unreadCount: 2, pulseToken: 1 }));
    view.unmount();
    expect(state.local.size).toBe(0);
  });

  it("retries startup after an offline auth failure when the network returns", async () => {
    state.user.mockRejectedValueOnce(Error("offline"));
    const view = renderHook(useIncomingFriendRequestCount);
    await settled();
    expect(state.channels).toHaveLength(0);
    act(() => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(view.result.current.count).toBe(2));
    expect(state.channels).toHaveLength(1);
  });

  it("does not open a channel when unmounted before auth resolves", async () => {
    const user = deferred<{ id: string }>();
    state.user.mockReturnValue(user.promise);
    const view = renderHook(useIncomingFriendRequestCount);
    view.unmount();
    await act(async () => user.resolve({ id: "reader" }));
    expect(state.channels).toHaveLength(0);
    expect(state.friends).not.toHaveBeenCalled();
  });
});
