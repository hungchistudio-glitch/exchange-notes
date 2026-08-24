"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import LexiconSearchSheet from "@/components/lexicon/LexiconSearchSheet";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";

/* =========================================================
   Search, from anywhere

   Mounted once in the protected layout, so the dock's centre key opens the
   same sheet on the Vocabulary screen, in a conversation, on Discover. The
   alternative — a sheet per screen — is how an app ends up with a search
   that works in three places and is missing in the other five, and with
   three copies of the save button to keep in step.

   The provider owns only "is it open, and with what". Everything the sheet
   does with a query lives in the engine (hooks/lexicon/useLexiconSearch),
   which is what makes this file short and keeps it that way.
   ========================================================= */

type OpenOptions = {
  /** Pre-fills the field. */
  query?: string;
  /** Looks it up immediately rather than waiting for a submit. */
  autoSubmit?: boolean;
};

type LexiconSearchContextType = {
  open: boolean;
  openSearch: (options?: OpenOptions) => void;
  closeSearch: () => void;
};

const LexiconSearchContext = createContext<LexiconSearchContextType | null>(
  null,
);

/**
 * The query param a camera hand-off comes back on.
 *
 * The capture screen owns recognition and hands back text; the lexicon owns
 * understanding. Rather than teach capture how to render a lexicon result,
 * it navigates home with the word it read and this reopens the sheet on it.
 * One result model, one save pipeline, and the camera stays a camera.
 */
const QUERY_PARAM = "lexicon";

/**
 * Reads the hand-off param, and nothing else.
 *
 * Its own component behind its own Suspense boundary because
 * `useSearchParams` opts every route that renders it out of static
 * rendering — and this provider wraps the whole protected app. Isolating the
 * hook here means one empty div is the dynamic part, rather than every
 * screen in the product.
 */
function LexiconHandoff({
  open,
  onQuery,
}: {
  open: boolean;
  onQuery: (query: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const incoming = searchParams.get(QUERY_PARAM);

  /*
   * Opening and cleaning the URL are two effects, in that order, and the
   * order is the whole point.
   *
   * They used to be one: hand the word over, then immediately rewrite the
   * URL. On a warm navigation that worked. On a cold load it did not — the
   * rewrite landed close enough to hydration to take the just-set state with
   * it, so the param vanished and no sheet ever opened. A camera hand-off
   * that silently does nothing is worse than one that is slow.
   *
   * Split, the failure cannot happen: nothing touches the URL until the sheet
   * is actually open, so a lost state update leaves the param in place and
   * this effect simply runs again. It is self-healing rather than
   * correctly-ordered, which is the only kind of fix worth having against a
   * race nobody can see.
   */
  useEffect(() => {
    if (!incoming || open) return;

    onQuery(incoming);
  }, [incoming, onQuery, open]);

  /*
   * `replace` rather than `push`, so the back button does not walk the reader
   * into reopening a search they just closed — and so a reload does not
   * reopen it either.
   */
  useEffect(() => {
    if (!incoming || !open) return;

    const next = new URLSearchParams(searchParams);
    next.delete(QUERY_PARAM);

    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [incoming, open, pathname, router, searchParams]);

  return null;
}

export function LexiconSearchProvider({ children }: { children: ReactNode }) {
  const { isCosmic } = useInterfaceMode();

  const [state, setState] = useState<{
    open: boolean;
    query: string;
    autoSubmit: boolean;
    /** Changes on every open, so the sheet re-primes for a new query. */
    token: number;
  }>({ open: false, query: "", autoSubmit: false, token: 0 });

  const openSearch = useCallback((options?: OpenOptions) => {
    setState((current) => {
      const query = options?.query ?? "";
      const autoSubmit = options?.autoSubmit ?? false;

      /*
       * Idempotent, because the hand-off effect above may ask more than once
       * while it waits for the sheet to appear. Returning the same object
       * tells React there is nothing to do — without it, each retry would
       * bump the token and remount the sheet mid-lookup.
       */
      if (current.open && current.query === query && current.autoSubmit === autoSubmit) {
        return current;
      }

      return { open: true, query, autoSubmit, token: current.token + 1 };
    });
  }, []);

  const closeSearch = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  /** A word arriving from the camera. */
  const handleHandoff = useCallback(
    (query: string) => openSearch({ query, autoSubmit: true }),
    [openSearch],
  );

  const value = useMemo<LexiconSearchContextType>(
    () => ({ open: state.open, openSearch, closeSearch }),
    [closeSearch, openSearch, state.open],
  );

  return (
    <LexiconSearchContext.Provider value={value}>
      {children}

      <Suspense fallback={null}>
        <LexiconHandoff open={state.open} onQuery={handleHandoff} />
      </Suspense>

      <LexiconSearchSheet
        key={state.token}
        open={state.open}
        onClose={closeSearch}
        initialQuery={state.query}
        autoSubmit={state.autoSubmit}
        tone={isCosmic ? "cosmic" : "warm"}
      />
    </LexiconSearchContext.Provider>
  );
}

export function useLexiconSearchSheet(): LexiconSearchContextType {
  const context = useContext(LexiconSearchContext);

  if (!context) {
    throw new Error(
      "useLexiconSearchSheet must be used inside LexiconSearchProvider.",
    );
  }

  return context;
}
