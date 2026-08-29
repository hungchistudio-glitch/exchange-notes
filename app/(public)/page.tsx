import type { Metadata } from "next";
import { redirect } from "next/navigation";

import LandingPage from "@/components/landing/LandingPage";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return <LandingPage />;
}
