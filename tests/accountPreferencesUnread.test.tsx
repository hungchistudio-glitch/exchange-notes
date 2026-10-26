import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccountPreferencesSync from "@/components/foundation/AccountPreferencesSync";
import { getAppFontSize, setAppFontSize } from "@/lib/appPreferences";
import type { AccountPreferences } from "@/lib/preferences/accountPreferences";

/* =========================================================
   Settings the server could not read are not settings never saved

   The protected layout reads profiles.app_preferences on every signed-in
   page. On 2026-10-26 that read was refused five times in a day (PGRST303,
   a token minted a moment too early for the database's clock), and the
   layout passed null: "this account has never saved any". The sync then
   wrote this device's settings over the account's. Now an unread value is
   undefined, read again from the page, and if that fails too nothing is
   written until the reader changes something.
   ========================================================= */

const db = vi.hoisted(() => ({
  updates: [] as Array<Record<string, unknown>>,
  read: { data: null, error: null } as { data: unknown; error: unknown },
  reads: 0,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: (values: Record<string, unknown>) => {
        db.updates.push(values);
        return { eq: () => ({ then: (resolve: (r: { error: null }) => void) => resolve({ error: null }) }) };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: () => {
            db.reads += 1;
            return Promise.resolve(db.read);
          },
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/i18n", () => ({
  loadTranslations: vi.fn().mockResolvedValue(undefined),
}));

const account: AccountPreferences = {
  fontSize: "large",
  interfaceLanguage: "english",
  dailyGoalWords: 5,
  speech: { rate: 1, voiceGender: "female", voiceURIs: {} },
};

const settle = () => new Promise(resolve => setTimeout(resolve, 900));

beforeEach(() => {
  db.updates.length = 0;
  db.reads = 0;
  db.read = { data: null, error: null };
  window.localStorage.clear();
  setAppFontSize("small");
});

describe("preferences the server could not read", () => {
  it("are read again from the page, and the account's are applied, not overwritten", async () => {
    db.read = { data: { app_preferences: account }, error: null };
    render(<AccountPreferencesSync userId="reader" stored={undefined} />);
    await waitFor(() => expect(getAppFontSize()).toBe("large"));
    await settle();
    expect(db.reads).toBe(1);
    expect(db.updates).toEqual([]);
  });

  it("write nothing when the page cannot read them either", async () => {
    db.read = { data: null, error: { code: "PGRST303" } };
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AccountPreferencesSync userId="reader" stored={undefined} />);
    await waitFor(() => expect(db.reads).toBe(1));
    await settle();
    expect(db.updates).toEqual([]);
    expect(getAppFontSize()).toBe("small");
  });

  it("still carry a device's settings up to an account that truly has none", async () => {
    render(<AccountPreferencesSync userId="reader" stored={null} />);
    await waitFor(() => expect(db.updates).toHaveLength(1));
    expect(db.reads).toBe(0);
    expect(db.updates[0]).toMatchObject({ app_preferences: { fontSize: "small" } });
  });
});
