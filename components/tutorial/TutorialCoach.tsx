"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { InterfaceMode } from "@/lib/appPreferences";
import {
  returnHomeFromSearch,
  subscribeToHomeMoments,
  type HomeMoment,
} from "@/lib/home/homeMoments";
import {
  COACH_FINISHED,
  getCoachStep,
  getCoachTrack,
  getServerCoachStep,
  getServerCoachTrack,
  setCoachStep,
  subscribeToCoach,
} from "@/lib/home/tutorialCoach";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { subscribeToWordSaved } from "@/lib/pet/wordSaved";

import type { CoachTarget } from "./CoachPointer";
import styles from "./TutorialCoach.module.css";

/*
 * The arrow, fetched when a step first needs it. Home's tab loads this file,
 * and most readers finished the tour long ago, so the needle, its geometry
 * and its stylesheet stay out of home's static graph
 * (tests/routeImportWeight.test.ts).
 */
const CoachPointer = lazy(() => import("./CoachPointer"));

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

     1. Home            — Standard: open the dial and turn it, look up,
                          keep, see what a kept word earns, feed.
     2. Around the app  — Vocabulary, Review, the Pronunciation Lab,
                          Messages, Notes, Discover, Settings.
     3. Yumi's shop     — where cookies come from, the energy supply,
                          trying a piece on, and how buying works.
     4. The other look  — the reader switches to Cosmic themselves, with
                          the switch at the top of Home (the one they will
                          use from then on), and is shown what is different:
                          the six systems, OmniLexicon, Menu Translator,
                          the dock. Nothing both looks share is taught twice.

   and ends by asking which look to start in, and taking them there.

   Chapters rather than one count, because twenty-three steps in a row is a tour
   people skip at step four. "Chapter 2 · 3/5" is a short thing to finish;
   "9 of 15" is not.

   ── One word, two things ───────────────────────────────────────────────

   A saved word earns two different cookies, and the tour says so at the
   moment it happens (Chi, 2026-10-18: "一個字，兩種用途"). One is on Home,
   with the word's first letter on it, for feeding Yumi. The other is an
   energy cookie in the shop's wallet. Feeding her never spends the wallet,
   which is what the old copy left a reader to guess.

   ── What's new, for readers who had finished ───────────────────────────

   Steps marked `refresh` are the ones the current edition added
   (lib/home/tutorialCoach.ts). A reader who finished an earlier edition gets
   only those, labelled as new, and only in Standard: the refresh track keeps
   quiet in Cosmic rather than asking someone to change looks for it.

   ── What it leaves alone ───────────────────────────────────────────────

   Anything that is not one of the main screens a step names, and the mode-switch
   animation itself: a card over a message composer, or over the deck
   waking up, is in the way of the very thing it wants the reader to see.
   ========================================================= */

type Chapter = "home" | "pages" | "shop" | "cosmic";

type StepKey =
  | "meet"
  | "dial"
  | "ask"
  | "keep"
  | "earned"
  | "feed"
  | "library"
  | "review"
  | "pronunciation"
  | "share"
  | "notes"
  | "discover"
  | "settings"
  | "cookies"
  | "wallet"
  | "tryOn"
  | "buy"
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
  /** New in this edition: shown to readers who finished the last one. */
  refresh?: boolean;
  /**
   * What the LED arrow points at (CoachPointer), as selectors in order of
   * preference: the first with a visible element wins. Absent on steps that
   * only show.
   */
  point?: readonly CoachTarget[];
};

/*
 * The targets, by the attributes the screens already carry where they had
 * one, and `data-coach-target` where they did not.
 */
/* Where she stands, not what draws her: hidden once the WebGL scene is live. */
const YUMI = {
  selector: "[data-yumi-figure]",
  anchor: true,
  /* Beside her: below is her voice line, above is the card. */
  from: ["left", "right"],
} as const;
const POINT = {
  yumi: [YUMI],
  /* The key under the gold mark while the dial is out; her, to open it. */
  dial: ['[data-dial-item][data-selected="true"]', YUMI],
  /* The dial's Search key while it is out; the search field when it is not. */
  search: ['[data-dial-key="search"]', '[data-coach-target="search-field"]'],
  save: ['[data-coach-target="save-word"]'],
  /* The cookie Home is already nudging, else any cookie. */
  cookie: ['[data-floating-cookie][data-hint="feed"]', "[data-floating-cookie]"],
  shopKey: ["[data-home-shop-key]"],
  balance: ['[data-coach-target="shop-balance"]'],
  item: ['[data-coach-target="shop-item"]'],
  buy: ['[data-coach-target="shop-primary"]'],
  modeSwitch: ["[data-home-mode-portal]"],
  /* From above: below the field are its mode keys, which the arrow would hide. */
  omni: [{ selector: '[data-coach-target="cosmic-omni"]', from: ["above"] }],
  scanner: ['[data-cosmic-room="scanner"]'],
  dock: ["[data-app-bottom-navigation]"],
} as const;

const STANDARD: InterfaceMode = "standard";
const COSMIC: InterfaceMode = "yumi-cosmic";

export const COACH_STEPS: readonly Step[] = [
  {
    key: "meet",
    chapter: "home",
    route: "/home",
    mode: STANDARD,
    awaits: ["ring-opened"],
    point: POINT.yumi,
  },
  /*
   * The dial (Chi, 2026-10-16) turns, and only a tap goes in. A reader who
   * drags expecting the key under their finger to open is left wondering why
   * nothing did, so they turn it once while being told.
   */
  {
    key: "dial",
    chapter: "home",
    route: "/home",
    mode: STANDARD,
    awaits: ["dial-turned"],
    refresh: true,
    point: POINT.dial,
  },
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
    point: POINT.search,
  },
  {
    key: "keep",
    chapter: "home",
    route: "/home",
    mode: STANDARD,
    awaits: ["word-saved"],
    point: POINT.save,
  },
  /*
   * Said straight after the save, while the "+1" card is in the corner and
   * the new cookie is arriving on Home — the two things the word just earned.
   */
  { key: "earned", chapter: "home", route: "/home", mode: STANDARD, refresh: true },
  {
    key: "feed",
    chapter: "home",
    route: "/home",
    mode: STANDARD,
    awaits: ["word-fed"],
    point: POINT.cookie,
  },

  { key: "library", chapter: "pages", route: "/vocabulary", mode: STANDARD },
  { key: "review", chapter: "pages", route: "/review", mode: STANDARD },
  /* On the dial since it replaced the ring, and never once in the tour. */
  {
    key: "pronunciation",
    chapter: "pages",
    route: "/pronunciation",
    mode: STANDARD,
    refresh: true,
  },
  { key: "share", chapter: "pages", route: "/messages", mode: STANDARD },
  { key: "notes", chapter: "pages", route: "/notes", mode: STANDARD },
  { key: "discover", chapter: "pages", route: "/discover", mode: STANDARD },
  { key: "settings", chapter: "pages", route: "/profile", mode: STANDARD },

  /*
   * The shop, before the other look (Chi, 2026-10-12: "在最後的模式切換教學前
   * 教商店及如何賺取 cookie 及購買"). Where cookies come from is said on
   * Home, pointing at the shop key in the corner; then, in the shop, the
   * reader tries something on themselves, and is told how buying works
   * rather than made to spend.
   */
  {
    key: "cookies",
    chapter: "shop",
    route: "/home",
    mode: STANDARD,
    refresh: true,
    point: POINT.shopKey,
  },
  /* The balance in the shop's corner opens the wallet: how many, from where. */
  {
    key: "wallet",
    chapter: "shop",
    route: "/shop",
    mode: STANDARD,
    awaits: ["shop-wallet-opened"],
    refresh: true,
    point: POINT.balance,
  },
  {
    key: "tryOn",
    chapter: "shop",
    route: "/shop",
    mode: STANDARD,
    awaits: ["shop-tried"],
    point: POINT.item,
  },
  { key: "buy", chapter: "shop", route: "/shop", mode: STANDARD, point: POINT.buy },

  /*
   * The reader makes the switch, with the real control, and the step waits
   * for the mode to actually change. It is the one thing in chapter three
   * worth remembering: where the switch is, for the next time they want it.
   *
   * On Home, with the switch beside the star (Chi, 2026-10-09: "在首頁教").
   * It was Interface mode in Settings, written before Home had a switch —
   * so the switch every reader would actually use was never taught, and was
   * hidden for the whole tour besides. Settings still has the choice; the
   * last step says so.
   */
  { key: "modeSwitch", chapter: "cosmic", route: "/home", point: POINT.modeSwitch },
  { key: "deck", chapter: "cosmic", route: "/home", mode: COSMIC, autoGo: true },
  { key: "omni", chapter: "cosmic", route: "/home", mode: COSMIC, point: POINT.omni },
  { key: "scanner", chapter: "cosmic", route: "/home", mode: COSMIC, point: POINT.scanner },
  { key: "dock", chapter: "cosmic", route: "/home", mode: COSMIC, point: POINT.dock },
  { key: "choose", chapter: "cosmic" },
];

const CHAPTER_NUMBER: Record<Chapter, number> = { home: 1, pages: 2, shop: 3, cosmic: 4 };

/** What a reader who finished the last edition is shown, in tour order. */
export const REFRESH_STEPS: readonly Step[] = COACH_STEPS.filter((step) => step.refresh);

/** The screens the coach speaks on. Everything else, it steps aside. */
const MAIN_SCREENS = new Set(
  COACH_STEPS.map((step) => step.route).filter(Boolean) as string[],
);

/** Long enough to read one word, short enough not to be a wait. */
const DONE_BEAT_MS = 900;

/** After the keep step's "good", before the answer is put away. */
const FEED_CLEAR_MS = 1_200;

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
  const track = useSyncExternalStore(
    subscribeToCoach,
    getCoachTrack,
    getServerCoachTrack,
  );
  const refreshing = track === "refresh";
  const steps = refreshing ? REFRESH_STEPS : COACH_STEPS;

  const index = stored >= 0 && stored < steps.length ? stored : COACH_FINISHED;
  const current = index === COACH_FINISHED ? undefined : steps[index];

  const [satisfied, setSatisfied] = useState(false);

  /* The arrow keeps off this, and hides while it is hidden. */
  const cardRef = useRef<HTMLDivElement>(null);

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
    setCoachStep(next >= steps.length ? COACH_FINISHED : next);
  }, [index, steps]);

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

  /*
   * The feed step needs the cookies within reach.
   *
   * It follows the keep step, which is done on a search answer — and while
   * an answer is up the cookies are faded and cannot be touched. So the
   * answer is put away for the reader, after a beat long enough to see the
   * word they just kept go into the library (Chi, 2026-10-03) — the same
   * way home a tap on Yumi takes, card fading and her gliding back.
   */
  /*
   * From the step after the save, not only the feed step: the earned step
   * talks about the new cookie on Home, so Home should be showing it.
   */
  const feeding =
    (current?.key === "earned" || current?.key === "feed") &&
    pathname === "/home" &&
    !wrongMode;

  useEffect(() => {
    if (!feeding) return;
    const timer = window.setTimeout(returnHomeFromSearch, FEED_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [feeding]);

  if (!current) return null;

  /* A conversation, a note, a drill: not a place to stand a card. */
  if (!MAIN_SCREENS.has(pathname)) return null;

  /* The deck waking up, or standing down, is the thing to watch. */
  if (switching || autoRoute) return null;

  /* What's new waits for Standard rather than asking for a change of look. */
  if (refreshing && wrongMode) return null;

  const stepCopy = copy.steps[current.key];

  const chapterSteps = refreshing
    ? REFRESH_STEPS
    : COACH_STEPS.filter((step) => step.chapter === current.chapter);
  const position = chapterSteps.indexOf(current) + 1;

  const label = (refreshing ? copy.whatsNew : copy.label)
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
          href: current.route,
          label:
            "action" in stepCopy && current.route !== "/home"
              ? stepCopy.action
              : copy.backHome,
        }
      : null;

  /* Home keeps the strip at the top, above Yumi; everywhere else it sits
     above the dock, clear of each screen's own header and back button. The
     switch and cookie steps go to the foot of Home, because the top corner
     they would cover on a phone holds the switch and the shop key they point
     at. The shop keeps it at the top too: its own bar stands where the dock
     would. The earned step goes to the foot as well, so the "+1" card that
     lands in the top corner as it appears is not underneath it; so do the
     dial's two steps, which have to stay readable with the dial out. */
  const placement =
    pathname === "/shop"
      ? ""
      : pathname !== "/home"
        ? ` ${styles.docked}`
        : current.key === "dial" || current.key === "ask"
          ? ` ${styles.dialStep}`
          : current.key === "modeSwitch" ||
              current.key === "cookies" ||
              current.key === "earned"
            ? ` ${styles.switchStep}`
            : "";

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
  } else if ((awaiting && !keepBlocked) || current.key === "modeSwitch") {
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

  /*
   * The arrow, while there is something to press and the reader can press it
   * here: not during the "Good." beat, not on the wrong screen or look, and
   * not on a keep step with nothing to keep.
   */
  const pointAt =
    current.point && !done && onRoute && !wrongMode && !keepBlocked
      ? current.point
      : null;

  return (
    <>
      <aside
        className={`${styles.coach}${placement}`}
        /* Announced as a live region rather than as a dialog: it interrupts
           nothing, takes no focus, and the reader is meant to keep using the
           screen while it is up. */
        role="status"
        aria-live="polite"
      >
        {/*
          Marked for the home screen's two other layers: the cookies float
          around it rather than under it (data-yumi-protected), and Yumi's
          answer position keeps clear of its bottom edge (data-coach-card).
        */}
        <div
          ref={cardRef}
          className={styles.card}
          data-coach-card=""
          /* The home switch reads this: it stays hidden under every other
             step, and is the thing pointed at under this one — until it has
             been used, when the "Good." beat should not still be pointing. */
          data-coach-step={current.key}
          data-coach-done={done ? "" : undefined}
          data-yumi-protected=""
        >
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

      {/* Beside the card rather than in it: the card's stacking context would
          keep the arrow under anything a screen layers above it. */}
      {pointAt ? (
        <Suspense fallback={null}>
          <CoachPointer targets={pointAt} avoid={cardRef} />
        </Suspense>
      ) : null}
    </>
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

  /* On Home, a switch the tour makes is the same crossing the switch makes
     (Chi, 2026-10-09: "統一新過場"); elsewhere it is Settings' sequence. */
  const setMode = useCallback(
    (mode: InterfaceMode) =>
      setInterfaceMode(mode, pathname === "/home" ? { home: true } : undefined),
    [pathname, setInterfaceMode],
  );

  return (
    <TutorialCoach
      pathname={pathname}
      interfaceMode={interfaceMode}
      switching={modeTransition !== null}
      onSetMode={setMode}
      onNavigate={navigate}
    />
  );
}
