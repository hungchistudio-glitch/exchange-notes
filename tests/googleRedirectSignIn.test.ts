import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The installed app's sign-in, and the redirect flow's failures

   The Home Screen app signs in by Google's redirect mode: Google POSTs the ID
   token to /auth/google, which signs in on the server. Before that, the app
   used the popup, which in a Home Screen web app opens a separate browser
   that does not reliably hand the account back — the reader picked an
   account, returned to the login page, and had to do it all again.

   These pin what the route must refuse, what it must accept, and that every
   failure, here and in /auth/callback, ends on the login page saying so
   rather than silently on a second login screen.
   ========================================================= */

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  signInWithIdToken: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      state.cookies.has(name)
        ? { name, value: state.cookies.get(name)! }
        : undefined,
    getAll: () =>
      [...state.cookies].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => state.cookies.set(name, value),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signInWithIdToken: state.signInWithIdToken },
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { exchangeCodeForSession: state.exchangeCodeForSession },
  }),
}));

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import { GET as callback } from "@/app/auth/callback/route";
import { GET, POST } from "@/app/auth/google/route";
import { PENDING_FRIEND_INVITE_COOKIE } from "@/lib/friends";
import { GOOGLE_NONCE_COOKIE } from "@/lib/auth/googleRedirect";

const ORIGIN = "https://exchange-notes-app.vercel.app";

function googlePost(fields: Record<string, string>) {
  return new NextRequest(`${ORIGIN}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
}

function location(response: Response) {
  return new URL(response.headers.get("location") ?? "", ORIGIN);
}

/** Whether the response expires `name` (Set-Cookie with Max-Age=0). */
function clears(response: Response, name: string) {
  return response.headers
    .getSetCookie()
    .some((cookie) => cookie.startsWith(`${name}=`) && /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(cookie));
}

beforeEach(() => {
  state.cookies.clear();
  state.signInWithIdToken.mockReset();
  state.signInWithIdToken.mockResolvedValue({ data: {}, error: null });
  state.exchangeCodeForSession.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});

  state.cookies.set("g_csrf_token", "csrf-1");
  state.cookies.set(GOOGLE_NONCE_COOKIE, encodeURIComponent("raw-nonce"));
});

describe("POST /auth/google", () => {
  it("signs in with the raw nonce and goes home with a 303", async () => {
    const response = await POST(
      googlePost({ credential: "id-token", g_csrf_token: "csrf-1" }),
    );

    expect(state.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "id-token",
      nonce: "raw-nonce",
    });
    expect(response.status).toBe(303);
    expect(location(response).pathname).toBe("/home");
    // Single use: the token it was bound to has been spent.
    expect(clears(response, GOOGLE_NONCE_COOKIE)).toBe(true);
  });

  it("lands on the invite a signed-out QR scan parked", async () => {
    state.cookies.set(PENDING_FRIEND_INVITE_COOKIE, "abcd1234");

    const response = await POST(
      googlePost({ credential: "id-token", g_csrf_token: "csrf-1" }),
    );

    expect(location(response).pathname).not.toBe("/home");
    expect(clears(response, PENDING_FRIEND_INVITE_COOKIE)).toBe(true);
  });

  it("accepts JSON as well as a form", async () => {
    const response = await POST(
      new NextRequest(`${ORIGIN}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: "id-token", g_csrf_token: "csrf-1" }),
      }),
    );

    expect(state.signInWithIdToken).toHaveBeenCalled();
    expect(location(response).pathname).toBe("/home");
  });

  it("still signs in when Google's five-minute CSRF cookie has lapsed", async () => {
    /*
     * The nonce already binds the token to this browser. Refusing a reader for
     * taking longer than five minutes with Google would be the "sign in
     * twice" bug again.
     */
    state.cookies.delete("g_csrf_token");

    const response = await POST(
      googlePost({ credential: "id-token", g_csrf_token: "csrf-1" }),
    );

    expect(state.signInWithIdToken).toHaveBeenCalled();
    expect(location(response).pathname).toBe("/home");
  });

  it.each([
    ["no credential", { g_csrf_token: "csrf-1" }],
    ["no CSRF token in the body", { credential: "id-token" }],
    ["a CSRF token that does not match", { credential: "id-token", g_csrf_token: "other" }],
  ])("refuses %s without asking Supabase", async (_case, fields) => {
    const response = await POST(googlePost(fields));

    expect(state.signInWithIdToken).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(location(response).pathname).toBe("/login");
    expect(location(response).searchParams.get("error")).toBe("google");
  });

  it("refuses a post this browser never asked for", async () => {
    /* No nonce cookie: whatever this token is, it is not this attempt's. */
    state.cookies.delete(GOOGLE_NONCE_COOKIE);

    const response = await POST(
      googlePost({ credential: "id-token", g_csrf_token: "csrf-1" }),
    );

    expect(state.signInWithIdToken).not.toHaveBeenCalled();
    expect(location(response).pathname).toBe("/login");
  });

  it("goes back to the login page, saying so, when Supabase refuses", async () => {
    state.signInWithIdToken.mockResolvedValue({
      data: {},
      error: { message: "invalid nonce: Nonces mismatch" },
    });

    const response = await POST(
      googlePost({ credential: "id-token", g_csrf_token: "csrf-1" }),
    );

    expect(location(response).pathname).toBe("/login");
    expect(location(response).searchParams.get("error")).toBe("google");
    expect(clears(response, GOOGLE_NONCE_COOKIE)).toBe(true);
  });

  it("sends a GET to the login page", async () => {
    const response = GET(new NextRequest(`${ORIGIN}/auth/google`));

    expect(location(response).pathname).toBe("/login");
  });
});

describe("GET /auth/callback", () => {
  it("goes home after a good code exchange", async () => {
    state.exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await callback(
      new NextRequest(`${ORIGIN}/auth/callback?code=abc`),
    );

    expect(location(response).pathname).toBe("/home");
  });

  it("goes back to the login page, saying so, when the exchange fails", async () => {
    /*
     * It used to carry on to /home regardless, whose auth check bounced the
     * reader to a login page with nothing on it about the failure.
     */
    state.exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid flow state" },
    });

    const response = await callback(
      new NextRequest(`${ORIGIN}/auth/callback?code=abc`),
    );

    expect(location(response).pathname).toBe("/login");
    expect(location(response).searchParams.get("error")).toBe("google");
  });

  it("goes home with no code, which is how the popup flow arrives", async () => {
    const response = await callback(
      new NextRequest(`${ORIGIN}/auth/callback`),
    );

    expect(state.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(response).pathname).toBe("/home");
  });
});
