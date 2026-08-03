import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import ProtectedNav from "@/components/foundation/layout/ProtectedNav";
import { createClient } from "@/lib/supabase/server";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Every protected page funnels through here, so this is the single
  // choke point that catches a not-yet-onboarded account regardless of
  // how they arrived (OAuth callback, a bookmark, a deep link, etc.).
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <>
      {children}
      <ProtectedNav />
    </>
  );
}
