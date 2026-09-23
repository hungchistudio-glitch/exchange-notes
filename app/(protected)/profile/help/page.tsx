"use client";

import { BookOpen, HeartHandshake, ShieldCheck } from "lucide-react";

import AppHeader from "@/components/foundation/layout/AppHeader";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsAnchor from "@/components/settings/SettingsAnchor";
import SettingsSection from "@/components/settings/SettingsSection";
import TutorialSettingsButton from "@/components/settings/TutorialSettingsButton";
import useTranslation from "@/hooks/i18n/useTranslation";

/**
 * Help & About.
 *
 * This held one row — the tour — and a comment saying the rest would arrive
 * when there was anything to put here. There is now: who made the app and
 * why, what is expected of people sharing in it, and what happens to what
 * they write. Each opens the same page the signed-out site publishes, so
 * there is one copy of those words rather than two that drift.
 */
export default function HelpSettingsPage() {
  const { t } = useTranslation();
  const copy = t.settings.help;
  const info = t.info;

  return (
    <main className="settings-screen min-h-[100dvh] bg-surface text-black">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col pb-28">
        <AppHeader
          title={copy.pageTitle}
          backHref="/profile"
          backLabel={copy.back}
        />

        <div className="flex-1 space-y-5 px-5 pt-5 sm:px-6">
          <p className="px-1.5 text-[0.8125rem] leading-[1.3125rem] text-ink-soft">
            {info.help.description}
          </p>

          <SettingsSection label={t.settings.sections.help}>
            <SettingsAnchor id="setting-about">
              <SettingsRow
                href="/profile/about"
                title={info.nav.about}
                description={info.help.about}
                icon={<BookOpen size={18} aria-hidden="true" />}
              />
            </SettingsAnchor>

            <SettingsAnchor id="setting-community">
              <SettingsRow
                href="/profile/community"
                title={info.nav.community}
                description={info.help.community}
                icon={<HeartHandshake size={18} aria-hidden="true" />}
              />
            </SettingsAnchor>

            <SettingsAnchor id="setting-privacy">
              <SettingsRow
                href="/profile/privacy"
                title={info.nav.privacy}
                description={info.help.privacy}
                icon={<ShieldCheck size={18} aria-hidden="true" />}
              />
            </SettingsAnchor>

            <SettingsAnchor id="setting-tour">
              <TutorialSettingsButton />
            </SettingsAnchor>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}
