"use client";

import Link from "next/link";

import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import useTranslation from "@/hooks/i18n/useTranslation";

export default function LoginPage() {
  const { t } = useTranslation();
  const copy = t.auth.login;

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

        <div className="mt-9">
          <GoogleLoginButton />
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-neutral-400">
          Your Google account is used securely to create or access
          your private Exchange Notes account.
        </p>

        <Link
          href="/language"
          className="mt-8 block text-center text-sm font-semibold text-neutral-500 underline-offset-4 transition hover:text-black hover:underline"
        >
          {copy.changeLanguage}
        </Link>
      </section>
    </main>
  );
}
