import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import AccountPreferencesSync from "@/components/foundation/AccountPreferencesSync";
import CosmicRouteStage from "@/components/cosmic/CosmicRouteStage";
import InlineScript from "@/components/foundation/InlineScript";
import ModeTransitionStage from "@/components/cosmic/ModeTransitionStage";
import OfflineBanner from "@/components/foundation/OfflineBanner";
import ProtectedNav from "@/components/foundation/layout/ProtectedNav";
import SplashGate from "@/components/ui/SplashGate";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { isInterfaceMode } from "@/lib/appPreferences";
import { getServerInterfaceMode } from "@/lib/preferences/serverPreferences";
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
  // Also grabs learning_language here so LearningLanguageProvider can be
  // seeded server-side (no client fetch waterfall on first render) — this
  // drives which language is the visual hero on word cards app-wide.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, learning_language, native_language, interface_mode")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // Passed through as stored. The provider reads either encoding, so this
  // does not need to know which one this row happens to carry.
  const initialLearningLanguage = profile?.learning_language ?? null;
  const initialNativeLanguage = profile?.native_language ?? null;

  // The cookie is what the root layout rendered from, and on this device it is
  // almost always already right. The profile is what makes the choice follow
  // the account — to a new phone, a new browser, a fresh login — so where the
  // two disagree the account wins.
  /*
   * Fetched separately from the select above, and allowed to fail.
   *
   * app_preferences arrived in a later migration than this code path, and the
   * app and the database do not deploy together. Folding the column into the
   * main profile query would mean a missing column takes down every protected
   * page; asking for it on its own means the worst case is that settings do
   * not sync until the migration lands.
   */
  const { data: preferencesRow } = await supabase
    .from("profiles")
    .select("app_preferences")
    .eq("id", user.id)
    .maybeSingle();

  const cookieInterfaceMode = await getServerInterfaceMode();

  const interfaceMode = isInterfaceMode(profile?.interface_mode)
    ? profile.interface_mode
    : cookieInterfaceMode;

  return (
    <InterfaceModeProvider initialMode={interfaceMode}>
      <LearningLanguageProvider
        initialLearningLanguage={initialLearningLanguage}
        initialNativeLanguage={initialNativeLanguage}
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

        {/*
          Here rather than in the root layout so the opening only ever plays
          for a signed-in visitor, on the far side of the Google redirect.
          This is a layout, so it survives soft navigation between protected
          pages — the animation mounts once per app load, not once per route.
        */}
        <AccountPreferencesSync
          userId={user.id}
          stored={preferencesRow?.app_preferences ?? null}
        />

        <SplashGate />

        <CosmicRouteStage>
          <OfflineBanner />
          {children}
        </CosmicRouteStage>

        <ProtectedNav />
        <ModeTransitionStage />
      </LearningLanguageProvider>
    </InterfaceModeProvider>
  );
}
