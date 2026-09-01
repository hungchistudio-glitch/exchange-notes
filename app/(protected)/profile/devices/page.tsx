"use client";

import AppHeader from "@/components/foundation/layout/AppHeader";
import NativeWidgetSettingsButton from "@/components/settings/NativeWidgetSettingsButton";
import PwaInstallSettingsButton from "@/components/settings/PwaInstallSettingsButton";
import ScriptableWidgetSettingsButton from "@/components/settings/ScriptableWidgetSettingsButton";
import SettingsAnchor from "@/components/settings/SettingsAnchor";
import SettingsSection from "@/components/settings/SettingsSection";
import useTranslation from "@/hooks/i18n/useTranslation";

/**
 * Devices & Widgets.
 *
 * Three settings that only matter on the phone in your hand, grouped so the
 * front of Settings does not have to carry them. Nothing here changed except
 * where it lives — installing, the Scriptable token and the native widget are
 * the same three controls they were.
 */
export default function DeviceSettingsPage() {
  const { t } = useTranslation();
  const copy = t.settings.devices;

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

          <SettingsSection label={t.settings.sections.devices}>
            <SettingsAnchor id="setting-install">
              <PwaInstallSettingsButton />
            </SettingsAnchor>

            <SettingsAnchor id="setting-iphone-widget">
              <ScriptableWidgetSettingsButton />
            </SettingsAnchor>

            <SettingsAnchor id="setting-yumi-widget">
              <NativeWidgetSettingsButton />
            </SettingsAnchor>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}
