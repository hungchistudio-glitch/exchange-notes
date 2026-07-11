"use client";

import { Camera, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import LogoutButton from "@/app/components/auth/LogoutButton";
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
          "display_name, exchange_id, native_language, learning_language, email"
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
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

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
    <main className="safe-bottom min-h-screen bg-[#f5f2eb] px-5 pt-8 text-black">
      <div className="mx-auto max-w-xl">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em]">
              Your account
            </p>

            <h1 className="mt-2 text-5xl font-black">Profile</h1>
          </div>

          <LogoutButton />
        </header>

        <section className="mt-7 rounded-[30px] bg-white p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black text-white">
              <UserRound size={38} />
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

          <button
            type="button"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-[20px] border border-black px-5 py-4 font-black"
          >
            <Camera size={20} />
            Add Profile Photo
          </button>
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
