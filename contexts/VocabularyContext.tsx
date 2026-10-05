"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { forgetDeviceCopies } from "@/lib/offline/forgetDevice";
import { flushOutbox } from "@/lib/offline/sync";
import type { VocabularyItem } from "@/lib/types/app";
import {
  useVocabularyLanguageFill,
  type FilledRow,
} from "@/hooks/useVocabularyLanguageFill";
import { applyLanguageFill } from "@/lib/vocabulary/applyLanguageFill";
import { fetchVocabulary, getCurrentUser } from "@/lib/vocabulary/repository";
import { subscribeToSavedWords } from "@/lib/vocabulary/savedWords";

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
  userId: string | null;
  serverItems: VocabularyItem[];
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
    return { userId: null, serverItems: [], items: [], learningLanguage: null };
  }

  const supabase = createClient();

  // Replay durable edits before reading the server, then overlay anything
  // still pending. A successful read must not undo offline work.
  await flushOutbox();
  const [{ data: profile }, rows] = await Promise.all([
    supabase
      .from("profiles")
      .select("learning_language")
      .eq("id", user.id)
      .single(),
    fetchVocabulary(user.id),
  ]);

  reportNetworkSuccess();

  const serverItems = rows as VocabularyItem[];
  const pending = await readOutbox();
  return {
    userId: user.id,
    serverItems,
    items: applyPending(serverItems, pending),
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
  const requestEpoch = useRef(0);
  const account = useRef<string | null>(null);

  // Background refresh keeps the current library visible while fetching.
  const refresh = useCallback(async () => {
    const epoch = ++requestEpoch.current;
    setError("");

    try {
      const snapshot = await fetchVocabularySnapshot();

      if (epoch !== requestEpoch.current) return;
      account.current = snapshot.userId;
      if (snapshot.userId) void writeMirror(snapshot.serverItems, snapshot.userId);
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
      if (epoch !== requestEpoch.current) return;
      if (refreshError instanceof TypeError) reportNetworkFailure();

      const local = await readLocalSnapshot();
      if (epoch !== requestEpoch.current) return;

      if (local.length > 0) setItems(local);
      else setError(loadErrorMessage(refreshError));
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }, []);

  // A device mirror cannot prove that a remote image is unreferenced.
  // Automatic storage deletion stays off; account refreshes only read data.

  useEffect(() => {
    let active = true;
    const epochRef = requestEpoch;
    const supabase = createClient();

    async function loadOnMount() {
      const epoch = ++requestEpoch.current;
      /*
       * The device's own copy first, always.
       *
       * It is on disk and needs no network, so it paints immediately —
       * which on a cold start with a slow connection is the difference
       * between a spinner and a library. The server's answer replaces it a
       * moment later; where they agree, nothing moves.
       */
      const local = await readLocalSnapshot();

      if (active && epoch === requestEpoch.current && local.length > 0) {
        setItems(local);
        setLoading(false);
      }

      try {
        const snapshot = await fetchVocabularySnapshot();

        if (!active || epoch !== requestEpoch.current) return;

        account.current = snapshot.userId;
        if (snapshot.userId) void writeMirror(snapshot.serverItems, snapshot.userId);
        setItems(snapshot.items);
        setLearningLanguage(snapshot.learningLanguage);
      } catch (loadError) {
        if (!active || epoch !== requestEpoch.current) return;

        if (loadError instanceof TypeError) reportNetworkFailure();

        // Only an error when there is nothing local either.
        if (local.length === 0) setError(loadErrorMessage(loadError));
      } finally {
        if (active && epoch === requestEpoch.current) setLoading(false);
      }
    }

    void loadOnMount();

    function handleOnline() {
      void flushOutbox().then((result) => {
        if (active && result.sent > 0) void refresh();
      });
    }

    window.addEventListener("online", handleOnline);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "SIGNED_IN" && session?.user.id !== account.current) {
        account.current = session?.user.id ?? null;
        ++requestEpoch.current;
        setItems([]);
        setLearningLanguage(null);
        setLoading(true);
        // Leave the auth callback before making another auth request.
        setTimeout(() => { if (active) void refresh(); }, 0);
        return;
      }

      if (event === "SIGNED_OUT") {
        ++requestEpoch.current;
        account.current = null;
        setItems([]);
        setLearningLanguage(null);
        setError("");
        setLoading(false);

        // The device's copy goes with them. A phone that is handed on, or
        // simply shared, must not open on the last person's words.
        void forgetMirror();

        /*
         * And everything else this device was holding for them: the
         * interaction history in localStorage, and the pages the service
         * worker cached while they were signed in. The mirror was the only
         * one of the three being cleared. See lib/offline/forgetDevice.
         *
         * Here as well as in the sign-out button, because a session can end
         * without anyone pressing anything — a revoked token, a sign-out on
         * another device — and this listener is the only thing that sees it.
         */
        void forgetDeviceCopies();
      }
    });

    return () => {
      active = false;
      ++epochRef.current;
      window.removeEventListener("online", handleOnline);
      subscription.unsubscribe();
    };
  }, [refresh]);

  const addItem = useCallback((item: VocabularyItem) => {
    ++requestEpoch.current;
    setLoading(false);
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
    ++requestEpoch.current;
    setLoading(false);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback((item: VocabularyItem) => {
    ++requestEpoch.current;
    setLoading(false);
    setItems((current) =>
      current.map((existing) => (existing.id === item.id ? item : existing)),
    );
  }, []);

  /*
   * Folds a finished translation batch into the list it belongs to.
   *
   * The alternative, and what this replaces, was re-reading everything after
   * every batch — see the comment on onFilled in useVocabularyLanguageFill.
   * Only the two filled columns are taken, so a row edited on this device
   * while the batch was in the air keeps the rest of its own state.
   */
  const patchTranslations = useCallback((updated: FilledRow[]) => {
    if (updated.length === 0) return;

    const byId = new Map(updated.map((row) => [row.id, row]));

    setItems((current) =>
      current.map((item) => {
        const patch = byId.get(item.id);
        if (!patch) return item;

        return applyLanguageFill(item, patch);
      }),
    );
  }, []);

  /*
   * A word saved anywhere in the app lands in this list immediately.
   *
   * The provider sits in the protected layout, so it stays mounted while the
   * reader walks from the camera back to their words — `items` is whatever
   * was loaded when the app started, and nothing on that walk replaced it.
   * Four of the five save surfaces never told it anything, so the word was in
   * the database and not on the screen until the app was opened again.
   *
   * Subscribing rather than asking each screen to remember: the announcement
   * comes from createVocabularyEntry, which every save already goes through.
   * See lib/vocabulary/savedWords.
   */
  useEffect(() => subscribeToSavedWords(addItem), [addItem]);

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
    onFilled: patchTranslations,
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
