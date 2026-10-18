import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   An installed app never signs in through a popup

   In an iOS Home Screen web app, Google's popup opens a separate in-app
   browser and the account the reader picks does not reliably come back.
   Chi's report, 2026-10-18: pick an account, return to the login page,
   nothing has happened, sign in again. Supabase's logs agreed — the first
   attempt never reached it.

   So the button asks Google for redirect mode when the page is an installed
   app, and keeps the popup in a browser tab. These pin both, and the nonce
   cookie the redirect relies on, and that the button is only revealed once
   Google has actually drawn it.
   ========================================================= */

const gsi = vi.hoisted(() => ({
  config: null as Record<string, unknown> | null,
  /* Cleared after each test, so none can fire into a torn-down document. */
  timers: new Set<ReturnType<typeof setTimeout>>(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: {} }),
}));

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

vi.mock("@/lib/auth/googleIdentity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/googleIdentity")>();

  return {
    ...actual,
    getGoogleClientId: () => "test-client-id.apps.googleusercontent.com",
    createSignInNonce: async () => ({ raw: "raw-nonce", hashed: "hashed-nonce" }),
    loadGoogleIdentity: async () => ({
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => {
            gsi.config = config;
          },
          /* What Google does: an iframe that loads its own page afterwards. */
          renderButton: (parent: HTMLElement) => {
            const frame = document.createElement("iframe");
            parent.appendChild(frame);
            const timer = setTimeout(() => {
              gsi.timers.delete(timer);
              /* The frame's own window's Event, not whichever global is current. */
              const view = frame.ownerDocument.defaultView;
              if (view) frame.dispatchEvent(new view.Event("load"));
            }, 10);
            gsi.timers.add(timer);
          },
          disableAutoSelect: () => {},
          cancel: () => {},
        },
      },
    }),
  };
});

const { default: GoogleIdentityButton } = await import(
  "@/components/auth/GoogleIdentityButton"
);

import { GOOGLE_NONCE_COOKIE } from "@/lib/auth/googleRedirect";

function setStandalone(standalone: boolean) {
  Object.defineProperty(window.navigator, "standalone", {
    configurable: true,
    value: standalone,
  });
}

function slot() {
  return document.querySelector("[data-status]");
}

beforeEach(() => {
  gsi.config = null;
  document.cookie = `${GOOGLE_NONCE_COOKIE}=; Max-Age=0; Path=/auth/google`;
});

afterEach(() => {
  setStandalone(false);
  gsi.timers.forEach(clearTimeout);
  gsi.timers.clear();
});

describe("the Google button", () => {
  it("uses redirect mode in a Home Screen app and leaves the nonce for the route", async () => {
    setStandalone(true);

    const writes: string[] = [];
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: (value: string) => writes.push(value),
    });

    try {
      render(<GoogleIdentityButton />);
      await waitFor(() => expect(gsi.config).not.toBeNull());
    } finally {
      Object.defineProperty(document, "cookie", descriptor);
    }

    /* The raw value the route will hand Supabase, before Google is asked. */
    expect(writes.some((cookie) => cookie.startsWith(`${GOOGLE_NONCE_COOKIE}=raw-nonce`))).toBe(true);
    expect(gsi.config).toMatchObject({
      ux_mode: "redirect",
      login_uri: `${window.location.origin}/auth/google`,
      nonce: "hashed-nonce",
    });
    /* Redirect mode posts to the route; a callback would never be called. */
    expect(gsi.config).not.toHaveProperty("callback");
  });

  it("keeps the popup in a browser tab", async () => {
    render(<GoogleIdentityButton />);

    await waitFor(() => expect(gsi.config).not.toBeNull());

    expect(gsi.config).toMatchObject({ ux_mode: "popup" });
    expect(typeof gsi.config?.callback).toBe("function");
    expect(gsi.config).not.toHaveProperty("login_uri");
  });

  it("holds the placeholder until Google's iframe has drawn", async () => {
    render(<GoogleIdentityButton />);

    expect(slot()?.getAttribute("data-status")).toBe("pending");

    await waitFor(() =>
      expect(slot()?.getAttribute("data-status")).toBe("ready"),
    );
  });

  it("says the last attempt failed when sent back from the route", () => {
    render(<GoogleIdentityButton initialError />);

    expect(document.querySelector('[role="alert"]')).not.toBeNull();
  });
});

describe("rememberRedirectNonce", () => {
  it("writes a cookie a cross-site POST will carry, scoped to the route", async () => {
    const { rememberRedirectNonce } = await import("@/lib/auth/googleRedirect");
    const writes: string[] = [];
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;

    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: (value: string) => writes.push(value),
    });

    try {
      rememberRedirectNonce("a b");
    } finally {
      Object.defineProperty(document, "cookie", descriptor);
    }

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain(`${GOOGLE_NONCE_COOKIE}=a%20b`);
    expect(writes[0]).toContain("Path=/auth/google");
    expect(writes[0]).toContain("SameSite=None");
    expect(writes[0]).toContain("Secure");
  });
});
