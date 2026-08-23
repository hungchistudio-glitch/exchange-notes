import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_INTERFACE_LANGUAGE,
  INTERFACE_LANGUAGE_COOKIE,
  getInterfaceLanguage,
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

function clearLanguage() {
  window.localStorage.clear();
  document.cookie = `${INTERFACE_LANGUAGE_COOKIE}=; path=/; max-age=0`;
}

describe("the stored interface language", () => {
  beforeEach(clearLanguage);

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
