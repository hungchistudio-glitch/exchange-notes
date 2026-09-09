"use client";

import { useEffect } from "react";

/* =========================================================
   The screen a failed render lands on

   Added for a specific reason. Four routes used to read a failed
   `getUser()` as "not signed in" and send the reader to /login; they throw
   now instead, because a session that could not be checked is not a session
   that ended. Throwing is only the better answer if something catches it —
   otherwise a blip trades a wrong sign-out screen for a raw server error,
   which is not an improvement.

   So this is the other half of that change. The session is untouched by any
   of it, which is what makes "try again" an honest offer: the reload usually
   just works, and it works without going near the OAuth flow.

   `error.js` wraps nested layouts but not the one beside it, so this file at
   the app root is what covers app/(protected)/layout.tsx — where the check
   that matters happens. See node_modules/next/dist/docs/01-app/
   03-api-reference/03-file-conventions/error.md.

   Fixed bilingual copy rather than the dictionaries. useTranslation throws
   when the active dictionary has not loaded, and a boundary that can throw
   while rendering a thrown error escalates to global-error — which is the
   blank white page this exists to avoid. The login screen already sets the
   precedent for fixed bilingual text.
   ========================================================= */

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /*
     * The digest is what ties this screen to a line in the server logs. The
     * message is deliberately not shown to the reader — it names
     * infrastructure — but it belongs in the console of whoever is looking.
     */
    console.error("A page failed to render:", error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-surface px-5 py-8 text-black">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-black">
          English × 繁體中文
        </p>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-black">
          Something went wrong
        </h1>
        <p className="mt-1 text-2xl font-bold tracking-tight text-black">
          出了一點問題
        </p>

        {/*
          Says what to do, and says the thing a reader most needs to hear
          here: they have not been signed out. The whole point of throwing
          rather than redirecting to /login was to stop this looking like a
          sign-out, and the screen has to carry that or the change is invisible.
        */}
        <p className="mt-5 leading-7 text-neutral-700">
          This is usually temporary, and you are still signed in. Try again.
        </p>
        <p className="mt-2 leading-7 text-neutral-700">
          這通常是暫時的，你仍然是登入狀態。請再試一次。
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-7 w-full rounded-2xl bg-black px-5 py-3.5 text-base font-semibold text-white transition-opacity active:opacity-80"
        >
          Try again · 再試一次
        </button>

        {error.digest && (
          <p className="mt-6 text-center text-xs leading-5 text-ink-soft">
            {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
