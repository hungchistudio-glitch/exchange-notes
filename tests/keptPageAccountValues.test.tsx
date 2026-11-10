import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccountPreferencesSync from "@/components/foundation/AccountPreferencesSync";
import { LearningLanguageProvider, useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { isKeptPage } from "@/hooks/useOnline";
import { getAppFontSize, setAppFontSize } from "@/lib/appPreferences";
import type { AccountPreferences } from "@/lib/preferences/accountPreferences";

/* =========================================================
   A kept page's account values are as old as the page

   With no signal, or a weak one, the app opens on a page the service worker
   kept (public/sw.js), and what the server rendered into it then — the
   account's settings, the learning pair — came with it. Applied as "the
   account wins", the settings put back whatever the reader had changed
   since, and the next change wrote the old ones to the account
   (2026-11-10). On a kept page they count as unread and are asked again.
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
vi.mock("@/lib/supabase/sessionUser", () => ({ getSessionUser: async () => ({ id: "reader" }) }));
vi.mock("@/lib/i18n", () => ({ loadTranslations: vi.fn().mockResolvedValue(undefined) }));

/* What the worker puts at the top of every kept copy. */
const marker = document.createElement("meta");
marker.name = "exchange-notes-kept-page";
marker.content = "2026-11-09T07:00:00.000Z";
document.head.prepend(marker);

const keptSettings: AccountPreferences = {
  fontSize: "large",
  interfaceLanguage: "english",
  dailyGoalWords: 5,
  speech: { rate: 1, voiceGender: "female", voiceURIs: {} },
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 900));

beforeEach(() => {
  db.updates.length = 0;
  db.reads = 0;
  db.read = { data: null, error: null };
  window.localStorage.clear();
  setAppFontSize("small");
});

describe("a page the device kept", () => {
  it("is recognised by the worker's mark", () => {
    expect(isKeptPage()).toBe(true);
  });

  it("does not put its old settings over the device's, and writes nothing, with no network", async () => {
    db.read = { data: null, error: { message: "Failed to fetch" } };
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<AccountPreferencesSync userId="reader" stored={keptSettings} />);
    await waitFor(() => expect(db.reads).toBe(1));
    await settle();

    expect(getAppFontSize()).toBe("small");
    expect(db.updates).toEqual([]);
  });

  it("applies the account's settings as the server has them now, when it answers", async () => {
    db.read = { data: { app_preferences: { ...keptSettings, fontSize: "medium" } }, error: null };

    render(<AccountPreferencesSync userId="reader" stored={keptSettings} />);

    await waitFor(() => expect(getAppFontSize()).toBe("medium"));
    expect(db.updates).toEqual([]);
  });

  it("asks for the learning pair again rather than trusting the one it carries", async () => {
    db.read = { data: { learning_language: "it", native_language: "zh-TW" }, error: null };
    function Shows() {
      return <p>{useLearningLanguageContext().learningLanguage}</p>;
    }

    render(
      <LearningLanguageProvider initialLearningLanguage="fr" initialNativeLanguage="zh-TW">
        <Shows />
      </LearningLanguageProvider>,
    );

    expect(await screen.findByText("it")).toBeInTheDocument();
  });
});
