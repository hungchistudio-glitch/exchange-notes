import type { Metadata } from "next";
import { redirect } from "next/navigation";

import LandingPage from "@/components/landing/LandingPage";
import { readCurrentUser } from "@/lib/auth/currentUser";
import { loadTranslations } from "@/lib/i18n";
import { openGraphLocale } from "@/lib/info/metadata";
import { getServerInterfaceLanguage } from "@/lib/preferences/serverPreferences";
import { createClient } from "@/lib/supabase/server";

/*
 * In the reader's display language, read from the same cookie the page
 * itself renders from, so the tab title and a pasted link's preview match
 * the introduction underneath them.
 */
export async function generateMetadata(): Promise<Metadata> {
  const language = await getServerInterfaceLanguage();
  const { landingTitle: title, landingDescription: description } = (
    await loadTranslations(language)
  ).meta;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Exchange Notes",
      locale: openGraphLocale(language),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

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
