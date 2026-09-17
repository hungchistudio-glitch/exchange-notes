import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AccountPreferencesSync from "@/components/foundation/AccountPreferencesSync";
import { getAppFontSize, getInterfaceLanguage } from "@/lib/appPreferences";
import {
  applyChosenFields,
  clearChosenBeforeSignIn,
  markChosenBeforeSignIn,
  readChosenBeforeSignIn,
} from "@/lib/preferences/pendingChoices";
import type { AccountPreferences } from "@/lib/preferences/accountPreferences";

/* =========================================================
   A choice made before signing in is an answer, not leftovers

   AccountPreferencesSync has one rule when the account already holds
   settings: the account wins. That is right for ambient state — it is what
   makes a new phone come back looking like the reader left it. It is wrong
   for something the reader picked on the page before, and it only goes wrong
   for returning readers, because a fresh account stores nothing and the
   device already wins there.

   Picking French on the landing page and watching the app come up French and
   then flip to English is the app contradicting the reader, visibly.
   ========================================================= */

const updates: Array<Record<string, unknown>> = [];

const supabase = vi.hoisted(() => ({
  update: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: (values: Record<string, unknown>) => {
        supabase.update(values);
        return {
          eq: () => ({ then: (resolve: (r: { error: null }) => void) => resolve({ error: null }) }),
        };
      },
    }),
  }),
}));

vi.mock("@/lib/i18n", () => ({
  loadTranslations: vi.fn().mockResolvedValue(undefined),
}));

const storedAccount: AccountPreferences = {
  fontSize: "small",
  interfaceLanguage: "english",
  dailyGoalWords: 5,
  speech: { rate: 1, voiceGender: "female", voiceURIs: {} },
};

beforeEach(() => {
  updates.length = 0;
  window.localStorage.clear();
  document.cookie
    .split(";")
    .map(part => part.split("=")[0]?.trim())
    .filter(Boolean)
    .forEach(name => {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    });
  supabase.update.mockReset().mockImplementation((values: Record<string, unknown>) => {
    updates.push(values);
  });
});

afterEach(() => {
  clearChosenBeforeSignIn();
});

async function sync(stored: unknown) {
  render(<AccountPreferencesSync userId="reader" stored={stored} />);
  await waitFor(() => expect(getInterfaceLanguage()).toBeDefined());
}

describe("the record of what was chosen before signing in", () => {
  it("keeps only recognised fields, and only one of each", () => {
    markChosenBeforeSignIn("interfaceLanguage");
    markChosenBeforeSignIn("interfaceLanguage");
    markChosenBeforeSignIn("fontSize");

    expect(readChosenBeforeSignIn().sort()).toEqual(["fontSize", "interfaceLanguage"]);
  });

  it.each([
    ["not json", []],
    ["{}", []],
    ['"interfaceLanguage"', []],
    ['["nonsense"]', []],
    ['["speech","nonsense"]', ["speech"]],
  ])("survives a stored record of %s", (written, expected) => {
    window.localStorage.setItem(
      "exchange-notes:preferences:chosen-before-sign-in",
      written,
    );

    expect(readChosenBeforeSignIn()).toEqual(expected);
  });

  it("puts back only the fields that were chosen, never the rest", () => {
    const local: AccountPreferences = {
      fontSize: "large",
      interfaceLanguage: "french",
      dailyGoalWords: 20,
      speech: { rate: 2, voiceGender: "male", voiceURIs: {} },
    };

    const merged = applyChosenFields(storedAccount, local, ["interfaceLanguage"]);

    expect(merged.interfaceLanguage).toBe("french");
    // Everything unspoken is still the account's.
    expect(merged.fontSize).toBe("small");
    expect(merged.dailyGoalWords).toBe(5);
    expect(merged.speech.rate).toBe(1);
  });
});

describe("signing in after choosing a language on the landing page", () => {
  it("keeps the chosen language and carries it up to the account", async () => {
    // What the landing page's picker does.
    const { setInterfaceLanguage } = await import("@/lib/appPreferences");
    act(() => setInterfaceLanguage("french"));
    markChosenBeforeSignIn("interfaceLanguage");

    await sync(storedAccount);

    await waitFor(() => expect(getInterfaceLanguage()).toBe("french"));
    await waitFor(() =>
      expect(updates.at(-1)?.app_preferences).toMatchObject({
        interfaceLanguage: "french",
      }),
    );
  });

  it("still lets the account replace everything nobody chose", async () => {
    const { setAppFontSize, setInterfaceLanguage } = await import("@/lib/appPreferences");
    act(() => {
      setInterfaceLanguage("french");
      // Changed on this device at some point, but not on the way in.
      setAppFontSize("large");
    });
    markChosenBeforeSignIn("interfaceLanguage");

    await sync(storedAccount);

    await waitFor(() => expect(getInterfaceLanguage()).toBe("french"));
    expect(getAppFontSize()).toBe("small");
  });

  it("leaves a returning reader who chose nothing entirely to the account", async () => {
    const { setInterfaceLanguage } = await import("@/lib/appPreferences");
    act(() => setInterfaceLanguage("french"));

    await sync(storedAccount);

    await waitFor(() => expect(getInterfaceLanguage()).toBe("english"));
  });

  /*
   * The shared-computer case. A standing "this device prefers French" would
   * be applied to whoever signs in next, which is this same bug pointed at
   * someone else.
   */
  it("spends the record, so the next person to sign in here is unaffected", async () => {
    const { setInterfaceLanguage } = await import("@/lib/appPreferences");
    act(() => setInterfaceLanguage("french"));
    markChosenBeforeSignIn("interfaceLanguage");

    await sync(storedAccount);
    await waitFor(() => expect(getInterfaceLanguage()).toBe("french"));

    expect(readChosenBeforeSignIn()).toEqual([]);
  });

  it("clears the record for a fresh account too, which adopts the device anyway", async () => {
    const { setInterfaceLanguage } = await import("@/lib/appPreferences");
    act(() => setInterfaceLanguage("french"));
    markChosenBeforeSignIn("interfaceLanguage");

    await sync(null);

    await waitFor(() =>
      expect(updates.at(-1)?.app_preferences).toMatchObject({
        interfaceLanguage: "french",
      }),
    );
    expect(readChosenBeforeSignIn()).toEqual([]);
  });
});
