"use client";

import { Bell, BellRing, CircleHelp, Globe, GraduationCap, Languages, LogOut, Orbit, Smartphone, Target, Type, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ModeTransitionScene } from "@/components/cosmic/ModeTransitionStage";
import { ProgressHudDisplay } from "@/components/cosmic/ProgressHud";
import SegmentedControl from "@/components/foundation/forms/SegmentedControl";
import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSearchIcon from "@/components/foundation/icons/NavSearchIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import AppHeader from "@/components/foundation/layout/AppHeader";
import BottomNavigation from "@/components/foundation/layout/BottomNavigation";
import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow, { SettingsControlRow, SettingsToggleRow } from "@/components/foundation/rows/SettingsRow";
import SettingsAnchor from "@/components/settings/SettingsAnchor";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import ProfileSummaryCard from "@/components/settings/ProfileSummaryCard";
import SettingsSearch from "@/components/settings/SettingsSearch";
import SettingsSection from "@/components/settings/SettingsSection";
import {
  ENTER_COMMIT_MS,
  ENTER_TOTAL_MS,
  LEAVE_COMMIT_MS,
  LEAVE_TOTAL_MS,
  type ModeTransitionPhase,
} from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { InterfaceMode } from "@/lib/appPreferences";

type PreviewSheet = "profile" | "native" | "learning" | "goal" | "pronunciation" | "app-language" | "devices" | "help" | "account" | "navigation";
const LANGUAGES = ["繁體中文", "English", "Español", "Français", "Italiano"];
const FONT_SIZES = ["16", "20", "32"] as const;

/** Real settings surfaces with local fixtures. No preference or account writes. */
export default function CosmicSettingsReview() {
  const { t } = useTranslation();
  const copy = t.settings;
  const [mode, setMode] = useState<InterfaceMode>("yumi-cosmic");
  const [fontSize, setFontSize] = useState<(typeof FONT_SIZES)[number]>("16");
  const [nativeLanguage, setNativeLanguage] = useState("繁體中文");
  const [learningLanguage, setLearningLanguage] = useState("English");
  const [appLanguage, setAppLanguage] = useState("English");
  const [goal, setGoal] = useState(33);
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(false);
  const [voice, setVoice] = useState("female");
  const [speed, setSpeed] = useState("1");
  const [sheet, setSheet] = useState<PreviewSheet | null>(null);
  const [phase, setPhase] = useState<ModeTransitionPhase | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-interface-mode");
    root.setAttribute("data-interface-mode", mode);
    return () => {
      if (previous === null) root.removeAttribute("data-interface-mode");
      else root.setAttribute("data-interface-mode", previous);
    };
  }, [mode]);

  /*
   * The mode change, played the way the app plays it.
   *
   * InterfaceModeProvider is not mounted here on purpose: its commit writes
   * the stored preference and then the signed-in profile row, and this page
   * promises neither. What it does own is the shape of the sequence — set the
   * phase, flip the shell at COMMIT while the veil is at its densest, clear
   * the phase at TOTAL — so that shape is what runs here, against the same
   * four exported constants, with the local `mode` state standing in for the
   * commit. Change the timings there and this moves with them.
   */
  function changeMode(next: InterfaceMode) {
    if (next === mode || phase) return;

    const entering = next === "yumi-cosmic";
    setPhase(entering ? "entering-cosmic" : "leaving-cosmic");

    const commit = window.setTimeout(
      () => setMode(next),
      entering ? ENTER_COMMIT_MS : LEAVE_COMMIT_MS,
    );
    const end = window.setTimeout(
      () => setPhase(null),
      entering ? ENTER_TOTAL_MS : LEAVE_TOTAL_MS,
    );

    timersRef.current = [commit, end];
  }

  useEffect(
    () => () => {
      for (const timer of timersRef.current) window.clearTimeout(timer);
    },
    [],
  );

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.fontSize;
    root.style.fontSize = `${fontSize}px`;
    return () => { root.style.fontSize = previous; };
  }, [fontSize]);

  const sheetTitles: Record<PreviewSheet, string> = {
    profile: copy.profile.editProfile,
    native: copy.profile.nativeLanguage,
    learning: copy.profile.learningLanguage,
    goal: copy.dailyGoal.sheetTitle,
    pronunciation: copy.pronunciation.sheetTitle,
    "app-language": copy.appLanguage.sheetTitle,
    devices: copy.devices.rowTitle,
    help: copy.help.rowTitle,
    account: copy.profile.logout,
    navigation: "Navigation preview",
  };

  function selectLanguage(language: string) {
    if (sheet === "native") {
      if (language === learningLanguage) setLearningLanguage(nativeLanguage);
      setNativeLanguage(language);
    } else if (sheet === "learning") {
      if (language === nativeLanguage) setNativeLanguage(learningLanguage);
      setLearningLanguage(language);
    } else setAppLanguage(language);
    setSheet(null);
  }

  const navItems = [
    { label: t.navigation.vocabulary, Icon: NavVocabularyIcon },
    { label: t.navigation.messages, Icon: NavMessagesIcon },
    { label: t.navigation.home, Icon: NavHomeIcon },
    { label: t.navigation.search, Icon: NavSearchIcon },
    { label: t.navigation.discover, Icon: NavDiscoverIcon },
    { label: t.navigation.settings, Icon: NavSettingsIcon },
  ];

  return (
    <main className="cosmic-settings-page min-h-[100dvh] bg-surface text-black">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col pb-28">
        <AppHeader title={copy.profile.pageTitle} action={<SettingsSearch />} />
        <div className="cosmic-settings-content flex-1 space-y-8 px-5 pt-5 sm:px-6">
          <SettingsAnchor id="setting-profile">
            <ProfileSummaryCard avatarUrl={null} displayName="Preview learner" exchangeId="" email="Local preview · no account connected" loading={false} editLabel={copy.profile.editProfile} onOpen={() => setSheet("profile")} />
          </SettingsAnchor>
          {mode === "yumi-cosmic" && <ProgressHudDisplay readings={{ todayAdded: 1, dailyGoal: goal, accuracy: 88, retention: 0, mastered: 4, reviewed: 114 }} />}

          <SettingsSection label={copy.sections.learning}>
            <SettingsAnchor id="setting-native-language">
              <SettingsRow title={copy.profile.nativeLanguage} description={copy.profile.nativeLanguageDescription} value={nativeLanguage} icon={<Globe size={16} strokeWidth={1.8} />} onClick={() => setSheet("native")} />
            </SettingsAnchor>
            <SettingsAnchor id="setting-learning-language">
              <SettingsRow title={copy.profile.learningLanguage} description={copy.profile.learningLanguageDescription} value={learningLanguage} icon={<GraduationCap size={16} strokeWidth={1.8} />} onClick={() => setSheet("learning")} />
            </SettingsAnchor>
            <SettingsAnchor id="setting-daily-goal">
              <SettingsRow title={copy.dailyGoal.rowTitle} description={copy.dailyGoal.rowDescription} value={`${goal} ${copy.dailyGoal.wordsLabel}`} icon={<Target size={17} strokeWidth={1.8} />} onClick={() => setSheet("goal")} />
            </SettingsAnchor>
            <SettingsAnchor id="setting-pronunciation">
              <SettingsRow title={copy.pronunciation.rowTitle} description={copy.pronunciation.rowDescription} value={`${speed}×`} icon={<Volume2 size={16} strokeWidth={1.8} />} onClick={() => setSheet("pronunciation")} />
            </SettingsAnchor>
          </SettingsSection>

          <SettingsSection label={copy.sections.yumi} footnote={copy.interfaceMode.sharedDataNote}>
            <SettingsAnchor id="setting-interface-mode">
              <SettingsControlRow title={copy.interfaceMode.rowTitle} description={copy.interfaceMode.rowDescription} icon={<Orbit size={16} strokeWidth={1.8} />} tone="blue" stacked control={
                <SegmentedControl<InterfaceMode> fill groupLabel={copy.interfaceMode.rowTitle} value={mode} onChange={changeMode} options={[
                  { value: "standard", content: copy.interfaceMode.standardShort, label: copy.interfaceMode.standardTitle },
                  { value: "yumi-cosmic", content: copy.interfaceMode.cosmicShort, label: copy.interfaceMode.cosmicTitle },
                ]} />
              } />
            </SettingsAnchor>
            <SettingsAnchor id="setting-notifications">
              <SettingsToggleRow title={copy.webPush.rowTitle} description={copy.webPush.rowDescription} icon={<Bell size={16} strokeWidth={1.8} />} checked={notifications} onChange={setNotifications} />
            </SettingsAnchor>
            <SettingsAnchor id="setting-yumi-reminders">
              <SettingsToggleRow title={copy.yumiReminders.rowTitle} description={copy.yumiReminders.rowDescription} icon={<BellRing size={16} strokeWidth={1.8} />} checked={reminders} onChange={setReminders} tone="blue" />
            </SettingsAnchor>
          </SettingsSection>

          <SettingsSection label={copy.sections.app}>
            <SettingsAnchor id="setting-app-language">
              <SettingsRow title={copy.appLanguage.rowTitle} description={copy.appLanguage.rowDescription} value={appLanguage} icon={<Languages size={16} strokeWidth={1.8} />} onClick={() => setSheet("app-language")} />
            </SettingsAnchor>
            <SettingsAnchor id="setting-font-size">
              <SettingsControlRow title={copy.fontSize.rowTitle} description={copy.fontSize.rowDescription} icon={<Type size={16} strokeWidth={1.8} />} stacked control={
                <SegmentedControl groupLabel="Preview root font size" value={fontSize} onChange={setFontSize} options={FONT_SIZES.map((value) => ({ value, content: <span style={{ fontSize: value === "16" ? "0.8125rem" : value === "20" ? "0.9375rem" : "1.125rem" }}>A</span>, label: `${value}px${value === "32" ? " · 200%" : ""}` }))} />
              } />
            </SettingsAnchor>
          </SettingsSection>

          <SettingsSection label={copy.sections.devices}>
            <SettingsRow title={copy.devices.rowTitle} description={copy.devices.rowDescription} icon={<Smartphone size={16} strokeWidth={1.8} />} value={copy.devices.notConnected} onClick={() => setSheet("devices")} />
          </SettingsSection>
          <SettingsSection label={copy.sections.help}>
            <SettingsRow title={copy.help.rowTitle} description={copy.help.rowDescription} icon={<CircleHelp size={16} strokeWidth={1.8} />} onClick={() => setSheet("help")} />
          </SettingsSection>
          <SettingsSection label={copy.sections.account}>
            <SettingsAnchor id="setting-logout">
              <SettingsRow title={copy.profile.logout} description={copy.profile.logoutDescription} icon={<LogOut size={16} strokeWidth={1.8} />} danger onClick={() => setSheet("account")} />
            </SettingsAnchor>
          </SettingsSection>

          <aside className="pb-4 text-ink-faint" style={{ fontSize: "12px", lineHeight: "1.6" }} aria-label="Development review information">
            Development preview only · 開發預覽。Sample readings: 1/33, 88%, 0%, 4, 114. Controls on this page are local previews; no account data or preferences are saved.
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40">
        <BottomNavigation label={t.navigation.primaryLabel} items={navItems.map(({ label, Icon }, index) => ({
          label, active: index === 5, icon: <Icon className="h-[19px] w-[19px]" active={index === 5} />,
          onSelect: () => index === 5 ? window.scrollTo({ top: 0 }) : setSheet("navigation"),
        }))} />
      </div>

      <ModeTransitionScene phase={phase} />

      <BottomSheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet ? sheetTitles[sheet] : ""} description="Development preview · Changes here stay on this page.">
        <div className="space-y-3">
          {(sheet === "native" || sheet === "learning" || sheet === "app-language") && LANGUAGES.map((language) => (
            <SettingsChoiceCard key={language} title={language} selected={language === (sheet === "native" ? nativeLanguage : sheet === "learning" ? learningLanguage : appLanguage)} onClick={() => selectLanguage(language)} />
          ))}
          {sheet === "goal" && [3, 5, 10, 20, 33].map((value) => (
            <SettingsChoiceCard key={value} title={`${value} ${copy.dailyGoal.wordsLabel}`} selected={goal === value} onClick={() => { setGoal(value); setSheet(null); }} />
          ))}
          {sheet === "pronunciation" && <>
            <p className="text-sm font-semibold">{copy.pronunciation.voice}</p>
            <SegmentedControl groupLabel={copy.pronunciation.voice} value={voice} onChange={setVoice} fill options={[
              { value: "female", content: copy.pronunciation.female, label: copy.pronunciation.female },
              { value: "male", content: copy.pronunciation.male, label: copy.pronunciation.male },
            ]} />
            <p className="pt-3 text-sm font-semibold">{copy.pronunciation.readingSpeed}</p>
            <SegmentedControl groupLabel={copy.pronunciation.readingSpeedAriaLabel} value={speed} onChange={setSpeed} fill options={["0.75", "1", "1.25"].map((value) => ({ value, content: `${value}×`, label: `${value}×` }))} />
          </>}
          {sheet && ["profile", "devices", "help", "account", "navigation"].includes(sheet) && <p className="text-sm leading-6 text-ink-soft">This is a visual review of the settings page. Navigation and account actions remain local to this preview.</p>}
        </div>
      </BottomSheet>
    </main>
  );
}
