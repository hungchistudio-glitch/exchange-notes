"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { readLanguageCode, type LanguageCode } from "@/lib/languages";
import {
  reportNetworkFailure,
  reportNetworkSuccess,
} from "@/hooks/useOnline";
import {
  applyPending,
  forgetMirror,
  readMirror,
  readOutbox,
  writeMirror,
} from "@/lib/offline/vocabulary";
import { flushOutbox } from "@/lib/offline/sync";
import type { VocabularyItem } from "@/lib/types/app";
import { useVocabularyLanguageFill } from "@/hooks/useVocabularyLanguageFill";
import { fetchVocabulary, getCurrentUser } from "@/lib/vocabulary/repository";

type VocabularyContextType = {
  items: VocabularyItem[];
  setItems: Dispatch<SetStateAction<VocabularyItem[]>>;

  learningLanguage: LanguageCode | null;

  loading: boolean;
  error: string;
  setError: Dispatch<SetStateAction<string>>;

  /**
   * Whether the missing side of some words is being filled in right now.
   *
   * Exposed so a screen can say so quietly. A half-translated list with no
   * explanation looks broken; the same list with a word about it looks like
   * work in progress, which is what it is.
   */
  fillingLanguage: boolean;

  refresh(): Promise<void>;
  addItem(item: VocabularyItem): void;
  removeItem(id: string): void;
  updateItem(item: VocabularyItem): void;
};

const VocabularyContext = createContext<VocabularyContextType | null>(null);

type VocabularySnapshot = {
  items: VocabularyItem[];
  learningLanguage: LanguageCode | null;
};

/*
 * Deliberately touches no state. The mount effect has to await this and
 * assign the result itself: set-state-in-effect is a reachability check, so
 * an effect may not call anything that writes state anywhere in its body,
 * however deep past an await it happens.
 */
async function fetchVocabularySnapshot(): Promise<VocabularySnapshot> {
  const { user } = await getCurrentUser();

  if (!user) {
    return { items: [], learningLanguage: null };
  }

  const supabase = createClient();

  const [{ data: profile }, rows] = await Promise.all([
    supabase
      .from("profiles")
      .select("learning_language")
      .eq("id", user.id)
      .single(),
    fetchVocabulary(user.id),
  ]);

  reportNetworkSuccess();

  const items = rows as VocabularyItem[];

  /*
   * Mirrored as it arrives. The write is not awaited by the caller: a
   * reader who is looking at their words should not wait on a copy being
   * made of them, and if the copy fails the only cost is that the next
   * cold start with no signal is emptier than it could have been.
   */
  void writeMirror(items, user.id);

  return {
    items,
    learningLanguage: readLanguageCode(profile?.learning_language),
  };
}

/**
 * The words as the device knows them, without asking anyone.
 *
 * The mirror is what the server last said; the outbox is what it has not
 * been told yet. Together they are what the reader actually has, which is
 * what a screen should render — a word saved on a train belongs in the
 * list, in order, with no hint that it is waiting.
 */
async function readLocalSnapshot(): Promise<VocabularyItem[]> {
  /*
   * getSession, not getUser: this runs before anything is painted and
   * getUser is a round trip, which is the exact wait the local copy exists
   * to avoid. getSession reads the session the client already has on disk.
   *
   * It is not a security check — the mirror holds only what this device
   * was already shown — but it is what stops one reader's words appearing
   * on the way in for the next one.
   */
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;
  if (!userId) return [];

  const [mirror, pending] = await Promise.all([
    readMirror(userId),
    readOutbox(),
  ]);

  return applyPending(mirror, pending);
}

function loadErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Could not load your vocabulary.";
}

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [learningLanguage, setLearningLanguage] = useState<LanguageCode | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * Reached from event handlers and from the auth subscription below, never
   * from an effect body, so it is free to show the spinner eagerly. The mount
   * path in the effect repeats the apply step rather than calling this —
   * about eight lines of overlap, which is the cost of not suppressing the
   * rule here.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const snapshot = await fetchVocabularySnapshot();

      setItems(snapshot.items);
      setLearningLanguage(snapshot.learningLanguage);
    } catch (refreshError) {
      /*
       * A failed read is not an empty library any more.
       *
       * There is a copy on the device, and falling back to it is the
       * difference between an app that stops working in a tunnel and one
       * that carries on. The error is only surfaced when there is nothing
       * local either — which, after a first successful load, there never is.
       */
      reportNetworkFailure();

      const local = await readLocalSnapshot();

      if (local.length > 0) setItems(local);
      else setError(loadErrorMessage(refreshError));
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * The same read, without the spinner.
   *
   * For work the user did not ask for and is not waiting on — the language
   * fill re-reads after every batch so cards appear as they are translated,
   * and a library of three hundred words is seventeen batches. Through
   * `refresh` that is seventeen full-screen loading states in a row, which
   * reads as a list that cannot make up its mind. A failure is swallowed for
   * the same reason: nothing was asked for, so nothing should be reported
   * here — the caller knows its own request failed.
   */
  const refreshQuietly = useCallback(async () => {
    try {
      const snapshot = await fetchVocabularySnapshot();

      setItems(snapshot.items);
      setLearningLanguage(snapshot.learningLanguage);
    } catch {
      // See above.
    }
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadOnMount() {
      /*
       * The device's own copy first, always.
       *
       * It is on disk and needs no network, so it paints immediately —
       * which on a cold start with a slow connection is the difference
       * between a spinner and a library. The server's answer replaces it a
       * moment later; where they agree, nothing moves.
       */
      const local = await readLocalSnapshot();

      if (active && local.length > 0) {
        setItems(local);
        setLoading(false);
      }

      try {
        const snapshot = await fetchVocabularySnapshot();

        if (!active) return;

        setItems(snapshot.items);
        setLearningLanguage(snapshot.learningLanguage);
      } catch (loadError) {
        if (!active) return;

        reportNetworkFailure();

        // Only an error when there is nothing local either.
        if (local.length === 0) setError(loadErrorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOnMount();

    /*
     * Anything saved with no connection goes now.
     *
     * On mount rather than only on an "online" event, because the common
     * case is not a reader watching the app reconnect — it is a reader who
     * closed it in a tunnel and opened it again at the hotel.
     */
    void flushOutbox().then((result) => {
      if (active && result.sent > 0) void refresh();
    });

    function handleOnline() {
      void flushOutbox().then((result) => {
        if (active && result.sent > 0) void refresh();
      });
    }

    window.addEventListener("online", handleOnline);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void refresh();
        return;
      }

      if (event === "SIGNED_OUT") {
        setItems([]);
        setLearningLanguage(null);
        setError("");
        setLoading(false);

        // The device's copy goes with them. A phone that is handed on, or
        // simply shared, must not open on the last person's words.
        void forgetMirror();
      }
    });

    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      subscription.unsubscribe();
    };
  }, [refresh]);

  const addItem = useCallback((item: VocabularyItem) => {
    setItems((current) => {
      const alreadyExists = current.some((existing) => existing.id === item.id);

      if (alreadyExists) {
        return current.map((existing) =>
          existing.id === item.id ? item : existing,
        );
      }

      return [item, ...current];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback((item: VocabularyItem) => {
    setItems((current) =>
      current.map((existing) => (existing.id === item.id ? item : existing)),
    );
  }, []);

  /*
   * Mounted here rather than on a screen, because the words belong to the
   * account and not to whichever page happens to be open. Switching language
   * anywhere leaves the library in the wrong one, and this is what walks it
   * over without anyone having to ask.
   */
  const { filling: fillingLanguage } = useVocabularyLanguageFill({
    items,
    learningLanguage,
    loading,
    onFilled: refreshQuietly,
  });

  const value = useMemo<VocabularyContextType>(
    () => ({
      items,
      setItems,
      learningLanguage,
      fillingLanguage,
      loading,
      error,
      setError,
      refresh,
      addItem,
      removeItem,
      updateItem,
    }),
    [
      fillingLanguage,
      items,
      learningLanguage,
      loading,
      error,
      refresh,
      addItem,
      removeItem,
      updateItem,
    ],
  );

  return (
    <VocabularyContext.Provider value={value}>
      {children}
    </VocabularyContext.Provider>
  );
}

export function useVocabulary() {
  const context = useContext(VocabularyContext);

  if (!context) {
    throw new Error("useVocabulary must be used inside VocabularyProvider.");
  }

  return context;
}
