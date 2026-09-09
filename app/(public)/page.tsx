import type { Metadata } from "next";
import { redirect } from "next/navigation";

import LandingPage from "@/components/landing/LandingPage";
import { readCurrentUser } from "@/lib/auth/currentUser";
import { createClient } from "@/lib/supabase/server";

const description =
  "Look up, practise, save, and share the words worth remembering — with Yumi beside you.";

export const metadata: Metadata = {
  title: "Exchange Notes — Keep the words worth remembering",
  description,
  openGraph: {
    title: "Exchange Notes — Keep the words worth remembering",
    description,
    type: "website",
    siteName: "Exchange Notes",
  },
  twitter: {
    card: "summary",
    title: "Exchange Notes — Keep the words worth remembering",
    description,
  },
};

export default async function LandingRoute() {
  /*
   * The product tour itself is deliberately backend-free. A preview build,
   * design review, or local checkout without production credentials should
   * still be able to render it; only the returning-user shortcut needs the
   * auth client. In configured environments this branch is skipped and the
   * normal verified-session check below runs exactly as it does elsewhere.
   */
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return <LandingPage />;
  }

  const supabase = await createClient();

  /*
   * The one place where the safe answer is to do nothing. A signed-in reader
   * is sent on to /home; anyone else — signed out, or unreachable auth server
   * — gets the landing page, which is what this route is for. Showing it to
   * someone who turns out to be signed in costs them one tap; throwing here
   * would break the public front page over an auth server they never needed.
   */
  const current = await readCurrentUser(supabase);

  if (current.state === "signed-in") {
    redirect("/home");
  }

  return <LandingPage />;
}
