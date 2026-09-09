"use client";

import AppHeader from "@/components/foundation/layout/AppHeader";
import SettingsAnchor from "@/components/settings/SettingsAnchor";
import SettingsSection from "@/components/settings/SettingsSection";
import TutorialSettingsButton from "@/components/settings/TutorialSettingsButton";
import useTranslation from "@/hooks/i18n/useTranslation";

/**
 * Help & About.
 *
 * One entry today — the tour — on the surface that will hold the help centre,
 * the privacy note and the version when there are any. A page with one honest
 * row beats a front page with one more row on it.
 */
export default function HelpSettingsPage() {
  const { t } = useTranslation();
  const copy = t.settings.help;

  return (
    <main className="min-h-[100dvh] bg-surface text-black">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col pb-28">
        <AppHeader
          title={copy.pageTitle}
          backHref="/profile"
          backLabel={copy.back}
        />

        <div className="flex-1 space-y-5 px-5 pt-5 sm:px-6">
          <p className="px-1.5 text-[0.8125rem] leading-[1.3125rem] text-ink-soft">
            {copy.pageDescription}
          </p>

          <SettingsSection label={t.settings.sections.help}>
            <SettingsAnchor id="setting-tour">
              <TutorialSettingsButton />
            </SettingsAnchor>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}
