import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetDeviceCopies } from "@/lib/offline/forgetDevice";

/* =========================================================
   Signing out has to empty the device, not just the session

   The vocabulary mirror was already handled — it records an owner, refuses to
   be read by anyone else, and is cleared on sign-out. Two stores holding the
   same kind of thing were not.

   `vocabulary-interactions-v1` is every word the reader has viewed,
   searched, spoken, shared or sent, with the word and its translation
   written out beside the counts. It survived a sign-out, and the next
   account's library was ordered by it.

   The service worker's cache holds the HTML of the signed-in pages, because
   public/sw.js is network-first over every same-origin GET that is not an
   API route. That survived too, and offline it is what the app serves.

   A shared or handed-on phone is the ordinary case for this app. These are
   the two that were being left behind.
   ========================================================= */

const ACCOUNT_KEYS = [
  "vocabulary-interactions-v1",
  "exchange-notes-home-notes",
  "pending-shared-vocabulary",
  "exchange-notes-pronunciation-session",
  "exchange-notes-device-connections",
];

/** Preferences of the device rather than of the person. */
const DEVICE_KEYS = [
  "exchange-notes-font-size",
  "speech-settings",
  "exchange-notes-daily-word-goal",
  "exchange-notes-tutorial-pending",
];

function fakeCaches(names: string[]) {
  const deleted: string[] = [];

  vi.stubGlobal("caches", {
    keys: async () => names,
    delete: async (name: string) => {
      deleted.push(name);
      return true;
    },
  });

  return deleted;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("forgetDeviceCopies", () => {
  it("removes every store holding the account's content", async () => {
    fakeCaches([]);

    for (const key of ACCOUNT_KEYS) {
      window.localStorage.setItem(key, JSON.stringify({ leftBehind: true }));
    }

    await forgetDeviceCopies();

    for (const key of ACCOUNT_KEYS) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
  });

  it("leaves the device's own preferences alone", async () => {
    /*
     * Signing out and back in as yourself must not reset the font size. These
     * belong to the device, and clearing them buys no privacy.
     */
    fakeCaches([]);

    for (const key of DEVICE_KEYS) {
      window.localStorage.setItem(key, "kept");
    }

    await forgetDeviceCopies();

    for (const key of DEVICE_KEYS) {
      expect(window.localStorage.getItem(key)).toBe("kept");
    }
  });

  it("empties the service worker's cache of signed-in pages", async () => {
    const deleted = fakeCaches([
      "exchange-notes-v3",
      "exchange-notes-v2",
    ]);

    await forgetDeviceCopies();

    /*
     * By name rather than by entry, and every name rather than today's: the
     * worker bumps its own cache version, and matching on the current
     * constant would quietly stop working the next time it changes.
     */
    expect(deleted).toEqual(["exchange-notes-v3", "exchange-notes-v2"]);
  });

  it("still clears storage when the cache API is unavailable", async () => {
    // Insecure contexts and some privacy modes have no `caches` at all.
    vi.stubGlobal("caches", undefined);

    window.localStorage.setItem("vocabulary-interactions-v1", "{}");

    await expect(forgetDeviceCopies()).resolves.toBeUndefined();
    expect(
      window.localStorage.getItem("vocabulary-interactions-v1"),
    ).toBeNull();
  });

  it("survives a cache API that throws", async () => {
    vi.stubGlobal("caches", {
      keys: async () => {
        throw new Error("Storage is not available in this context.");
      },
      delete: async () => true,
    });

    window.localStorage.setItem("pending-shared-vocabulary", "{}");

    await expect(forgetDeviceCopies()).resolves.toBeUndefined();
    expect(window.localStorage.getItem("pending-shared-vocabulary")).toBeNull();
  });
});
