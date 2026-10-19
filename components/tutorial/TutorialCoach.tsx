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
import { useLexiconSearchSheet } from "@/contexts/LexiconSearchContext";
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

import type { CoachTarget } from "./CoachLight";
import styles from "./TutorialCoach.module.css";

/*
 * The glow round the key, fetched when a step first needs it. Home's tab
 * loads this file, and most readers finished the tour long ago, so the light
 * and its stylesheet stay out of home's static graph
 * (tests/routeImportWeight.test.ts).
 */
const CoachLight = lazy(() => import("./CoachLight"));

/* =========================================================
   The tour you do — in four chapters, across both looks

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
                          keep (and hear what a kept word earns), feed.
     2. Around the app  — Vocabulary, Review, the Pronunciation Lab,
                          Messages, Notes, Discover, Settings.
     3. Yumi's shop     — where cookies come from, and trying a piece on,
                          with how buying works said in the same breath.
     4. The other look  — the reader switches to Cosmic themselves, with
                          the switch at the top of Home (the one they will
                          use from then on), and is shown in one card what
                          is different. Nothing both looks share is taught
                          twice.

   and ends by asking which look to start in, and taking them there.

   Chapters rather than one count, because sixteen steps in a row is a tour
   people skip at step four. "Chapter 2 · 3/7" is a short thing to finish;
   "7 of 16" is not.

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

   ── The search sheet ───────────────────────────────────────────────────

   The dial's Search key opens the search as a sheet, which takes the whole
   screen and stands above the card. So the two steps done in it, look up
   and save, light their keys in the sheet from over it instead: the field,
   then Save, with a short tag beside the light saying what the card would
   (Chi, 2026-10-18: "這裡教學應該要亮 save to vocabulary 燈"). A word saved
   there closes the sheet after the "Good." beat, so feeding follows on
   Home. A reader who closes it without saving finds Home's search lit.

   ── What it leaves alone ───────────────────────────────────────────────

   Anything that is not one of the main screens a step names, and the mode-switch
   animation itself: a card over a message composer, or over the deck
   waking up, is in the way of the very thing it wants the reader to see.
   ========================================================= */

type Chapter = "home" | "pages" | "shop" | "cosmic";

type StepKey =
  | "meet"
  | "ask"
  | "keep"
  | "feed"
  | "library"
  | "review"
  | "pronunciation"
  | "share"
  | "notes"
  | "discover"
  | "settings"
  | "cookies"
  | "tryOn"
  | "modeSwitch"
  | "deck"
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
   * The key the LED glow rings (CoachLight), as selectors in
   * order of preference: the first with a visible element wins. Absent on
   * steps that only show.
   */
  point?: readonly CoachTarget[];
  /** What it lights instead while the search sheet covers the screen. */
  sheetPoint?: readonly CoachTarget[];
};

/*
 * The targets, by the attributes the screens already carry where they had
 * one, and `data-coach-target` where they did not.
 */
/* Where she stands, not what draws her: hidden once the WebGL scene is live. */
const YUMI = { selector: "[data-yumi-figure]", anchor: true } as const;
const POINT = {
  /* The key under the gold mark while the dial is out; her, to open it. */
  dial: ['[data-dial-item][data-selected="true"]', YUMI],
  /* The dial's Search key while it is out; the search field when it is not. */
  search: ['[data-dial-key="search"]', '[data-coach-target="search-field"]'],
  /* Save on Home's answer; with no answer up, Home's search, to get one. */
  save: ['[data-coach-target="save-word"]', '[data-coach-target="search-field"]'],
  /* The same two, in the search sheet. */
  sheetSearch: ['[data-lexicon-sheet] [data-coach-target="sheet-search"]'],
  sheetSave: ['[data-lexicon-sheet] [data-coach-target="save-word"]'],
  /* The cookie Home is already nudging, else any cookie. */
  cookie: ['[data-floating-cookie][data-hint="feed"]', "[data-floating-cookie]"],
  /* The bag and the switch's track, not their buttons: both buttons are
     bigger than what they draw, for the finger, and the light belongs round
     the shape the reader can see. */
  shopKey: ["[data-home-shop-key] > svg", "[data-home-shop-key]"],
  item: ['[data-coach-target="shop-item"]'],
  modeSwitch: ["[data-home-mode-portal] > span", "[data-home-mode-portal]"],
  omni: ['[data-coach-target="cosmic-omni"]'],
} as const;

const STANDARD: InterfaceMode = "standard";
const COSMIC: InterfaceMode = "yumi-cosmic";

/*
 * Sixteen steps, one point each (Chi, 2026-10-18: "更簡潔重點帶過"). What
 * used to be separate steps is said together where it happens together:
 * opening the dial and turning it; saving a word and what it earns; trying
 * a piece on, buying, and the balance; the whole of the deck in one card.
 * The page walk stays one screen at a time, in a line each.
 */
export const COACH_STEPS: readonly Step[] = [
  /*
   * The dial (Chi, 2026-10-16) turns, and only a tap goes in. A reader who
   * drags expecting the key under their finger to open is left wondering why
   * nothing did, so they open it and turn it once while being told.
   */
  {
    key: "meet",
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
    sheetPoint: POINT.sheetSearch,
  },
  /* Saving, and the two things a new word earns (one word, two uses). */
  {
    key: "keep",
    chapter: "home",
    route: "/home",
    mode: STANDARD,
    awaits: ["word-saved"],
    refresh: true,
    point: POINT.save,
    sheetPoint: POINT.sheetSave,
  },
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
   * 教商店及如何賺取 cookie 及購買"). Where cookies go is said on Home, at the
   * shop key; then, in the shop, the reader tries something on themselves and
   * is told in the same breath how buying works, rather than made to spend.
   */
  {
    key: "cookies",
    chapter: "shop",
    route: "/home",
    mode: STANDARD,
    refresh: true,
    point: POINT.shopKey,
  },
  {
    key: "tryOn",
    chapter: "shop",
    route: "/shop",
    mode: STANDARD,
    awaits: ["shop-tried"],
    point: POINT.item,
  },

  /*
   * The reader makes the switch, with the real control, and the step waits
   * for the mode to actually change: where the switch is is the one thing
   * worth remembering from this chapter (Chi, 2026-10-09: "在首頁教").
   */
  { key: "modeSwitch", chapter: "cosmic", route: "/home", point: POINT.modeSwitch },
  /* The whole deck in one card, lighting the search it shares with Standard. */
  {
    key: "deck",
    chapter: "cosmic",
    route: "/home",
    mode: COSMIC,
    autoGo: true,
    point: POINT.omni,
  },
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
  /** The search sheet is open, over the card. */
  searchOpen?: boolean;
  onSetMode: (mode: InterfaceMode) => void;
  onNavigate: (href: string) => void;
  /** Puts the search sheet away. */
  onCloseSearch?: () => void;
};

export default function TutorialCoach({
  pathname,
  interfaceMode,
  switching = false,
  searchOpen = false,
  onSetMode,
  onNavigate,
  onCloseSearch,
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

  /* The light keeps off this, and hides while it is hidden. */
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

  /*
   * A returning reader is told what a kept word earns rather than asked to
   * keep one there and then: there is no answer on their screen to keep
   * from, and they know how to get one.
   */
  const awaiting = refreshing && current?.key === "keep" ? undefined : current?.awaits;
  const onRoute = current?.route ? pathname === current.route : true;
  const wrongMode = Boolean(current?.mode && current.mode !== interfaceMode);

  const advance = useCallback(() => {
    setSatisfied(false);
    const next = index + 1;
    setCoachStep(next >= steps.length ? COACH_FINISHED : next);
  }, [index, steps]);

  /*
   * Past a step the reader cannot do now. The switch is the exception:
   * passing it means not changing looks, so the Cosmic steps that follow
   * would only ask for the switch again — it goes straight to the choice.
   */
  const skipStep = useCallback(() => {
    if (steps[index]?.key === "modeSwitch") {
      setSatisfied(false);
      setCoachStep(steps.findIndex((step) => step.key === "choose"));
      return;
    }
    advance();
  }, [advance, index, steps]);

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

  /*
   * The beat between doing it and being asked for the next thing.
   *
   * A word kept in the search sheet puts the sheet away at the end of it:
   * the next step is feeding, on Home, and the sheet covers Home.
   */
  const closeSheet = done && current?.key === "keep" && searchOpen;

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => {
      if (closeSheet) onCloseSearch?.();
      advance();
    }, DONE_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [advance, closeSheet, done, onCloseSearch]);

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
  const feeding = current?.key === "feed" && pathname === "/home" && !wrongMode;

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
    current.key === "keep" &&
    Boolean(awaiting) &&
    lastLookupEmpty &&
    !done &&
    onRoute &&
    !wrongMode;

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
     would. The dial's two steps go to the foot as well: they have to stay
     readable with the dial out. */
  const placement =
    pathname === "/shop"
      ? ""
      : pathname !== "/home"
        ? ` ${styles.docked}`
        : current.key === "meet" || current.key === "ask"
          ? ` ${styles.dialStep}`
          : current.key === "modeSwitch" || current.key === "cookies"
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
     * A waiting step has no "Next", only "Skip this step".
     *
     * "Next" would read as the way on, and make every instruction optional.
     * But a step can be impossible right now — no cookie on Home to feed, a
     * lookup that will not come — and the reader stuck on it used to have
     * only Skip, which ends the whole tour (Chi, 2026-10-18). So a quieter
     * key passes the one step; Skip still ends the tour.
     */
    keys = (
      <>
        <span className={styles.waiting} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <button type="button" className={styles.skipStep} onClick={skipStep}>
          {copy.skipStep}
        </button>
      </>
    );
  } else {
    keys = (
      <button type="button" className={styles.next} onClick={advance}>
        {copy.next}
      </button>
    );
  }

  /*
   * The light, while there is something to press and the reader can press it
   * here: not on the wrong screen or look, and not on a keep step with
   * nothing to keep. It stays through the "Good." beat, to flash its
   * confirmation and let go.
   *
   * With the search sheet open it lights the step's key in the sheet, from
   * over it, or nothing; and since the card is under the sheet, a tag on
   * the light says what the card would.
   */
  const target = searchOpen ? current.sheetPoint : current.point;
  const pointAt = target && onRoute && !wrongMode && !keepBlocked ? target : null;
  const tag =
    searchOpen && pointAt
      ? done
        ? copy.done
        : "tag" in stepCopy
          ? stepCopy.tag
          : undefined
      : undefined;

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
          keep the light under anything a screen layers above it. */}
      {pointAt ? (
        <Suspense fallback={null}>
          <CoachLight
            targets={pointAt}
            avoid={cardRef}
            done={done}
            raised={searchOpen}
            tag={tag}
          />
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
  const { open: searchOpen, closeSearch } = useLexiconSearchSheet();

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
      searchOpen={searchOpen}
      onSetMode={setMode}
      onNavigate={navigate}
      onCloseSearch={closeSearch}
    />
  );
}
