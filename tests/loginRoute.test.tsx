import { isValidElement, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The login page is for people who are not signed in

   A signed-in reader who reached /login — a reopened app, the back button
   after Google, a bookmark — was shown the button anyway, and signing in a
   second time was the obvious thing to do. Now they go home. And the page
   warms Google's script in the head so the button is not the last thing on
   the screen to arrive.
   ========================================================= */

const state = vi.hoisted(() => ({
  current: { state: "signed-out" } as { state: string },
  preload: vi.fn(),
  preconnect: vi.fn(),
}));

vi.mock("@/lib/auth/currentUser", () => ({
  readCurrentUser: async () => state.current,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: state.preload,
  preconnect: state.preconnect,
}));

const { default: LoginRoute } = await import("@/app/(public)/login/page");

function props(search: Record<string, string> = {}) {
  return { searchParams: Promise.resolve(search) };
}

beforeEach(() => {
  state.current = { state: "signed-out" };
  state.preload.mockReset();
  state.preconnect.mockReset();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/login", () => {
  it("sends a signed-in reader home", async () => {
    state.current = { state: "signed-in" };

    await expect(LoginRoute(props())).rejects.toThrow("redirect:/home");
  });

  it("shows the card to a signed-out reader", async () => {
    const page = (await LoginRoute(props())) as ReactElement<{ initialError: boolean }>;

    expect(isValidElement(page)).toBe(true);
    expect(page.props.initialError).toBe(false);
  });

  it("shows the card when the auth server cannot be reached", async () => {
    state.current = { state: "unavailable" };

    const page = (await LoginRoute(props())) as ReactElement<{ initialError: boolean }>;

    expect(isValidElement(page)).toBe(true);
  });

  it("passes on that the last attempt was refused", async () => {
    const page = (await LoginRoute(props({ error: "google" }))) as ReactElement<{
      initialError: boolean;
    }>;

    expect(page.props.initialError).toBe(true);
  });

  it("starts Google's script from the head when a client id is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");

    await LoginRoute(props());

    expect(state.preconnect).toHaveBeenCalledWith("https://accounts.google.com");
    expect(state.preload).toHaveBeenCalledWith(
      "https://accounts.google.com/gsi/client",
      { as: "script" },
    );
  });

  it("asks Google for nothing when no client id is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");

    await LoginRoute(props());

    expect(state.preload).not.toHaveBeenCalled();
    expect(state.preconnect).not.toHaveBeenCalled();
  });
});
