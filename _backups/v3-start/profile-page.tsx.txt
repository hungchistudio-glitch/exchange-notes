"use client";

import { Camera, LoaderCircle, UserRound, X } from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import LogoutButton from "@/app/components/auth/LogoutButton";
import SpeechSettingsButton from "@/app/components/settings/SpeechSettingsButton";
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

export default function ProfilePage() {
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
          "display_name, exchange_id, native_language, learning_language, email, avatar_url"
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


  async function handlePhotoSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
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
        file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
        "jpg";

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
    <main className="min-h-screen bg-[#f5f2eb] px-5 pt-8 pb-32 text-black">
      <div className="mx-auto max-w-xl">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em]">
              Your account
            </p>

            <h1 className="mt-2 text-5xl font-black">Profile</h1>
          </div>

          <div className="flex items-center gap-2">
            <SpeechSettingsButton />
            <LogoutButton />
          </div>
        </header>

        <section className="mt-7 rounded-[30px] bg-white p-6">
          <div className="flex items-center gap-5">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black text-white">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound size={38} />
              )}

              {uploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <LoaderCircle size={22} className="animate-spin" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-2xl font-black">
                {loading
                  ? "Loading…"
                  : form.display_name || "Language learner"}
              </h2>

              <p className="mt-1 break-words text-sm">{email}</p>
            </div>
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(event) => void handlePhotoSelected(event)}
          />

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[20px] border border-black px-4 py-4 font-black disabled:opacity-40"
            >
              {uploadingPhoto ? (
                <LoaderCircle size={19} className="animate-spin" />
              ) : (
                <Camera size={19} />
              )}

              {avatarUrl ? "Change Photo" : "Add Profile Photo"}
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={() => void removeProfilePhoto()}
                disabled={uploadingPhoto}
                aria-label="Remove profile photo"
                className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[20px] border border-black/15 disabled:opacity-40"
              >
                <X size={19} />
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <section className="mt-5 rounded-[30px] bg-white p-6">
            <p className="font-bold">Loading your profile…</p>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-5 space-y-5 rounded-[30px] bg-white p-6"
          >
            <label className="block">
              <span className="font-black">Your name</span>

              <input
                required
                value={form.display_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    display_name: event.target.value,
                  }))
                }
                placeholder="First name"
                className="mt-2 w-full rounded-[20px] border border-[#bbb] px-5 py-4 text-lg outline-none focus:border-black"
              />
            </label>

            <label className="block">
              <span className="font-black">Exchange ID</span>

              <div className="mt-2 flex rounded-[20px] border border-[#bbb] bg-white focus-within:border-black">
                <span className="px-5 py-4 text-2xl font-black">@</span>

                <input
                  required
                  value={form.exchange_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      exchange_id: normalizeExchangeId(event.target.value),
                    }))
                  }
                  placeholder="yourname"
                  className="min-w-0 flex-1 rounded-r-[20px] bg-white py-4 pr-5 text-lg outline-none"
                />
              </div>

              <p className="mt-2 text-sm text-[#555]">
                3–24 lowercase letters, numbers, or underscores.
              </p>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-black">Native language</span>

                <select
                  value={form.native_language}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      native_language: event.target.value as AppLanguage,
                    }))
                  }
                  className="mt-2 w-full rounded-[20px] border border-[#bbb] bg-white px-4 py-4 text-base outline-none focus:border-black"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="font-black">Learning language</span>

                <select
                  value={form.learning_language}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      learning_language: event.target.value as AppLanguage,
                    }))
                  }
                  className="mt-2 w-full rounded-[20px] border border-[#bbb] bg-white px-4 py-4 text-base outline-none focus:border-black"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <p className="rounded-[20px] bg-red-50 p-4 font-bold text-red-900">
                {error}
              </p>
            )}

            {message && (
              <p className="rounded-[20px] bg-green-50 p-4 font-bold text-green-900">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-[20px] bg-black px-5 py-4 text-lg font-black text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
