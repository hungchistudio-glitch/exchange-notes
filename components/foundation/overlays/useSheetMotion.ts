"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import styles from "./SheetMotion.module.css";

const EXIT_DURATION_MS = 380;

/*
 * How far down the sheet has to be let go to be dismissed.
 *
 * A fraction of the screen so the gesture means the same thing on every
 * phone, capped so it does not become a long haul on a tall one. Read in two
 * places — the resistance while dragging and the decision on release — and
 * they must agree, which is why it is a function and not two constants.
 */
function dismissThreshold() {
  return Math.min(window.innerHeight * 0.16, 150);
}

type SheetPresentation = "sheet" | "fullscreen";

/*
 * Everything an open sheet has to take away from the page behind it.
 *
 * The panel says aria-modal="true", which is a promise that the rest of the
 * app is unavailable. Nothing was keeping it: Tab walked straight out of the
 * sheet and into the page underneath, and closing left focus wherever it had
 * wandered to rather than on the control that opened the sheet.
 *
 * A stack rather than a flag, because sheets nest — the friend picker opens
 * over the dish sheet — and only the topmost one should be reachable.
 */
/*
 * Where the sheet came from.
 *
 * A sheet that grows out of the row you tapped and shrinks back into it is
 * the whole of what "opening" means on a phone home screen: the thing you
 * touched became the thing you are looking at. A sheet that always rises from
 * the bottom edge is a panel being delivered, which is a different idea and a
 * flatter one.
 *
 * Nothing is passed in. The control that opened a sheet is the one the finger
 * was last on, and — since the focus work below already has to know it — the
 * one focus goes back to when the sheet closes. Reading it here rather than
 * threading an `originRef` through fourteen call sites keeps every existing
 * sheet as it is.
 *
 * pointerdown rather than focus alone: iOS does not focus a button when it is
 * tapped, so focus would find `body` for exactly the readers this is for.
 */
let lastPointerDownTarget: Element | null = null;
let lastPointerDownAt = 0;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (event) => {
      lastPointerDownTarget =
        event.target instanceof Element ? event.target : null;
      lastPointerDownAt = performance.now();
    },
    { capture: true, passive: true },
  );
}

/** Controls a sheet can plausibly have been opened from. */
const ORIGIN_CANDIDATE = [
  "button",
  "a[href]",
  "[role='button']",
  "[role='switch']",
  "[role='option']",
  "li",
].join(",");

function findOrigin(fallback: HTMLElement | null): HTMLElement | null {
  const tapped =
    performance.now() - lastPointerDownAt < 1200 ? lastPointerDownTarget : null;

  const candidate = tapped?.closest(ORIGIN_CANDIDATE) ?? fallback;
  if (!(candidate instanceof HTMLElement) || !candidate.isConnected) return null;

  return candidate;
}

/**
 * The transform that puts the panel over its origin, ready to grow out of it.
 *
 * Measured with the panel's own transform switched off for the length of one
 * layout read, because every other answer — unpicking the computed matrix,
 * or deriving the layout box from whichever of the four base transforms is
 * currently winning — is a way of getting the same number wrong later.
 *
 * Returns null when the origin is gone or off screen: a sheet flying in from
 * a point nobody can see is worse than one that simply rises.
 */
function originTransform(panel: HTMLElement, origin: HTMLElement) {
  const originRect = origin.getBoundingClientRect();

  if (originRect.width === 0 || originRect.height === 0) return null;
  if (originRect.bottom < 0 || originRect.top > window.innerHeight) return null;

  panel.setAttribute("data-measuring", "true");
  const panelRect = panel.getBoundingClientRect();
  panel.removeAttribute("data-measuring");

  if (panelRect.width === 0 || panelRect.height === 0) return null;

  /*
   * Uniform, and floored well short of nothing. A row gives about 0.8 and
   * reads as the row opening; an icon button would give 0.08, and a panel of
   * text scaled to a tenth is a smear rather than a sheet on its way.
   */
  const scale = Math.min(
    0.92,
    Math.max(0.42, originRect.width / panelRect.width),
  );

  return {
    x:
      originRect.left
      + originRect.width / 2
      - (panelRect.left + panelRect.width / 2),
    y:
      originRect.top
      + originRect.height / 2
      - (panelRect.top + panelRect.height / 2),
    scale,
  };
}

function applyOrigin(panel: HTMLElement | null, origin: HTMLElement | null) {
  if (!panel) return;

  const placement = origin ? originTransform(panel, origin) : null;

  if (!placement) {
    panel.removeAttribute("data-origin");
    return;
  }

  panel.style.setProperty("--sheet-from-x", `${placement.x}px`);
  panel.style.setProperty("--sheet-from-y", `${placement.y}px`);
  panel.style.setProperty("--sheet-from-scale", `${placement.scale}`);
  panel.setAttribute("data-origin", "true");
}

const openPanels: HTMLElement[] = [];
const inertedElements = new Set<Element>();

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Makes every body-level subtree except the topmost panel's inert.
 *
 * `inert` is what actually removes the page behind from the tab order, the
 * accessibility tree and hit testing, in one attribute. The Tab handler below
 * is the fallback for browsers without it, and the thing that wraps focus
 * around the ends — inert alone would let Tab escape to the browser chrome.
 */
function applyInertness() {
  for (const element of inertedElements) element.removeAttribute("inert");
  inertedElements.clear();

  const top = openPanels[openPanels.length - 1];
  if (!top) return;

  for (const child of Array.from(document.body.children)) {
    if (child.contains(top)) continue;
    child.setAttribute("inert", "");
    inertedElements.add(child);
  }
}

let bodyLockCount = 0;
let previousBodyOverflow = "";
let previousBodyOverscroll = "";
let previousBodyPosition = "";
let previousBodyTop = "";
let previousBodyLeft = "";
let previousBodyRight = "";
let previousBodyWidth = "";
let previousRootOverflow = "";
let previousRootOverscroll = "";
let previousRootScrollBehavior = "";
let lockedWindowScrollY = 0;
let lockedAppScroller: HTMLElement | null = null;
let previousAppScrollerOverflowY = "";
let previousAppScrollerOverscroll = "";

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    const body = document.body;
    const root = document.documentElement;
    const overflow = body.style.overflow;

    // Never remember a locked state as the value to restore. If something
    // else hid overflow first, storing "hidden" here means releasing this
    // lock re-applies it — and the page stays unscrollable for good once the
    // other holder lets go. That is exactly what stranded the capture screen
    // after taking a photo.
    previousBodyOverflow = overflow === "hidden" ? "" : overflow;
    previousBodyOverscroll = body.style.overscrollBehavior;
    previousBodyPosition = body.style.position;
    previousBodyTop = body.style.top;
    previousBodyLeft = body.style.left;
    previousBodyRight = body.style.right;
    previousBodyWidth = body.style.width;
    previousRootOverflow = root.style.overflow;
    previousRootOverscroll = root.style.overscrollBehavior;
    previousRootScrollBehavior = root.style.scrollBehavior;
    lockedWindowScrollY = window.scrollY;

    /*
     * The protected app no longer scrolls the document; it scrolls this one
     * viewport-sized element. Locking only body therefore leaves the actual
     * page free to move under a sheet. Hold both layers: the app scroller for
     * signed-in routes, and html/body for public overlays and iOS rubber-band
     * gestures at the root edge.
     */
    lockedAppScroller = document.querySelector<HTMLElement>(
      "[data-app-scroll-viewport]",
    );

    if (lockedAppScroller) {
      previousAppScrollerOverflowY = lockedAppScroller.style.overflowY;
      previousAppScrollerOverscroll =
        lockedAppScroller.style.overscrollBehavior;
      lockedAppScroller.style.overflowY = "hidden";
      lockedAppScroller.style.overscrollBehavior = "none";
    }

    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = `-${lockedWindowScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
  }

  bodyLockCount += 1;
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);

  if (bodyLockCount === 0) {
    const body = document.body;
    const root = document.documentElement;

    if (lockedAppScroller) {
      lockedAppScroller.style.overflowY = previousAppScrollerOverflowY;
      lockedAppScroller.style.overscrollBehavior = previousAppScrollerOverscroll;
      lockedAppScroller = null;
    }

    body.style.overflow = previousBodyOverflow;
    body.style.overscrollBehavior = previousBodyOverscroll;
    body.style.position = previousBodyPosition;
    body.style.top = previousBodyTop;
    body.style.left = previousBodyLeft;
    body.style.right = previousBodyRight;
    body.style.width = previousBodyWidth;
    root.style.overflow = previousRootOverflow;
    root.style.overscrollBehavior = previousRootOverscroll;

    /* Avoid the global smooth-scroll rule animating the page back into place. */
    root.style.scrollBehavior = "auto";
    if (lockedWindowScrollY !== 0) {
      window.scrollTo(0, lockedWindowScrollY);
    }
    root.style.scrollBehavior = previousRootScrollBehavior;
  }
}

type DragPointer = {
  id: number;
  startY: number;
  lastY: number;
  lastTime: number;
  currentY: number;
  velocityY: number;
};

export default function useSheetMotion({
  open = true,
  onClose,
  closeDisabled = false,
  presentation = "sheet",
}: {
  open?: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
  presentation?: SheetPresentation;
}) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [settled, setSettled] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragProgress, setDragProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const pointerRef = useRef<DragPointer | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const originRef = useRef<HTMLElement | null>(null);

  // A callback ref so it can be spread onto whatever element a sheet uses for
  // its panel — a section, a div — without the hook having to know which.
  const setPanelRef = useCallback((node: HTMLElement | null) => {
    panelRef.current = node;
  }, []);

  const clearMotionTimers = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (secondFrameRef.current !== null) {
      cancelAnimationFrame(secondFrameRef.current);
      secondFrameRef.current = null;
    }
  }, []);

  const animationDuration = useCallback(() => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 1
      : EXIT_DURATION_MS;
  }, []);

  const settleAfterMotion = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      setSettled(true);
    }, animationDuration());
  }, [animationDuration]);

  const requestClose = useCallback(() => {
    if (closingRef.current || closeDisabled) return;

    closingRef.current = true;
    pointerRef.current = null;
    /*
     * Re-measured rather than reused. The page behind is frozen while a sheet
     * is up, but it need not be where it was when the sheet opened — a new
     * sheet may have replaced the list, or the row may have been the last one
     * and since been removed. If it is gone, applyOrigin drops the attribute
     * and the sheet leaves the ordinary way.
     */
    applyOrigin(panelRef.current, originRef.current);
    setClosing(true);
    setSettled(false);
    setDragging(false);
    setDragProgress(0);
    setVisible(false);
    clearMotionTimers();

    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setRendered(false);
      setDragY(0);
      onClose();
      closingRef.current = false;
      setClosing(false);
    }, animationDuration());
  }, [animationDuration, clearMotionTimers, closeDisabled, onClose]);

  useEffect(() => {
    if (open) {
      clearMotionTimers();
      closingRef.current = false;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setClosing(false);
        setSettled(false);
        setRendered(true);
        setDragY(0);
        secondFrameRef.current = requestAnimationFrame(() => {
          secondFrameRef.current = null;
          setVisible(true);
          settleAfterMotion();
        });
      });
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setClosing(true);
      setSettled(false);
      setVisible(false);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setRendered(false);
        setDragY(0);
        setClosing(false);
      }, animationDuration());
    });
  }, [animationDuration, clearMotionTimers, open, settleAfterMotion]);

  useEffect(() => {
    if (!rendered) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [rendered]);

  useEffect(() => {
    if (!rendered) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rendered, requestClose]);

  /*
   * Focus goes in when the sheet arrives and comes back when it leaves.
   *
   * The panel itself, not the first field in it: several sheets focus their
   * own input on purpose and a couple deliberately do not, because raising
   * the keyboard during an entrance is its own kind of rough. Hence the
   * guard — if the sheet has already put focus somewhere inside itself, that
   * was a decision, and this leaves it alone.
   */
  /*
   * Before the first paint, not after it.
   *
   * The panel is in the document by the time a layout effect runs and the
   * browser has not drawn it yet, which is the only moment the "from" state
   * can be installed without a frame of the sheet sitting somewhere else
   * first. An ordinary effect is one paint too late.
   */
  useLayoutEffect(() => {
    if (!rendered) return;

    /*
     * On `rendered` alone, not on "rendered and not yet visible". The two
     * happen a frame apart and the panel has to be measured in between — but
     * a guard that depends on catching that gap is a guard that fails the
     * moment the two land in one commit. Writing the offsets while the sheet
     * is already open costs nothing: the visible rule wins until it closes,
     * and then they are exactly what the closing rule needs.
     */
    originRef.current = findOrigin(
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null,
    );

    applyOrigin(panelRef.current, originRef.current);
  }, [rendered]);

  useEffect(() => {
    if (!rendered) return;

    const panel = panelRef.current;
    if (!panel) return;

    /*
     * body does not count as "where focus was".
     *
     * iOS does not focus a button when it is tapped, so for a reader on a
     * phone document.activeElement is the document itself — and handing focus
     * back to <body> is the same as dropping it. The control the finger was
     * on is already known for the entrance, and it is the honest answer to
     * "what was the reader using before this opened".
     */
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
      && document.activeElement !== document.body
        ? document.activeElement
        : null;

    openPanels.push(panel);
    applyInertness();

    if (!panel.contains(document.activeElement)) {
      panel.focus({ preventScroll: true });
    }

    return () => {
      const index = openPanels.indexOf(panel);
      if (index !== -1) openPanels.splice(index, 1);
      applyInertness();

      // Only if it is still on the page, and still somewhere focus can go.
      const returnTo = previouslyFocused ?? originRef.current;

      if (returnTo && returnTo.isConnected) {
        returnTo.focus({ preventScroll: true });
      }
    };
  }, [rendered]);

  /*
   * Tab stays inside. `inert` already stops it reaching the page behind; this
   * is what stops it reaching the browser's own chrome, and what wraps it
   * from the last control back to the first.
   */
  useEffect(() => {
    if (!rendered) return;

    function handleTab(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel || openPanels[openPanels.length - 1] !== panel) return;

      const stops = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((node) => !node.hasAttribute("hidden"));

      if (stops.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }

      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [rendered]);

  useEffect(() => clearMotionTimers, [clearMotionTimers]);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (closingRef.current || closeDisabled || event.button !== 0) return;

    // The sheet header doubles as the drag handle and also holds the close
    // button. Capturing the pointer retargets pointerup to the header, so the
    // browser never finds a common target for a click and the button silently
    // stops working. Let the press through instead of starting a drag.
    // Element rather than HTMLElement: the close button's icon is an <svg>,
    // so a press usually lands on an SVGElement, which is an Element but not
    // an HTMLElement. Narrowing to HTMLElement here would skip the guard for
    // the exact press this exists to protect.
    const target = event.target;
    if (
      target instanceof Element
      && target.closest("button, a, input, select, textarea, [role='button']")
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = {
      id: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: performance.now(),
      currentY: 0,
      velocityY: 0,
    };
    setSettled(false);
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;

    event.preventDefault();
    const now = performance.now();
    const elapsed = Math.max(1, now - pointer.lastTime);
    const instantVelocity = (event.clientY - pointer.lastY) / elapsed;
    const rawY = event.clientY - pointer.startY;
    const threshold = dismissThreshold();

    /*
     * Upward is rubber — the sheet is already as far up as it goes.
     *
     * Downward tracks the finger exactly until the dismiss threshold, then
     * takes on resistance. That change of feel *is* the signal that letting
     * go now will dismiss: the sheet tells the reader where the edge is by
     * getting heavier at it, rather than by leaving while they are still
     * holding it.
     *
     * It used to call requestClose() from right here, mid-gesture. The sheet
     * left from under the finger the instant the threshold was crossed, and
     * there was no way to change your mind by dragging back up — which is
     * the whole reason a threshold is judged on release everywhere else.
     */
    const nextY = rawY < 0
      ? -Math.min(Math.abs(rawY) * 0.12, 18)
      : rawY > threshold
        ? threshold + (rawY - threshold) * 0.5
        : rawY;

    pointer.lastY = event.clientY;
    pointer.lastTime = now;
    pointer.currentY = nextY;
    pointer.velocityY = pointer.velocityY * 0.64 + instantVelocity * 0.36;
    setDragY(nextY);
    setDragProgress(Math.min(1, Math.max(0, nextY) / threshold));
  }

  function finishPointer(event: ReactPointerEvent<HTMLElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;

    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);

    const projectedY = pointer.currentY + pointer.velocityY * 180;
    if (projectedY > dismissThreshold() || pointer.velocityY > 0.62) {
      requestClose();
      return;
    }

    setDragY(0);
    setDragProgress(0);
    settleAfterMotion();
  }

  function cancelPointer(event: ReactPointerEvent<HTMLElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;

    pointerRef.current = null;
    setDragging(false);
    setDragY(0);
    setDragProgress(0);
    settleAfterMotion();
  }

  return {
    rendered,
    visible,
    settled,
    dragging,
    requestClose,
    backdropClassName: styles.backdrop,
    panelClassName: styles.panel,
    handleClassName: styles.handle,
    backdropProps: {
      "data-visible": visible ? "true" : "false",
      /*
       * The scrim lifts as the sheet is pulled down, so the gesture is
       * answered on the frame it happens rather than only when it ends. With
       * the dismissal now judged on release (see handlePointerMove), this is
       * what tells the reader the drag is being received at all.
       */
      "data-dragging": dragging ? "true" : "false",
      style: {
        "--sheet-drag-progress": dragProgress,
      } as CSSProperties,
    },
    panelRef,
    panelProps: {
      ref: setPanelRef,
      // So the panel itself can hold focus while a sheet is open.
      tabIndex: -1,
      "data-visible": visible ? "true" : "false",
      "data-dragging": dragging ? "true" : "false",
      "data-settled": settled ? "true" : "false",
      "data-closing": closing ? "true" : "false",
      "data-presentation": presentation,
      style: {
        "--sheet-drag-y": `${dragY}px`,
      } as CSSProperties,
    },
    handleProps: {
      "data-dragging": dragging ? "true" : "false",
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: finishPointer,
      onPointerCancel: cancelPointer,
      onLostPointerCapture: finishPointer,
    },
  };
}
