"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { subscribeToHomeMoments, type HomeMoment } from "@/lib/home/homeMoments";
import {
  COACH_FINISHED,
  getCoachStep,
  getServerCoachStep,
  setCoachStep,
  subscribeToCoach,
} from "@/lib/home/tutorialCoach";
import { subscribeToWordSaved } from "@/lib/pet/wordSaved";

import styles from "./TutorialCoach.module.css";

/* =========================================================
   The tour you do — across the whole app

   The old one was seven pages of description, and the page about navigation
   described a dock that no longer exists. Somebody read it, pressed Finish,
   and arrived on a screen they had still never touched.

   This one asks. Each step names one thing to do on the screen the reader is
   already looking at, and then waits for that thing to actually happen — the
   ring coming out, a lookup coming back, a word being kept, a cookie
   reaching her. Nothing advances because a button was pressed to make the
   words go away.

   ── Why it lives in the protected layout now ───────────────────────────

   It used to be mounted inside the Standard home screen only. The two steps
   that pointed elsewhere were links, and following one took the reader to a
   screen with no tour on it: the step count said 5 of 7, and then there was
   nothing, until they happened to go home again. And Cosmic Mode's home had
   no tour at all.

   So it is mounted once for every signed-in screen, and every step says
   which screen it belongs to. On that screen it asks for the thing; on any
   other main screen it offers a door there. The reader is walked through
   Home, Vocabulary, Messages, Notes, Discover and Settings in one line, in
   either interface mode.

   ── What it leaves alone ───────────────────────────────────────────────

   Anything that is not one of the six main screens: a conversation, a note,
   a pronunciation drill. Those have their own controls at the top and the
   bottom, and a tour card over a message composer is in the way of the very
   thing the tour is trying to get someone to use.
   ========================================================= */

type StepKey =
  | "meet"
  | "ask"
  | "keep"
  | "feed"
  | "library"
  | "share"
  | "notes"
  | "discover"
  | "settings"
  | "close";

type Step = {
  key: StepKey;
  /** The screen this step happens on. Absent: it can be said anywhere. */
  route?: string;
  /** The events that satisfy it. Absent on the steps that only show. */
  awaits?: ReadonlyArray<HomeMoment | "word-saved">;
  /**
   * The ring and the cookie tray are Standard Mode's home screen. Cosmic
   * Mode's deck has neither, so those two steps are simply not in its tour —
   * asking for a gesture the screen cannot receive is how a tour gets stuck.
   */
  standardOnly?: boolean;
};

export const COACH_STEPS: readonly Step[] = [
  { key: "meet", route: "/home", awaits: ["ring-opened"], standardOnly: true },
  /*
   * A lookup that came back empty still counts as having asked. Waiting here
   * for a real answer would hold the whole tour hostage to Gemini being up;
   * the next step is where it matters, and that step knows how to say so.
   */
  {
    key: "ask",
    route: "/home",
    awaits: ["word-answered", "word-unavailable"],
  },
  { key: "keep", route: "/home", awaits: ["word-saved"] },
  { key: "feed", route: "/home", awaits: ["word-fed"], standardOnly: true },
  { key: "library", route: "/vocabulary" },
  { key: "share", route: "/messages" },
  { key: "notes", route: "/notes" },
  { key: "discover", route: "/discover" },
  { key: "settings", route: "/profile" },
  { key: "close" },
];

/** The screens the coach speaks on. Everything else, it steps aside. */
const MAIN_SCREENS = new Set(
  COACH_STEPS.map((step) => step.route).filter(Boolean) as string[],
);

/** Long enough to read one word, short enough not to be a wait. */
const DONE_BEAT_MS = 900;

function stepApplies(step: Step, isCosmic: boolean) {
  return !(isCosmic && step.standardOnly);
}

/**
 * The first step at or after `from` that this interface mode has. A stored
 * index can point at a Standard-only step when the reader switched modes
 * mid-tour; the tour carries on from the next thing they can actually do.
 */
function resolveIndex(from: number, isCosmic: boolean) {
  for (let index = from; index < COACH_STEPS.length; index += 1) {
    if (stepApplies(COACH_STEPS[index], isCosmic)) return index;
  }
  return COACH_FINISHED;
}

export type TutorialCoachProps = {
  pathname: string;
  isCosmic: boolean;
};

export default function TutorialCoach({
  pathname,
  isCosmic,
}: TutorialCoachProps) {
  const { t } = useTranslation();
  const copy = t.tutorial.coach;

  const stored = useSyncExternalStore(
    subscribeToCoach,
    getCoachStep,
    getServerCoachStep,
  );

  const index = stored >= COACH_STEPS.length ? COACH_FINISHED : resolveIndex(stored, isCosmic);
  const current = index === COACH_FINISHED ? undefined : COACH_STEPS[index];

  const [satisfied, setSatisfied] = useState(false);

  /*
   * Whether the last lookup came back without a meaning.
   *
   * Listened for all the time rather than only while a step waits for it,
   * because the lookup that fails is usually the one that satisfied "ask" —
   * by the time "keep" is on screen, the event that says there is nothing to
   * keep has already happened.
   */
  const [lastLookupEmpty, setLastLookupEmpty] = useState(false);

  useEffect(() => {
    return subscribeToHomeMoments((moment) => {
      if (moment === "word-unavailable") setLastLookupEmpty(true);
      if (moment === "word-answered") setLastLookupEmpty(false);
    });
  }, []);

  const awaiting = current?.awaits;
  const onRoute = current?.route
    ? pathname === current.route
    : true;

  const advance = useCallback(() => {
    setSatisfied(false);
    const next = resolveIndex(index + 1, isCosmic);
    setCoachStep(next >= COACH_STEPS.length ? COACH_FINISHED : next);
  }, [index, isCosmic]);

  /*
   * Watching the screen rather than the reader's patience.
   *
   * Both stores are listened to at once because "the reader kept a word" is
   * announced by the vocabulary side and the rest by the home side, and
   * which module owns an event is not something this component should make
   * the reader care about.
   */
  useEffect(() => {
    if (!awaiting) return;

    let cancelled = false;

    const satisfy = () => {
      if (cancelled) return;
      setSatisfied(true);
    };

    const stopMoments = subscribeToHomeMoments((moment) => {
      if (awaiting.includes(moment)) satisfy();
    });

    const stopSaves = awaiting.includes("word-saved")
      ? subscribeToWordSaved(({ duplicate }) => {
          /* A word they already had is not a word they just kept, and
             telling them "good" for it would be the tour lying to make
             itself progress. */
          if (!duplicate) satisfy();
        })
      : () => {};

    return () => {
      cancelled = true;
      stopMoments();
      stopSaves();
    };
  }, [awaiting]);

  /* The beat between doing it and being asked for the next thing. */
  useEffect(() => {
    if (!satisfied) return;
    const timer = window.setTimeout(advance, DONE_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [advance, satisfied]);

  if (!current) return null;

  /* A conversation, a note, a drill: not a place to stand a card. */
  if (!MAIN_SCREENS.has(pathname)) return null;

  const stepCopy = copy.steps[current.key];
  const total = COACH_STEPS.filter((step) => stepApplies(step, isCosmic)).length;
  const position =
    COACH_STEPS.slice(0, index + 1).filter((step) => stepApplies(step, isCosmic))
      .length;
  const isLast = index === COACH_STEPS.length - 1;

  /*
   * The keep step, when there is nothing to keep.
   *
   * Save is disabled on a card without a meaning, so a step waiting for a
   * save would wait forever — which is exactly where a new reader in Taiwan
   * was left on 2026-09-25, looking at step 3 of 7 with no way forward but
   * Skip. Say what happened, and let them either try another word or move on.
   */
  const keepBlocked =
    current.key === "keep" && lastLookupEmpty && !satisfied && onRoute;

  const body = satisfied
    ? copy.done
    : keepBlocked
      ? copy.unavailable
      : stepCopy.body;

  const door = !onRoute && current.route
    ? {
        href: current.route,
        label:
          "action" in stepCopy && current.route !== "/home"
            ? stepCopy.action
            : copy.backHome,
      }
    : null;

  /* Home keeps the strip at the top, above Yumi; everywhere else it sits
     above the dock, clear of each screen's own header and back button. */
  const placement = pathname === "/home" ? "" : ` ${styles.docked}`;

  return (
    <aside
      className={`${styles.coach}${placement}`}
      /* Announced as a live region rather than as a dialog: it interrupts
         nothing, takes no focus, and the reader is meant to keep using the
         screen while it is up. */
      role="status"
      aria-live="polite"
    >
      <div className={styles.card}>
        <p className={styles.label}>
          {copy.label
            .replace("{current}", String(position))
            .replace("{total}", String(total))}
        </p>

        <p className={styles.body}>{body}</p>

        <div className={styles.keys}>
          {door ? (
            /* Following the door does not advance: the step is done on the
               screen it names, and arriving there is what shows it. */
            <Link href={door.href} className={styles.door}>
              {door.label}
            </Link>
          ) : awaiting && !keepBlocked ? (
            /*
             * A waiting step has no "next".
             *
             * Offering one would make every instruction optional, and an
             * instruction the reader can dismiss is a sentence rather than a
             * step. Skip is always there, because a tour nobody can leave is
             * a worse thing than a tour nobody finishes.
             */
            <span className={styles.waiting} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          ) : (
            <button type="button" className={styles.next} onClick={advance}>
              {isLast ? copy.finish : copy.next}
            </button>
          )}

          <button
            type="button"
            className={styles.skip}
            onClick={() => setCoachStep(COACH_FINISHED)}
          >
            {copy.skip}
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * The coach as the protected layout mounts it: told where the reader is and
 * which interface they are in, so the component itself stays a pure function
 * of those two things and its tests do not need a router or a provider.
 */
export function AppTutorialCoach() {
  const pathname = usePathname() ?? "";
  const { isCosmic } = useInterfaceMode();

  return <TutorialCoach pathname={pathname} isCosmic={isCosmic} />;
}
