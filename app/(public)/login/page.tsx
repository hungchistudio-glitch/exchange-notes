"use client";

import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import useTranslation from "@/hooks/i18n/useTranslation";

export default function LoginPage() {
  const { t } = useTranslation();
  const copy = t.auth.login;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-8 text-black">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-8">
        {/* Fixed bilingual brand mark — always shown in both scripts
            regardless of interface language, not app UI copy. */}
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-black">
          English × 繁體中文
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-black">
          {copy.title}
        </h1>

        <p className="mt-3 leading-7 text-neutral-700">
          {copy.googleSubtitle}
        </p>

        <div className="mt-8">
          <GoogleLoginButton />
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-neutral-500">
          {copy.consentNotice}
        </p>
      </section>
    </main>
  );
}