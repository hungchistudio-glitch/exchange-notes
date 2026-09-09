import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
} from "@supabase/supabase-js";

/* =========================================================
   A failed check is not a sign-out

   Four routes read `getUser()` and kept only `data.user`, so every reason the
   call can fail — a dropped connection, a slow cold start, a rate limit, an
   auth server having a bad minute — arrived looking exactly like "nobody is
   signed in". The protected layout then sent the reader to /login.

   These pin the classification, because it is the kind of thing that is
   obviously right when written and quietly wrong a year later. The asymmetry
   is the whole point: mistaking a stranger for "unavailable" costs a reload,
   mistaking a signed-in reader for a stranger throws them out of the app.
   ========================================================= */

const redirected = vi.hoisted(() => ({ to: null as string | null }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirected.to = path;
    // The real one throws to stop rendering; mirror that so callers cannot
    // accidentally continue past it in a test and pass for the wrong reason.
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

const { readCurrentUser, requireUser, AuthUnavailableError } = await import(
  "@/lib/auth/currentUser"
);

/** A Supabase double whose getUser answers with whatever this test wants. */
function supabaseAnswering(answer: { user?: unknown; error?: unknown }) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: answer.user ?? null },
        error: answer.error ?? null,
      }),
    },
  } as never;
}

const someone = { id: "00000000-0000-4000-8000-000000000000" };

afterEach(() => {
  redirected.to = null;
});

describe("readCurrentUser", () => {
  it("reports the reader when the check succeeds", async () => {
    const result = await readCurrentUser(supabaseAnswering({ user: someone }));

    expect(result).toEqual({ state: "signed-in", user: someone });
  });

  it("treats a missing session as signed out", async () => {
    // The ordinary signed-out case: getUser returns an error, not just null.
    const result = await readCurrentUser(
      supabaseAnswering({ error: new AuthSessionMissingError() }),
    );

    expect(result.state).toBe("signed-out");
  });

  it("treats the auth server's own 4xx verdict as signed out", async () => {
    /*
     * This is the shape the session-refresh bug produced: a rotated refresh
     * token the server no longer recognises. The session really is dead, and
     * /login really is where the reader should go.
     */
    const result = await readCurrentUser(
      supabaseAnswering({
        error: new AuthApiError("Invalid Refresh Token", 400, "refresh_token_not_found"),
      }),
    );

    expect(result.state).toBe("signed-out");
  });

  it("treats a connection that never arrived as unavailable", async () => {
    const result = await readCurrentUser(
      supabaseAnswering({
        error: new AuthRetryableFetchError("Failed to fetch", 0),
      }),
    );

    expect(result.state).toBe("unavailable");
  });

  it("treats a rate limit as unavailable, not as a verdict", async () => {
    // 429 is 4xx, but it means the server declined to look — it is not an
    // answer about this session, and signing the reader out over it is wrong.
    const result = await readCurrentUser(
      supabaseAnswering({
        error: new AuthApiError("Too many requests", 429, "over_request_rate_limit"),
      }),
    );

    expect(result.state).toBe("unavailable");
  });

  it("treats a broken auth server as unavailable", async () => {
    const result = await readCurrentUser(
      supabaseAnswering({
        error: new AuthApiError("Internal error", 503, undefined),
      }),
    );

    expect(result.state).toBe("unavailable");
  });

  it("treats an error it does not recognise as unavailable", async () => {
    /*
     * The default has to fall this way. A new error type nobody has taught
     * this function about should delay a reader by one reload, never sign
     * them out.
     */
    const result = await readCurrentUser(
      supabaseAnswering({
        error: new AuthUnknownError("Something new", new Error("cause")),
      }),
    );

    expect(result.state).toBe("unavailable");
  });
});

describe("requireUser", () => {
  it("returns the reader when there is one", async () => {
    const user = await requireUser(supabaseAnswering({ user: someone }));

    expect(user).toEqual(someone);
    expect(redirected.to).toBeNull();
  });

  it("sends a genuinely signed-out visitor to /login", async () => {
    await expect(
      requireUser(supabaseAnswering({ error: new AuthSessionMissingError() })),
    ).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(redirected.to).toBe("/login");
  });

  it("throws rather than signing anyone out when the check failed", async () => {
    /*
     * The behaviour this whole change exists for. app/error.tsx turns this
     * into a screen offering another go, and the session is untouched — so
     * the reload usually works without going near the OAuth flow.
     */
    await expect(
      requireUser(
        supabaseAnswering({
          error: new AuthRetryableFetchError("Failed to fetch", 0),
        }),
      ),
    ).rejects.toBeInstanceOf(AuthUnavailableError);

    expect(redirected.to).toBeNull();
  });
});
