import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   From a hello, through sign-in, and back to it

   A signed-out visitor's "Make your own Yumi" or "Meet …" parks the hello
   in an httpOnly cookie and goes to /login; whichever way the sign-in
   ends, it returns to that hello and clears the cookie. Nothing is sent
   on the way, the destination is only ever the hello's own path, and a
   cookie of the wrong shape leads nowhere. The first links, /hello/<id>,
   move to the new path for good.
   ========================================================= */

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }),
}));

const { redirectAfterSignIn } = await import("@/lib/auth/afterSignIn");
const { GET: join } = await import("@/app/a-word-to-invite-you/[id]/join/route");
const { GET: oldLink } = await import("@/app/hello/[...rest]/route");
const { PENDING_HELLO_COOKIE } = await import("@/lib/hello/pending");
const { PENDING_FRIEND_INVITE_COOKIE } = await import("@/lib/friends");

const ID = "AbCdEfGhIjKl";
const ORIGIN = "https://exchange-notes-app.vercel.app";

function cookies(values: Record<string, string>) {
  return { get: (name: string) => (name in values ? { value: values[name] } : undefined) };
}

function deleted(response: Response, name: string) {
  return response.headers
    .getSetCookie()
    .some((line) => line.startsWith(`${name}=`) && /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(line));
}

beforeEach(() => {
  auth.user = null;
});

describe("after signing in", () => {
  it("returns to the hello the visitor left, and forgets it", () => {
    const response = redirectAfterSignIn(cookies({ [PENDING_HELLO_COOKIE]: ID }), `${ORIGIN}/auth/callback`);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/a-word-to-invite-you/${ID}`);
    expect(deleted(response, PENDING_HELLO_COOKIE)).toBe(true);
  });

  it("prefers the hello to an older friend invite, and clears both", () => {
    const response = redirectAfterSignIn(
      cookies({ [PENDING_HELLO_COOKIE]: ID, [PENDING_FRIEND_INVITE_COOKIE]: "someone" }),
      `${ORIGIN}/auth/callback`,
    );
    expect(response.headers.get("location")).toBe(`${ORIGIN}/a-word-to-invite-you/${ID}`);
    expect(deleted(response, PENDING_HELLO_COOKIE)).toBe(true);
    expect(deleted(response, PENDING_FRIEND_INVITE_COOKIE)).toBe(true);
  });

  it("ignores a hello cookie of the wrong shape, and still clears it", () => {
    for (const value of ["https://evil.example", "../home", "short", `${ID}/join`]) {
      const response = redirectAfterSignIn(cookies({ [PENDING_HELLO_COOKIE]: value }), `${ORIGIN}/auth/callback`);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/home`);
      expect(deleted(response, PENDING_HELLO_COOKIE)).toBe(true);
    }
  });
});

describe("/a-word-to-invite-you/<id>/join", () => {
  it("parks the hello for a signed-out visitor and goes to sign in", async () => {
    const response = await join(new NextRequest(`${ORIGIN}/a-word-to-invite-you/${ID}/join?intent=meet`), {
      params: Promise.resolve({ id: ID }),
    });
    expect(response.headers.get("location")).toBe(`${ORIGIN}/login`);
    const cookie = response.headers.getSetCookie().find((line: string) => line.startsWith(`${PENDING_HELLO_COOKIE}=`)) ?? "";
    expect(cookie).toContain(`${PENDING_HELLO_COOKIE}=${ID}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("sends a signed-in visitor straight back to the hello, setting nothing", async () => {
    auth.user = { id: "me" };
    const response = await join(new NextRequest(`${ORIGIN}/a-word-to-invite-you/${ID}/join`), { params: Promise.resolve({ id: ID }) });
    expect(response.headers.get("location")).toBe(`${ORIGIN}/a-word-to-invite-you/${ID}`);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("goes nowhere for an id of the wrong shape", async () => {
    const response = await join(new NextRequest(`${ORIGIN}/a-word-to-invite-you/x/join`), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.headers.get("location")).toBe(`${ORIGIN}/`);
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});

describe("the first links, /hello/<id>", () => {
  const go = (path: string, rest: string[]) =>
    oldLink(new NextRequest(`${ORIGIN}${path}`), { params: Promise.resolve({ rest }) });

  it("move for good to where a hello lives now", async () => {
    const response = await go(`/hello/${ID}`, [ID]);
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/a-word-to-invite-you/${ID}`);
  });

  it("carry sign-in along, and nothing from the query", async () => {
    const response = await go(`/hello/${ID}/join?intent=meet&next=https://evil.example`, [ID, "join"]);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/a-word-to-invite-you/${ID}/join`);
  });

  it("go home for anything that is not a hello", async () => {
    for (const rest of [["short"], [ID, "other"], [ID, "join", "more"], ["..", "admin"]]) {
      const response = await go(`/hello/${rest.join("/")}`, rest);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/`);
    }
  });
});
