"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account created. Check your email to confirm it.");
    }

    setLoading(false);
  }

  async function handleLogIn() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
          English × 繁體中文
        </p>

        <h1 className="mt-3 text-4xl font-bold text-neutral-900">
          Exchange Notes
        </h1>

        <p className="mt-3 text-neutral-600">
          Log in to your private learning space.
        </p>

        <form onSubmit={handleSignUp} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold">
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3"
            />
          </div>

          {message && (
            <p className="rounded-xl bg-neutral-100 p-3 text-sm">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogIn}
            disabled={loading}
            className="w-full rounded-xl bg-neutral-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Please wait..." : "Log In"}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border border-neutral-300 px-5 py-3 font-semibold disabled:opacity-50"
          >
            Create Account
          </button>
        </form>
      </section>
    </main>
  );
}
