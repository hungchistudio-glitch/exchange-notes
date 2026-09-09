"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import usePhonetics from "@/hooks/usePhonetics";
import { cosmicCoreTone, zhuyinGlyph } from "@/lib/pet/moodEngine";
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

type GhostPhase = "pending" | "dragging" | "releasing" | "returning";

/*
 * One cookie between the tray and Yumi's mouth.
 *
 * There used to be a single one of these, which is what made feeding a queue:
 * picking up a second cookie while the first was still flying overwrote the
 * first, so it never landed, was never eaten, and Yumi was left waiting for a
 * cookie that no longer existed — with the tray disabled off that same wait.
 * A list means a release hands the cookie off to its own flight and frees the
 * hand immediately, which is the whole "keep feeding" behaviour.
 */
type Ghost = {
  // An instance id, not the cookie's: the same cookie can be picked up again
  // while an earlier flight of it is still in the air.
  id: number;
  // Which finger owns this one, or null once it has been let go. Also what
  // keeps a second contact from stealing a drag out from under the first.
  pointerId: number | null;
  cookie: Cookie;
  originX: number;
  originY: number;
  x: number;
  y: number;
  phase: GhostPhase;
  attracted: boolean;
};

// How long to wait for a flight's transition before settling it anyway. These
// sit just past the CSS durations (0.5s for the feed, 0.3s for the return).
const FEED_FLIGHT_MS = 700;
const RETURN_FLIGHT_MS = 520;
// With transitions off there is nothing to wait for, and 700ms of nothing is
// exactly the stall the reduced-motion path is supposed to avoid.
const REDUCED_FLIGHT_MS = 60;
// Comfortably past the ~300ms a touch browser may take to synthesise a click.
const RECENT_FEED_MS = 800;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Pointer events resolve against the ref, never against rendered state:
  // a down and an up can land in the same React batch on a fast tap, and the
  // up has to see what the down wrote.
  const ghostsRef = useRef<Ghost[]>([]);
  const ghostSeqRef = useRef(0);
  /*
   * The in-flight timers, keyed by ghost.
   *
   * Presence in this map is also the "not settled yet" flag — the single
   * boolean that used to serve that purpose could only ever describe one
   * flight, so with two in the air it settled the wrong one.
   */
  // Cookies fed a moment ago, so a trailing synthetic click cannot feed one of
  // them again. Each entry removes itself; the set only ever holds the last
  // instant's worth, and nothing outside this component reads it.
  const recentlyFedRef = useRef(new Set<string>());
  const flightTimersRef = useRef(
    new Map<
      number,
      { raf: number; fallback: ReturnType<typeof setTimeout> }
    >(),
  );

  function updateGhosts(next: (prev: Ghost[]) => Ghost[]) {
    const resolved = next(ghostsRef.current);
    ghostsRef.current = resolved;
    setGhosts(resolved);
  }

  function patchGhost(id: number, patch: Partial<Ghost>) {
    updateGhosts((prev) =>
      prev.map((ghost) => (ghost.id === id ? { ...ghost, ...patch } : ghost)),
    );
  }

  function heldGhost(pointerId: number) {
    return ghostsRef.current.find(
      (ghost) =>
        ghost.pointerId === pointerId
        && (ghost.phase === "pending" || ghost.phase === "dragging"),
    );
  }

  const liveDrag = ghosts.find((ghost) => ghost.phase === "dragging") ?? null;
  /*
   * Yumi's eyes follow the cookie, and this is reported by value.
   *
   * The dependency used to be the drag object itself, which is rebuilt on
   * every pointermove — and on the home screen the handler on the other end
   * was a plain function, so a new identity every render re-ran this, which
   * set state, which rendered, which re-ran this. A drag there was a render
   * loop for as long as the finger was down, and the cookie visibly stopped
   * keeping up with it. Depending on the coordinates means this fires when
   * the cookie actually moves and not once per render.
   */
  const dragX = liveDrag?.x ?? null;
  const dragY = liveDrag?.y ?? null;
  const onDragPointRef = useRef(onDragPoint);
  const onAttractChangeRef = useRef(onAttractChange);

  useEffect(() => {
    onDragPointRef.current = onDragPoint;
    onAttractChangeRef.current = onAttractChange;
  });

  useEffect(() => {
    if (dragX === null || dragY === null) {
      onDragPointRef.current?.(null);
      return;
    }

    onDragPointRef.current?.({ x: dragX, y: dragY });
  }, [dragX, dragY]);

  const dragAttracted = Boolean(liveDrag?.attracted);

  useEffect(() => {
    onAttractChangeRef.current?.(dragAttracted);
  }, [dragAttracted]);

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

  function feedPoint() {
    const target = feedTargetRef?.current ?? yumiZoneRef.current;
    if (!target) return null;

    const rect = target.getBoundingClientRect();

    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  /*
   * Settles one flight, exactly once.
   *
   * Called from three places that can all race each other — the transition
   * ending, the fallback timer, and a missing drop target — so the map lookup
   * at the top is the guard: the first caller removes the timers, every later
   * one finds nothing and returns.
   */
  function finishFlight(id: number) {
    const timers = flightTimersRef.current.get(id);
    if (!timers) return;

    cancelAnimationFrame(timers.raf);
    clearTimeout(timers.fallback);
    flightTimersRef.current.delete(id);

    const ghost = ghostsRef.current.find((entry) => entry.id === id);
    updateGhosts((prev) => prev.filter((entry) => entry.id !== id));

    if (!ghost || ghost.phase !== "releasing") return;

    const fedId = ghost.cookie.id;
    const recentlyFed = recentlyFedRef.current;

    recentlyFed.add(fedId);
    setTimeout(() => recentlyFed.delete(fedId), RECENT_FEED_MS);

    onFeed(ghost.cookie);
  }

  // Second half of a release: on the next frame, move the ghost's target
  // position — Yumi's mouth for a feed, the slot it came from for a cancel —
  // so the CSS transition on the ghost animates it there, then settle when
  // that finishes.
  function beginFlight(id: number, phase: "releasing" | "returning") {
    const raf = requestAnimationFrame(() => {
      const ghost = ghostsRef.current.find((entry) => entry.id === id);
      if (!ghost || ghost.phase !== phase) return;

      const destination =
        phase === "releasing"
          ? feedPoint()
          : { x: ghost.originX, y: ghost.originY };

      // No Yumi to fly to. Settle rather than leave the cookie hanging over
      // the page — a feed still counts, it just doesn't get its travel.
      if (!destination) {
        finishFlight(id);
        return;
      }

      patchGhost(id, destination);
    });

    const fallback = setTimeout(
      () => finishFlight(id),
      prefersReducedMotion()
        ? REDUCED_FLIGHT_MS
        : phase === "releasing"
          ? FEED_FLIGHT_MS
          : RETURN_FLIGHT_MS,
    );

    flightTimersRef.current.set(id, { raf, fallback });
  }

  // On release: either let go inside Yumi's zone, or a plain tap (never
  // dragged past the threshold) — both count as feeding, and both play the
  // same "fly to Yumi" transition for a consistent, satisfying finish. A drag
  // released anywhere else travels back to where it came from.
  function releaseGhost(ghost: Ghost, clientX: number, clientY: number) {
    if (ghost.phase === "dragging" && !isOverYumi(clientX, clientY)) {
      /*
       * Cancelled, and it travels home rather than vanishing.
       *
       * A core that disappears from under the finger reads as an error even
       * though nothing went wrong, and this is a playful interaction, not a
       * form rejecting a field. The return is the same ghost on the same two
       * properties as the feed — only the easing and the destination differ.
       */
      patchGhost(ghost.id, {
        x: clientX,
        y: clientY,
        phase: "returning",
        attracted: false,
        pointerId: null,
      });
      beginFlight(ghost.id, "returning");
      return;
    }

    haptic(18);
    onFeedStart?.(ghost.cookie);
    patchGhost(ghost.id, {
      x: ghost.phase === "dragging" ? clientX : ghost.originX,
      y: ghost.phase === "dragging" ? clientY : ghost.originY,
      phase: "releasing",
      attracted: false,
      pointerId: null,
    });
    beginFlight(ghost.id, "releasing");
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    cookie: Cookie,
  ) {
    if (disabled) return;
    // One hand at a time. A second contact landing mid-drag would fight the
    // first for Yumi's gaze and for the attraction zone. Read from the ref,
    // not from rendered state: two presses can land in the same batch.
    if (ghostsRef.current.some((ghost) => ghost.pointerId !== null)) return;

    /*
     * Capture is best-effort, and deliberately not load-bearing.
     *
     * It throws on a pointer the browser no longer considers active, which
     * some WebKit and assistive-touch paths produce — and when the whole drag
     * hung off the captured element, that threw the gesture away and stranded
     * whatever had already been picked up. The window listeners below are what
     * actually carry the drag; this only keeps the button's own :active state
     * honest while the finger is outside it.
     */
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // No capture. The window listeners do not need it.
    }

    attachDragListeners();

    const id = ghostSeqRef.current++;

    updateGhosts((prev) => [
      ...prev,
      {
        id,
        pointerId: event.pointerId,
        cookie,
        originX: event.clientX,
        originY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        phase: "pending",
        attracted: false,
      },
    ]);
  }

  /*
   * Move, up and cancel live on the window, not on the button.
   *
   * They used to be React handlers on the slot, which only saw anything at all
   * because of pointer capture — so any path that lost or never established
   * capture (capture refused, the element re-rendered out from under the
   * pointer, an assistive-touch gesture) stopped delivering moves the moment
   * the finger left the slot, and delivered no release at all. The cookie
   * froze mid-air under a finger that was still moving and stayed there.
   * Listening on the window means the release always arrives, captured or not.
   */
  function handleDragMove(event: PointerEvent) {
    const ghost = heldGhost(event.pointerId);
    if (!ghost) return;

    const dx = event.clientX - ghost.originX;
    const dy = event.clientY - ghost.originY;
    const dragging =
      ghost.phase === "dragging" || Math.hypot(dx, dy) > DRAG_THRESHOLD;

    if (dragging && ghost.phase !== "dragging") haptic(8);

    const attracted = dragging && isOverYumi(event.clientX, event.clientY);

    // Only on the way in. The zone edge is soft enough that a hand hovering
    // across it would otherwise buzz repeatedly.
    if (attracted && !ghost.attracted) haptic(5);

    patchGhost(ghost.id, {
      x: event.clientX,
      y: event.clientY,
      phase: dragging ? "dragging" : "pending",
      attracted,
    });
  }

  function handleDragUp(event: PointerEvent) {
    const ghost = heldGhost(event.pointerId);
    if (!ghost) return;

    releaseGhost(ghost, event.clientX, event.clientY);
  }

  /*
   * Interrupted, not dropped.
   *
   * This used to delete the drag outright. That is fine while nothing has been
   * promised, but a cancel arriving after the feed had been announced left
   * Yumi mouth-open, waiting for a cookie that had ceased to exist, with the
   * tray disabled off exactly that wait — a lock that lasted until reload.
   * Sending it home is a complete outcome from any phase.
   */
  function handleDragCancel(event: PointerEvent) {
    const ghost = heldGhost(event.pointerId);
    if (!ghost) return;

    patchGhost(ghost.id, {
      phase: "returning",
      attracted: false,
      pointerId: null,
    });
    beginFlight(ghost.id, "returning");
  }

  /*
   * The window listeners, attached the instant a finger goes down.
   *
   * Deliberately imperative rather than an effect keyed on "is something being
   * dragged": an effect only runs after React has committed, so every pointer
   * event between the press and that commit would be missed — and the press is
   * exactly when the gesture starts. Attaching here means the drag is being
   * listened for before `pointerdown` has even finished returning.
   */
  /*
   * The window listeners, attached the instant a finger goes down.
   *
   * Deliberately imperative rather than an effect keyed on "is something being
   * dragged": an effect only runs after React has committed, so every pointer
   * event between the press and that commit would be missed — and the press is
   * exactly when the gesture starts. Attaching here means the drag is being
   * listened for before `pointerdown` has finished returning.
   */
  const pointerHandlersRef = useRef({
    move: handleDragMove,
    up: handleDragUp,
    cancel: handleDragCancel,
  });

  // Refreshed after every render so the listeners, which are attached once per
  // gesture, always call the current closures.
  useEffect(() => {
    pointerHandlersRef.current = {
      move: handleDragMove,
      up: handleDragUp,
      cancel: handleDragCancel,
    };
  });

  type DragListeners = {
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
    cancel: (event: PointerEvent) => void;
  };

  // The same three function objects for the life of the component, because
  // removeEventListener only accepts the identity it was given.
  const listenersRef = useRef<DragListeners | null>(null);
  const listeningRef = useRef(false);

  function detachDragListeners() {
    const listeners = listenersRef.current;
    if (!listeners || !listeningRef.current) return;

    listeningRef.current = false;
    window.removeEventListener("pointermove", listeners.move);
    window.removeEventListener("pointerup", listeners.up);
    window.removeEventListener("pointercancel", listeners.cancel);
  }

  // Stops listening once no finger is holding anything. Ghosts still in the
  // air are none of the pointer layer's business.
  function detachIfHandsFree() {
    if (ghostsRef.current.some((ghost) => ghost.pointerId !== null)) return;

    detachDragListeners();
  }

  function attachDragListeners() {
    if (listeningRef.current) return;

    if (!listenersRef.current) {
      listenersRef.current = {
        move: (event) => pointerHandlersRef.current.move(event),
        up: (event) => {
          pointerHandlersRef.current.up(event);
          detachIfHandsFree();
        },
        cancel: (event) => {
          pointerHandlersRef.current.cancel(event);
          detachIfHandsFree();
        },
      };
    }

    listeningRef.current = true;
    window.addEventListener("pointermove", listenersRef.current.move);
    window.addEventListener("pointerup", listenersRef.current.up);
    window.addEventListener("pointercancel", listenersRef.current.cancel);
  }

  useEffect(() => {
    const listeners = listenersRef;

    return () => {
      const attached = listeners.current;
      if (!attached) return;

      window.removeEventListener("pointermove", attached.move);
      window.removeEventListener("pointerup", attached.up);
      window.removeEventListener("pointercancel", attached.cancel);
    };
  }, []);

  // Nothing may outlive the component. A pending flight's rAF or fallback
  // firing after unmount would settle a ghost that no longer renders.
  useEffect(() => {
    const timers = flightTimersRef.current;

    return () => {
      timers.forEach(({ raf, fallback }) => {
        cancelAnimationFrame(raf);
        clearTimeout(fallback);
      });
      timers.clear();
    };
  }, []);

  // Accessibility activation and a few WebKit/assistive-touch paths can
  // produce a click without any matching pointer sequence. This is a guarded
  // fallback: a real release has already put this cookie into a flight, so it
  // cannot feed the same cookie twice.
  function handleClick(
    event: React.MouseEvent<HTMLButtonElement>,
    cookie: Cookie,
  ) {
    if (disabled) return;
    // Still in the air from this same gesture's pointer release.
    if (ghostsRef.current.some((ghost) => ghost.cookie.id === cookie.id)) return;
    /*
     * Or just landed. A click is synthesised after the pointer sequence, and
     * on a touch browser it can trail the release by a few hundred
     * milliseconds — longer than a reduced-motion flight, which settles in
     * 60ms. Without this, the same tap could feed the cookie a second time.
     */
    if (recentlyFedRef.current.has(cookie.id)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const id = ghostSeqRef.current++;

    onFeedStart?.(cookie);
    updateGhosts((prev) => [
      ...prev,
      {
        id,
        pointerId: null,
        cookie,
        originX,
        originY,
        x: originX,
        y: originY,
        phase: "releasing",
        attracted: false,
      },
    ]);
    beginFlight(id, "releasing");
  }

  /*
   * The readings for the cookies on screen, and only those.
   *
   * A zhuyin cookie wears the first symbol of its word's Chinese reading.
   * That used to be computed here from pinyin-pro — 640KB of dictionary on
   * the critical path of two screens, to draw one character on a biscuit.
   * The same batched request every word card already makes answers it, and
   * the answer is cached for the session and mirrored to the device, so it
   * is a round trip once and instant forever after.
   *
   * Only the visible slice is asked for: the tray shows three cookies on the
   * home screen and eight on the vocabulary page, however long the library is.
   */
  const phoneticsFor = usePhonetics(
    visible
      .filter((cookie) => cookie.type === "zhuyin")
      .map((cookie) => ({ text: cookie.translation, language: "zh-TW" as const })),
  );

  function glyphFor(cookie: Cookie) {
    if (cookie.type !== "zhuyin") return cookie.glyph;

    const reading = phoneticsFor({
      text: cookie.translation,
      language: "zh-TW",
    });

    // Undefined while the lookup is in the air — the cookie wears its
    // placeholder until then rather than nothing.
    return reading?.zhuyin ? zhuyinGlyph(reading.zhuyin) : cookie.glyph;
  }

  // The ghost and the tray slots draw the same object, so the face is one
  // function rather than two that have to be kept looking alike.
  function face(
    cookie: Cookie,
    index: number,
    state: "resting" | "lifted" | "attracted" | "absorbing",
  ) {
    if (!cosmic) {
      return <span className={styles.glyphText}>{glyphFor(cookie)}</span>;
    }

    return (
      <LearningCore
        cookie={cookie}
        glyph={glyphFor(cookie)}
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
              const lifted = ghosts.some(
                (ghost) => ghost.cookie.id === cookie.id,
              );

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
                  } ${lifted ? styles.cookieHidden : ""}`}
                  onPointerDown={(event) => handlePointerDown(event, cookie)}
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

      {typeof document !== "undefined"
        ? createPortal(
            <>
              {ghosts.map((ghost) => (
                <div
                  key={ghost.id}
                  className={`${cosmic ? styles.ghostCore : styles.ghost} ${
                    cosmic ? "" : styles[`cookie--${ghost.cookie.type}`]
                  } ${
                    ghost.phase === "releasing"
                      ? styles.ghostFlying
                      : ghost.phase === "returning"
                        ? styles.ghostReturning
                        : styles.ghostDragging
                  }`}
                  data-attracted={ghost.attracted ? "true" : "false"}
                  /*
                   * Position as a transform, not as left/top.
                   *
                   * This element is moved on every pointermove of a drag.
                   * Written to left/top that is a layout pass, a paint and a
                   * composite per frame — for a fixed-position element the
                   * browser cannot skip any of the three, and on a phone it is
                   * the difference between a Core that follows the finger and
                   * one that lags behind it. As a translate it is composited
                   * only, and the flight and the spring back become GPU
                   * transitions rather than animated geometry. See .ghost in
                   * the module CSS.
                   */
                  style={
                    {
                      "--ghost-x": `${ghost.x}px`,
                      "--ghost-y": `${ghost.y}px`,
                    } as CSSProperties
                  }
                  onTransitionEnd={(event) => {
                    if (ghost.phase !== "releasing" && ghost.phase !== "returning") {
                      return;
                    }

                    /*
                     * Only this element's own travel ends the flight.
                     *
                     * transitionend bubbles, and the Core inside this wrapper
                     * fades its chassis out over 220ms while it is being
                     * absorbed — so an unfiltered handler settled the flight
                     * less than halfway through and the cookie jumped the rest
                     * of the way into Yumi's mouth.
                     */
                    if (event.target !== event.currentTarget) return;
                    if (event.propertyName !== "translate") return;

                    finishFlight(ghost.id);
                  }}
                >
                  {face(
                    ghost.cookie,
                    0,
                    ghost.phase === "releasing"
                      ? "absorbing"
                      : ghost.attracted
                        ? "attracted"
                        : "lifted",
                  )}
                </div>
              ))}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
