"use client";

import { useEffect } from "react";

import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import { learningLanguageList } from "@/lib/languages";

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

   Its own copy rather than the dictionaries. useTranslation throws when the
   active dictionary has not loaded, and a boundary that can throw while
   rendering a thrown error escalates to global-error — which is the blank
   white page this exists to avoid. So the five languages are written out
   here and picked by the interface setting, which is a stored preference
   and cannot fail to load. It was fixed English-and-Chinese text, which a
   reader who had chosen Spanish, French or Italian could read neither of.
   ========================================================= */

const COPY: Record<
  InterfaceLanguage,
  { title: string; body: string; retry: string }
> = {
  english: {
    title: "Something went wrong",
    body: "This is usually temporary, and you are still signed in. Try again.",
    retry: "Try again",
  },
  "traditional-chinese": {
    title: "出了一點問題",
    body: "這通常是暫時的，你仍然是登入狀態。請再試一次。",
    retry: "再試一次",
  },
  spanish: {
    title: "Algo salió mal",
    body: "Suele ser temporal y tu sesión sigue iniciada. Vuelve a intentarlo.",
    retry: "Reintentar",
  },
  french: {
    title: "Un problème est survenu",
    body: "C’est généralement temporaire et votre session est toujours ouverte. Réessayez.",
    retry: "Réessayer",
  },
  italian: {
    title: "Qualcosa è andato storto",
    body: "Di solito è temporaneo e la tua sessione è ancora attiva. Riprova.",
    retry: "Riprova",
  },
};

export default function AppError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = COPY[useInterfaceLanguage()] ?? COPY.english;

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
        {/* The same brand mark as the sign-in card, from the same table. */}
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] leading-5 text-black">
          {learningLanguageList()}
        </p>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-black">
          {copy.title}
        </h1>

        {/*
          Says what to do, and says the thing a reader most needs to hear
          here: they have not been signed out. The whole point of throwing
          rather than redirecting to /login was to stop this looking like a
          sign-out, and the screen has to carry that or the change is invisible.
        */}
        <p className="mt-5 leading-7 text-neutral-700">{copy.body}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-7 w-full rounded-2xl bg-black px-5 py-3.5 text-base font-semibold text-white transition-opacity active:opacity-80"
        >
          {copy.retry}
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
