"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import AuthGuard from "@/app/components/auth/AuthGuard";
import { createClient } from "@/lib/supabase/client";

type ProfileForm = {
  display_name: string;
  exchange_id: string;
  native_language: string;
  learning_language: string;
};

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "traditional-chinese", label: "繁體中文" },
];

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    exchange_id: "",
    native_language: "english",
    learning_language: "traditional-chinese",
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

      if (!user) {
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select(
          "display_name, exchange_id, native_language, learning_language, email"
        )
        .eq("id", user.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          exchange_id: data.exchange_id ?? "",
          native_language: data.native_language ?? "english",
          learning_language:
            data.learning_language ?? "traditional-chinese",
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

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name.trim(),
          exchange_id: form.exchange_id.trim().toLowerCase(),
          native_language: form.native_language,
          learning_language: form.learning_language,
        })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Profile updated successfully!");
    } catch {
      setError("Could not update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-5 py-8 text-black">
        <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-black">
            English × 繁體中文
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-black">
            Edit Profile
          </h1>

          <p className="mt-3 leading-7 text-black">
            Update how you appear to your learning partner.
          </p>

          {loading ? (
            <p className="mt-8 rounded-2xl border border-neutral-300 bg-neutral-100 p-4 text-sm font-semibold text-black">
              Loading your profile...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-black">
                  Your name
                </span>

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
                  className="w-full rounded-2xl border border-neutral-500 bg-white px-4 py-4 text-base text-black placeholder:text-neutral-600 outline-none focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-black">
                  Exchange ID
                </span>

                <div className="flex items-center rounded-2xl border border-neutral-500 px-4">
                  <span className="mr-3 text-2xl font-bold text-black">
                    @
                  </span>

                  <input
                    required
                    value={form.exchange_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        exchange_id: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, ""),
                      }))
                    }
                    placeholder="yourname"
                    className="w-full bg-transparent py-4 text-base text-black placeholder:text-neutral-600 outline-none"
                  />
                </div>

                <p className="mt-2 text-sm text-neutral-600">
                  3–24 lowercase letters, numbers, or underscores.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-black">
                  Email
                </span>

                <input
                  disabled
                  value={email}
                  className="w-full cursor-not-allowed rounded-2xl border border-neutral-300 bg-neutral-100 px-4 py-4 text-base text-neutral-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-black">
                  Native language
                </span>

                <select
                  value={form.native_language}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      native_language: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-neutral-500 bg-white px-4 py-4 text-base text-black outline-none focus:border-black"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-black">
                  Learning language
                </span>

                <select
                  value={form.learning_language}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      learning_language: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-neutral-500 bg-white px-4 py-4 text-base text-black outline-none focus:border-black"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {error && (
                <p className="rounded-2xl border border-red-700 bg-red-50 p-4 text-sm font-bold text-red-900">
                  {error}
                </p>
              )}

              {message && (
                <p className="rounded-2xl border border-green-700 bg-green-50 p-4 text-sm font-bold text-green-900">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-black px-5 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <Link
                href="/"
                className="block w-full rounded-2xl border border-black bg-white px-5 py-4 text-center text-base font-bold text-black"
              >
                Back to Home
              </Link>
            </form>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
