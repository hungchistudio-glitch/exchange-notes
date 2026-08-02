"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      setSent(true);
    } catch {
      setMessage("Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-8 text-black">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-black">
          English × 繁體中文
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-black">
          Reset Password
        </h1>

        <p className="mt-3 leading-7 text-black">
          Enter your email and we&apos;ll send you a link to reset your
          password.
        </p>

        {sent ? (
          <div className="mt-8 rounded-2xl border border-neutral-300 bg-neutral-100 p-4 text-sm font-semibold text-black">
            Check your inbox for a password reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-black">
                Email
              </span>

              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
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
              disabled={loading}
              className="w-full rounded-2xl bg-black px-5 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <Link
              href="/login"
              className="block w-full rounded-2xl border border-black bg-white px-5 py-4 text-center text-base font-bold text-black"
            >
              Back to Log In
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
