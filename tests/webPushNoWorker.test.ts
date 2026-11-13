import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Settings' Notifications row waited on `navigator.serviceWorker.ready`,
 * which never settles while no worker is registered: the row said
 * "Checking…" and the button "Turning on…" for as long as the page was open
 * (Chi, 2026-11-13: 等不到就顯示無法使用). Now the wait has a limit, and
 * running out of it reads as unavailable.
 */

import {
  disableWebPush,
  enableWebPush,
  getWebPushStatus,
  WORKER_WAIT_MS,
} from "@/lib/push/client";

const getSubscription = vi.fn(async () => null);
let ready: Promise<unknown>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U");
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", { permission: "granted", requestPermission: vi.fn(async () => "granted") });
  ready = new Promise(() => {});
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    get: () => ({ get ready() { return ready; } }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  // jsdom has no serviceWorker of its own; take the stand-in away again.
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe("the Notifications row with no service worker", () => {
  it("says unavailable once the wait runs out, instead of checking forever", async () => {
    const status = getWebPushStatus();
    await vi.advanceTimersByTimeAsync(WORKER_WAIT_MS);

    await expect(status).resolves.toMatchObject({ code: "no-worker", available: false, subscribed: false });
  });

  it("stops turning on and off with a reason the screen can name", async () => {
    const enabling = enableWebPush();
    const disabling = disableWebPush();
    await vi.advanceTimersByTimeAsync(WORKER_WAIT_MS);

    await expect(enabling).resolves.toMatchObject({ ok: false, code: "no-worker" });
    await expect(disabling).resolves.toMatchObject({ ok: false, code: "no-worker" });
  });

  it("reads the subscription as before when the worker is there", async () => {
    ready = Promise.resolve({ pushManager: { getSubscription } });

    await expect(getWebPushStatus()).resolves.toMatchObject({ code: "available", subscribed: false });
    expect(getSubscription).toHaveBeenCalledOnce();
  });
});
