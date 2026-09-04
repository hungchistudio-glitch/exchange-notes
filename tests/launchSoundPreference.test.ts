import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_LAUNCH_SOUND_ENABLED,
  getLaunchSoundEnabled,
  setLaunchSoundEnabled,
  subscribeToLaunchSound,
} from "@/lib/appPreferences";
import {
  parseAccountPreferences,
  preferencesEqual,
  readLocalPreferences,
} from "@/lib/preferences/accountPreferences";

/* =========================================================
   The switch that turns the opening's sound off

   The only sound in the app that plays without being asked, so it is the
   only one that needs somewhere to be told not to. It follows the account
   like the other preferences, which means an older document that predates it
   has to read as "never chosen" — the default — rather than as off.
   ========================================================= */

afterEach(() => {
  window.localStorage.clear();
});

describe("the opening sound preference", () => {
  it("is on until somebody turns it off", () => {
    expect(getLaunchSoundEnabled()).toBe(DEFAULT_LAUNCH_SOUND_ENABLED);
    expect(DEFAULT_LAUNCH_SOUND_ENABLED).toBe(true);
  });

  it("remembers both answers", () => {
    setLaunchSoundEnabled(false);
    expect(getLaunchSoundEnabled()).toBe(false);

    setLaunchSoundEnabled(true);
    expect(getLaunchSoundEnabled()).toBe(true);
  });

  it("tells anyone listening", () => {
    const heard: boolean[] = [];
    const stop = subscribeToLaunchSound((enabled) => heard.push(enabled));

    setLaunchSoundEnabled(false);
    setLaunchSoundEnabled(true);
    stop();
    setLaunchSoundEnabled(false);

    expect(heard).toEqual([false, true]);
  });

  it("answers the default rather than throwing where storage is blocked", () => {
    const getItem = vi
      .spyOn(window.Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });

    expect(getLaunchSoundEnabled()).toBe(DEFAULT_LAUNCH_SOUND_ENABLED);

    getItem.mockRestore();
  });

  it("travels with the account, and reads an older document as never chosen", () => {
    setLaunchSoundEnabled(false);
    expect(readLocalPreferences().launchSound).toBe(false);

    // A document written before this setting existed.
    const older = parseAccountPreferences({ fontSize: "large" });
    expect(older.launchSound).toBe(DEFAULT_LAUNCH_SOUND_ENABLED);

    // And it counts as a real difference, so a change is actually written up.
    const quiet = { ...older, launchSound: false };
    expect(preferencesEqual(older, quiet)).toBe(false);
  });
});
