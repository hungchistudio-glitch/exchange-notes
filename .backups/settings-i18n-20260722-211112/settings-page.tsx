"use client";

import {
  Camera,
    LoaderCircle,
  LogOut,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";

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
  const router = useRouter();
  const interfaceLanguage = useInterfaceLanguage();
  const isTraditionalChinese =
    interfaceLanguage === "traditional-chinese";

  const copy = isTraditionalChinese
    ? {
        pageTitle: "設定",
        loading: "載入中…",
        languageLearner: "語言學習者",
        accountFallback: "Exchange Notes 帳號",
        changePhoto: "更換照片",
        addPhoto: "新增照片",
        removePhoto: "移除個人照片",
        loadingProfile: "正在載入個人資料…",
        profile: "個人資料",
        accountDetails: "帳號資料",
        yourName: "你的名字",
        namePlaceholder: "你的名字",
        exchangeId: "Exchange ID",
        exchangeIdDescription:
          "使用 3–24 個小寫英文字母、數字或底線。",
        exchangeIdPlaceholder: "yourname",
        nativeLanguage: "母語",
        learningLanguage: "學習語言",
        saveChanges: "儲存變更",
        saving: "儲存中…",
        preferences: "偏好設定",
        account: "帳號",
        logout: "登出",
        logoutDescription: "登出此裝置",
        logoutConfirm: "確定要登出嗎？",
        photoImageError: "請選擇圖片檔案。",
        photoSizeError: "個人照片必須小於 5 MB。",
        loginUploadError: "你必須先登入才能上傳個人照片。",
        photoUpdated: "個人照片已更新！",
        photoUploadError: "無法上傳個人照片。",
        loginRequired: "你必須先登入。",
        photoRemoved: "個人照片已移除。",
        photoRemoveError: "無法移除個人照片。",
        loginUpdateError: "你必須先登入才能更新個人資料。",
        exchangeIdLength:
          "Exchange ID 必須至少包含 3 個字元。",
        profileUpdated: "個人資料已成功更新！",
        profileUpdateError:
          "無法更新個人資料，請再試一次。",
      }
    : {
        pageTitle: "Settings",
        loading: "Loading…",
        languageLearner: "Language learner",
        accountFallback: "Exchange Notes account",
        changePhoto: "Change photo",
        addPhoto: "Add photo",
        removePhoto: "Remove profile photo",
        loadingProfile: "{copy.loadingProfile}",
        profile: "Profile",
        accountDetails: "Account details",
        yourName: "Your name",
        namePlaceholder: "Your name",
        exchangeId: "Exchange ID",
        exchangeIdDescription:
          "3–24 lowercase letters, numbers, or underscores.",
        exchangeIdPlaceholder: "yourname",
        nativeLanguage: "Native language",
        learningLanguage: "Learning language",
        saveChanges: "Save changes",
        saving: "Saving…",
        preferences: "Preferences",
        account: "Account",
        logout: "Log out",
        logoutDescription: "Sign out of this device",
        logoutConfirm: "Are you sure you want to log out?",
        photoImageError: "Please choose an image file.",
        photoSizeError:
          "Profile photos must be smaller than 5 MB.",
        loginUploadError:
          "You must be logged in to upload a profile photo.",
        photoUpdated: "Profile photo updated!",
        photoUploadError:
          "Could not upload your profile photo.",
        loginRequired: "You must be logged in.",
        photoRemoved: "Profile photo removed.",
        photoRemoveError:
          "Could not remove your profile photo.",
        loginUpdateError:
          "You must be logged in to update your profile.",
        exchangeIdLength:
          "Exchange ID must contain at least 3 characters.",
        profileUpdated: "Profile updated successfully!",
        profileUpdateError:
          "Could not update profile. Please try again.",
      };
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
    const confirmed = window.confirm(
      copy.logoutConfirm,
    );

    if (!confirmed) return;

    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
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

          {error && (
            <StatusMessage tone="danger">{error}</StatusMessage>
          )}

          {message && (
            <StatusMessage tone="success">{message}</StatusMessage>
          )}

          {loading ? (
            <section className="rounded-[24px] border border-black/[0.06] bg-white p-5">
              <div className="flex items-center gap-3 text-sm font-medium text-black/45">
                <LoaderCircle size={17} className="animate-spin" />
                Loading your profile…
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

              <FormField
                label={copy.yourName}
                htmlFor="settings-display-name"
              >
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
                      exchange_id: normalizeExchangeId(
                        event.target.value,
                      ),
                    }))
                  }
                  placeholder={copy.exchangeIdPlaceholder}
                  leading={
                    <span className="text-sm font-semibold">@</span>
                  }
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
                      native_language:
                        event.target.value as AppLanguage,
                    }))
                  }
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
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
                      learning_language:
                        event.target.value as AppLanguage,
                    }))
                  }
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
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
                {saving && (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                )}

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
