"use client";

import GoogleIdentityButton from "@/components/auth/GoogleIdentityButton";
import ExchangeNotesLogo from "@/components/brand/ExchangeNotesLogo";
import useTranslation from "@/hooks/i18n/useTranslation";
import { learningLanguageList } from "@/lib/languages";

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

        {/*
          The languages themselves, each in its own name, and deliberately
          not translated: this is the brand mark rather than UI copy, and a
          reader who arrives wanting Italian should see Italiano whatever the
          interface happens to be set to.

          Read from the language table. Written out by hand it said
          "English × 繁體中文" for as long as the app had five languages — on
          the one screen every new reader sees before anything else.
        */}
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] leading-5 text-black">
          {learningLanguageList()}
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