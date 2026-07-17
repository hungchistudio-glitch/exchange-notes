"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleUpdatePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/login");
    } catch {
      setMessage("Could not update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-5 py-8 text-black">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-black">
          English × 繁體中文
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-black">
          Set New Password
        </h1>

        <p className="mt-3 leading-7 text-black">
          Enter a new password for your account.
        </p>

        {!ready && (
          <p className="mt-6 rounded-2xl border border-neutral-400 bg-neutral-50 p-4 text-sm font-bold text-black">
            Verifying your reset link...
          </p>
        )}

        <form
          onSubmit={handleUpdatePassword}
          className="mt-8 space-y-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-black">
              New password
            </span>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-neutral-500 bg-white px-4 py-4 text-base text-black placeholder:text-neutral-600 outline-none focus:border-black"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-black">
              Confirm new password
            </span>

            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Re-enter new password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-neutral-500 bg-white px-4 py-4 text-base text-black placeholder:text-neutral-600 outline-none focus:border-black"
            />
          </label>

          {message && (
            <p className="rounded-2xl border border-red-700 bg-red-50 p-4 text-sm font-bold text-red-900">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full rounded-2xl bg-black px-5 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

          <Link
            href="/login"
            className="block w-full rounded-2xl border border-black bg-white px-5 py-4 text-center text-base font-bold text-black"
          >
            Back to Log In
          </Link>
        </form>
      </section>
    </main>
  );
}
