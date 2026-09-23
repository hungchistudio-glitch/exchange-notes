"use client";

import AppHeader from "@/components/foundation/layout/AppHeader";
import { BookOpen, HeartHandshake, ShieldCheck } from "lucide-react";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsAnchor from "@/components/settings/SettingsAnchor";
import SettingsSection from "@/components/settings/SettingsSection";
import TutorialSettingsButton from "@/components/settings/TutorialSettingsButton";
import useTranslation from "@/hooks/i18n/useTranslation";

export default function HelpSettingsPage() {
  const { t } = useTranslation();
  const copy = t.settings.help;

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
            {t.info.help.description}
          </p>

          <SettingsSection label={t.settings.sections.help}>
            <SettingsAnchor id="setting-about">
              <SettingsRow href="/profile/about" title={t.info.nav.about} description={t.info.help.about} icon={<BookOpen size={18} aria-hidden="true" />} />
            </SettingsAnchor>
            <SettingsAnchor id="setting-community">
              <SettingsRow href="/profile/community" title={t.info.nav.community} description={t.info.help.community} icon={<HeartHandshake size={18} aria-hidden="true" />} />
            </SettingsAnchor>
            <SettingsAnchor id="setting-privacy">
              <SettingsRow href="/profile/privacy" title={t.info.nav.privacy} description={t.info.help.privacy} icon={<ShieldCheck size={18} aria-hidden="true" />} />
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
