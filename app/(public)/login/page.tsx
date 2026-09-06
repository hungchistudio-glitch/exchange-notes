"use client";

import GoogleIdentityButton from "@/components/auth/GoogleIdentityButton";
import ExchangeNotesLogo from "@/components/brand/ExchangeNotesLogo";
import useTranslation from "@/hooks/i18n/useTranslation";

export default function LoginPage() {
  const { t } = useTranslation();
  const copy = t.auth.login;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-8 text-black">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-8">
        {/*
          The one screen in the app that carries the identity rather than the
          character: there is no Yumi here yet to introduce herself, so the
          mark does it. It takes --yumi-mark rather than the page's text
          colour, which is what carries it across into Cosmic Mode — the card
          turns deep navy there and the mark turns white with it.
        */}
        <ExchangeNotesLogo className="mb-6 h-11 w-11 text-[color:var(--yumi-mark)]" />

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
          <GoogleIdentityButton />
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-ink-soft">
          {copy.consentNotice}
        </p>
      </section>
    </main>
  );
}