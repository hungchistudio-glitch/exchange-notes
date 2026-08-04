import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import ProtectedNav from "@/components/foundation/layout/ProtectedNav";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { createClient } from "@/lib/supabase/server";
import type { AppLanguage } from "@/lib/types/app";

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
  // Also grabs learning_language here so LearningLanguageProvider can be
  // seeded server-side (no client fetch waterfall on first render) — this
  // drives which language is the visual hero on word cards app-wide.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, learning_language")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  const initialLearningLanguage: AppLanguage =
    profile?.learning_language === "traditional-chinese"
      ? "traditional-chinese"
      : "english";

  return (
    <LearningLanguageProvider
      initialLearningLanguage={initialLearningLanguage}
    >
      {children}
      <ProtectedNav />
    </LearningLanguageProvider>
  );
}
