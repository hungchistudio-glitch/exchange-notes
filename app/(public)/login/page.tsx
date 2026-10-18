import { redirect } from "next/navigation";
import { preconnect, preload } from "react-dom";

import LoginScreen from "@/components/auth/LoginScreen";
import { readCurrentUser } from "@/lib/auth/currentUser";
import {
  GOOGLE_IDENTITY_SCRIPT_SRC,
  LOGIN_ERROR_PARAM,
} from "@/lib/auth/googleRedirect";
import { createClient } from "@/lib/supabase/server";

type LoginRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginRoute({ searchParams }: LoginRouteProps) {
  /*
   * A reader who is already signed in has nothing to do here, and showing
   * them the button anyway invites a second sign-in that changes nothing —
   * which is exactly what a reopened app, a back button or a bookmark used to
   * do. Same rule as the landing page: only a confirmed session goes home,
   * and an auth server that cannot be reached gets the login screen rather
   * than an error, because this is the page for not being signed in.
   *
   * getUser rather than a local JWT check, deliberately. The protected layout
   * asks getUser too, and the two have to agree: a token that still verifies
   * locally for a session the server has revoked would send this page to
   * /home and /home straight back here, for as long as the token had left.
   *
   * Without a session cookie this asks the network nothing.
   */
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const current = await readCurrentUser(await createClient());

    if (current.state === "signed-in") redirect("/home");
  }

  /*
   * Google's script and its button page are the slowest things on this
   * screen, and the button cannot start loading until the page has hydrated.
   * Asked for here, they are in the document head: the connection is open and
   * the script is downloading while the app's own JavaScript is still
   * arriving, so by the time GoogleIdentityButton appends the tag it runs
   * from the cache.
   *
   * Only when a client id is configured, so a deployment that will show the
   * redirect button never reaches Google at all.
   */
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()) {
    preconnect("https://accounts.google.com");
    preload(GOOGLE_IDENTITY_SCRIPT_SRC, { as: "script" });
  }

  const { [LOGIN_ERROR_PARAM]: error } = await searchParams;

  return <LoginScreen initialError={error === "google"} />;
}
