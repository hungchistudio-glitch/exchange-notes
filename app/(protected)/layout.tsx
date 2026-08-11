import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import CosmicRouteStage from "@/components/cosmic/CosmicRouteStage";
import InlineScript from "@/components/foundation/InlineScript";
import ModeTransitionStage from "@/components/cosmic/ModeTransitionStage";
import ProtectedNav from "@/components/foundation/layout/ProtectedNav";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { isInterfaceMode } from "@/lib/appPreferences";
import { getServerInterfaceMode } from "@/lib/preferences/interfaceModeServer";
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
    .select("onboarding_completed, learning_language, interface_mode")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  const initialLearningLanguage: AppLanguage =
    profile?.learning_language === "traditional-chinese"
      ? "traditional-chinese"
      : "english";

  // The cookie is what the root layout rendered from, and on this device it is
  // almost always already right. The profile is what makes the choice follow
  // the account — to a new phone, a new browser, a fresh login — so where the
  // two disagree the account wins.
  const cookieInterfaceMode = await getServerInterfaceMode();

  const interfaceMode = isInterfaceMode(profile?.interface_mode)
    ? profile.interface_mode
    : cookieInterfaceMode;

  return (
    <InterfaceModeProvider initialMode={interfaceMode}>
      <LearningLanguageProvider
        initialLearningLanguage={initialLearningLanguage}
      >
        {/*
          Only rendered on the rare disagreement above — a device that has not
          seen this account before. It runs while the browser is still parsing,
          so the cosmic tokens are correct on the first paint instead of a
          frame or two into it. See node_modules/next/dist/docs/01-app/
          02-guides/preventing-flash-before-hydration.md.
        */}
        {interfaceMode !== cookieInterfaceMode && (
          <InlineScript
            html={`document.documentElement.dataset.interfaceMode=${JSON.stringify(
              interfaceMode,
            )}`}
          />
        )}

        <CosmicRouteStage>{children}</CosmicRouteStage>

        <ProtectedNav />
        <ModeTransitionStage />
      </LearningLanguageProvider>
    </InterfaceModeProvider>
  );
}
