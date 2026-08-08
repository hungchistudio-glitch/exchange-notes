"use client";

import { disableNativePushRegistration } from "@/lib/push/nativeClient";

import {
  Camera,
  Check,
  Copy,
  GraduationCap,
  Globe,
  LoaderCircle,
  LogOut,
  QrCode,
  Pencil,
  X,
} from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";

import AppHeader from "@/components/foundation/layout/AppHeader";
import Avatar from "@/components/foundation/media/Avatar";
import StatusMessage from "@/components/foundation/feedback/StatusMessage";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import Modal from "@/components/ui/Modal";
import EditProfileSheet from "@/components/settings/EditProfileSheet";
import ProfileLanguageSettingsButton from "@/components/settings/ProfileLanguageSettingsButton";
import DailyGoalSettingsButton from "@/components/settings/DailyGoalSettingsButton";
import PronunciationSettingsButton from "@/components/settings/PronunciationSettingsButton";
import FontSizeSettingsButton from "@/components/settings/FontSizeSettingsButton";
import AppLanguageSettingsButton from "@/components/settings/AppLanguageSettingsButton";
import PwaInstallSettingsButton from "@/components/settings/PwaInstallSettingsButton";
import NativeWidgetSettingsButton from "@/components/settings/NativeWidgetSettingsButton";
import WebPushSettingsButton from "@/components/settings/WebPushSettingsButton";
import YumiReminderSettingsButton from "@/components/settings/YumiReminderSettingsButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { createClient } from "@/lib/supabase/client";
import type { AppLanguage } from "@/lib/types/app";

type ProfileForm = {
  display_name: string;
  exchange_id: string;
  native_language: AppLanguage;
  learning_language: AppLanguage;
};

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { refresh: refreshLearningLanguage } = useLearningLanguageContext();
  const copy = t.settings.profile;
  const qrCopy = t.friends.profileQr;

  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    exchange_id: "",
    native_language: "english",
    learning_language: "traditional-chinese",
  });

  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

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
            "display_name, exchange_id, native_language, learning_language, email, avatar_url",
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
            (data?.native_language as AppLanguage) ?? "english",
          learning_language:
            (data?.learning_language as AppLanguage) ?? "traditional-chinese",
        });

        setEmail(data?.email ?? user.email ?? "");
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

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || uploadingPhoto || !userId) return;

    if (!file.type.startsWith("image/")) {
      setError(copy.photoImageError);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(copy.photoSizeError);
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      const extension =
        file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
        "jpg";

      const storagePath = `${userId}/profile.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(storagePath);

      const avatarWithVersion = `${publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarWithVersion })
        .eq("id", userId);

      if (profileError) throw profileError;

      setAvatarUrl(avatarWithVersion);
      setMessage(copy.photoUpdated);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : copy.photoUploadError,
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removeProfilePhoto() {
    if (uploadingPhoto || !userId) return;

    setUploadingPhoto(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(null);
      setMessage(copy.photoRemoved);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : copy.photoRemoveError,
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleLanguageChange(
    field: "native_language" | "learning_language",
    value: AppLanguage,
  ) {
    if (!userId) return;

    const otherField =
      field === "native_language" ? "learning_language" : "native_language";
    const previous = form;

    // Only two languages exist app-wide, so native and learning can never
    // be equal (the database enforces this too). If the new value collides
    // with the other field, flip that field to the remaining language in
    // the same update instead of sending a lone change that would violate
    // the constraint.
    const nextOtherValue: AppLanguage =
      value === form[otherField]
        ? value === "english"
          ? "traditional-chinese"
          : "english"
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

  async function handleCopyHandle() {
    try {
      await navigator.clipboard.writeText(`@${form.exchange_id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable; fail silently.
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    const supabase = createClient();

    await disableNativePushRegistration();
    await supabase.auth.signOut();

    // Send the user back to the Google sign-in screen.
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-[100dvh] bg-surface text-black">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col pb-28">
        <AppHeader title={copy.pageTitle} />

        <div className="flex-1 space-y-6 px-4 pt-5 sm:px-6">
          {(error || message) && (
            <>
              {error && <StatusMessage tone="danger">{error}</StatusMessage>}
              {message && (
                <StatusMessage tone="success">{message}</StatusMessage>
              )}
            </>
          )}

          {/* Account: compact identity summary */}
          <section className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.035)]">
            <div
              aria-hidden="true"
              className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400"
            />

            <div className="flex items-center gap-5 border-b border-black/[0.05] bg-gradient-to-br from-blue-50/60 to-white px-6 pb-6 pt-6">
              <div className="relative shrink-0">
                <Avatar
                  src={avatarUrl}
                  fallback={form.display_name}
                  size="xl"
                  loading={uploadingPhoto}
                />

                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  aria-label={avatarUrl ? copy.changePhoto : copy.addPhoto}
                  title={avatarUrl ? copy.changePhoto : copy.addPhoto}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white ring-[3px] ring-white transition-transform active:scale-90 disabled:opacity-50"
                >
                  <Camera size={14} strokeWidth={2} />
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => void removeProfilePhoto()}
                    disabled={uploadingPhoto}
                    aria-label={copy.removePhoto}
                    title={copy.removePhoto}
                    className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white ring-[3px] ring-white transition-transform active:scale-90 disabled:opacity-50"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[22px] font-bold tracking-[-0.03em] text-black">
                  {loading
                    ? copy.loading
                    : form.display_name || copy.languageLearner}
                </h2>

                <p className="mt-1 truncate text-[14px] leading-5 text-black/45">
                  {email || copy.accountFallback}
                </p>

                {!loading && form.exchange_id && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-semibold text-blue-600">
                      @{form.exchange_id}
                    </span>

                    <button
                      type="button"
                      onClick={() => void handleCopyHandle()}
                      aria-label={copied ? copy.copied : copy.copyHandle}
                      title={copied ? copy.copied : copy.copyHandle}
                      className={`flex shrink-0 items-center justify-center rounded-full p-1.5 transition-colors ${
                        copied
                          ? "bg-green-100 text-green-600"
                          : "bg-black/[0.045] text-black/55 hover:bg-black/[0.08]"
                      }`}
                    >
                      <span className="relative flex h-[11px] w-[11px] items-center justify-center">
                        <Copy
                          size={11}
                          strokeWidth={2}
                          className={`absolute transition-all duration-200 ease-out ${
                            copied ? "scale-50 opacity-0" : "scale-100 opacity-100"
                          }`}
                        />
                        <Check
                          size={11}
                          strokeWidth={2.5}
                          className={`absolute transition-all duration-200 ease-out ${
                            copied ? "scale-100 opacity-100" : "scale-50 opacity-0"
                          }`}
                        />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrOpen(true)}
                      aria-label={copy.viewQr}
                      title={copy.viewQr}
                      className="flex shrink-0 items-center justify-center rounded-full bg-black/[0.045] p-1.5 text-black/55 transition-colors hover:bg-black/[0.08]"
                    >
                      <QrCode size={11} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={(event) => void handlePhotoSelected(event)}
            />

            <div className="px-6 py-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm font-medium text-black/45">
                  <LoaderCircle size={16} className="animate-spin" />
                  {copy.loadingProfile}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black/[0.045] text-sm font-semibold text-black transition-colors hover:bg-black/[0.08] active:scale-[0.99]"
                >
                  <Pencil size={15} strokeWidth={1.8} />
                  {copy.editProfile}
                </button>
              )}
            </div>
          </section>

          {/* Learning setup */}
          <section>
            <p className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
              {t.settings.learningSetup}
            </p>

            <div className="divide-y divide-black/[0.05] overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
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

              <DailyGoalSettingsButton />
            </div>
          </section>

          {/* Experience */}
          <section>
            <p className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
              {copy.preferences}
            </p>

            <div className="divide-y divide-black/[0.05] overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              <PronunciationSettingsButton />
              <FontSizeSettingsButton />
              <AppLanguageSettingsButton />
              <PwaInstallSettingsButton />
              <NativeWidgetSettingsButton />
              <WebPushSettingsButton />
              <YumiReminderSettingsButton />
            </div>
          </section>

          {/* Account actions */}
          <section>
            <p className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
              {copy.account}
            </p>

            <div className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              <SettingsRow
                title={copy.logout}
                description={copy.logoutDescription}
                icon={<LogOut size={16} strokeWidth={1.8} />}
                danger
                onClick={() => setLogoutOpen(true)}
              />
            </div>
          </section>
        </div>
      </div>

      {userId && (
        <EditProfileSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          userId={userId}
          initialName={form.display_name}
          initialExchangeId={form.exchange_id}
          onSaved={(values) => {
            setForm((current) => ({ ...current, ...values }));
            setMessage(copy.profileUpdated);
          }}
        />
      )}

      <Modal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title={qrCopy.title}
        description={qrCopy.description}
      >
        <div className="flex flex-col items-center">
          <div className="flex aspect-square w-full max-w-[220px] items-center justify-center rounded-3xl border border-line p-6">
            {form.exchange_id ? (
              <QRCodeSVG
                value={`exchangenotes://add-friend/${form.exchange_id}`}
                size={160}
                bgColor="transparent"
                fgColor="#000000"
                level="M"
                aria-label={qrCopy.imageAlt}
              />
            ) : (
              <span className="text-center text-sm text-black/40">
                {qrCopy.loading}
              </span>
            )}
          </div>

          {form.exchange_id && (
            <p className="mt-3 text-sm font-semibold text-black/50">
              @{form.exchange_id}
            </p>
          )}
        </div>
      </Modal>

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
        <p className="text-sm leading-6 text-black/50">
          {email || copy.accountFallback}
        </p>
      </BottomSheet>
    </main>
  );
}
