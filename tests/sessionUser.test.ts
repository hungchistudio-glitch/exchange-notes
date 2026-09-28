import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const { getSessionUser } = await import("@/lib/supabase/sessionUser");

/* =========================================================
   Knowing who is signed in without asking the server

   Returning home fired three auth-server round trips before any of its
   queries could start (measured 2026-09-28). The session this browser holds
   answers the same question locally; the server is asked only when there is
   no readable session.
   ========================================================= */

function client(session: unknown, user: unknown = null, sessionThrows = false) {
  return {
    auth: {
      getSession: vi.fn(async () => {
        if (sessionThrows) throw new Error("storage blocked");
        return { data: { session } };
      }),
      getUser: vi.fn(async () => ({ data: { user } })),
    },
  };
}

describe("the signed-in user", () => {
  it("comes from the local session, with no call to the auth server", async () => {
    const supabase = client({ user: { id: "reader-1" } });

    await expect(getSessionUser(supabase as never)).resolves.toEqual({ id: "reader-1" });
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("asks the server when there is no session to read", async () => {
    const supabase = client(null, { id: "reader-2" });

    await expect(getSessionUser(supabase as never)).resolves.toEqual({ id: "reader-2" });
    expect(supabase.auth.getUser).toHaveBeenCalledOnce();
  });

  it("asks the server when local storage cannot be read", async () => {
    const supabase = client(null, { id: "reader-3" }, true);

    await expect(getSessionUser(supabase as never)).resolves.toEqual({ id: "reader-3" });
  });
});
