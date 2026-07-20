"use client";

import {
  Camera,
  Languages,
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
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photos must be smaller than 5 MB.");
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
        throw new Error("You must be logged in to upload a profile photo.");
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
      setMessage("Profile photo updated!");
    } catch (uploadError) {
      console.error("Profile photo upload failed:", uploadError);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload your profile photo.",
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
        throw new Error("You must be logged in.");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(null);
      setMessage("Profile photo removed.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove your profile photo.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?",
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
        setError("You must be logged in to update your profile.");
        return;
      }

      const cleanId = normalizeExchangeId(form.exchange_id);

      if (cleanId.length < 3) {
        setError("Exchange ID must contain at least 3 characters.");
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
      setMessage("Profile updated successfully!");
    } catch {
      setError("Could not update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f4f1ea] text-neutral-900">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col">
        <AppHeader
          title="Settings"
          backHref="/home"
          backLabel="Back to home"
        />

        <div className="flex-1 space-y-5 px-4 pb-32 pt-5">
          <section className="rounded-[26px] border border-black/[0.06] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.035)]">
            <div className="flex items-center gap-4">
              <Avatar
                src={avatarUrl}
                fallback={form.display_name}
                size="xl"
                loading={uploadingPhoto}
              />

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold tracking-[-0.025em] text-black">
                  {loading
                    ? "Loading…"
                    : form.display_name || "Language learner"}
                </h2>

                <p className="mt-1 truncate text-sm text-black/45">
                  {email || "Exchange Notes account"}
                </p>

                {!loading && form.exchange_id && (
                  <p className="mt-1 truncate text-xs font-medium text-black/30">
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
                className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-black/[0.05] px-4 text-xs font-semibold text-black transition-all disabled:opacity-40 active:scale-[0.985]"
              >
                {uploadingPhoto ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Camera size={15} strokeWidth={1.8} />
                )}

                {avatarUrl ? "Change photo" : "Add photo"}
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => void removeProfilePhoto()}
                  disabled={uploadingPhoto}
                  aria-label="Remove profile photo"
                  title="Remove profile photo"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 transition-all disabled:opacity-40 active:scale-95"
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
            <section className="rounded-[26px] border border-black/[0.06] bg-white p-5">
              <div className="flex items-center gap-3 text-sm font-medium text-black/45">
                <LoaderCircle size={17} className="animate-spin" />
                Loading your profile…
              </div>
            </section>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-[26px] border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.035)]"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
                  Profile
                </p>

                <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-black">
                  Account details
                </h3>
              </div>

              <FormField
                label="Your name"
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
                  placeholder="Your name"
                />
              </FormField>

              <FormField
                label="Exchange ID"
                htmlFor="settings-exchange-id"
                description="3–24 lowercase letters, numbers, or underscores."
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
                  placeholder="yourname"
                  leading={
                    <span className="text-sm font-semibold">@</span>
                  }
                />
              </FormField>

              <FormField
                label="Native language"
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
                label="Learning language"
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
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition-all disabled:opacity-35 active:scale-[0.985]"
              >
                {saving && (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                )}

                {saving ? "Saving…" : "Save changes"}
              </button>
            </form>
          )}

          <section>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
              Preferences
            </p>

            <div className="divide-y divide-black/[0.06] overflow-hidden rounded-[26px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              <SpeechSettingsButton variant="row" />

              <SettingsRow
                title="Languages"
                description="Your native and learning languages"
                value={`${form.native_language === "english" ? "English" : "繁體中文"} → ${
                  form.learning_language === "english"
                    ? "English"
                    : "繁體中文"
                }`}
                icon={<Languages size={17} strokeWidth={1.8} />}
              />
            </div>
          </section>

          <section>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
              Account
            </p>

            <div className="overflow-hidden rounded-[26px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              <SettingsRow
                title="Log out"
                description="Sign out of this device"
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
