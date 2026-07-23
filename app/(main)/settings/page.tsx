"use client";

import { Camera, LoaderCircle, LogOut, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import SpeechSettingsButton from "@/app/components/settings/SpeechSettingsButton";
import FontSizeSettingsButton from "@/components/settings/FontSizeSettingsButton";
import AppLanguageSettingsButton from "@/components/settings/AppLanguageSettingsButton";
import {
  AppHeader,
  AppInput,
  AppSelect,
  Avatar,
  FormField,
  SettingsRow,
  StatusMessage,
} from "@/components/foundation";
import { createClient } from "@/lib/supabase/client";
import type { AppLanguage } from "@/lib/types/app";
import useTranslation from "@/hooks/i18n/useTranslation";

type ProfileForm = {
  display_name: string;
  exchange_id: string;
  native_language: AppLanguage;
  learning_language: AppLanguage;
};

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "traditional-chinese", label: "繁體中文" },
];

function normalizeExchangeId(value: string) {
  return value
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const copy = t.settings.profile;

  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    exchange_id: "",
    native_language: "traditional-chinese",
    learning_language: "english",
  });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

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

      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          exchange_id: data.exchange_id ?? "",
          native_language:
            (data.native_language as AppLanguage) ?? "traditional-chinese",
          learning_language:
            (data.learning_language as AppLanguage) ?? "english",
        });
        setEmail(data.email ?? user.email ?? "");
        setAvatarUrl(data.avatar_url ?? null);
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || uploadingPhoto) return;

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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(copy.loginUploadError);
      }

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";

      const storagePath = `${user.id}/profile.${extension}`;

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
        .update({
          avatar_url: avatarWithVersion,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      setAvatarUrl(avatarWithVersion);
      setMessage(copy.photoUpdated);
    } catch (uploadError) {
      console.error("Profile photo upload failed:", uploadError);
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
    if (uploadingPhoto) return;

    setUploadingPhoto(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(copy.loginRequired);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

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

  async function handleLogout() {
    const confirmed = window.confirm(copy.logoutConfirm);

    if (!confirmed) return;

    setError("");

    try {
      const supabase = createClient();
      const { error: logoutError } = await supabase.auth.signOut();

      if (logoutError) {
        throw logoutError;
      }

      window.location.replace("/login");
    } catch (logoutError) {
      console.error("Logout failed:", logoutError);
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Could not log out. Please try again.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(copy.loginUpdateError);
        return;
      }

      const cleanId = normalizeExchangeId(form.exchange_id);

      if (cleanId.length < 3) {
        setError(copy.exchangeIdLength);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name.trim(),
          exchange_id: cleanId,
          native_language: form.native_language,
          learning_language: form.learning_language,
        })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setForm((current) => ({ ...current, exchange_id: cleanId }));
      setMessage(copy.profileUpdated);
    } catch {
      setError(copy.profileUpdateError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#F6F3ED] text-neutral-900">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col">
        <AppHeader title={copy.pageTitle} />

        <div className="flex-1 space-y-6 px-4 pb-32 pt-6 sm:px-6">
          <section className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.035)]">
            <div className="flex items-center gap-4">
              <Avatar
                src={avatarUrl}
                fallback={form.display_name}
                size="xl"
                loading={uploadingPhoto}
              />

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[22px] font-semibold tracking-[-0.035em] text-black">
                  {loading
                    ? copy.loading
                    : form.display_name || copy.languageLearner}
                </h2>

                <p className="mt-1 truncate text-[14px] leading-5 text-black/45">
                  {email || copy.accountFallback}
                </p>

                {!loading && form.exchange_id && (
                  <p className="mt-1 truncate text-[13px] font-medium text-black/32">
                    @{form.exchange_id}
                  </p>
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

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-black/[0.05] px-4 text-xs font-semibold text-black transition-all disabled:opacity-40 active:scale-[0.985]"
              >
                {uploadingPhoto ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Camera size={15} strokeWidth={1.8} />
                )}

                {avatarUrl ? copy.changePhoto : copy.addPhoto}
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => void removeProfilePhoto()}
                  disabled={uploadingPhoto}
                  aria-label={copy.removePhoto}
                  title={copy.removePhoto}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 transition-all disabled:opacity-40 active:scale-95"
                >
                  <X size={15} strokeWidth={1.8} />
                </button>
              )}
            </div>
          </section>

          {error && <StatusMessage tone="danger">{error}</StatusMessage>}

          {message && <StatusMessage tone="success">{message}</StatusMessage>}

          {loading ? (
            <section className="rounded-[24px] border border-black/[0.06] bg-white p-5">
              <div className="flex items-center gap-3 text-sm font-medium text-black/45">
                <LoaderCircle size={17} className="animate-spin" />
                {copy.loadingProfile}
              </div>
            </section>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.035)]"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/38">
                  {copy.profile}
                </p>

                <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-black">
                  {copy.accountDetails}
                </h3>
              </div>

              <FormField label={copy.yourName} htmlFor="settings-display-name">
                <AppInput
                  id="settings-display-name"
                  required
                  autoComplete="name"
                  value={form.display_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      display_name: event.target.value,
                    }))
                  }
                  placeholder={copy.namePlaceholder}
                />
              </FormField>

              <FormField
                label={copy.exchangeId}
                htmlFor="settings-exchange-id"
                description={copy.exchangeIdDescription}
              >
                <AppInput
                  id="settings-exchange-id"
                  required
                  value={form.exchange_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      exchange_id: normalizeExchangeId(event.target.value),
                    }))
                  }
                  placeholder={copy.exchangeIdPlaceholder}
                  leading={<span className="text-sm font-semibold">@</span>}
                />
              </FormField>

              <FormField
                label={copy.nativeLanguage}
                htmlFor="settings-native-language"
              >
                <AppSelect
                  id="settings-native-language"
                  value={form.native_language}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      native_language: event.target.value as AppLanguage,
                    }))
                  }
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AppSelect>
              </FormField>

              <FormField
                label={copy.learningLanguage}
                htmlFor="settings-learning-language"
              >
                <AppSelect
                  id="settings-learning-language"
                  value={form.learning_language}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      learning_language: event.target.value as AppLanguage,
                    }))
                  }
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AppSelect>
              </FormField>

              <button
                type="submit"
                disabled={saving}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-[16px] font-semibold text-white transition-all disabled:opacity-35 active:scale-[0.985]"
              >
                {saving && <LoaderCircle size={16} className="animate-spin" />}

                {saving ? copy.saving : copy.saveChanges}
              </button>
            </form>
          )}

          <section>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/38">
              {copy.preferences}
            </p>

            <div className="divide-y divide-black/[0.06] overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              <SpeechSettingsButton variant="row" />

              <FontSizeSettingsButton />

              <AppLanguageSettingsButton />
            </div>
          </section>

          <section>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/38">
              {copy.account}
            </p>

            <div className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              <SettingsRow
                title={copy.logout}
                description={copy.logoutDescription}
                icon={<LogOut size={17} strokeWidth={1.8} />}
                danger
                onClick={() => void handleLogout()}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
