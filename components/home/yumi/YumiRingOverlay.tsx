"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { useLexiconSearchSheet } from "@/contexts/LexiconSearchContext";
import type { CSSProperties, ReactNode } from "react";

import LiquidRingButton, { LiquidRingSurface } from "./LiquidRingButton";
import { announceHomeMoment } from "@/lib/home/homeMoments";
import { COACH_STEPS } from "@/components/tutorial/TutorialCoach";
import { getCoachStep } from "@/lib/home/tutorialCoach";
import { setYumiRingState } from "@/lib/home/yumiRing";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";
import {
  hasParkedYumiScene,
  parkYumiScene,
  relayedOptions,
  takeParkedYumiScene,
  type YumiSceneRelay,
} from "@/lib/yumi3d/sceneCache";

import styles from "./YumiRingOverlay.module.css";

/* =========================================================
   Yumi, and the ring she opens

   One fixed full-viewport canvas. At rest she sits in the home stage's
   figure slot and scrolls with it; pulling her eye flies her to the middle
   of the viewport at full size and opens the ring around her.

   Why a ring of seven and not the dock's six: the dock is 單字 / 訊息 /
   首頁 / 搜尋 / 探索 / 設定, and 首頁 is not here because Yumi is home —
   the dock is the only route to /home in the whole app, so whatever
   replaces it has to carry that. The two additions are the sections the
   app built and left with no key at all: 筆記, reachable only from one
   "view all" link on this very screen, and the pronunciation lab, eight
   routes deep behind a home module.

   This is Standard Mode only. Cosmic Mode keeps its Command Deck and its
   dock exactly as they are.
   ========================================================= */

type Spoke = {
  key: string;
  label: string;
  href?: string;
  /** Search is a sheet, not a route — see ProtectedNav for the same note. */
  action?: "search";
  badge?: number;
  icon: React.ReactNode;
};

const ICON = {
  words: (
    <>
      <path d="M12 7.5v13" />
      <path d="M3 5h5.5A3.5 3.5 0 0 1 12 8.5 3.5 3.5 0 0 1 15.5 5H21v13h-5.5a3.5 3.5 0 0 0-3.5 3 3.5 3.5 0 0 0-3.5-3H3z" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <path d="M9.5 12.5h5M9.5 16h3" />
    </>
  ),
  speech: (
    <>
      <path d="M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3z" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  review: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v14.5H6.5A2.5 2.5 0 0 0 4 20z" />
      <path d="M9.2 8.6h5.6M9.2 12h3.4" />
    </>
  ),
  messages: <path d="M21 11.6a8.4 8.4 0 0 1-12.8 7.4L3 20.5l1.6-4.8A8.4 8.4 0 1 1 21 11.6z" />,
  discover: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m14.8 9.2-1.9 4.4-4.4 1.9 1.9-4.4z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    </>
  ),
} as const;

/**
 * Her radius on screen, in CSS pixels, at rest and with the ring open.
 *
 * At rest she was 96px across, inherited from the slot she used to occupy in
 * a stage with ten modules under it. She is the screen now, so she is sized
 * like it: 144 across, a little over a third of the narrowest phone's width.
 * The open radius is unchanged — that one is set against the ring's own
 * geometry, which is verified, and she does not need to be larger once seven
 * keys are out around her.
 */
const REST_RADIUS = 72;
const OPEN_RADIUS = 86;

/*
 * Where she goes while she is answering, and how small she gets.
 *
 * A dictionary entry is 600px tall and the room under her at rest is 334 on a
 * 390-wide phone and 245 on a 375 — so at rest the answer's own save key sits
 * below the bottom of a screen that cannot scroll. Lifting her to a fifth of
 * the way down and taking her to a 48px radius turns that into 565px, which
 * is a page you can read rather than a card you can see the top of.
 *
 * She does not leave: she is the one being asked, and a question whose
 * listener walks off screen is a different screen.
 */
const ANSWER_HEIGHT = 0.2;
const ANSWER_RADIUS = 48;

/*
 * Where she sits while the reader is typing or reading an answer, in pixels
 * from the top of the layer.
 *
 * It was always 20% of the layer's height, and the layer is the *layout*
 * viewport, which does not shrink when a phone keyboard opens. With the
 * keyboard up on an 844px iPhone, 20% put her eye at 169px and the field
 * well below that — and the answer column ran on underneath the keyboard.
 *
 * So the height is taken from what is actually visible: never lower than
 * it used to be, and with a keyboard up, a quarter of the visible height —
 * floored at ANSWER_TOP_FLOOR so she clears the status bar and notch.
 */
const ANSWER_TOP_FLOOR = 120;

export function visibleBottom(layerHeight: number) {
  const viewport = typeof window !== "undefined" ? window.visualViewport : null;
  if (!viewport) return layerHeight;
  return Math.min(layerHeight, viewport.offsetTop + viewport.height);
}

export function answerAnchorY(
  layerHeight: number,
  visible = visibleBottom(layerHeight),
) {
  return Math.max(
    ANSWER_TOP_FLOOR,
    Math.min(layerHeight * ANSWER_HEIGHT, visible * 0.24),
  );
}

/*
 * One motion from rest to the search (Chi, 2026-10-02: "一次滑到定位").
 *
 * Recorded on an iPhone home-screen app: tapping the field pushed the whole
 * screen up — Yumi half off the top — and it then took nearly three seconds
 * to come back. Two things did that together.
 *
 * At rest the field sits where the keyboard is about to be, so iOS, seeing a
 * field it believes the keyboard will cover, scrolled the page to reveal it;
 * and the correction that put the page back was animated by the document's
 * `scroll-behavior: smooth` and restarted on every scroll event, so it
 * crawled. The correction is instant now (see the keyboard lock below). The
 * reveal is avoided rather than corrected: a tap on the field focuses a
 * stand-in input that is already in view, so the keyboard rises with nothing
 * to reveal; she and the column glide up together; and the real field takes
 * the focus once it is above where the keyboard will be (HANDOFF_MS).
 *
 * Her flight is an exponential ease at GLIDE_RATE (lib/yumi3d/scene.ts); the
 * column under her uses the same rate, so the field travels with her rather
 * than jumping ahead of her.
 */
const GLIDE_RATE = 7;
/** Where the field has cleared any keyboard: well inside her glide. */
const HANDOFF_MS = 200;
/*
 * What a phone keyboard leaves of the screen, for placing her before it has
 * arrived: about 56% on a 390x844 iPhone with the suggestion bar, a little
 * more on larger ones. Replaced by the real figure once it has settled.
 */
const KEYBOARD_VISIBLE_SHARE = 0.56;
/** How long the visible height must hold still before it counts. */
const VIEWPORT_SETTLE_MS = 180;

/** Her column's own offset below the eye, and the air under the page. */
const BELOW_OFFSET = 94;
const BELOW_AIR = 24;


/**
 * How far the keys sit from her centre once the ring is out.
 *
 * 132 is the tuned value and it stands on any phone with room for it. What
 * follows is what happens when there is not.
 *
 * Eight equal steps put two keys on the horizontal axis, at exactly ±R, so
 * the ring is at its widest possible: 2R + a key = 326px. A 320px screen
 * cannot hold that. Seven was 319.4px, which is to say seven was already out
 * of room and nobody had measured it.
 *
 * Two things fix it together. Turning the whole ring an eighth of a turn
 * moves those two keys off the axis, taking the widest points to ±R·cos(π/8)
 * and the span to 306px. And the radius itself gives way on a narrow screen
 * rather than the layout breaking. MIN_RING_RADIUS is the floor where the
 * keys would start to crowd her open silhouette; at 375 — the narrowest phone
 * the app supports — the measured radius is 131.5, so the floor never binds.
 */
const RING_RADIUS = 132;

/** An eighth of a turn, so no key sits on the widest part of the circle. */
const RING_ROTATION = Math.PI / 8;

/**
 * Her open radius (86) plus half a key (31) plus air. Below this the keys
 * sit on her face. It is a floor, not a working value: above the panel
 * threshold the measured radius never reaches it.
 */
const MIN_RING_RADIUS = 123;

/** Room for a key on each side of the ring, plus a margin. */
const RING_MARGIN = 24;

function ringRadiusFor(width: number) {
  return Math.max(
    MIN_RING_RADIUS,
    Math.min(RING_RADIUS, (width - SPOKE_SIZE - RING_MARGIN * 2) / 2 / Math.cos(RING_ROTATION)),
  );
}

/**
 * The key's widest part — its label, not its disc.
 *
 * The disc is 62. The label under it is allowed to be wider, because
 * "Impostazioni" and "Vocabolario" do not fit inside 62 at any size a person
 * can read: clamped to the disc they broke mid-word into "Vocabolari / o".
 * The geometry has to reserve the wider number or the outermost keys run off
 * the screen.
 */
const SPOKE_SIZE = 84;

/*
 * There is no list form of this ring.
 *
 * One was written — eight keys stacking into a panel below 360px — and it
 * never worked for a single frame: it was applied on width alone rather than
 * only while the ring was out, so its panel chrome drew on the collapsed home
 * screen; its `!important` transform overrode the per-frame one that is the
 * only thing placing this element on her eye, so it sat in the viewport's
 * corner; and `.ring` is zero-height, which the panel never overrode, so the
 * box had no height to show anything in. Type-checked, linted, tested, and
 * broken on every phone narrower than 360px.
 *
 * It is gone rather than repaired because the width it existed for is not a
 * width the app supports: 375 is the narrowest phone in use, and at 375 the
 * measured radius comes out at 131.5 — the tuned value, untouched. The clamp
 * below is what remains, and it is a floor that never binds above 375.
 */



/* How long the scene gets before the dock is brought back as a rescue. Long
   enough that a slow phone finishes first and nobody sees a dock; short
   enough that a device which is never going to manage it is not left on a
   screen it cannot leave. */
const RING_GIVE_UP_MS = 8000;

/* Per device, not per account: the gesture is learned by a pair of hands. */
const HINT_KEY = "yumi-ring-hint-retired";

/*
 * Whether the pull has been learned on this device.
 *
 * Read through a store rather than an effect, which is what this shape is
 * for: an effect that calls setState on mount is a second render of the
 * whole screen to answer a question the browser could have answered during
 * the first one.
 *
 * The answer is cached because getSnapshot has to return the same value
 * between renders or React re-renders forever — and reading localStorage
 * fresh each time would also be a synchronous disk hit per frame.
 *
 * The server says "retired", so a reader who learned the gesture months ago
 * never watches a line they have finished with flash past on a cold load.
 * A new reader sees it a tick later, which costs nothing: the scene is not
 * live on the first frame either, and nothing in these columns is drawn
 * until it is.
 */
let hintRetiredCache: boolean | null = null;
const hintListeners = new Set<() => void>();

function subscribeToHint(listener: () => void) {
  hintListeners.add(listener);
  return () => {
    hintListeners.delete(listener);
  };
}

function getHintSnapshot(): boolean {
  if (hintRetiredCache === null) {
    try {
      hintRetiredCache = window.localStorage.getItem(HINT_KEY) === "1";
    } catch {
      /* Private windows and blocked site data land here. Keeping the hint on
         offer is the safe way to be wrong about this. */
      hintRetiredCache = false;
    }
  }

  return hintRetiredCache;
}

const getHintServerSnapshot = () => true;

function retireHint() {
  if (hintRetiredCache === true) return;
  hintRetiredCache = true;
  try {
    window.localStorage.setItem(HINT_KEY, "1");
  } catch {
    /* It simply stays on offer next time. */
  }
  for (const listener of hintListeners) listener();
}

/* She reaches occasionally, not rhythmically: a fixed interval reads as a
   machine ticking rather than as an animal noticing something. */
const LUNGE_MIN_MS = 8000;
const LUNGE_MAX_MS = 18000;

/*
 * How long the screen has to be left alone before she may reach.
 *
 * She used to reach whenever the ring was shut and nothing was being
 * answered — so the moment a reader saved a word and closed the answer, a
 * timer that had long since run out sent her straight at the new cookie,
 * before they were back on the home screen at all. Now every frame in which
 * the reader is busy here — the ring out, a field focused, an answer up, a
 * sheet or dialog open, the app in the background — pushes her next reach
 * to at least this far away.
 */
const SETTLE_MS = 3000;

/* The tour's "feed me one" step asks the *reader* to hand her a cookie; if
   she helps herself, the lesson is gone. */
const FEED_STEP = COACH_STEPS.findIndex((step) => step.key === "feed");

function somethingElseIsUp() {
  if (typeof document === "undefined") return false;
  if (document.visibilityState !== "visible") return true;
  return Boolean(document.querySelector('[aria-modal="true"]'));
}

function nextLungeDelay() {
  return LUNGE_MIN_MS + Math.random() * (LUNGE_MAX_MS - LUNGE_MIN_MS);
}

export type YumiRingOverlayProps = {
  /**
   * The 2D stage this replaces. Two data hooks inside it are all the
   * coupling there is: `[data-yumi-figure]` is where she sits while the
   * ring is shut, and `[data-yumi-cookie]` is what she reaches for. Both
   * are read from the DOM rather than threaded through as refs, because
   * the stage and the tray are shared with screens that have no 3D Yumi.
   */
  stageRef: React.RefObject<HTMLElement | null>;
  /** Fired when a reach lands, so the feeding sequence can take the bite. */
  onLungeArrive?: () => void;
  /** Review surfaces can inspect a selection without leaving their fixture. */
  onChooseDestination?: (destination: Pick<Spoke, "key" | "label" | "href" | "action">) => void;
  unreadCount?: number;
  /**
   * Her voice, from the stage underneath. Eleven moods, five languages, all
   * of it already written — the overlay says it rather than restating it.
   */
  lines?: { primary: string; secondary: string } | null;
  /**
   * Where and when the reader is. Null until the browser has answered: the
   * server has no clock and no time zone, and a guess at either is a
   * hydration mismatch over a line of decoration.
   */
  meta?: {
    greeting: string;
    place: string | null;
    date: string;
    time: string;
  } | null;
  /**
   * The three things that can be waiting, counted separately.
   *
   * Never summed. A message someone sent you, a person asking to be added
   * and a word due for review are three different asks, and one number
   * covering all of them is a number that means nothing. Null while the
   * library is still loading, which is not the same as nothing waiting —
   * showing a confident zero to a reader with forty words due is worse than
   * showing nothing at all.
   */
  notices?: {
    unread: number;
    friendRequests: number;
    reviewDue: number;
  } | null;
  /**
   * The one control that comes back to this screen.
   *
   * Ten modules came off the home because each was a second door to
   * somewhere the ring already went. A search field is the exception, and
   * not a grudging one: the ring's Search key opens a sheet, and a sheet you
   * open is not the same affordance as a field you type into. This one owns
   * the lexicon engine itself — type, speak or scan, and read the answer
   * without another view covering the page.
   *
   * It rides in the column under her so it moves with her, gets out of the
   * way when the ring is out, and cannot collide with the absolutely
   * positioned lines it shares that column with.
   *
   * A function rather than a node, because the field has to say when it is
   * showing an answer: that is what moves her, silences the idle lines and
   * gives the column a height to scroll inside. Passing the callback down is
   * what keeps that one piece of state here, on the screen it belongs to,
   * rather than split between this and its parent.
   */
  field?: (props: { onAnswerChange: (hasAnswer: boolean) => void }) => ReactNode;
  /** Rendered underneath while the scene is starting, or if it cannot. */
  children: React.ReactNode;
};

export default function YumiRingOverlay({
  stageRef,
  onLungeArrive,
  onChooseDestination,
  unreadCount = 0,
  lines = null,
  meta = null,
  notices = null,
  field,
  children,
}: YumiRingOverlayProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { openSearch } = useLexiconSearchSheet();

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /* Where the canvas is put. The canvas itself is not React's: it is the
     one element that has to survive this screen unmounting, so it is made
     and moved by hand. See lib/yumi3d/sceneCache.ts. */
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<YumiSceneHandle | null>(null);
  const cancelCanvasGestureRef = useRef<(() => void) | null>(null);
  /* Already live when she was parked a moment ago: no fade-in from nothing
     for a scene that is already built. Client-only — a parked scene only
     exists after a client-side navigation, never during hydration. */
  const [live, setLive] = useState(() => hasParkedYumiScene());
  /* The cookie the current reach is for, so arriving can take that exact
     one rather than whichever is first in the tray a moment later. */
  const reachingFor = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

  /*
   * Whether the field under her has something to show.
   *
   * Held here rather than inside the field because it is the screen's state,
   * not the field's: it moves her, it silences the idle lines, and it is what
   * gives the column a height to scroll inside. The ref is for the frame
   * loop, which runs outside React and reads it every frame — the same pair
   * `open` already keeps for the same reason.
   */
  const [hasAnswer, setHasAnswer] = useState(false);
  const handleAnswerChange = useCallback((next: boolean) => setHasAnswer(next), []);

  /*
   * Whether the reader is typing into the field under her.
   *
   * The screen moved her up and out of the way only once there was an
   * answer — a keystroke after the keyboard had already arrived and covered
   * the field. The keyboard arrives on focus, so the layout does too: a
   * focused field is treated exactly like an answer on screen.
   */
  const [typing, setTyping] = useState(false);
  const answering = hasAnswer || typing;
  const answeringRef = useRef(false);

  /* Mirrored in an effect rather than written by the callback: the callback
     is handed to the field during render, and a callback that writes a ref
     is a ref written during render as far as the compiler can tell. The
     effect commits before paint, and the loop reads it on the next frame. */
  useEffect(() => {
    answeringRef.current = answering;
  }, [answering]);

  /* The field's own box, for keeping it continuous when the column's
     contents change around it, and the stand-in the keyboard is opened on. */
  const fieldRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLInputElement>(null);
  /* Set by a tap on the field from a touch screen: a keyboard is on its way
     and has not arrived yet, so she is placed for it in advance. */
  const expectKeyboardRef = useRef(false);

  /*
   * Review lives on her.
   *
   * It is the one destination this screen used to offer that the ring has no
   * door for, and the ring is seven keys because seven is the geometry that
   * was verified. So a long press goes straight there — and the count below
   * her is the key you can actually see, because a gesture nobody is told
   * about is not a route.
   *
   * A press that turned into a drag is a drag. She can be turned and her eye
   * can be pulled, and neither may end up somewhere else.
   */
  /*
   * How wide the screen is, for the ring's radius and for whether it should
   * be a ring at all. Measured rather than guessed with a media query,
   * because the radius is a number the layout loop needs, not a breakpoint.
   */
  const [viewport, setViewport] = useState(0);
  useEffect(() => {
    const read = () => setViewport(window.innerWidth);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const ringRadius = viewport > 0 ? ringRadiusFor(viewport) : RING_RADIUS;

  /* Tapping her is the only way to the ring, and nobody is born knowing it,
     so the hint sits under her until the ring has been opened once. */
  const hintRetired = useSyncExternalStore(
    subscribeToHint,
    getHintSnapshot,
    getHintServerSnapshot,
  );




  /*
   * The ring is positioned from the eye's own projected point every frame,
   * not from a CSS percentage, so it stays on her while she flies to the
   * middle and while the band is stretched.
   */
  const ringRef = useRef<HTMLDivElement>(null);
  const spokeRefs = useRef<Array<HTMLElement | null>>([]);

  const spokes: Spoke[] = [
    { key: "words", label: t.navigation.vocabulary, href: "/vocabulary", icon: ICON.words },
    /* Review sits next to Vocabulary because they are two stages of one
       thing: the words you kept, and the words asking to be kept. It used to
       be a capsule under her and a 450ms press on her, and neither was a
       place a reader would look for it. */
    { key: "review", label: t.navigation.review, href: "/review", icon: ICON.review },
    { key: "notes", label: t.navigation.notes, href: "/notes", icon: ICON.notes },
    { key: "speech", label: t.navigation.pronunciation, href: "/pronunciation", icon: ICON.speech },
    { key: "search", label: t.navigation.search, action: "search", icon: ICON.search },
    { key: "messages", label: t.navigation.messages, href: "/messages", badge: unreadCount, icon: ICON.messages },
    { key: "discover", label: t.navigation.discover, href: "/discover", icon: ICON.discover },
    { key: "settings", label: t.navigation.settings, href: "/profile", icon: ICON.settings },
  ];

  const close = useCallback(() => {
    cancelCanvasGestureRef.current?.();
    openRef.current = false;
    setOpen(false);
  }, []);

  /*
   * A key a keyboard can reach.
   *
   * The ring is the only navigation this screen has, and every way into it
   * was a pointer: a tap or a pull, both on a canvas, which is not focusable
   * and has no role. The spokes are tabIndex -1 while it is shut, so tabbing
   * through the home screen went past the review key and off the end without
   * ever meeting the menu.
   *
   * So there is a real button. It is off-screen until it takes focus and
   * then it is plainly visible, which is what a skip-link does and for the
   * same reason: it is for the reader who is already tabbing, and it must
   * not become furniture for the one who is not.
   */
  const ringKeyRef = useRef<HTMLButtonElement>(null);

  /* Whether the ring was opened from the keyboard, which is the one case
     where focus should follow it in. */
  const openedByKey = useRef(false);

  const openFromKey = useCallback(() => {
    openedByKey.current = true;
    openRef.current = true;
    setOpen(true);
    retireHint();
  }, []);

  /*
   * Focus follows the ring. Opening hands it to the first spoke, because a
   * menu that opens behind the focus is a menu a keyboard cannot use; closing
   * gives it back to the key it came from, rather than dropping it on <body>
   * and making the reader tab in from the top of the document again.
   */
  /*
   * Only for a keyboard, though. Opened by a pull or a tap, moving focus to
   * the first key made the browser draw its focus ring there — and with the
   * glass keys, the active-key highlight too — so 01 looked chosen before the
   * finger had gone anywhere, and closing put the skip-link key on screen.
   * A finger does not need focus handed to it.
   */
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      if (openedByKey.current) {
        spokeRefs.current[0]?.querySelector("button")?.focus();
      }
    } else if (!open && wasOpen.current) {
      const focusInRing = rootRef.current?.contains(document.activeElement);
      if (openedByKey.current || focusInRing) ringKeyRef.current?.focus();
      openedByKey.current = false;
    }
    wasOpen.current = open;
  }, [open]);

  // ------------------------------------------------------------- the scene
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    /*
     * The scene from the last visit to this screen, if it is still parked
     * and its context survived; otherwise a fresh canvas to build one on.
     */
    const parked = takeParkedYumiScene();
    const canvas = parked?.canvas ?? document.createElement("canvas");
    canvas.className = styles.canvas;
    host.appendChild(canvas);
    canvasRef.current = canvas;

    let pointer: {
      id: number; blank: boolean; x: number; y: number; started: number; moved: boolean;
    } | null = null;
    const cancelCanvasGesture = () => {
      const current = pointer;
      pointer = null;
      if (!current) return;
      if (!current.blank) sceneRef.current?.pointerCancel?.();
      if (canvas.hasPointerCapture?.(current.id)) canvas.releasePointerCapture(current.id);
    };
    cancelCanvasGestureRef.current = cancelCanvasGesture;
    const onCanvasDown = (event: PointerEvent) => {
      if (event.isPrimary === false || event.button !== 0 || pointer) return;
      // A second input must not dismiss a selection already being scrubbed.
      if (rootRef.current?.querySelector("[data-liquid-option][data-dragging], [data-liquid-option][data-releasing]")) return;
      const eye = sceneRef.current?.eyeScreenPosition();
      if (!eye) return;
      const blank = Math.hypot(event.clientX - eye.x, event.clientY - eye.y) > 100;
      if (blank && !openRef.current) return;
      pointer = { id: event.pointerId, blank, x: event.clientX, y: event.clientY, started: performance.now(), moved: false };
      if (!blank) sceneRef.current?.pointerDown(event.clientX, event.clientY);
      canvas.setPointerCapture?.(event.pointerId);
    };
    const onCanvasMove = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      pointer.moved ||= Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8;
      if (!pointer.blank) sceneRef.current?.pointerMove(event.clientX, event.clientY);
    };
    const onCanvasUp = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      // Cancellation events may report (0, 0); they must not turn Yumi.
      if (event.type === "pointerup") onCanvasMove(event);
      const current = pointer;
      pointer = null;
      const tap = !current.moved && performance.now() - current.started <= 450;
      if (event.type !== "pointerup" || (!current.moved && !tap)) {
        if (!current.blank) sceneRef.current?.pointerCancel?.();
      } else if (current.blank) {
        // The canvas covers the scrim, including the gaps between options.
        if (tap && openRef.current) close();
      } else {
        sceneRef.current?.pointerUp();
      }
      if (canvas.hasPointerCapture?.(current.id)) canvas.releasePointerCapture(current.id);
    };
    const onHidden = () => { if (document.hidden) cancelCanvasGesture(); };
    const onBite = () => {
      if (reachingFor.current) return;
      const eye = sceneRef.current?.eyeScreenPosition();
      if (eye) sceneRef.current?.lungeAt(eye.x + 42, eye.y);
    };
    let gazePoint: { x: number; y: number } | null = null;
    const onGaze = (event: Event) => { gazePoint = (event as CustomEvent).detail; };
    const stage = stageRef.current;
    stage?.addEventListener("yumi-cookie-gaze", onGaze);
    stage?.addEventListener("yumi-cookie-bite", onBite);
    canvas.addEventListener("pointerdown", onCanvasDown);
    canvas.addEventListener("pointermove", onCanvasMove);
    canvas.addEventListener("pointerup", onCanvasUp);
    canvas.addEventListener("pointercancel", onCanvasUp);
    canvas.addEventListener("lostpointercapture", onCanvasUp);
    window.addEventListener("blur", cancelCanvasGesture);
    document.addEventListener("visibilitychange", onHidden);

    let handle: YumiSceneHandle | null = null;
    let raf = 0;
    let cancelled = false;

    /* The dock is hidden on this screen on the strength of this ring
       existing, so every way of not existing has to say so. */
    setYumiRingState("pending");
    const giveUp = window.setTimeout(
      () => setYumiRingState("failed"),
      RING_GIVE_UP_MS,
    );
    let lungeAt = performance.now() + nextLungeDelay();

    /* The last whole-pixel eye position handed to the stage — see the write
       below for why it is worth remembering. NaN so the first frame always
       writes. */
    let lastEyeX = Number.NaN;
    let lastEyeY = Number.NaN;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Dynamic, so three.js is a chunk this screen asks for after it has
       painted rather than weight on every route's first load. */
    /*
     * What the scene's callbacks do, for this mount of the screen. The scene
     * was created with a relay rather than with these, so a parked scene
     * taken back by a new mount calls the new mount's code.
     */
    const relay: YumiSceneRelay = parked?.relay ?? { current: {} };
    relay.current = {
          onPullOpen: () => {
            openRef.current = true;
            setOpen(true);
            retireHint();
          },
          onTap: () => {
            /* A tap is the same key either way: it opens the ring, and once
               the ring is out it is the way home. */
            openRef.current = !openRef.current;
            setOpen(openRef.current);
            if (openRef.current) retireHint();
          },
          onLungeArrive: () => {
            /*
             * The bite goes through the tray's own click path rather than
             * through a second copy of it. Everything downstream — the
             * cookie leaving the tray, the feeding sequence, the pet row,
             * the mood reaction, the widget — then happens exactly as it
             * does when a reader hands her one, and there is one feeding
             * implementation rather than two that can drift.
             */
            const target = reachingFor.current;
            if (!openRef.current && !answeringRef.current && !somethingElseIsUp()) {
              if (target?.hasAttribute("data-floating-cookie")) target.dispatchEvent(new CustomEvent("yumi-cookie-feed", { bubbles: true }));
              else target?.click();
            }
            reachingFor.current = null;
            onLungeArrive?.();
          },
    };

    if (parked) {
      /* She may have been parked mid-gesture, and the viewport may have
         changed since. */
      parked.handle.pointerCancel?.();
      parked.handle.setFocusLevel(0);
      parked.handle.resize();
    }

    const ready: Promise<YumiSceneHandle | null> = parked
      ? Promise.resolve(parked.handle)
      : import("@/lib/yumi3d/scene").then(({ createYumiScene }) =>
          cancelled ? null : createYumiScene(canvas, relayedOptions(relay, reduced)),
        );

    void ready
      .then((created) => {
        if (cancelled) {
          /* Unmounted while three.js was still loading: nothing to park. */
          if (created && !parked) created.dispose();
          return;
        }

        handle = created;

        if (!handle) {
          window.clearTimeout(giveUp);
          setYumiRingState("failed");
          return;
        }
        sceneRef.current = handle;
        window.clearTimeout(giveUp);
        setYumiRingState("live");
        setLive(true);

        let lastRingTransform = "";
        let lastBelowRoom = "";
        /* The column's own eased position, at rest and while answering; null
           while the ring is out, which places it outright. */
        let column: { x: number; y: number } | null = null;
        let fieldOffset = Number.NaN;
        let lastFrame = 0;
        /* The visible height, and when it last changed: a keyboard on its
           way up reports a new height every frame, and following each one
           made the field drift for the length of the animation. */
        const viewportWatch = { value: Number.NaN, since: 0, settled: Number.NaN };
        const loop = (now: number) => {
          if (cancelled || !handle) return;
          const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 1 / 30) : 0;
          lastFrame = now;

          // --- where she should be this frame
          const rect = canvas.getBoundingClientRect();

          const liveVisible = visibleBottom(rect.height);
          if (liveVisible !== viewportWatch.value) {
            viewportWatch.value = liveVisible;
            viewportWatch.since = now;
          }
          if (
            Number.isNaN(viewportWatch.settled) ||
            now - viewportWatch.since >= VIEWPORT_SETTLE_MS
          ) {
            viewportWatch.settled = liveVisible;
          }
          /* A keyboard that has arrived and settled ends the prediction —
             not one still on its way up, whose half-height would put her
             back where she started for a moment. One that never comes (a
             hardware keyboard) ends it when the field is let go of. */
          if (expectKeyboardRef.current && viewportWatch.settled < rect.height * 0.9) {
            expectKeyboardRef.current = false;
          }
          const keyboardPending = expectKeyboardRef.current;
          const answerY = answerAnchorY(
            rect.height,
            keyboardPending
              ? rect.height * KEYBOARD_VISIBLE_SHARE
              : viewportWatch.settled,
          );

          let restPosition: { x: number; y: number } | null = null;
          if (openRef.current) {
            handle.setScreenAnchor(rect.width / 2, rect.height * 0.42, OPEN_RADIUS);
          } else if (answeringRef.current) {
            /* Up and smaller, so the answer has the page. */
            handle.setScreenAnchor(rect.width / 2, answerY, ANSWER_RADIUS);
          } else {
            const figure = stageRef.current?.querySelector("[data-yumi-figure]");
            const anchor = figure?.getBoundingClientRect();
            if (anchor) {
              restPosition = { x: anchor.left + anchor.width / 2 - rect.left, y: anchor.top + anchor.height / 2 - rect.top };
              handle.setScreenAnchor(
                anchor.left + anchor.width / 2 - rect.left,
                anchor.top + anchor.height / 2 - rect.top,
                REST_RADIUS,
              );
            }
          }

          /*
           * --- the occasional reach for a cookie
           *
           * Only while the screen is at rest. The cookies are hidden with
           * `opacity` in both of the other states, which keeps their boxes —
           * and a box is all the reachability test below can see. Without
           * this she reaches for a biscuit the reader cannot see while they
           * are reading a definition, which is a quieter version of the bug
           * that hid the tray in the first place.
           */
          /* Busy here means no reach for SETTLE_MS after it stops. */
          if (openRef.current || answeringRef.current) {
            lungeAt = Math.max(lungeAt, now + SETTLE_MS);
          }

          if (!openRef.current && !answeringRef.current && !reduced && now > lungeAt) {
            const cookies = Array.from(
              document.querySelectorAll<HTMLElement>("[data-yumi-cookie]"),
            );
            /* Only a cookie that is actually on screen and can still be
               taken. Reaching for one scrolled out of view, or for a
               disabled tray, is a reach into nothing. */
            const reachable = cookies.filter(element => {
              if (element.hasAttribute("disabled")) return false;
              const box = element.getBoundingClientRect();
              return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
            });

            if (somethingElseIsUp() || stageRef.current?.dataset.cookiesPaused === "true" || document.querySelector("[data-floating-field][data-dragging], [data-floating-field][data-gathering]") || getCoachStep() === FEED_STEP) {
              /* A sheet, a dialog, the app in the background, or the tour
                 asking the reader to do the feeding: not now. */
              lungeAt = now + SETTLE_MS;
            } else if (reachable.length > 0) {
              const pick = reachable[Math.floor(Math.random() * reachable.length)];
              const box = pick.getBoundingClientRect();
              const started = handle.lungeAt(
                box.left + box.width / 2,
                box.top + box.height / 2,
              );
              if (started) reachingFor.current = pick;
              lungeAt = now + nextLungeDelay();
            } else {
              lungeAt = now + nextLungeDelay();
            }
          }

          const gazeEye = handle.eyeScreenPosition();
          handle.setGaze?.(
            gazePoint && !reduced ? (gazePoint.x - gazeEye.x) / 180 : 0,
            gazePoint && !reduced ? (gazePoint.y - gazeEye.y) / 180 : 0,
          );
          handle.frame(now);

          // --- the ring rides on the eye
          if (ringRef.current) {
            const eye = handle.eyeScreenPosition();

            /*
             * Anchored while answering, tracked the rest of the time.
             *
             * Her eye is never still — she breathes, she blinks, she leans —
             * and this element rides on its projected point, which is exactly
             * what makes the greeting and her mood line feel attached to her.
             * The search field is in that same column, and a field you are
             * typing into must not move. Tracking her meant the input drifted
             * under the reader's finger on every frame, and jumped again each
             * time she flew.
             *
             * So while she is answering the column is placed on the anchor
             * she is flying to rather than on where she currently is. That
             * point is a constant — the same one setScreenAnchor is given
             * above — so the field is still from the first keystroke, and she
             * is free to keep breathing next to it. The spokes are the only
             * other thing in here and they are not on screen in this state.
             */
            /*
             * The field keeps its place on screen when the column's contents
             * change around it. Her mood line above it steps aside while she
             * answers and comes back after; the column is moved by the same
             * amount in the same frame, and the glide below takes it from
             * there — one motion, not a jump and then a slide.
             */
            const offset = fieldRef.current?.offsetTop ?? 0;
            if (column && !Number.isNaN(fieldOffset) && offset !== fieldOffset) {
              column.y += fieldOffset - offset;
            }
            fieldOffset = offset;

            let ringTransform: string;
            if (openRef.current) {
              // Keep captured-pointer geometry stable while scrubbing the orbit.
              column = null;
              ringTransform = `translate(${rect.width / 2}px, ${rect.height * 0.42}px)`;
            } else {
              const target = answeringRef.current
                ? { x: rect.width / 2, y: answerY }
                : // A reach can cross the whole screen now; the search stays by her body.
                  { x: restPosition?.x ?? eye.x, y: restPosition?.y ?? eye.y };

              if (!column || reduced) {
                column = { ...target };
              } else {
                const k = Math.min(1, dt * GLIDE_RATE);
                column.x += (target.x - column.x) * k;
                column.y += (target.y - column.y) * k;
                /* Arrived: snap, so a settled screen stops writing. */
                if (Math.abs(target.x - column.x) < 0.25) column.x = target.x;
                if (Math.abs(target.y - column.y) < 0.25) column.y = target.y;
              }

              ringTransform = `translate(${column.x.toFixed(2)}px, ${column.y.toFixed(2)}px)`;
            }
            if (ringTransform !== lastRingTransform) {
              ringRef.current.style.transform = ringTransform;
              lastRingTransform = ringTransform;
            }

            /*
             * Where she is, for everything outside this element.
             *
             * The cookie tray lives in the 2D stage — it has to, because the
             * pet state, the feeding sequence and the widget bridge are all
             * in there — and the stage is a sibling of this layer, hidden
             * behind the live scene. Two custom properties are how it finds
             * her without either of them holding a reference to the other.
             *
             * Written on the stage element rather than on the document, so
             * the per-frame style invalidation is one small subtree and not
             * the whole page on the one screen already running WebGL.
             */
            const stage = stageRef.current;
            if (stage) {
              /*
               * Rounded, and only written when the rounded value moves.
               *
               * A custom property inherits, so setting one on the stage
               * invalidates the computed style of everything under it — the
               * 2D mark with its thirty animations, the tray, every cookie —
               * once per frame, on the one screen already running WebGL. Her
               * eye drifts by fractions of a pixel for most of that time, and
               * a fraction of a pixel is a style recalculation nobody can
               * see.
               *
               * Whole pixels are what the tray positions against anyway, so
               * the skipped frames cost nothing and the kept ones are
               * identical.
               */
              const x = Math.round(eye.x);
              const y = Math.round(eye.y);

              if (x !== lastEyeX) {
                lastEyeX = x;
                stage.style.setProperty("--yumi-x", `${x}px`);
              }

              if (y !== lastEyeY) {
                lastEyeY = y;
                stage.style.setProperty("--yumi-y", `${y}px`);
              }
            }

            /* Only while answering: this is the one state whose column needs
               a height, and a custom property written every frame on the idle
               screen would be a style invalidation nothing reads. */
            if (answeringRef.current) {
              /* From the anchor as well: a max-height recomputed off a
                 moving eye is the same jitter one property along. */
              const belowRoom = `${Math.round(Math.max(
                  0,
                  liveVisible - answerY - BELOW_OFFSET - BELOW_AIR,
                ))}px`;
              if (belowRoom !== lastBelowRoom) {
                ringRef.current.style.setProperty("--below-room", belowRoom);
                lastBelowRoom = belowRoom;
              }
            }
          }

          raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        /* No 3D on this device. The 2D stage underneath is already correct
           and stays visible — but the dock has to come back, because the
           ring was what it stepped aside for. */
        window.clearTimeout(giveUp);
        setYumiRingState("failed");
      });

    const onResize = () => handle?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(giveUp);
      window.removeEventListener("resize", onResize);
      cancelCanvasGesture();
      cancelCanvasGestureRef.current = null;
      sceneRef.current = null;
      stage?.removeEventListener("yumi-cookie-gaze", onGaze);
      stage?.removeEventListener("yumi-cookie-bite", onBite);
      canvas.removeEventListener("pointerdown", onCanvasDown);
      canvas.removeEventListener("pointermove", onCanvasMove);
      canvas.removeEventListener("pointerup", onCanvasUp);
      canvas.removeEventListener("pointercancel", onCanvasUp);
      canvas.removeEventListener("lostpointercapture", onCanvasUp);
      window.removeEventListener("blur", cancelCanvasGesture);
      document.removeEventListener("visibilitychange", onHidden);
      /* Parked, not disposed: the next visit to this screen takes her back
         rather than building her again. */
      if (handle) parkYumiScene({ canvas, handle, relay });
      canvas.remove();
      canvasRef.current = null;
      /* Leaving the screen leaves no opinion behind: the next screen's dock
         is not this screen's business. */
      setYumiRingState("pending");
    };
    // stageRef and the callbacks are refs/stable for this screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setFocusLevel(0);
  }, [open]);

  /* Announced here rather than at each of the three ways to open it — a
     pull, a tap and the keyboard key — so there is one place that is right
     rather than three that have to stay in step. */
  useEffect(() => {
    if (open) announceHomeMoment("ring-opened");
  }, [open]);

  /*
   * The same signal, as an attribute, for the things CSS has to decide.
   *
   * `.open` and `.answering` sit on this layer's own root, and the stage is
   * its sibling — so a rule inside the stage cannot see them. This is set on
   * state change rather than in the loop because an attribute written sixty
   * times a second to say the same word is sixty style recalculations for
   * nothing.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.dataset.yumiMode = open
      ? "open"
      : answering
        ? "answering"
        : live
          ? "rest"
          : "starting";
  }, [open, answering, live, stageRef]);

  /* Keep keyboard correction immediate. The document normally scrolls
     smoothly; restarting that animation from a scroll listener made iOS
     spend seconds chasing the focused field. The answer's own scroller
     remains available, while its outer app scroller stays where it was. */
  useEffect(() => {
    const layer = rootRef.current;
    if (!layer) return;

    let releaseLock: (() => void) | null = null;
    const lock = () => {
      if (releaseLock) return;
      const root = document.documentElement;
      const scroller = layer.closest<HTMLElement>("[data-app-scroll-viewport]");
      const overflow = root.style.overflow;
      const scrollBehavior = root.style.scrollBehavior;
      const outerOverflow = scroller?.style.overflowY ?? "";
      const outerBehavior = scroller?.style.scrollBehavior ?? "";
      const outerTop = scroller?.scrollTop ?? 0;
      root.style.overflow = "hidden";
      root.style.scrollBehavior = "auto";
      if (scroller) {
        scroller.style.overflowY = "hidden";
        scroller.style.scrollBehavior = "auto";
      }
      const holdStill = () => {
        if (window.scrollY !== 0) window.scrollTo({ left: window.scrollX, top: 0, behavior: "instant" });
        if (scroller && scroller.scrollTop !== outerTop) scroller.scrollTop = outerTop;
      };
      window.addEventListener("scroll", holdStill, { passive: true });
      scroller?.addEventListener("scroll", holdStill, { passive: true });
      const viewport = window.visualViewport;
      viewport?.addEventListener("resize", holdStill);
      viewport?.addEventListener("scroll", holdStill);
      holdStill();
      releaseLock = () => {
        window.removeEventListener("scroll", holdStill);
        scroller?.removeEventListener("scroll", holdStill);
        viewport?.removeEventListener("resize", holdStill);
        viewport?.removeEventListener("scroll", holdStill);
        root.style.overflow = overflow;
        root.style.scrollBehavior = scrollBehavior;
        if (scroller) {
          scroller.style.overflowY = outerOverflow;
          scroller.style.scrollBehavior = outerBehavior;
        }
        releaseLock = null;
      };
    };
    const unlock = () => releaseLock?.();

    /* Only a real text field, and only one of ours: the ring's keys take
       focus too, and they do not summon a keyboard. */
    const isOurField = (node: EventTarget | null) =>
      node instanceof HTMLElement &&
      layer.contains(node) &&
      (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement);

    const onFocusIn = (event: FocusEvent) => {
      if (isOurField(event.target)) {
        lock();
        answeringRef.current = true;
        setTyping(true);
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      /* `relatedTarget` is where focus is going. Moving between two fields
         inside the layer must not flicker the lock off and on — the hand-off
         from the stand-in below to the real field is exactly that move. */
      if (isOurField(event.target) && !isOurField(event.relatedTarget)) {
        unlock();
        expectKeyboardRef.current = false;
        setTyping(false);
      }
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      unlock();
    };
  }, []);

  /*
   * A tap on the field from a touch screen opens the keyboard on a stand-in.
   *
   * See GLIDE_RATE for what this is for. The tap's own focus is cancelled
   * (preventDefault on touchend, which is where iOS would focus the field
   * and decide to scroll it into view); the stand-in, which sits well above
   * any keyboard and mirrors the field's keyboard settings, takes the focus
   * inside the same tap — the only place iOS will raise a keyboard for it —
   * and the real field takes it over HANDOFF_MS later, once the glide has
   * lifted it clear. Anything typed in between moves across with it; a
   * composition in progress (注音, pinyin) is waited out rather than cut.
   *
   * Mouse and keyboard focus are left alone: no software keyboard, nothing
   * to avoid.
   */
  useEffect(() => {
    const layer = rootRef.current;
    const proxy = proxyRef.current;
    if (!layer || !proxy) return;

    let tap: { id: number; x: number; y: number; field: HTMLInputElement } | null = null;
    let timer = 0;
    let composing = false;
    let pending: HTMLInputElement | null = null;

    const fieldInput = (node: EventTarget | null) =>
      node instanceof HTMLInputElement &&
      !node.disabled &&
      !node.readOnly &&
      Boolean(fieldRef.current?.contains(node))
        ? node
        : null;

    const handOff = () => {
      window.clearTimeout(timer);
      const field = pending;
      if (!field) return;
      /* Wait for the end of a composition rather than cutting it. */
      if (composing) return;
      pending = null;
      if (document.activeElement !== proxy || !field.isConnected) return;

      const typed = proxy.value;
      proxy.value = "";
      field.focus({ preventScroll: true });

      if (typed) {
        /* Through the native setter, so React's controlled input hears it
           as typing rather than having its value changed under it. */
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(field, field.value + typed);
        field.dispatchEvent(new Event("input", { bubbles: true }));
        const end = field.value.length;
        try {
          field.setSelectionRange(end, end);
        } catch {
          /* Not every input type has a caret to place. */
        }
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      const field = fieldInput(event.target);
      const touch = event.changedTouches[0];
      tap =
        field && touch && event.touches.length === 1 && document.activeElement !== field
          ? { id: touch.identifier, x: touch.clientX, y: touch.clientY, field }
          : null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tap) return;
      const touch = Array.from(event.changedTouches).find(t => t.identifier === tap?.id);
      if (touch && Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > 10) tap = null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const current = tap;
      tap = null;
      if (!current || !event.cancelable) return;
      if (!Array.from(event.changedTouches).some(t => t.identifier === current.id)) return;
      if (document.activeElement === current.field) return;

      event.preventDefault();

      /* Same keyboard as the field's, so nothing changes under the reader's
         thumbs when the field takes over. */
      const field = current.field;
      proxy.type = field.type === "search" ? "search" : "text";
      for (const name of [
        "inputmode",
        "enterkeyhint",
        "autocomplete",
        "autocapitalize",
        "autocorrect",
        "spellcheck",
        "lang",
      ]) {
        const value = field.getAttribute(name);
        if (value === null) proxy.removeAttribute(name);
        else proxy.setAttribute(name, value);
      }
      proxy.value = "";

      expectKeyboardRef.current = true;
      pending = field;
      proxy.focus({ preventScroll: true });
      timer = window.setTimeout(handOff, HANDOFF_MS);
    };

    const onCompositionStart = () => { composing = true; };
    const onCompositionEnd = () => {
      composing = false;
      if (pending) window.setTimeout(handOff, 0);
    };
    /* Leaving the stand-in any other way — the app backgrounded, a tap
       elsewhere — cancels the hand-off. */
    const onProxyBlur = () => {
      window.clearTimeout(timer);
      pending = null;
      composing = false;
      proxy.value = "";
    };
    /* Search pressed before the hand-off: hand off, then submit the field's
       own form as if it had been pressed there. */
    const onProxyKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || composing || event.isComposing) return;
      event.preventDefault();
      const field = pending;
      handOff();
      field?.form?.requestSubmit();
    };

    layer.addEventListener("touchstart", onTouchStart, { passive: true });
    layer.addEventListener("touchmove", onTouchMove, { passive: true });
    layer.addEventListener("touchend", onTouchEnd, { passive: false });
    const onTouchCancel = () => { tap = null; };
    layer.addEventListener("touchcancel", onTouchCancel);
    proxy.addEventListener("compositionstart", onCompositionStart);
    proxy.addEventListener("compositionend", onCompositionEnd);
    proxy.addEventListener("blur", onProxyBlur);
    proxy.addEventListener("keydown", onProxyKey);

    return () => {
      window.clearTimeout(timer);
      layer.removeEventListener("touchstart", onTouchStart);
      layer.removeEventListener("touchmove", onTouchMove);
      layer.removeEventListener("touchend", onTouchEnd);
      layer.removeEventListener("touchcancel", onTouchCancel);
      proxy.removeEventListener("compositionstart", onCompositionStart);
      proxy.removeEventListener("compositionend", onCompositionEnd);
      proxy.removeEventListener("blur", onProxyBlur);
      proxy.removeEventListener("keydown", onProxyKey);
    };
  }, []);

  /*
   * The keyboard, while the ring is out.
   *
   * Escape closes, the way it closes every other overlay in the app. The
   * arrow keys step around the circle and wrap, because eight things
   * arranged in a ring are a ring to a keyboard too: Down and Right go
   * clockwise, Up and Left go back, and the last key's neighbour is the
   * first. Home and End jump to the ends of the order.
   *
   * Tab is left alone deliberately — it steps through the keys in document
   * order, which is the same order, and taking it over would be replacing a
   * behaviour every reader already has with one only this screen knows.
   */
  useEffect(() => {
    if (!open) return;

    const focusSpoke = (index: number) => {
      const count = spokeRefs.current.length;
      if (count === 0) return;
      const wrapped = ((index % count) + count) % count;
      spokeRefs.current[wrapped]?.querySelector("button")?.focus();
    };

    const currentIndex = () =>
      spokeRefs.current.findIndex(spoke =>
        spoke?.contains(document.activeElement),
      );

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }

      const step =
        event.key === "ArrowDown" || event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp" || event.key === "ArrowLeft"
            ? -1
            : 0;

      if (step !== 0) {
        event.preventDefault();
        const from = currentIndex();
        /* Arriving from outside the ring starts at the first key going
           forward and the last one going back, rather than jumping to
           whichever end happens to be index 0. */
        focusSpoke(from < 0 ? (step > 0 ? 0 : -1) : from + step);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusSpoke(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusSpoke(-1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  function choose(spoke: Spoke) {
    close();
    if (onChooseDestination) {
      onChooseDestination(spoke);
      return;
    }
    if (spoke.action === "search") {
      openSearch();
      return;
    }
    if (spoke.href) router.push(spoke.href);
  }

  return (
    <>
      {/* The 2D stage. It keeps the moods, the feeding and the widget
          bridge, and it is what a device without WebGL keeps showing. */}
      <div className={live ? styles.replaced : undefined}>{children}</div>

      <div
        ref={rootRef}
        className={`${styles.root} ${open ? styles.open : ""} ${live ? styles.live : ""} ${
          answering ? styles.answering : ""
        }`}
        data-yumi-ring-open={open ? "true" : "false"}
      >
        {/* The keyboard's way in. See openFromKey. */}
        <button
          ref={ringKeyRef}
          type="button"
          className={styles.ringKey}
          aria-expanded={open}
          onClick={openFromKey}
          tabIndex={open ? -1 : 0}
        >
          {t.navigation.primaryLabel}
        </button>

        {/* Dims the page so the ring is the only thing being decided on. */}
        <button
          type="button"
          className={styles.scrim}
          onClick={close}
          aria-label={t.common.close}
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
        />

        {/* The keyboard's stand-in for a tap on the field: see the hand-off
            effect. Invisible, above any keyboard, and out of every order. */}
        <input
          ref={proxyRef}
          className={styles.keyboardProxy}
          data-keyboard-proxy=""
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
        />

        {/* The canvas goes here, by hand — see the scene effect. `contents`
            so the host adds no box: the canvas lays out as this layer's
            child, exactly as it did when React rendered it. */}
        <div ref={canvasHostRef} style={{ display: "contents" }} />

          {meta ? (
            <div className={styles.above} data-yumi-protected="">
              <p className={styles.greeting}>
                {meta.greeting}
                {meta.place ? (
                  <>
                    <span className={styles.dot} aria-hidden="true">
                      ·
                    </span>
                    {meta.place}
                  </>
                ) : null}
              </p>
              <p className={styles.when}>
                {meta.date}
                <span className={styles.dot} aria-hidden="true">
                  ·
                </span>
                {meta.time}
              </p>
            </div>
          ) : null}

        <div
          ref={ringRef}
          className={styles.ring}
          data-yumi-ring=""
        >
          <div className={styles.reticle} aria-hidden="true" />
          <LiquidRingSurface enabled={open} onChoose={index => choose(spokes[index])}>
            {spokes.map((spoke, index) => {
              const angle =
                -Math.PI / 2 +
                RING_ROTATION +
                (index * Math.PI * 2) / spokes.length;
              const x = Math.cos(angle) * ringRadius;
              const y = Math.sin(angle) * ringRadius;

              return (
                <div
                  key={spoke.key}
                  className={styles.spoke}
                  ref={element => { spokeRefs.current[index] = element; }}
                  style={{
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                    "--spoke-return-x": `${-x * 0.65}px`,
                    "--spoke-return-y": `${-y * 0.65}px`,
                  } as CSSProperties}
                >
                  <LiquidRingButton label={spoke.label} index={index}>
                    {/* The disc is the key; the label is a caption under it and
                        may be wider. Keeping them as two boxes is what lets a
                        long word finish without the circle growing. */}
                    <span className={styles.disc} data-liquid-disc>
                      <span className={styles.glassBody} aria-hidden="true" />
                      <span className={styles.keyIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <svg
                        width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.9"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                      >
                        {spoke.icon}
                      </svg>
                      {spoke.badge ? (
                        <i className={styles.badge}>{spoke.badge > 9 ? "9+" : spoke.badge}</i>
                      ) : null}
                    </span>
                    <span className={styles.spokeLabel}>{spoke.label}</span>
                  </LiquidRingButton>
                </div>
              );
            })}
          </LiquidRingSurface>

          {/*
            Everything that is not her, placed from her.

            Both blocks live inside the ring element, which the frame loop
            already puts on her eye's projected point every frame — so they
            travel with her for free, and they stack in normal flow rather
            than at hand-counted offsets, which is what lets them grow with
            the reader's text size without colliding.

            Neither is in the stage underneath, because the stage is hidden
            the moment the scene goes live.
          */}
          <div className={styles.below} data-yumi-protected="" inert={open || !live}>
            {lines?.primary ? (
              <p className={styles.voice}>{lines.primary}</p>
            ) : null}

            {field ? (
              <div ref={fieldRef} className={styles.field}>
                {field({ onAnswerChange: handleAnswerChange })}
              </div>
            ) : null}

            {notices ? (
              <div className={styles.notices}>
                {notices.reviewDue > 0 ? (
                  <Link href="/review" className={styles.notice}>
                    <span>{t.navigation.review}</span>
                    <i>{notices.reviewDue}</i>
                  </Link>
                ) : null}

                {notices.unread > 0 ? (
                  <Link href="/messages" className={styles.notice}>
                    <span>{t.navigation.messages}</span>
                    <i>{notices.unread}</i>
                  </Link>
                ) : null}

                {notices.friendRequests > 0 ? (
                  <Link href="/friends" className={styles.notice}>
                    <span>{t.navigation.friends}</span>
                    <i>{notices.friendRequests}</i>
                  </Link>
                ) : null}
              </div>
            ) : null}

            {hintRetired ? null : (
              <p className={styles.hint}>{t.home.yumiHint}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
