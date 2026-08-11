"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import {
  applyInterfaceMode,
  getInterfaceMode,
  setInterfaceMode as persistInterfaceMode,
  type InterfaceMode,
} from "@/lib/appPreferences";

/** Which half of the mode change is on screen, if either. */
export type ModeTransitionPhase = "entering-cosmic" | "leaving-cosmic";

type InterfaceModeContextType = {
  interfaceMode: InterfaceMode;
  isCosmic: boolean;
  setInterfaceMode: (mode: InterfaceMode) => void;
  modeTransition: ModeTransitionPhase | null;
};

/*
 * The two sequences, in milliseconds.
 *
 * Waking the deck is the app's one genuinely cinematic moment and gets the
 * top of the brief's range; standing it down is shorter, because a system
 * powering off has less to say than one coming online and nobody wants to
 * wait to leave.
 *
 * COMMIT is when the mode itself actually flips. It sits at the point where
 * the veil is at its densest, so the underlying app repaints from one shell
 * to the other while nothing of it is visible — that is what removes the
 * hard cut that a mode switch would otherwise be.
 */
const ENTER_COMMIT_MS = 280;
const ENTER_TOTAL_MS = 1150;
const LEAVE_COMMIT_MS = 460;
const LEAVE_TOTAL_MS = 800;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const InterfaceModeContext = createContext<InterfaceModeContextType | null>(
  null,
);

/**
 * App-wide source of truth for which interface shell the user is in —
 * the standard experience, or the Yumi Command Deck.
 *
 * Seeded server-side from app/(protected)/layout.tsx, which already reads the
 * profile row, so the correct shell is in the HTML that arrives rather than
 * being swapped in after hydration.
 *
 * The mode is only ever a choice about presentation. Nothing here touches
 * vocabulary, messages, progress or any other record — both shells read and
 * write the same rows, so switching cannot create, duplicate or lose data.
 */
export function InterfaceModeProvider({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode: InterfaceMode;
}) {
  const [interfaceMode, setMode] = useState<InterfaceMode>(initialMode);
  const [modeTransition, setModeTransition] =
    useState<ModeTransitionPhase | null>(null);

  // Every timer the running sequence owns, so an interruption can drop all of
  // them at once rather than letting a half-finished scene land later.
  const timersRef = useRef<number[]>([]);

  const clearSequence = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
  }, []);

  useEffect(() => clearSequence, [clearSequence]);

  /*
   * Deliberately not subscribed to the stored value.
   *
   * Settings is the only place the mode may change, and it changes it through
   * setInterfaceMode below — which owns the sequence, the commit and the
   * profile write as one operation. Listening to the store as well gave the
   * mode a second, uncoordinated way in: a write from anywhere would flip the
   * shell mid-navigation with no sequence around it, which is what made the
   * switch feel arbitrary rather than deliberate.
   *
   * A change made elsewhere (another tab) is picked up on the next load,
   * where the server decides the shell before anything renders.
   */

  const commitMode = useCallback((mode: InterfaceMode) => {
    // Local first, so the shell changes on the tap rather than on the round
    // trip. The profile write below is what carries the choice to the user's
    // other devices; if it fails, this device is still correct and the next
    // successful write reconciles the rest.
    persistInterfaceMode(mode);
    setMode(mode);

    void (async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ interface_mode: mode })
        .eq("id", user.id);

      if (error) {
        console.error("Unable to save interface mode:", error);
      }
    })();
  }, []);

  const setInterfaceMode = useCallback(
    (mode: InterfaceMode) => {
      /*
       * Any second call cancels whatever was playing.
       *
       * This is the whole interruption story, and it is deliberately one
       * rule rather than a state machine: whatever the screen was in the
       * middle of, the newest instruction wins and lands immediately. Tapping
       * the other option halfway through the deck waking up puts you straight
       * back in Standard Mode — no waiting for a scene to finish, and no way
       * to end up with the overlay showing and no sequence behind it.
       */
      const wasRunning = timersRef.current.length > 0;
      clearSequence();

      if (mode === interfaceMode) {
        setModeTransition(null);
        return;
      }

      if (wasRunning || prefersReducedMotion()) {
        setModeTransition(null);
        commitMode(mode);
        return;
      }

      const entering = mode === "yumi-cosmic";
      setModeTransition(entering ? "entering-cosmic" : "leaving-cosmic");

      timersRef.current = [
        window.setTimeout(
          () => commitMode(mode),
          entering ? ENTER_COMMIT_MS : LEAVE_COMMIT_MS,
        ),
        window.setTimeout(() => {
          timersRef.current = [];
          setModeTransition(null);
        }, entering ? ENTER_TOTAL_MS : LEAVE_TOTAL_MS),
      ];
    },
    [clearSequence, commitMode, interfaceMode],
  );

  const reconciledRef = useRef(false);

  /*
   * Two jobs, and the order matters.
   *
   * Once, on mount: the server stamped <html data-interface-mode> from the
   * cookie, but where the profile disagreed the layout handed us the
   * account's answer instead. Writing that answer back means the next load on
   * this device is decided before any React runs at all.
   *
   * Every time after that: mirror the mode onto the attribute and nothing
   * else. Reconciling on each change would make this effect overwrite the
   * cookie whenever it did not already match React's state — including when
   * the value came from outside, which is exactly the case reconciling is
   * supposed to serve rather than fight.
   */
  useEffect(() => {
    if (!reconciledRef.current) {
      reconciledRef.current = true;

      if (getInterfaceMode() !== interfaceMode) {
        persistInterfaceMode(interfaceMode);
        return;
      }
    }

    applyInterfaceMode(interfaceMode);
  }, [interfaceMode]);

  const value = useMemo<InterfaceModeContextType>(
    () => ({
      interfaceMode,
      isCosmic: interfaceMode === "yumi-cosmic",
      setInterfaceMode,
      modeTransition,
    }),
    [interfaceMode, modeTransition, setInterfaceMode],
  );

  return (
    <InterfaceModeContext.Provider value={value}>
      {children}
    </InterfaceModeContext.Provider>
  );
}

export function useInterfaceMode() {
  const context = useContext(InterfaceModeContext);

  if (!context) {
    throw new Error(
      "useInterfaceMode must be used inside InterfaceModeProvider.",
    );
  }

  return context;
}
