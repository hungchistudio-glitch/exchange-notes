import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ensurePocketKey, forgetPocketKey, resetPocketKeyForTests } from "@/lib/pocket/device";

/*
 * The web app's half of the share extension's key (Chi, 2026-11-12): only
 * inside the iPhone app, a phone without a key gets one, once; signing out
 * revokes it and has the phone forget it. In a browser, nothing happens.
 */
type BridgeWindow = Window & {
  __yumiPocketKey?: { present: boolean; id: string | null };
  webkit?: unknown;
};

describe("the share extension's key, from the web app", () => {
  let posted: unknown[];
  const fetchMock = vi.fn();

  function installBridge(state: { present: boolean; id: string | null } | undefined) {
    posted = [];
    (window as BridgeWindow).webkit = {
      messageHandlers: { yumiPocketKey: { postMessage: (body: unknown) => posted.push(body) } },
    };
    (window as BridgeWindow).__yumiPocketKey = state;
  }

  beforeEach(() => {
    resetPocketKeyForTests();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    delete (window as BridgeWindow).webkit;
    delete (window as BridgeWindow).__yumiPocketKey;
    vi.unstubAllGlobals();
  });

  it("does nothing in a browser", async () => {
    await ensurePocketKey();
    await forgetPocketKey();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("issues a key for a phone that has none, hands it over, and asks once", async () => {
    installBridge({ present: false, id: null });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "0e1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b", key: "enpk_".concat("a".repeat(43)) }),
    });
    await ensurePocketKey();
    await ensurePocketKey();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pocket/key");
    expect(posted).toEqual([{ version: 1, key: "enpk_".concat("a".repeat(43)), id: "0e1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b" }]);
  });

  it("leaves a phone that already holds a key alone", async () => {
    installBridge({ present: true, id: "0e1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b" });
    await ensurePocketKey();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("revokes the phone's key and has it forgotten on signing out", async () => {
    installBridge({ present: true, id: "0e1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b" });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await forgetPocketKey();
    expect(fetchMock).toHaveBeenCalledWith("/api/pocket/key?id=0e1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b", { method: "DELETE" });
    expect(posted).toEqual([{ version: 1, clear: true }]);
  });
});
