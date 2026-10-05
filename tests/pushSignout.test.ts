import { afterEach, expect, it, vi } from "vitest";
import { removeWebPushOnSignOut } from "@/lib/push/client";
afterEach(() => vi.unstubAllGlobals());
it("unsubscribes locally even if server cleanup is unavailable", async () => {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => ({ endpoint: "https://web.push.apple.com/test", unsubscribe }) } }) } });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  await expect(removeWebPushOnSignOut()).rejects.toThrow("offline");
  expect(unsubscribe).toHaveBeenCalledOnce();
});
it("finishes without waiting for serviceWorker.ready when no worker is installed", async () => {
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => undefined } });
  await expect(removeWebPushOnSignOut()).resolves.toBeUndefined();
});
