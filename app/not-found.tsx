import Link from "next/link";

import { loadTranslations } from "@/lib/i18n";
import { getServerInterfaceLanguage } from "@/lib/preferences/serverPreferences";

/*
 * Any address the app does not have, in the reader's display language.
 *
 * Without this file Next.js showed its own English "404 | This page could
 * not be found." The root not-found handles every unmatched URL and renders
 * inside the root layout, which has already read the same cookie, so the
 * dictionary here is the one the layout loaded. Styled like app/error.tsx,
 * the other screen a reader lands on when something is not where they
 * expected.
 */
export default async function NotFound() {
  const language = await getServerInterfaceLanguage();
  const copy = (await loadTranslations(language)).notFound;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-surface px-5 py-8 text-black">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-8">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] leading-5 text-black">
          Exchange Notes
        </p>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-black">
          {copy.title}
        </h1>

        <p className="mt-5 leading-7 text-neutral-700">{copy.description}</p>

        <Link
          href="/"
          className="mt-7 block w-full rounded-2xl bg-black px-5 py-3.5 text-center text-base font-semibold text-white transition-opacity active:opacity-80"
        >
          {copy.home}
        </Link>
      </section>
    </main>
  );
}
