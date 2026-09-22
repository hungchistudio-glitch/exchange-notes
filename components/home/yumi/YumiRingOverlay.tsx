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
import type { ReactNode } from "react";

import { setYumiRingState } from "@/lib/home/yumiRing";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<YumiSceneHandle | null>(null);
  const [live, setLive] = useState(false);
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
  const [answering, setAnswering] = useState(false);
  const answeringRef = useRef(false);
  const handleAnswerChange = useCallback((next: boolean) => setAnswering(next), []);

  /* Mirrored in an effect rather than written by the callback: the callback
     is handed to the field during render, and a callback that writes a ref
     is a ref written during render as far as the compiler can tell. The
     effect commits before paint, and the loop reads it on the next frame. */
  useEffect(() => {
    answeringRef.current = answering;
  }, [answering]);

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

  const openFromKey = useCallback(() => {
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
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      spokeRefs.current[0]?.querySelector("button")?.focus();
    } else if (!open && wasOpen.current) {
      ringKeyRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  // ------------------------------------------------------------- the scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Dynamic, so three.js is a chunk this screen asks for after it has
       painted rather than weight on every route's first load. */
    void import("@/lib/yumi3d/scene")
      .then(({ createYumiScene }) => {
        if (cancelled) return;

        handle = createYumiScene(canvas, {
          reducedMotion: reduced,
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
            reachingFor.current?.click();
            reachingFor.current = null;
            onLungeArrive?.();
          },
        });

        if (!handle) {
          window.clearTimeout(giveUp);
          setYumiRingState("failed");
          return;
        }
        sceneRef.current = handle;
        window.clearTimeout(giveUp);
        setYumiRingState("live");
        setLive(true);

        const loop = (now: number) => {
          if (cancelled || !handle) return;

          // --- where she should be this frame
          const rect = canvas.getBoundingClientRect();
          if (openRef.current) {
            handle.setScreenAnchor(rect.width / 2, rect.height * 0.42, OPEN_RADIUS);
          } else if (answeringRef.current) {
            /* Up and smaller, so the answer has the page. */
            handle.setScreenAnchor(
              rect.width / 2,
              rect.height * ANSWER_HEIGHT,
              ANSWER_RADIUS,
            );
          } else {
            const figure = stageRef.current?.querySelector("[data-yumi-figure]");
            const anchor = figure?.getBoundingClientRect();
            if (anchor) {
              handle.setScreenAnchor(
                anchor.left + anchor.width / 2 - rect.left,
                anchor.top + anchor.height / 2 - rect.top,
                REST_RADIUS,
              );
            }
          }

          // --- the occasional reach for a cookie
          if (!openRef.current && !reduced && now > lungeAt) {
            const cookies = Array.from(
              stageRef.current?.querySelectorAll<HTMLElement>("[data-yumi-cookie]") ?? [],
            );
            /* Only a cookie that is actually on screen and can still be
               taken. Reaching for one scrolled out of view, or for a
               disabled tray, is a reach into nothing. */
            const reachable = cookies.filter(element => {
              if (element.hasAttribute("disabled")) return false;
              const box = element.getBoundingClientRect();
              return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
            });

            if (reachable.length > 0) {
              const pick = reachable[Math.floor(Math.random() * reachable.length)];
              const box = pick.getBoundingClientRect();
              const started = handle.lungeAt(
                box.left + box.width / 2,
                box.top + box.height / 2,
              );
              if (started) reachingFor.current = pick;
            }
            lungeAt = now + nextLungeDelay();
          }

          handle.frame(now);

          // --- the ring rides on the eye
          if (ringRef.current) {
            const eye = handle.eyeScreenPosition();
            ringRef.current.style.transform = `translate(${eye.x}px, ${eye.y}px)`;

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
              stage.style.setProperty("--yumi-x", `${eye.x}px`);
              stage.style.setProperty("--yumi-y", `${eye.y}px`);
            }

            /* Only while answering: this is the one state whose column needs
               a height, and a custom property written every frame on the idle
               screen would be a style invalidation nothing reads. */
            if (answeringRef.current) {
              ringRef.current.style.setProperty(
                "--below-room",
                `${Math.max(0, rect.height - eye.y - BELOW_OFFSET - BELOW_AIR)}px`,
              );
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
      sceneRef.current = null;
      handle?.dispose();
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
          tabIndex={open ? 0 : -1}
        />

        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={event => {
            sceneRef.current?.pointerDown(event.clientX, event.clientY);
            (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={event =>
            sceneRef.current?.pointerMove(event.clientX, event.clientY)
          }
          onPointerUp={() => sceneRef.current?.pointerUp()}
          onPointerCancel={() => sceneRef.current?.pointerUp()}
        />

        <div
          ref={ringRef}
          className={styles.ring}
        >
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
                }}
              >
                <button
                  type="button"
                  onClick={() => choose(spoke)}
                  tabIndex={open ? 0 : -1}
                  aria-label={spoke.label}
                >
                  {/* The disc is the key; the label is a caption under it and
                      may be wider. Keeping them as two boxes is what lets a
                      long word finish without the circle growing. */}
                  <span className={styles.disc}>
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
                </button>
              </div>
            );
          })}

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
          {meta ? (
            <div className={styles.above}>
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

          <div className={styles.below}>
            {lines?.primary ? (
              <p className={styles.voice}>{lines.primary}</p>
            ) : null}

            {field ? (
              <div className={styles.field}>
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

          {/* She is the home key, and a character you have to guess at is
              not a key. So it is said out loud, only while the ring is out. */}
          <p className={styles.homecap}>{t.navigation.home}</p>
        </div>
      </div>
    </>
  );
}
