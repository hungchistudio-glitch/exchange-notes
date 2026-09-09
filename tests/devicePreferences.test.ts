import { beforeEach, describe, expect, it } from "vitest";

import {
  APP_FONT_SIZE_COOKIE,
  DAILY_GOAL_COOKIE,
  DEFAULT_APP_FONT_SIZE,
  DEFAULT_DAILY_GOAL_WORDS,
  DEFAULT_INTERFACE_LANGUAGE,
  INTERFACE_LANGUAGE_COOKIE,
  getAppFontSize,
  getDailyGoalWords,
  getInterfaceLanguage,
  setAppFontSize,
  setDailyGoalWords,
  setInterfaceLanguage,
} from "@/lib/appPreferences";

/*
 * The interface language decides every string in the app, so the server has
 * to be able to see it. Read from localStorage alone — which is where it used
 * to live — the server rendered English, the browser rendered the reader's
 * own language, and React resolved the mismatch by discarding the server's
 * tree and rebuilding the entire page. That rebuild was the flash on every
 * launch.
 *
 * These hold the two halves of the fix: the cookie is authoritative, and a
 * device that only has the old localStorage value is migrated the first time
 * it is read rather than on some later visit to Settings.
 */

function clearPreferences() {
  window.localStorage.clear();

  for (const name of [
    INTERFACE_LANGUAGE_COOKIE,
    APP_FONT_SIZE_COOKIE,
    DAILY_GOAL_COOKIE,
  ]) {
    document.cookie = `${name}=; path=/; max-age=0`;
  }
}

describe("the stored interface language", () => {
  beforeEach(clearPreferences);

  it("falls back to the default when nothing is stored", () => {
    expect(getInterfaceLanguage()).toBe(DEFAULT_INTERFACE_LANGUAGE);
  });

  it("is written to the cookie, which is the copy the server reads", () => {
    setInterfaceLanguage("traditional-chinese");

    expect(document.cookie).toContain(
      `${INTERFACE_LANGUAGE_COOKIE}=traditional-chinese`,
    );
    expect(getInterfaceLanguage()).toBe("traditional-chinese");
  });

  it("migrates a device that only has the old localStorage value", () => {
    window.localStorage.setItem(
      "exchange-notes-interface-language",
      "french",
    );

    // The read itself writes the cookie through, so this is the last load
    // that could have been rendered in the wrong language.
    expect(getInterfaceLanguage()).toBe("french");
    expect(document.cookie).toContain(`${INTERFACE_LANGUAGE_COOKIE}=french`);
  });

  it("keeps localStorage in step, for a browser that drops the cookie", () => {
    setInterfaceLanguage("italian");

    expect(
      window.localStorage.getItem("exchange-notes-interface-language"),
    ).toBe("italian");
  });

  it("ignores a language it does not have a dictionary for", () => {
    document.cookie = `${INTERFACE_LANGUAGE_COOKIE}=klingon; path=/`;

    expect(getInterfaceLanguage()).toBe(DEFAULT_INTERFACE_LANGUAGE);
  });
});

describe("the stored font size", () => {
  beforeEach(clearPreferences);

  it("is written to the cookie, so the document arrives at the right size", () => {
    // Not cosmetic: this is the root font size, so every rem in the app is
    // measured against it. Applied only after hydration, a reader on "small"
    // watched the whole interface relay itself on every load.
    setAppFontSize("small");

    expect(document.cookie).toContain(`${APP_FONT_SIZE_COOKIE}=small`);
    expect(getAppFontSize()).toBe("small");
  });

  it("migrates a device that only has the old localStorage value", () => {
    window.localStorage.setItem("exchange-notes-font-size", "large");

    expect(getAppFontSize()).toBe("large");
    expect(document.cookie).toContain(`${APP_FONT_SIZE_COOKIE}=large`);
  });

  it("falls back to the default when nothing is stored", () => {
    expect(getAppFontSize()).toBe(DEFAULT_APP_FONT_SIZE);
  });
});

describe("the stored daily goal", () => {
  beforeEach(clearPreferences);

  it("is written to the cookie, because it is rendered as a number", () => {
    setDailyGoalWords(33);

    expect(document.cookie).toContain(`${DAILY_GOAL_COOKIE}=33`);
    expect(getDailyGoalWords()).toBe(33);
  });

  it("migrates a device that only has the old localStorage value", () => {
    window.localStorage.setItem("exchange-notes-daily-word-goal", "20");

    expect(getDailyGoalWords()).toBe(20);
    expect(document.cookie).toContain(`${DAILY_GOAL_COOKIE}=20`);
  });

  it("refuses a number that is not on the ladder", () => {
    document.cookie = `${DAILY_GOAL_COOKIE}=7; path=/`;

    expect(getDailyGoalWords()).toBe(DEFAULT_DAILY_GOAL_WORDS);
  });
});
