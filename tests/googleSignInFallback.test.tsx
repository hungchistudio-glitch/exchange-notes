import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   Nothing about the branded sign-in may be the only way in

   Signing in with Google through the ID token flow puts the app's name on
   the consent screen instead of the Supabase project ref. It also puts a
   third-party script on the critical path of the one screen a signed-out
   person has, and that script can be blocked by an extension, an enterprise
   proxy, a filtered network, or simply be slow.

   Losing the branding is a bad day. Losing the only way into the app is an
   outage — so every way this can fail has to end at the redirect button that
   has always worked. These are the two that matter: no client id, which is
   the state it ships in, and a script that never arrives.
   ========================================================= */

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: {} }),
}));

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const { default: GoogleIdentityButton } = await import(
  "@/components/auth/GoogleIdentityButton"
);

/** The redirect button, by the markup only it has. */
function fallbackButton() {
  return document.querySelector("main button.rounded-full, button.rounded-full");
}

afterEach(() => {
  vi.useRealTimers();
  document
    .querySelectorAll('script[src*="accounts.google.com"]')
    .forEach((node) => node.remove());
});

describe("signing in when Google Identity is not available", () => {
  it("gives the redirect button when no client id is configured", () => {
    /* The state this ships in: nothing set, nothing to fall back from. */
    expect(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID).toBeFalsy();

    render(<GoogleIdentityButton />);

    expect(fallbackButton()).not.toBeNull();
  });

  it("asks Google for nothing at all when unconfigured", () => {
    /*
     * Not merely invisible — absent. An unconfigured deployment should not be
     * reaching accounts.google.com on the login screen at all.
     */
    render(<GoogleIdentityButton />);

    expect(
      document.querySelector('script[src*="accounts.google.com"]'),
    ).toBeNull();
  });

  it("falls back when the script never arrives", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
      "test-client-id.apps.googleusercontent.com",
    );

    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<GoogleIdentityButton />);

    /*
     * jsdom fetches no external script, so the load event never fires — the
     * same shape as a blocked or hanging request. Without the grace timer
     * this is a login screen with no button on it, for as long as the reader
     * is willing to look at it.
     */
    await vi.advanceTimersByTimeAsync(5000);

    await waitFor(() => expect(fallbackButton()).not.toBeNull());

    vi.unstubAllEnvs();
  });
});
