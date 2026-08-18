"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { cosmicCoreTone } from "@/lib/pet/moodEngine";
import type { Cookie, CookieType } from "@/lib/pet/types";
import type { TranslationDictionary } from "@/lib/i18n/types";

import LearningCore from "./LearningCore";
import styles from "./CookieTray.module.css";

type MascotCopy = TranslationDictionary["vocabulary"]["mascot"];

type CookieTrayProps = {
  cookies: Cookie[];
  yumiZoneRef: RefObject<HTMLDivElement | null>;
  onFeed: (cookie: Cookie) => void;
  onFeedStart?: (cookie: Cookie) => void;
  feedTargetRef?: RefObject<HTMLElement | null>;
  disabled?: boolean;
  copy: MascotCopy;
  maxVisible?: number;
  hideHint?: boolean;
  // Reports the live pointer position while a cookie is actively being
  // dragged (null once released/settled), so Yumi's eyes can follow it.
  onDragPoint?: (point: { x: number; y: number } | null) => void;
  /*
   * Cosmic Mode. Repaints each cookie as a Learning Core and turns on the
   * parts of the interaction the brief asks for by name — the magnetic
   * approach, the absorption. The drag itself, the feed, the economy and the
   * accessibility path are the same code in both modes; only what is on
   * screen changes.
   */
  cosmic?: boolean;
  /*
   * Fires when the held cookie crosses into, or back out of, Yumi's
   * attraction zone — so Yumi can answer a hand that is nearly there rather
   * than waiting for the drop.
   */
  onAttractChange?: (attracted: boolean) => void;
  /*
   * Whether "+N more" can open the rest of the tray in place. The home
   * screen's corner tray shows three and has nowhere to put twenty, so it
   * opts out; the vocabulary page's full tray is where the inventory lives.
   */
  expandable?: boolean;
};

const DEFAULT_VISIBLE_LIMIT = 8;
const DRAG_THRESHOLD = 10;

/*
 * How far out Yumi still pulls.
 *
 * The brief asks for 1.3–1.5× the visible body, and this is measured off the
 * Yumi zone rather than hard-coded so it keeps up with the hero as the hero
 * scales — the zone is square-ish around Yumi and its shorter axis tracks the
 * body closely enough at every size the page renders at.
 */
const ATTRACTION_SCALE = 1.4;

/*
 * Haptics, where the platform has them.
 *
 * Guarded twice because the delivery target does not: iOS Safari, including
 * an installed PWA, exposes no Vibration API at all, so this is silently
 * inert there and the interaction has to work without it — which is why every
 * beat it marks is also carried visually. Where it does fire (Android), the
 * system's own haptic setting is already respected by the platform, so there
 * is nothing further to check.
 */
function haptic(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;

  navigator.vibrate(pattern);
}

function cookieLabel(copy: MascotCopy, type: CookieType) {
  switch (type) {
    case "letter":
      return copy.cookieTypeLetter;
    case "zhuyin":
      return copy.cookieTypeZhuyin;
  }
}

/*
 * What a cookie says to a screen reader in Cosmic Mode.
 *
 * The glow is the only thing carrying lifecycle on screen, so the same fact
 * has to arrive some other way for anyone who is not seeing it — that is the
 * whole reason the tone is computed from named states rather than colours.
 * The label also names both ways in, because drag cannot be the only one.
 */
function coreAriaLabel(copy: MascotCopy, cookie: Cookie) {
  const state = copy.coreState[cosmicCoreTone(cookie)];

  return copy.coreAriaLabel
    .replace("{word}", cookie.word)
    .replace("{state}", state);
}

type DragPhase = "pending" | "dragging" | "returning" | "releasing";

type DragState = {
  cookie: Cookie;
  originX: number;
  originY: number;
  x: number;
  y: number;
  phase: DragPhase;
  // True only while the pointer is inside Yumi's attraction zone. Lives on
  // the drag rather than in its own state so it can never disagree with the
  // drag it describes.
  attracted: boolean;
};

export default function CookieTray({
  cookies,
  yumiZoneRef,
  onFeed,
  onFeedStart,
  feedTargetRef,
  disabled,
  copy,
  maxVisible = DEFAULT_VISIBLE_LIMIT,
  hideHint = false,
  onDragPoint,
  cosmic = false,
  onAttractChange,
  expandable = true,
}: CookieTrayProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (!onDragPoint) return;

    if (drag && drag.phase === "dragging") {
      onDragPoint({ x: drag.x, y: drag.y });
    } else {
      onDragPoint(null);
    }
  }, [drag, onDragPoint]);

  useEffect(() => {
    if (!onAttractChange) return;

    onAttractChange(Boolean(drag && drag.phase === "dragging" && drag.attracted));
  }, [drag, onAttractChange]);

  /*
   * Expansion is derived rather than synchronised.
   *
   * Feeding the tray down below the limit while it is open would otherwise
   * leave a "show fewer" control sitting over nothing, and the obvious fix —
   * an effect that closes it — is a setState inside an effect and therefore a
   * cascading render on every change to the cookie list. Gating the flag on
   * there actually being an overflow gets the same result with no effect at
   * all: the intent is remembered, and it simply has nothing to do until the
   * tray is long enough to need it again.
   */
  const showAll = expanded && cookies.length > maxVisible;
  const visible = showAll ? cookies : cookies.slice(0, maxVisible);
  const overflowCount = Math.max(cookies.length - visible.length, 0);

  function updateDrag(
    next: DragState | null | ((prev: DragState | null) => DragState | null),
  ) {
    // Pointer down/up can arrive inside the same React event batch on a
    // fast tap. Resolve against the ref synchronously so pointer-up always
    // sees the state written by pointer-down; React state remains the
    // rendering copy of the same value.
    const resolved =
      typeof next === "function"
        ? next(dragRef.current)
        : next;

    dragRef.current = resolved;
    setDrag(resolved);
  }

  /*
   * Yumi's attraction zone, and the drop target with it.
   *
   * Radial rather than the zone's raw rectangle, which is what the brief's
   * "1.3–1.5× the visible body" actually describes — and the same test now
   * decides both what the user is shown while approaching and whether the
   * drop lands, so the pull can never brighten somewhere a release would be
   * refused.
   */
  function isOverYumi(clientX: number, clientY: number) {
    const zone = yumiZoneRef.current;
    if (!zone) return false;

    const rect = zone.getBoundingClientRect();
    const radius = (Math.min(rect.width, rect.height) / 2) * ATTRACTION_SCALE;

    return (
      Math.hypot(
        clientX - (rect.left + rect.width / 2),
        clientY - (rect.top + rect.height / 2),
      ) <= radius
    );
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    cookie: Cookie,
  ) {
    if (disabled) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    updateDrag({
      cookie,
      originX: event.clientX,
      originY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      phase: "pending",
      attracted: false,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || current.phase === "releasing" || current.phase === "returning") {
      return;
    }

    const dx = event.clientX - current.originX;
    const dy = event.clientY - current.originY;
    const dragging =
      current.phase === "dragging" || Math.hypot(dx, dy) > DRAG_THRESHOLD;

    if (dragging && current.phase !== "dragging") haptic(8);

    const attracted = dragging && isOverYumi(event.clientX, event.clientY);

    // Only on the way in. The zone edge is soft enough that a hand hovering
    // across it would otherwise buzz repeatedly.
    if (attracted && !current.attracted) haptic(5);

    updateDrag({
      ...current,
      x: event.clientX,
      y: event.clientY,
      phase: dragging ? "dragging" : "pending",
      attracted,
    });
  }

  // On release: either let go inside Yumi's zone, or a plain tap (never
  // dragged past the threshold) — both count as feeding, and both play the
  // same "fly to Yumi" transition for a consistent, satisfying finish. A drag
  // released anywhere else travels back to where it came from.
  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current) return;

    const overYumi = isOverYumi(event.clientX, event.clientY);

    if (current.phase !== "dragging" || overYumi) {
      settledRef.current = false;
      haptic(18);
      onFeedStart?.(current.cookie);
      updateDrag({
        ...current,
        x: current.phase === "dragging" ? event.clientX : current.originX,
        y: current.phase === "dragging" ? event.clientY : current.originY,
        phase: "releasing",
        attracted: false,
      });
    } else {
      /*
       * Cancelled, and it travels home rather than vanishing.
       *
       * A core that disappears from under the finger reads as an error even
       * though nothing went wrong, and this is a playful interaction, not a
       * form rejecting a field. The return is the same ghost on the same two
       * properties as the feed — only the easing and the destination differ.
       */
      updateDrag({
        ...current,
        x: event.clientX,
        y: event.clientY,
        phase: "returning",
        attracted: false,
      });
    }
  }

  // Accessibility activation and a few WebKit/assistive-touch paths can
  // produce a click without delivering the matching pointer-up back to the
  // captured element. This is a guarded fallback: a normal pointer-up has
  // already moved the drag out of its pending phase, so it cannot feed twice.
  function handleClick(
    event: React.MouseEvent<HTMLButtonElement>,
    cookie: Cookie,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const current = dragRef.current ?? {
      cookie,
      originX: rect.left + rect.width / 2,
      originY: rect.top + rect.height / 2,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      phase: "pending" as DragPhase,
      attracted: false,
    };

    if (current.cookie.id !== cookie.id || current.phase !== "pending") return;

    settledRef.current = false;
    onFeedStart?.(current.cookie);
    updateDrag({
      ...current,
      x: event.clientX || current.originX,
      y: event.clientY || current.originY,
      phase: "releasing",
      attracted: false,
    });
  }

  function settleRelease() {
    if (settledRef.current) return;
    settledRef.current = true;

    const current = dragRef.current;
    if (current) onFeed(current.cookie);
    updateDrag(null);
  }

  // Second half of a release: on the next frame, move the ghost's target
  // position — Yumi's centre for a feed, the tray slot it came from for a
  // cancel — so the CSS transition on the ghost animates it there, then
  // settle when that finishes.
  useEffect(() => {
    const phase = drag?.phase;
    if (phase !== "releasing" && phase !== "returning") return;

    if (phase === "returning") {
      const raf = requestAnimationFrame(() => {
        updateDrag((prev) =>
          prev && prev.phase === "returning"
            ? { ...prev, x: prev.originX, y: prev.originY }
            : prev,
        );
      });

      // Same safety net as the feed below: a transition that never fires
      // must not leave a ghost stranded over the page.
      const fallback = setTimeout(() => updateDrag(null), 520);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(fallback);
      };
    }

    const zone = yumiZoneRef.current;
    if (!zone || !drag) {
      if (drag) onFeed(drag.cookie);
      updateDrag(null);
      return;
    }

    const target = feedTargetRef?.current ?? zone;
    const rect = target.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    const raf = requestAnimationFrame(() => {
      updateDrag((prev) =>
        prev && prev.phase === "releasing"
          ? { ...prev, x: targetX, y: targetY }
          : prev,
      );
    });

    // Safety net: if the transition never fires (e.g. reduced-motion, or
    // the cookie happened to already be at Yumi's position), still settle
    // so the cookie doesn't get stuck un-fed.
    const fallback = setTimeout(settleRelease, 700);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.phase]);

  // The ghost and the tray slots draw the same object, so the face is one
  // function rather than two that have to be kept looking alike.
  function face(
    cookie: Cookie,
    index: number,
    state: "resting" | "lifted" | "attracted" | "absorbing",
  ) {
    if (!cosmic) return <span className={styles.glyphText}>{cookie.glyph}</span>;

    return (
      <LearningCore
        cookie={cookie}
        tone={cosmicCoreTone(cookie)}
        state={state}
        index={index}
        // The ember is ambience for the tray as it normally appears. Expanded,
        // the rows past that are still Cores — they just stop breathing.
        animated={index < maxVisible}
        newBadgeLabel={copy.coreNewBadge}
      />
    );
  }

  const slotClass = cosmic ? styles.slot : styles.cookie;
  const hint = cosmic ? copy.coreTrayHint : copy.cookieTrayHint;
  const empty = cosmic ? copy.coreTrayEmpty : copy.cookieTrayEmpty;

  return (
    <div className={styles.wrap} data-cosmic={cosmic ? "true" : "false"}>
      {visible.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <>
          <div className={styles.tray}>
            {visible.map((cookie, index) => {
              const isDragging = drag?.cookie.id === cookie.id;

              return (
                <button
                  key={cookie.id}
                  type="button"
                  disabled={disabled}
                  aria-label={
                    cosmic
                      ? coreAriaLabel(copy, cookie)
                      : copy.feedAriaLabel.replace("{word}", cookie.word)
                  }
                  title={cookieLabel(copy, cookie.type)}
                  className={`${slotClass} ${
                    cosmic ? "" : styles[`cookie--${cookie.type}`]
                  } ${isDragging ? styles.cookieHidden : ""}`}
                  onPointerDown={(event) => handlePointerDown(event, cookie)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={() => updateDrag(null)}
                  onClick={(event) => handleClick(event, cookie)}
                >
                  {face(cookie, index, "resting")}
                </button>
              );
            })}

            {overflowCount > 0 && expandable ? (
              <button
                type="button"
                className={cosmic ? styles.moreCore : styles.moreButton}
                aria-label={copy.coreTrayShowAllAriaLabel.replace(
                  "{count}",
                  String(cookies.length),
                )}
                onClick={() => setExpanded(true)}
              >
                {copy.cookieTrayMore.replace("{count}", String(overflowCount))}
              </button>
            ) : null}

            {overflowCount > 0 && !expandable ? (
              <span className={styles.more}>
                {copy.cookieTrayMore.replace("{count}", String(overflowCount))}
              </span>
            ) : null}
          </div>

          {showAll ? (
            <button
              type="button"
              className={styles.collapse}
              onClick={() => setExpanded(false)}
            >
              {copy.coreTrayShowLess}
            </button>
          ) : null}

          {hideHint ? null : <p className={styles.hint}>{hint}</p>}
        </>
      )}

      {drag && typeof document !== "undefined"
        ? createPortal(
            <div
              className={`${cosmic ? styles.ghostCore : styles.ghost} ${
                cosmic ? "" : styles[`cookie--${drag.cookie.type}`]
              } ${
                drag.phase === "releasing"
                  ? styles.ghostFlying
                  : drag.phase === "returning"
                    ? styles.ghostReturning
                    : styles.ghostDragging
              }`}
              data-attracted={drag.attracted ? "true" : "false"}
              /*
               * Position as a transform, not as left/top.
               *
               * This element is moved on every pointermove of a drag. Written
               * to left/top that is a layout pass, a paint and a composite per
               * frame — for a fixed-position element the browser cannot skip
               * any of the three, and on a phone it is the difference between
               * a Core that follows the finger and one that lags behind it.
               * As a translate it is composited only, and the flight and the
               * spring back become GPU transitions rather than animated
               * geometry. See .ghost in the module CSS.
               */
              style={
                {
                  "--ghost-x": `${drag.x}px`,
                  "--ghost-y": `${drag.y}px`,
                } as CSSProperties
              }
              onTransitionEnd={
                drag.phase === "releasing"
                  ? settleRelease
                  : drag.phase === "returning"
                    ? () => updateDrag(null)
                    : undefined
              }
            >
              {face(
                drag.cookie,
                0,
                drag.phase === "releasing"
                  ? "absorbing"
                  : drag.attracted
                    ? "attracted"
                    : "lifted",
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
