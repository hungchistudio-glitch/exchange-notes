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

/** How far the keys sit from her centre once the ring is out. */
const RING_RADIUS = 132;

/* How long she has to be held before the press means review rather than a
   tap, and how far a finger may wander inside that time and still be a
   press. She can be turned and her eye can be pulled, so a press that
   became a drag has to stop being a press. */
const LONG_PRESS_MS = 450;
const PRESS_SLOP_PX = 10;

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
  /** Words waiting. The key under her is drawn only while this is above zero. */
  reviewDue?: number;
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
  /** Rendered underneath while the scene is starting, or if it cannot. */
  children: React.ReactNode;
};

export default function YumiRingOverlay({
  stageRef,
  onLungeArrive,
  unreadCount = 0,
  reviewDue = 0,
  lines = null,
  meta = null,
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
  /* The pull is the only way to the ring, and nobody is born knowing it, so
     the hint sits under her until the ring has been opened once. */
  const hintRetired = useSyncExternalStore(
    subscribeToHint,
    getHintSnapshot,
    getHintServerSnapshot,
  );

  const pressTimer = useRef<number | null>(null);
  const pressFrom = useRef<{ x: number; y: number } | null>(null);
  const pressWentLong = useRef(false);

  const endPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressFrom.current = null;
  }, []);

  /*
   * The ring is positioned from the eye's own projected point every frame,
   * not from a CSS percentage, so it stays on her while she flies to the
   * middle and while the band is stretched.
   */
  const ringRef = useRef<HTMLDivElement>(null);
  const spokeRefs = useRef<Array<HTMLElement | null>>([]);

  const spokes: Spoke[] = [
    { key: "words", label: t.navigation.vocabulary, href: "/vocabulary", icon: ICON.words },
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
            /* The scene reports a tap on pointer-up, which is also when a
               long press has already fired and taken the reader to review.
               Swallow that one so the ring does not open behind it. */
            if (pressWentLong.current) {
              pressWentLong.current = false;
              return;
            }
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

  // Escape closes, the way it closes every other overlay in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
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
        className={`${styles.root} ${open ? styles.open : ""} ${live ? styles.live : ""}`}
        data-yumi-ring-open={open ? "true" : "false"}
      >
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

            /* Only while the ring is shut. With it out, holding a key is
               how a reader reads a label, not how they leave. */
            if (openRef.current) return;
            pressWentLong.current = false;
            pressFrom.current = { x: event.clientX, y: event.clientY };
            pressTimer.current = window.setTimeout(() => {
              pressTimer.current = null;
              pressFrom.current = null;
              pressWentLong.current = true;
              router.push("/review");
            }, LONG_PRESS_MS);
          }}
          onPointerMove={event => {
            sceneRef.current?.pointerMove(event.clientX, event.clientY);

            const from = pressFrom.current;
            if (!from) return;
            if (
              Math.abs(event.clientX - from.x) > PRESS_SLOP_PX ||
              Math.abs(event.clientY - from.y) > PRESS_SLOP_PX
            ) {
              endPress();
            }
          }}
          onPointerUp={() => {
            endPress();
            sceneRef.current?.pointerUp();
          }}
          onPointerCancel={() => {
            endPress();
            sceneRef.current?.pointerUp();
          }}
        />

        <div ref={ringRef} className={styles.ring} role={open ? "menu" : undefined}>
          {spokes.map((spoke, index) => {
            const angle = -Math.PI / 2 + (index * Math.PI * 2) / spokes.length;
            const x = Math.cos(angle) * RING_RADIUS;
            const y = Math.sin(angle) * RING_RADIUS;

            return (
              <div
                key={spoke.key}
                className={styles.spoke}
                ref={element => { spokeRefs.current[index] = element; }}
                style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
              >
                <button
                  type="button"
                  onClick={() => choose(spoke)}
                  tabIndex={open ? 0 : -1}
                  aria-label={spoke.label}
                >
                  <svg
                    width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.9"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  >
                    {spoke.icon}
                  </svg>
                  <span>{spoke.label}</span>
                  {spoke.badge ? (
                    <i className={styles.badge}>{spoke.badge > 9 ? "9+" : spoke.badge}</i>
                  ) : null}
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

            {reviewDue > 0 ? (
              <Link
                href="/review"
                className={styles.reviewKey}
                tabIndex={open ? -1 : 0}
              >
                <span>{t.home.quickStart.review}</span>
                <i>
                  {reviewDue}{" "}
                  {reviewDue === 1
                    ? t.home.progress.word
                    : t.home.progress.words}
                </i>
              </Link>
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
