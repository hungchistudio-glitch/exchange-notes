"use client";

import { forgetDeviceCopies } from "@/lib/offline/forgetDevice";
import { disableNativePushRegistration } from "@/lib/push/nativeClient";

import {
  CircleHelp,
  GraduationCap,
  Globe,
  LoaderCircle,
  LogOut,
  Smartphone,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import ProgressHud from "@/components/cosmic/ProgressHud";
import LearningProgressPanel from "@/components/settings/LearningProgressPanel";
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
  changeProfileLanguagePair,
  DEFAULT_LEARNING_PAIR,
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
  const {
    apply: applyLearningLanguages,
    languagePair: savedLanguagePair,
  } = useLearningLanguageContext();
  const { isCosmic } = useInterfaceMode();
  const { isStandalone } = usePwaInstall();

  const copy = t.settings.profile;
  const sections = t.settings.sections;
  const devicesCopy = t.settings.devices;
  const helpCopy = t.settings.help;

  const [userId, setUserId] = useState<string | null>(null);
  /*
   * Seeded from the pair the app is already running on, not from the
   * constant. The profile read below confirms it a moment later; until then
   * DEFAULT_LEARNING_PAIR made the two rows claim English and Chinese to
   * every reader who had chosen anything else, and then corrected itself on
   * screen.
   */
  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    exchange_id: "",
    native_language: savedLanguagePair[1],
    learning_language: savedLanguagePair[0],
  });

  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [savingLanguage, setSavingLanguage] = useState(false);

  /*
   * Refs, not the state beside them, because both guards have to hold within
   * the same tick a second tap arrives in — a state update scheduled by the
   * first tap has not been applied yet when the second one runs.
   */
  const languageSaveInFlight = useRef(false);
  const logoutInFlight = useRef(false);

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
              DEFAULT_LEARNING_PAIR[1],
          learning_language:
            readLanguageCode(data?.learning_language) ??
              DEFAULT_LEARNING_PAIR[0],
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
    /*
     * One change at a time, and none before the profile is here.
     *
     * Two overlapping saves each captured their own `previous` and each
     * restored it on failure, so a failed second save could put back the
     * state the first one had already replaced. The row is disabled while a
     * save is in flight, and this is the guard behind the disabling.
     */
    if (!userId || loading || languageSaveInFlight.current) return;

    const previous = form;

    /*
     * Native and learning must differ — the database enforces it too — so a
     * value that collides with the other field flips that field in the same
     * update rather than sending a lone change the constraint would reject.
     *
     * A collision swaps the two existing values, preserving both explicit
     * choices across all 20 supported directions.
     */
    const [nextLearning, nextNative] = changeProfileLanguagePair(
      [form.learning_language, form.native_language],
      field === "learning_language" ? "learning" : "native",
      value,
    );

    // Choosing what is already chosen is not a change, and sending it would
    // spend a request and a disabled row on nothing.
    if (
      nextLearning === form.learning_language &&
      nextNative === form.native_language
    ) {
      return;
    }

    languageSaveInFlight.current = true;
    setSavingLanguage(true);

    setForm((current) => ({
      ...current,
      learning_language: nextLearning,
      native_language: nextNative,
    }));
    setError("");

    /*
     * Every card on screen changes now, not after the round trip.
     *
     * This used to save first and then refresh the shared context, which is
     * three requests deep — the update, getUser(), and the profile read —
     * before a single word card noticed. The value was never in doubt: the
     * reader just picked it. Persisting it and displaying it are different
     * jobs, and only one of them has to wait for the network.
     */
    applyLearningLanguages(nextLearning, nextNative);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          learning_language: nextLearning,
          native_language: nextNative,
        })
        .eq("id", userId);

      if (updateError) {
        restore();
        setError(
          updateError.code === "23514"
            ? copy.languagesMustDifferError
            : updateError.message,
        );
        return;
      }
    } catch {
      restore();
      setError(copy.profileUpdateError);
    } finally {
      languageSaveInFlight.current = false;
      setSavingLanguage(false);
    }

    /*
     * Puts back the pair this call found, which is not the same as the pair
     * the context is holding.
     *
     * The failure path used to restore from `savedLanguagePair` — the shared
     * context — and the optimistic update at the top of this function had
     * already moved it. So a failed save restored the value that had just
     * failed to save: the error message appeared, and every card on screen
     * stayed in the language the database had refused.
     */
    function restore() {
      setForm((current) => ({
        ...current,
        learning_language: previous.learning_language,
        native_language: previous.native_language,
      }));
      applyLearningLanguages(
        previous.learning_language,
        previous.native_language,
      );
    }
  }

  async function handleLogout() {
    if (logoutInFlight.current) return;

    logoutInFlight.current = true;
    setLoggingOut(true);
    setLogoutError("");

    /*
     * Best-effort, and deliberately outside the decision below.
     *
     * Telling the push server to forget this device is a courtesy; it is not
     * what signing out means. Letting it fail the sign-out would mean a
     * reader whose push endpoint is unreachable cannot leave their account
     * on a shared phone, which is the one moment signing out actually
     * matters.
     */
    try {
      await disableNativePushRegistration();
    } catch (error) {
      console.error("Could not unregister this device for push.", error);
    }

    try {
      const supabase = createClient();

      // "global" revokes every refresh token for the account, not just this
      // tab's — a session left open on another device should not survive a
      // deliberate sign-out here.
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "global",
      });

      /*
       * Checked, which it never used to be. signOut resolves with an error
       * rather than throwing, so a failed sign-out read exactly like a
       * successful one: the next two lines deleted every offline copy on the
       * device and reloaded — into the same account, still signed in, with
       * its saved words, drafts and phonetics gone. Nothing is deleted now
       * until the session is actually over.
       */
      if (signOutError) throw signOutError;

      /*
       * Awaited, and awaited here rather than left to the SIGNED_OUT listener
       * alone. That listener does call this too, but it calls it as `void` and
       * the navigation below replaces the document a moment later — clearing
       * the caches is asynchronous, and work nobody waited for is work a
       * discarded document may not finish. The listener covers the sign-out
       * nobody pressed; this covers the one that did.
       */
      await forgetDeviceCopies();

      /*
       * Reload the protected URL as a new document. The server auth boundary
       * redirects it to /login, while the React tree, router cache and every
       * client component holding the previous user's data are discarded first.
       *
       * Nothing resets the busy state on this path on purpose: the document
       * is on its way out, and a button that springs back to life during the
       * teardown only invites a second press.
       */
      window.location.reload();
    } catch (error) {
      /*
       * The reason goes to the console and the reader gets the sentence in
       * their own language. Unlike a profile update — where the database's
       * own message names the constraint and is worth showing — a failed
       * sign-out fails for reasons that are never the reader's to act on,
       * and an English network error under a Chinese interface is a worse
       * answer than "that did not work, try again".
       */
      console.error("Could not sign out.", error);
      setLogoutError(t.common.error);

      logoutInFlight.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <main className="settings-screen cosmic-settings-page min-h-[100dvh] bg-surface text-black">
      <div className="settings-shell mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col pb-28">
        <AppHeader title={copy.pageTitle} action={<SettingsSearch />} />

        <div className="settings-content cosmic-settings-content flex-1 space-y-8 px-5 pt-5 sm:px-6">
          {(error || message) && (
            <div className="settings-feedback space-y-2">
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
          {isCosmic ? (
            <ProgressHud />
          ) : (
            /*
              Standard Mode's counterpart, in the same slot.
              
              These four readings were the bottom of the old home screen. The
              home is only Yumi now, and unlike today's word and today's
              focus — which moved to the vocabulary screen, where they are
              about the words in front of you — these answer "how is it
              going", which is a question a reader asks on purpose.
            */
            <SettingsSection
              label={t.home.progress.title}
              bare
              /* Four readings across, rather than two squeezed into half a
                 window, once the layout has two columns to give. */
              className="settings-span"
            >
              <LearningProgressPanel />
            </SettingsSection>
          )}

          <SettingsSection label={sections.learning}>
            <SettingsAnchor id="setting-native-language">
              <ProfileLanguageSettingsButton
                rowTitle={copy.nativeLanguage}
                rowDescription={copy.nativeLanguageDescription}
                sheetTitle={copy.nativeLanguage}
                sheetDescription={copy.nativeLanguageDescription}
                icon={<Globe size={16} strokeWidth={1.8} />}
                value={form.native_language}
                disabled={loading || !userId || savingLanguage}
                busy={savingLanguage}
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
                disabled={loading || !userId || savingLanguage}
                busy={savingLanguage}
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
        /* Closing mid-sign-out would leave the request running behind a sheet
           that is no longer there to report what happened to it. */
        closeDisabled={loggingOut}
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
        <div className="space-y-3">
          <p className="text-sm leading-6 text-ink-soft">
            {email || copy.accountFallback}
          </p>

          {/* Inside the sheet, because that is where the button that failed
              is, and the page behind is covered. */}
          {logoutError ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {logoutError}
            </p>
          ) : null}
        </div>
      </BottomSheet>
    </main>
  );
}
