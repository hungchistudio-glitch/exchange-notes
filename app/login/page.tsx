"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.sessionStorage.setItem("exchange-notes:show-login-splash", "1");

      router.replace("/");
      router.refresh();
    } catch {
      setMessage("Could not log in. Please try again.");
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
          Exchange Notes
        </h1>

        <p className="mt-3 leading-7 text-black">
          Log in to your private learning space.
        </p>

        <form onSubmit={handleLogIn} className="mt-8 space-y-5">
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

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-black">
              Password
            </span>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-neutral-500 bg-white px-4 py-4 text-base text-black placeholder:text-neutral-600 outline-none focus:border-black"
            />
          </label>
          <Link
            href="/forgot-password"
            className="block text-right text-sm font-semibold text-black underline"
          >
            Forgot password?
          </Link>
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
            {loading ? "Logging in..." : "Log In"}
          </button>

          <Link
            href="/signup"
            className="block w-full rounded-2xl border border-black bg-white px-5 py-4 text-center text-base font-bold text-black"
          >
            Create Account
          </Link>
        </form>
      </section>
    </main>
  );
}
