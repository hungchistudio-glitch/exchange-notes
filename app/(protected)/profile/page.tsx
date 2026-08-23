"use client";

import { disableNativePushRegistration } from "@/lib/push/nativeClient";

import {
  CircleHelp,
  GraduationCap,
  Globe,
  LoaderCircle,
  LogOut,
  Smartphone,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import ProgressHud from "@/components/cosmic/ProgressHud";
import AppHeader from "@/components/foundation/layout/AppHeader";
import StatusMessage from "@/components/foundation/feedback/StatusMessage";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import EditProfileSheet from "@/components/settings/EditProfileSheet";
import ProfileSummaryCard from "@/components/settings/ProfileSummaryCard";
import SettingsAnchor from "@/components/settings/SettingsAnchor";
import SettingsSearch from "@/components/settings/SettingsSearch";
import SettingsSection from "@/components/settings/SettingsSection";
import ProfileLanguageSettingsButton from "@/components/settings/ProfileLanguageSettingsButton";
import DailyGoalSettingsButton from "@/components/settings/DailyGoalSettingsButton";
import PronunciationSettingsButton from "@/components/settings/PronunciationSettingsButton";
import FontSizeSettingsButton from "@/components/settings/FontSizeSettingsButton";
import AppLanguageSettingsButton from "@/components/settings/AppLanguageSettingsButton";
import InterfaceModeSettingsButton from "@/components/settings/InterfaceModeSettingsButton";
import WebPushSettingsButton from "@/components/settings/WebPushSettingsButton";
import YumiReminderSettingsButton from "@/components/settings/YumiReminderSettingsButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import usePwaInstall from "@/hooks/pwa/usePwaInstall";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  getDeviceConnections,
  getServerDeviceConnections,
  subscribeToDeviceConnections,
} from "@/lib/settings/deviceConnections";
import {
  DEFAULT_LEARNING_PAIR,
  getLearningLanguages,
  readLanguageCode,
  type LanguageCode,
} from "@/lib/languages";

type ProfileForm = {
  display_name: string;
  exchange_id: string;
  native_language: LanguageCode;
  learning_language: LanguageCode;
};

/**
 * Settings.
 *
 * Six groups, in the order they are actually used: who you are, how you
 * learn, how Yumi behaves, how the app looks, what this device is connected
 * to, where the help is, and the way out. Nothing was removed to get the page
 * this short — Devices & Widgets and Help & About each hold a screen of their
 * own, and search reaches everything on both.
 */
export default function ProfilePage() {
  const { t } = useTranslation();
  const { refresh: refreshLearningLanguage } = useLearningLanguageContext();
  const { isCosmic } = useInterfaceMode();
  const { isStandalone } = usePwaInstall();

  const copy = t.settings.profile;
  const sections = t.settings.sections;
  const devicesCopy = t.settings.devices;
  const helpCopy = t.settings.help;

  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    exchange_id: "",
    native_language: DEFAULT_LEARNING_PAIR[0],
    learning_language: DEFAULT_LEARNING_PAIR[1],
  });

  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /*
   * What this device has connected, from the cache the Devices & Widgets
   * screen keeps. The summary is on the row so the group is not a black box,
   * and it costs no request: the Home Screen install is a media query, and
   * the widget token was last checked by the screen that owns it.
   */
  const deviceConnections = useSyncExternalStore(
    subscribeToDeviceConnections,
    getDeviceConnections,
    getServerDeviceConnections,
  );

  const connectedCount =
    (isStandalone ? 1 : 0) + (deviceConnections.iphoneWidget ? 1 : 0);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (userError || !user) {
          setError(userError?.message ?? copy.loginRequired);
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select(
            "display_name, exchange_id, native_language, learning_language, avatar_url",
          )
          .eq("id", user.id)
          .single();

        if (!isMounted) return;

        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        setUserId(user.id);
        setForm({
          display_name: data?.display_name ?? "",
          exchange_id: data?.exchange_id ?? "",
          native_language:
            readLanguageCode(data?.native_language) ??
              DEFAULT_LEARNING_PAIR[0],
          learning_language:
            readLanguageCode(data?.learning_language) ??
              DEFAULT_LEARNING_PAIR[1],
        });

        // From the session, not the profiles row. The address is the same one
        // either way, and SELECT on profiles.email is revoked from the client
        // so it cannot be read back out of the API by anyone, for any row.
        setEmail(user.email ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
      } catch {
        if (isMounted) {
          setError(copy.profileUpdateError);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLanguageChange(
    field: "native_language" | "learning_language",
    value: LanguageCode,
  ) {
    if (!userId) return;

    const otherField =
      field === "native_language" ? "learning_language" : "native_language";
    const previous = form;

    /*
     * Native and learning must differ — the database enforces it too — so a
     * value that collides with the other field flips that field in the same
     * update rather than sending a lone change the constraint would reject.
     *
     * Which language it flips to is picked here rather than being the one
     * left over: with five learnable languages there is no leftover, so the
     * first that is not the new value stands in until the user says
     * otherwise.
     */
    const nextOtherValue: LanguageCode =
      value === form[otherField]
        ? (getLearningLanguages().find((meta) => meta.code !== value)?.code ??
          form[otherField])
        : form[otherField];

    setForm((current) => ({
      ...current,
      [field]: value,
      [otherField]: nextOtherValue,
    }));
    setError("");

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [field]: value, [otherField]: nextOtherValue })
        .eq("id", userId);

      if (updateError) {
        setForm(previous);
        setError(
          updateError.code === "23514"
            ? copy.languagesMustDifferError
            : updateError.message,
        );
        return;
      }

      // Both fields can change here (native/learning are mutually
      // exclusive), so always refresh the shared learning-language
      // context — every mounted word card should reflect the new value
      // immediately, without a full page reload.
      void refreshLearningLanguage();
    } catch {
      setForm(previous);
      setError(copy.profileUpdateError);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    const supabase = createClient();

    await disableNativePushRegistration();

    // "global" revokes every refresh token for the account, not just this
    // tab's — a session left open on another device should not survive a
    // deliberate sign-out here.
    await supabase.auth.signOut({ scope: "global" });

    /*
     * A full document load rather than router.replace, which is a soft
     * navigation: the React tree, the router cache and every client component
     * still holding the previous user's data would otherwise survive into the
     * signed-out state. Signing out should leave nothing of the old session in
     * memory, and the cheapest way to guarantee that is a new document.
     */
    window.location.assign("/login");
  }

  return (
    <main className="min-h-[100dvh] bg-surface text-black">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col pb-28">
        <AppHeader title={copy.pageTitle} action={<SettingsSearch />} />

        <div className="flex-1 space-y-8 px-5 pt-5 sm:px-6">
          {(error || message) && (
            <div className="space-y-2">
              {error && <StatusMessage tone="danger">{error}</StatusMessage>}
              {message && (
                <StatusMessage tone="success">{message}</StatusMessage>
              )}
            </div>
          )}

          <SettingsAnchor id="setting-profile">
            <ProfileSummaryCard
              avatarUrl={avatarUrl}
              displayName={
                loading ? copy.loading : form.display_name || copy.languageLearner
              }
              exchangeId={loading ? "" : form.exchange_id}
              email={email || copy.accountFallback}
              loading={loading}
              editLabel={copy.editProfile}
              onOpen={() => setEditOpen(true)}
            />
          </SettingsAnchor>

          {/*
            Cosmic Mode's read on the learning itself, above the settings that
            configure it. Standard Mode is unchanged — this is an instrument
            panel, and it belongs to the mode that has instruments.
          */}
          {isCosmic && <ProgressHud />}

          <SettingsSection label={sections.learning}>
            <SettingsAnchor id="setting-native-language">
              <ProfileLanguageSettingsButton
                rowTitle={copy.nativeLanguage}
                rowDescription={copy.nativeLanguageDescription}
                sheetTitle={copy.nativeLanguage}
                sheetDescription={copy.nativeLanguageDescription}
                icon={<Globe size={16} strokeWidth={1.8} />}
                value={form.native_language}
                onChange={(value) =>
                  handleLanguageChange("native_language", value)
                }
              />
            </SettingsAnchor>

            <SettingsAnchor id="setting-learning-language">
              <ProfileLanguageSettingsButton
                rowTitle={copy.learningLanguage}
                rowDescription={copy.learningLanguageDescription}
                sheetTitle={copy.learningLanguage}
                sheetDescription={copy.learningLanguageDescription}
                icon={<GraduationCap size={16} strokeWidth={1.8} />}
                value={form.learning_language}
                onChange={(value) =>
                  handleLanguageChange("learning_language", value)
                }
              />
            </SettingsAnchor>

            <SettingsAnchor id="setting-daily-goal">
              <DailyGoalSettingsButton />
            </SettingsAnchor>

            <SettingsAnchor id="setting-pronunciation">
              <PronunciationSettingsButton />
            </SettingsAnchor>
          </SettingsSection>

          <SettingsSection
            label={sections.yumi}
            footnote={t.settings.interfaceMode.sharedDataNote}
          >
            <SettingsAnchor id="setting-interface-mode">
              <InterfaceModeSettingsButton />
            </SettingsAnchor>

            <SettingsAnchor id="setting-notifications">
              <WebPushSettingsButton />
            </SettingsAnchor>

            <SettingsAnchor id="setting-yumi-reminders">
              <YumiReminderSettingsButton onError={setError} />
            </SettingsAnchor>
          </SettingsSection>

          <SettingsSection label={sections.app}>
            <SettingsAnchor id="setting-app-language">
              <AppLanguageSettingsButton />
            </SettingsAnchor>

            <SettingsAnchor id="setting-font-size">
              <FontSizeSettingsButton />
            </SettingsAnchor>
          </SettingsSection>

          <SettingsSection label={sections.devices}>
            <SettingsRow
              href="/profile/devices"
              title={devicesCopy.rowTitle}
              description={devicesCopy.rowDescription}
              icon={<Smartphone size={16} strokeWidth={1.8} />}
              tone={connectedCount > 0 ? "emerald" : "neutral"}
              value={
                connectedCount > 0
                  ? devicesCopy.connectedCount.replace(
                      "{count}",
                      String(connectedCount),
                    )
                  : devicesCopy.notConnected
              }
            />
          </SettingsSection>

          <SettingsSection label={sections.help}>
            <SettingsRow
              href="/profile/help"
              title={helpCopy.rowTitle}
              description={helpCopy.rowDescription}
              icon={<CircleHelp size={16} strokeWidth={1.8} />}
            />
          </SettingsSection>

          <SettingsSection label={sections.account}>
            <SettingsAnchor id="setting-logout">
              <SettingsRow
                title={copy.logout}
                description={copy.logoutDescription}
                icon={<LogOut size={16} strokeWidth={1.8} />}
                danger
                onClick={() => setLogoutOpen(true)}
              />
            </SettingsAnchor>
          </SettingsSection>
        </div>
      </div>

      {userId && (
        <EditProfileSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          userId={userId}
          initialName={form.display_name}
          initialExchangeId={form.exchange_id}
          avatarUrl={avatarUrl}
          onSaved={(values) => {
            setForm((current) => ({ ...current, ...values }));
            setMessage(copy.profileUpdated);
          }}
          onAvatarChange={setAvatarUrl}
        />
      )}

      <BottomSheet
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title={copy.logout}
        description={copy.logoutConfirm}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLogoutOpen(false)}
              disabled={loggingOut}
              className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-black/[0.05] text-sm font-semibold text-black transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {t.common.cancel}
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-red-600 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loggingOut ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : null}
              {copy.logout}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-ink-soft">
          {email || copy.accountFallback}
        </p>
      </BottomSheet>
    </main>
  );
}
