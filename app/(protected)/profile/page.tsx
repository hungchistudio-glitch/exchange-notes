"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import Card from "@/components/foundation/cards/Card";
import PrimaryButton from "@/components/foundation/buttons/PrimaryButton";
import Screen from "@/components/foundation/layout/Screen";
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
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isMounted) {
          return;
        }

        if (userError || !user) {
          setError(
            userError?.message ??
              "You must be logged in to view your profile."
          );
          setLoading(false);
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

        setForm({
          display_name: data?.display_name ?? "",
          exchange_id: data?.exchange_id ?? "",
          native_language: data?.native_language ?? "english",
          learning_language:
            data?.learning_language ?? "traditional-chinese",
        });

        setEmail(data?.email ?? user.email ?? "");
      } catch {
        if (isMounted) {
          setError("Could not load your profile. Please try again.");
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
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          userError?.message ??
            "You must be logged in to update your profile."
        );
        return;
      }

      const displayName = form.display_name.trim();
      const exchangeId = form.exchange_id.trim().toLowerCase();

      if (!displayName) {
        setError("Please enter your name.");
        return;
      }

      if (!/^[a-z0-9_]{3,24}$/.test(exchangeId)) {
        setError(
          "Exchange ID must contain 3–24 lowercase letters, numbers, or underscores."
        );
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          exchange_id: exchangeId,
          native_language: form.native_language,
          learning_language: form.learning_language,
        })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setForm((current) => ({
        ...current,
        display_name: displayName,
        exchange_id: exchangeId,
      }));

      setMessage("Profile updated successfully!");
    } catch {
      setError("Could not update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentClassName="flex items-center justify-center px-5 py-8">
      <Card className="w-full max-w-md p-7 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-black">
          English × 繁體中文
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-black">
          Edit Profile
        </h1>

        <p className="mt-3 leading-7 text-neutral-600">
          Update how you appear to your learning partner.
        </p>

        {loading ? (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-black/[0.06] bg-[#f5f3ed] p-4"
          >
            <p className="text-sm font-semibold text-neutral-700">
              Loading your profile...
            </p>
          </div>
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
                autoComplete="name"
                className="w-full rounded-2xl border border-black/[0.12] bg-white px-4 py-4 text-base text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-black"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-black">
                Exchange ID
              </span>

              <div className="flex items-center rounded-2xl border border-black/[0.12] bg-white px-4 transition-colors focus-within:border-black">
                <span className="mr-3 text-2xl font-bold text-black">@</span>

                <input
                  required
                  minLength={3}
                  maxLength={24}
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
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-transparent py-4 text-base text-black outline-none placeholder:text-neutral-400"
                />
              </div>

              <p className="mt-2 text-sm text-neutral-500">
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
                className="w-full cursor-not-allowed rounded-2xl border border-black/[0.06] bg-neutral-100 px-4 py-4 text-base text-neutral-500"
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
                className="w-full rounded-2xl border border-black/[0.12] bg-white px-4 py-4 text-base text-black outline-none transition-colors focus:border-black"
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
                className="w-full rounded-2xl border border-black/[0.12] bg-white px-4 py-4 text-base text-black outline-none transition-colors focus:border-black"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
              >
                {message}
              </p>
            )}

            <div className="space-y-3 pt-1">
              <PrimaryButton
                type="submit"
                disabled={saving}
                fullWidth
                className="min-h-14 text-base"
              >
                {saving ? "Saving..." : "Save Changes"}
              </PrimaryButton>

              <Link
                href="/"
                className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-black/[0.1] bg-white px-5 py-3 text-base font-semibold text-neutral-800 transition-all hover:bg-neutral-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
              >
                Back to Home
              </Link>
            </div>
          </form>
        )}
      </Card>
    </Screen>
  );
}