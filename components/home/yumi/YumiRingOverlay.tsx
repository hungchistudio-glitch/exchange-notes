"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { useLexiconSearchSheet } from "@/contexts/LexiconSearchContext";
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

/** Her radius on screen, in CSS pixels, at rest and with the ring open. */
const REST_RADIUS = 48;
const OPEN_RADIUS = 86;

/** How far the keys sit from her centre once the ring is out. */
const RING_RADIUS = 132;

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
  /** Rendered underneath while the scene is starting, or if it cannot. */
  children: React.ReactNode;
};

export default function YumiRingOverlay({
  stageRef,
  onLungeArrive,
  unreadCount = 0,
  children,
}: YumiRingOverlayProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { openSearch } = useLexiconSearchSheet();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<YumiSceneHandle | null>(null);
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

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
          },
          onTap: () => {
            /* A tap is the same key either way: it opens the ring, and once
               the ring is out it is the way home. */
            openRef.current = !openRef.current;
            setOpen(openRef.current);
          },
          onLungeArrive,
        });

        if (!handle) return;
        sceneRef.current = handle;
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
            const targets = Array.from(
              stageRef.current?.querySelectorAll("[data-yumi-cookie]") ?? [],
            ).map(element => element.getBoundingClientRect());
            /* Only for a cookie that is actually on screen. Reaching for
               something scrolled out of view is a reach into nothing. */
            const visible = targets.filter(
              box => box.bottom > 0 && box.top < window.innerHeight && box.width > 0,
            );
            if (visible.length > 0) {
              const pick = visible[Math.floor(Math.random() * visible.length)];
              handle.lungeAt(pick.left + pick.width / 2, pick.top + pick.height / 2);
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
           and stays visible; nothing else has to know. */
      });

    const onResize = () => handle?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      sceneRef.current = null;
      handle?.dispose();
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
          }}
          onPointerMove={event => sceneRef.current?.pointerMove(event.clientX, event.clientY)}
          onPointerUp={() => sceneRef.current?.pointerUp()}
          onPointerCancel={() => sceneRef.current?.pointerUp()}
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

          {/* She is the home key, and a character you have to guess at is
              not a key. So it is said out loud, only while the ring is out. */}
          <p className={styles.homecap}>{t.navigation.home}</p>
        </div>
      </div>
    </>
  );
}
