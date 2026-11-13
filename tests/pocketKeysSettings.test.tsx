import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { default: PocketKeysSettingsButton } = await import("@/components/settings/PocketKeysSettingsButton");

/*
 * Settings → Devices, Yumi Pocket Lookup's share keys (Chi, 2026-11-12):
 * shown inside the iPhone app, or anywhere once a key exists; never to a
 * reader who has not opened the app on an iPhone.
 */
type BridgeWindow = Window & { webkit?: unknown; __yumiPocketKey?: unknown };

function keysAre(keys: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ keys }) })));
}

afterEach(() => {
  delete (window as BridgeWindow).webkit;
  delete (window as BridgeWindow).__yumiPocketKey;
  vi.unstubAllGlobals();
});

describe("the share-key row in Settings", () => {
  it("is not there on the web for a reader with no keys", async () => {
    keysAre([]);
    const { container } = render(<PocketKeysSettingsButton />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("is there on the web once a key exists, to revoke a lost phone's", async () => {
    keysAre([{ id: "0e1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b", label: "iPhone", created_at: "2026-11-12T00:00:00Z", last_used_at: null }]);
    render(<PocketKeysSettingsButton />);
    expect(await screen.findByText("Sharing to Yumi Pocket Lookup")).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();
  });

  it("is there inside the iPhone app even before the first key", async () => {
    (window as BridgeWindow).webkit = { messageHandlers: { yumiPocketKey: { postMessage() {} } } };
    keysAre([]);
    render(<PocketKeysSettingsButton />);
    expect(await screen.findByText("Sharing to Yumi Pocket Lookup")).toBeInTheDocument();
  });
});
