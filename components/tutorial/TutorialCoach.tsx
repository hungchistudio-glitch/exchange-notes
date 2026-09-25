"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { focusSetting } from "@/components/settings/SettingsAnchor";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { InterfaceMode } from "@/lib/appPreferences";
import { subscribeToHomeMoments, type HomeMoment } from "@/lib/home/homeMoments";
import {
  COACH_FINISHED,
  getCoachStep,
  getServerCoachStep,
  setCoachStep,
  subscribeToCoach,
} from "@/lib/home/tutorialCoach";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { subscribeToWordSaved } from "@/lib/pet/wordSaved";

import styles from "./TutorialCoach.module.css";

/* =========================================================
   The tour you do — in three chapters, across both looks

   The old one was seven pages of description, and the page about navigation
   described a dock that no longer exists. This one asks: each step names one
   thing to do on the screen the reader is already looking at, and waits for
   that thing to actually happen.

   ── Why chapters ────────────────────────────────────────────────────────

   Exchange Notes has two looks, Standard and Cosmic, over the same library.
   The tour used to run in whichever the reader happened to be in, which
   meant a Cosmic reader was taught Standard's ring and cookies by a card
   the deck could not even display legibly, and nobody was ever shown that
   the other look existed.

   So there is one tour, in one order, and it teaches both:

     1. Home            — Standard: pull her eye, look up, keep, feed.
     2. Around the app  — Vocabulary, Messages, Notes, Discover, Settings.
     3. The other look  — the reader switches to Cosmic themselves, in
                          Settings, and is shown what is different there:
                          the six systems, OmniLexicon, Menu Translator,
                          the dock. Nothing both looks share is taught twice.

   and ends by asking which look to start in, and taking them there.

   Chapters rather than one count, because fifteen steps in a row is a tour
   people skip at step four. "Chapter 2 · 3/5" is a short thing to finish;
   "9 of 15" is not.

   ── What it leaves alone ───────────────────────────────────────────────

   Anything that is not one of the six main screens, and the mode-switch
   animation itself: a card over a message composer, or over the deck
   waking up, is in the way of the very thing it wants the reader to see.
   ========================================================= */

type Chapter = "home" | "pages" | "cosmic";

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
  | "modeSwitch"
  | "deck"
  | "omni"
  | "scanner"
  | "dock"
  | "choose";

type Step = {
  key: StepKey;
  chapter: Chapter;
  /** The screen this step happens on. Absent: it can be said anywhere. */
  route?: string;
  /** The look this step is about. The reader is offered the switch if not. */
  mode?: InterfaceMode;
  /** The events that satisfy it. Absent on the steps that only show. */
  awaits?: ReadonlyArray<HomeMoment | "word-saved">;
  /** Take the reader to `route` without asking — used right after a switch. */
  autoGo?: boolean;
};

const STANDARD: InterfaceMode = "standard";
const COSMIC: InterfaceMode = "yumi-cosmic";

export const COACH_STEPS: readonly Step[] = [
  { key: "meet", chapter: "home", route: "/home", mode: STANDARD, awaits: ["ring-opened"] },
  /*
   * A lookup that came back empty still counts as having asked. Waiting here
   * for a real answer would hold the whole tour hostage to Gemini being up;
   * the next step is where it matters, and that step knows how to say so.
   */
  {
    key: "ask",
    chapter: "home",
    route: "/home",
    mode: STANDARD,
    awaits: ["word-answered", "word-unavailable"],
  },
  { key: "keep", chapter: "home", route: "/home", mode: STANDARD, awaits: ["word-saved"] },
  { key: "feed", chapter: "home", route: "/home", mode: STANDARD, awaits: ["word-fed"] },

  { key: "library", chapter: "pages", route: "/vocabulary", mode: STANDARD },
  { key: "share", chapter: "pages", route: "/messages", mode: STANDARD },
  { key: "notes", chapter: "pages", route: "/notes", mode: STANDARD },
  { key: "discover", chapter: "pages", route: "/discover", mode: STANDARD },
  { key: "settings", chapter: "pages", route: "/profile", mode: STANDARD },

  /*
   * The reader makes the switch, with the real control, and the step waits
   * for the mode to actually change. It is the one thing in chapter three
   * worth remembering: where the switch is, for the next time they want it.
   */
  { key: "modeSwitch", chapter: "cosmic", route: "/profile" },
  { key: "deck", chapter: "cosmic", route: "/home", mode: COSMIC, autoGo: true },
  { key: "omni", chapter: "cosmic", route: "/home", mode: COSMIC },
  { key: "scanner", chapter: "cosmic", route: "/home", mode: COSMIC },
  { key: "dock", chapter: "cosmic", route: "/home", mode: COSMIC },
  { key: "choose", chapter: "cosmic" },
];

const CHAPTER_NUMBER: Record<Chapter, number> = { home: 1, pages: 2, cosmic: 3 };

/** The screens the coach speaks on. Everything else, it steps aside. */
const MAIN_SCREENS = new Set(
  COACH_STEPS.map((step) => step.route).filter(Boolean) as string[],
);

/** Long enough to read one word, short enough not to be a wait. */
const DONE_BEAT_MS = 900;

/**
 * Every name the chapter-three copy may use, from the app's own dictionary,
 * so the tour calls a thing exactly what the screen in front of the reader
 * calls it — including after someone renames a room.
 */
function fill(text: string, t: TranslationDictionary) {
  const names: Record<string, string> = {
    standard: t.settings.interfaceMode.standardTitle,
    cosmic: t.settings.interfaceMode.cosmicTitle,
    omni: t.cosmic.omni.label,
    lexicon: t.cosmic.rooms.lexicon.name,
    mission: t.cosmic.rooms.mission.name,
    scanner: t.cosmic.rooms.scanner.name,
    comms: t.cosmic.rooms.comms.name,
    earth: t.cosmic.rooms.earth.name,
    memory: t.cosmic.rooms.memory.name,
  };

  return text.replace(/\{(\w+)\}/g, (match, key: string) => names[key] ?? match);
}

export type TutorialCoachProps = {
  pathname: string;
  interfaceMode: InterfaceMode;
  /** The switch animation is running; the card waits it out. */
  switching?: boolean;
  onSetMode: (mode: InterfaceMode) => void;
  onNavigate: (href: string) => void;
};

export default function TutorialCoach({
  pathname,
  interfaceMode,
  switching = false,
  onSetMode,
  onNavigate,
}: TutorialCoachProps) {
  const { t } = useTranslation();
  const copy = t.tutorial.coach;

  const stored = useSyncExternalStore(
    subscribeToCoach,
    getCoachStep,
    getServerCoachStep,
  );

  const index = stored >= 0 && stored < COACH_STEPS.length ? stored : COACH_FINISHED;
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
  const onRoute = current?.route ? pathname === current.route : true;
  const wrongMode = Boolean(current?.mode && current.mode !== interfaceMode);

  const advance = useCallback(() => {
    setSatisfied(false);
    const next = index + 1;
    setCoachStep(next >= COACH_STEPS.length ? COACH_FINISHED : next);
  }, [index]);

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

  /*
   * The switch step is satisfied by the switch — once the deck has finished
   * waking, not the moment the control is pressed, so the "good" is not said
   * over the top of the animation.
   */
  const switched =
    current?.key === "modeSwitch" && interfaceMode === COSMIC && !switching;

  /* Derived rather than stored: the switch is a fact about the props. */
  const done = satisfied || switched;

  /* The beat between doing it and being asked for the next thing. */
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(advance, DONE_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [advance, done]);

  /*
   * Straight to the deck after the switch. The reader has just done the one
   * thing they were asked; making them find Home as well would be a second
   * errand nobody explained.
   */
  const autoRoute =
    current?.autoGo && current.route && !onRoute && !wrongMode && !switching
      ? current.route
      : null;

  useEffect(() => {
    if (autoRoute) onNavigate(autoRoute);
  }, [autoRoute, onNavigate]);

  if (!current) return null;

  /* A conversation, a note, a drill: not a place to stand a card. */
  if (!MAIN_SCREENS.has(pathname)) return null;

  /* The deck waking up, or standing down, is the thing to watch. */
  if (switching || autoRoute) return null;

  const stepCopy = copy.steps[current.key];

  const chapterSteps = COACH_STEPS.filter(
    (step) => step.chapter === current.chapter,
  );
  const position = chapterSteps.indexOf(current) + 1;

  const label = copy.label
    .replace("{chapter}", String(CHAPTER_NUMBER[current.chapter]))
    .replace("{name}", copy.chapters[current.chapter])
    .replace("{current}", String(position))
    .replace("{total}", String(chapterSteps.length));

  /*
   * The keep step, when there is nothing to keep.
   *
   * Save is disabled on a card without a meaning, so a step waiting for a
   * save would wait forever — which is exactly where a new reader in Taiwan
   * was left on 2026-09-25, looking at step 3 of 7 with no way forward but
   * Skip. Say what happened, and let them either try another word or move on.
   */
  const keepBlocked =
    current.key === "keep" && lastLookupEmpty && !done && onRoute && !wrongMode;

  const body = done
    ? copy.done
    : wrongMode
      ? current.mode === COSMIC
        ? copy.needsCosmic
        : copy.needsStandard
      : keepBlocked
        ? copy.unavailable
        : stepCopy.body;

  const door =
    !wrongMode && !onRoute && current.route
      ? {
          href:
            current.key === "modeSwitch"
              ? "/profile#setting-interface-mode"
              : current.route,
          label:
            "action" in stepCopy && current.route !== "/home"
              ? stepCopy.action
              : copy.backHome,
        }
      : null;

  /* Home keeps the strip at the top, above Yumi; everywhere else it sits
     above the dock, clear of each screen's own header and back button. */
  const placement = pathname === "/home" ? "" : ` ${styles.docked}`;

  const finish = (mode: InterfaceMode) => {
    setCoachStep(COACH_FINISHED);
    onSetMode(mode);
    if (pathname !== "/home") onNavigate("/home");
  };

  let keys;

  if (done) {
    keys = null;
  } else if (wrongMode && current.mode) {
    const mode = current.mode;
    keys = (
      <button type="button" className={styles.next} onClick={() => onSetMode(mode)}>
        {fill(mode === COSMIC ? copy.toCosmic : copy.toStandard, t)}
      </button>
    );
  } else if (door) {
    /* Following the door does not advance: the step is done on the screen
       it names, and arriving there is what shows it. */
    keys = (
      <Link href={door.href} className={styles.door}>
        {door.label}
      </Link>
    );
  } else if (current.key === "modeSwitch") {
    keys = (
      <button
        type="button"
        className={styles.next}
        onClick={() => focusSetting("setting-interface-mode")}
      >
        {"action" in stepCopy ? stepCopy.action : ""}
      </button>
    );
  } else if (current.key === "choose") {
    keys = (
      <>
        <button type="button" className={styles.next} onClick={() => finish(STANDARD)}>
          {fill(copy.useStandard, t)}
        </button>
        <button type="button" className={styles.next} onClick={() => finish(COSMIC)}>
          {fill(copy.useCosmic, t)}
        </button>
      </>
    );
  } else if (awaiting && !keepBlocked) {
    /*
     * A waiting step has no "next".
     *
     * Offering one would make every instruction optional, and an instruction
     * the reader can dismiss is a sentence rather than a step. Skip is always
     * there, because a tour nobody can leave is a worse thing than a tour
     * nobody finishes.
     */
    keys = (
      <span className={styles.waiting} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    );
  } else {
    keys = (
      <button type="button" className={styles.next} onClick={advance}>
        {copy.next}
      </button>
    );
  }

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
        <p className={styles.label}>{label}</p>

        <p className={styles.body}>{fill(body, t)}</p>

        <div className={styles.keys}>
          {keys}

          {current.key === "choose" ? null : (
            <button
              type="button"
              className={styles.skip}
              onClick={() => setCoachStep(COACH_FINISHED)}
            >
              {copy.skip}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

/**
 * The coach as the protected layout mounts it: told where the reader is,
 * which look they are in, and given the two things it may do about either —
 * so the component itself stays a pure function of its props and its tests
 * need neither a router nor a provider.
 */
export function AppTutorialCoach() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { interfaceMode, setInterfaceMode, modeTransition } = useInterfaceMode();

  const navigate = useCallback((href: string) => router.push(href), [router]);

  return (
    <TutorialCoach
      pathname={pathname}
      interfaceMode={interfaceMode}
      switching={modeTransition !== null}
      onSetMode={setInterfaceMode}
      onNavigate={navigate}
    />
  );
}
