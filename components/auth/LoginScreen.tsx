"use client";

import Link from "next/link";
import { Fragment, useEffect } from "react";

import GoogleIdentityButton from "@/components/auth/GoogleIdentityButton";
import styles from "@/components/auth/LoginScreen.module.css";
import LoginYumi from "@/components/auth/LoginYumi";
import useTranslation from "@/hooks/i18n/useTranslation";
import { learningLanguageList } from "@/lib/languages";

type LoginScreenProps = {
  /** The last sign-in came back refused; see app/auth/google. */
  initialError?: boolean;
};

/** The sign-in card. app/(public)/login/page.tsx decides who sees it. */
export default function LoginScreen({ initialError = false }: LoginScreenProps) {
  const { t } = useTranslation();
  const copy = t.auth.login;

  /*
   * The flag has been read into the button's error line by now. Dropped from
   * the address so a reload, or the app reopening on this page, does not
   * report a failure from earlier.
   */
  useEffect(() => {
    if (initialError) window.history.replaceState(null, "", "/login");
  }, [initialError]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-8 text-black">
      <section
        className={`${styles.card} w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-8`}
      >
        {/*
          Yumi herself, where the flat mark was (2026-10-24): she is who the
          landing page introduces, and the sign-in card was the one place a
          new reader met the logo instead. The orbit takes --yumi-mark, as the
          logo did, so it turns light with the card in Cosmic Mode.
        */}
        <div className="text-[color:var(--yumi-mark)]">
          <LoginYumi />
        </div>

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
          <GoogleIdentityButton initialError={initialError} />
        </div>

        {/*
          Where a new reader agrees to the terms, so it names them and links
          them, and states the age the AI provider's terms require. It
          replaces a line that only said signing in with Google is secure.
        */}
        <p className="mt-6 text-center text-xs leading-5 text-ink-soft">
          {copy.legalNotice.split(/(\{terms\}|\{privacy\})/).map((part, index) =>
            part === "{terms}" ? (
              <Link key={index} href="/terms" className="underline underline-offset-2">
                {t.info.nav.terms}
              </Link>
            ) : part === "{privacy}" ? (
              <Link key={index} href="/privacy" className="underline underline-offset-2">
                {t.info.nav.privacy}
              </Link>
            ) : (
              <Fragment key={index}>{part}</Fragment>
            ),
          )}
        </p>
      </section>
    </main>
  );
}