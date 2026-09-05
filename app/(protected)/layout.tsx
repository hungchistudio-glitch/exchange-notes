import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import NativePushRegister from "@/app/components/NativePushRegister";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import AccountPreferencesSync from "@/components/foundation/AccountPreferencesSync";
import DeviceTimeZoneSync from "@/components/foundation/DeviceTimeZoneSync";
import RouteStage from "@/components/foundation/layout/RouteStage";
import InlineScript from "@/components/foundation/InlineScript";
import ModeTransitionStage from "@/components/cosmic/ModeTransitionStage";
import OfflineBanner from "@/components/foundation/OfflineBanner";
import ProtectedNav from "@/components/foundation/layout/ProtectedNav";
import AppViewport from "@/components/foundation/layout/AppViewport";
import SplashGate from "@/components/ui/SplashGate";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { LexiconSearchProvider } from "@/contexts/LexiconSearchContext";
import { VocabularyProvider } from "@/contexts/VocabularyContext";
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
  /*
   * The profile and optional preferences column are independent reads, so do
   * them in parallel. They used to add two database round trips in series to
   * every signed-in cold start, even though neither depends on the other.
   * Keeping app_preferences in its own query still preserves the important
   * deployment safety below: an older database may reject that column without
   * taking down the profile data every protected screen requires.
   *
   * The cookie read is local, but joins the same wait so the render has one
   * synchronization point rather than three.
   *
   * app_preferences is allowed to fail.
   *
   * app_preferences arrived in a later migration than this code path, and the
   * app and the database do not deploy together. Folding the column into the
   * main profile query would mean a missing column takes down every protected
   * page; asking for it on its own means the worst case is that settings do
   * not sync until the migration lands.
   */
  const [profileResult, preferencesResult, cookieInterfaceMode] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "onboarding_completed, learning_language, native_language, interface_mode",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("app_preferences")
        .eq("id", user.id)
        .maybeSingle(),
      getServerInterfaceMode(),
    ]);

  const profile = profileResult.data;
  const preferencesRow = preferencesResult.data;

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

        <DeviceTimeZoneSync userId={user.id} />

        {/*
          Both services belong to the authenticated app runtime. Keeping them
          here means public product and review routes do not create an auth
          client, register a worker, or subscribe to native bridge events.
        */}
        <ServiceWorkerRegister />
        <NativePushRegister />

        <SplashGate />

        {/*
          The library, once for the whole app.

          It used to be mounted per route — the Vocabulary screen and the
          Pronunciation Lab each had their own — while the home screen and
          the Command Deck fetched the same rows separately by hand. Four
          copies of one list, three of them unable to see a word the fourth
          had just saved.

          Hoisting it here is what makes the Universal Search answerable from
          anywhere: "do I already have this word" is a question about the
          account, not about whichever screen happens to be open. It also
          costs one query per app load instead of one per screen, and brings
          the offline mirror to every route rather than two of them.
        */}
        <VocabularyProvider>
          <LexiconSearchProvider>
            {/*
              One physical viewport, with one deliberately scrollable layer.

              The document itself used to scroll while the dock tried to stay
              fixed above it. Mobile Safari can detach fixed descendants from
              the visual viewport after a long scroll, a sheet transition or
              a dynamic-toolbar resize; the screenshots then show the dock in
              the middle of the page and content continuing underneath it.

              Keeping the protected app at exactly 100dvh gives the chrome a
              stable coordinate system. Pages still scroll normally inside
              data-app-scroll-viewport, while the dock is its non-scrolling
              sibling and therefore cannot be carried away by page content.
            */}
            <AppViewport navigation={<ProtectedNav />}>
              <RouteStage>
                <OfflineBanner />
                {children}
              </RouteStage>
            </AppViewport>
          </LexiconSearchProvider>
        </VocabularyProvider>

        <ModeTransitionStage />
      </LearningLanguageProvider>
    </InterfaceModeProvider>
  );
}
