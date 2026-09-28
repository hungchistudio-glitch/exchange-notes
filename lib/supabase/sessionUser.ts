import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

/**
 * The signed-in user, from the session this browser already holds.
 *
 * Twenty-odd places in the client called `auth.getUser()` to learn who was
 * signed in before asking for their rows. That call goes to the auth
 * server every time — measured on 2026-09-28 at 70–210ms from New York, and
 * it runs *before* the query it gates, so a screen paid for it in series,
 * sometimes three times over: returning home fired three of them at once.
 *
 * Here that round trip buys nothing. The protected layout has already
 * verified the user on the server before this screen could render, and
 * the id is only used to shape a query that Row Level Security enforces on
 * the database anyway: a forged id is refused there, not here. So the
 * session in local storage answers it — and refreshes itself over the
 * network only when its token has actually expired.
 *
 * Falls back to the auth server when there is no readable local session
 * (locked-down storage, an injected client), so a signed-in reader is never
 * told otherwise.
 */
export async function getSessionUser(
  supabase: SupabaseClient = createClient(),
): Promise<User | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) return session.user;
  } catch {
    /* Fall through to asking the server. */
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
