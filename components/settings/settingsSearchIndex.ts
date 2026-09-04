import type { TranslationDictionary } from "@/lib/i18n/types";

export type SettingsSearchEntry = {
  // Matches the SettingsAnchor wrapped around the row.
  id: string;
  title: string;
  section: string;
  // Latin search terms, present in both interface languages. Someone looking
  // for the widget types "widget" whichever language the app is speaking.
  keywords: string[];
  // Omitted for rows on the Settings page itself.
  href?: string;
};

/**
 * Every setting, including the ones now a level deeper.
 *
 * Grouping Devices & Widgets and Help & About behind their own screens is
 * what keeps the front page short; this is what stops that from meaning
 * "harder to find".
 */
export function buildSettingsSearchIndex(
  t: TranslationDictionary,
): SettingsSearchEntry[] {
  const settings = t.settings;
  const sections = settings.sections;

  return [
    {
      id: "setting-profile",
      title: settings.profile.editProfile,
      section: settings.profile.profile,
      keywords: ["profile", "name", "photo", "avatar", "qr", "exchange id"],
    },
    {
      id: "setting-native-language",
      title: settings.profile.nativeLanguage,
      section: sections.learning,
      keywords: ["native", "language", "mother tongue"],
    },
    {
      id: "setting-learning-language",
      title: settings.profile.learningLanguage,
      section: sections.learning,
      keywords: ["learning", "language", "practice"],
    },
    {
      id: "setting-daily-goal",
      title: settings.dailyGoal.rowTitle,
      section: sections.learning,
      keywords: ["daily", "goal", "words", "target", "cookie"],
    },
    {
      id: "setting-pronunciation",
      title: settings.pronunciation.rowTitle,
      section: sections.learning,
      keywords: ["pronunciation", "voice", "speed", "speech", "audio", "rate"],
    },
    {
      id: "setting-interface-mode",
      title: settings.interfaceMode.rowTitle,
      section: sections.yumi,
      keywords: ["interface", "mode", "cosmic", "standard", "theme", "deck"],
    },
    {
      id: "setting-notifications",
      title: settings.webPush.rowTitle,
      section: sections.yumi,
      keywords: ["notifications", "push", "alerts", "messages"],
    },
    {
      id: "setting-yumi-reminders",
      title: settings.yumiReminders.rowTitle,
      section: sections.yumi,
      keywords: ["yumi", "reminders", "notifications", "cookie"],
    },
    {
      id: "setting-app-language",
      title: settings.appLanguage.rowTitle,
      section: sections.app,
      keywords: ["app", "language", "interface", "english", "chinese"],
    },
    {
      id: "setting-font-size",
      title: settings.fontSize.rowTitle,
      section: sections.app,
      keywords: ["font", "size", "text", "type", "bigger", "smaller"],
    },
    {
      id: "setting-launch-sound",
      title: settings.launchSound.rowTitle,
      section: sections.app,
      keywords: ["sound", "audio", "opening", "launch", "mute", "volume"],
    },
    {
      id: "setting-install",
      title: t.pwa.settingsRowTitle,
      section: sections.devices,
      keywords: ["install", "home screen", "pwa", "app"],
      href: "/profile/devices",
    },
    {
      id: "setting-iphone-widget",
      title: settings.scriptableWidget.rowTitle,
      section: sections.devices,
      keywords: ["widget", "iphone", "scriptable", "token"],
      href: "/profile/devices",
    },
    {
      id: "setting-yumi-widget",
      title: settings.iphoneWidget.rowTitle,
      section: sections.devices,
      keywords: ["widget", "iphone", "yumi", "native", "home screen"],
      href: "/profile/devices",
    },
    {
      id: "setting-tour",
      title: t.tutorial.rowTitle,
      section: sections.help,
      keywords: ["tour", "tutorial", "help", "how to", "guide"],
      href: "/profile/help",
    },
    {
      id: "setting-logout",
      title: settings.profile.logout,
      section: sections.account,
      keywords: ["log out", "logout", "sign out", "account"],
    },
  ];
}

export function matchSettingsEntries(
  entries: SettingsSearchEntry[],
  query: string,
): SettingsSearchEntry[] {
  const needle = query.trim().toLowerCase();

  if (!needle) return [];

  return entries.filter((entry) => {
    if (entry.title.toLowerCase().includes(needle)) return true;
    if (entry.section.toLowerCase().includes(needle)) return true;

    return entry.keywords.some((keyword) => keyword.includes(needle));
  });
}
