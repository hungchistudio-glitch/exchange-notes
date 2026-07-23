"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import useTranslation from "@/hooks/i18n/useTranslation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const copy = t.auth.login;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogIn(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.sessionStorage.setItem(
        "exchange-notes:show-login-splash",
        "1",
      );

      router.replace("/");
      router.refresh();
    } catch {
      setMessage(copy.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f1ea] px-5 py-8 text-black">
      <section className="w-full max-w-md rounded-[32px] border border-black/[0.06] bg-white p-7 shadow-sm sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-black text-xl font-bold text-white">
          E
        </div>

        <p className="mt-7 text-sm font-bold uppercase tracking-[0.2em] text-neutral-500">
          {copy.eyebrow}
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-black">
          {copy.title}
        </h1>

        <p className="mt-3 leading-7 text-neutral-600">
          {copy.subtitle}
        </p>

        <form
          onSubmit={handleLogIn}
          className="mt-8 space-y-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-black">
              {copy.email}
            </span>

            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder={copy.emailPlaceholder}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className="h-13 w-full rounded-2xl border border-black/[0.09] bg-[#faf9f6] px-4 text-[15px] text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/[0.04]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-black">
              {copy.password}
            </span>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder={copy.passwordPlaceholder}
              autoComplete="current-password"
              className="h-13 w-full rounded-2xl border border-black/[0.09] bg-[#faf9f6] px-4 text-[15px] text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/[0.04]"
            />
          </label>

          <Link
            href="/forgot-password"
            className="block text-right text-sm font-semibold text-black underline-offset-4 hover:underline"
          >
            {copy.forgotPassword}
          </Link>

          {message && (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-13 w-full items-center justify-center rounded-2xl bg-black px-5 text-base font-bold text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? copy.submitting
              : copy.submit}
          </button>

          <Link
            href="/signup"
            className="flex h-13 w-full items-center justify-center rounded-2xl border border-black bg-white px-5 text-center text-base font-bold text-black transition hover:bg-neutral-50 active:scale-[0.99]"
          >
            {copy.createAccount}
          </Link>

          <Link
            href="/language"
            className="block text-center text-sm font-semibold text-neutral-500 underline-offset-4 hover:text-black hover:underline"
          >
            {copy.changeLanguage}
          </Link>
        </form>
      </section>
    </main>
  );
}
