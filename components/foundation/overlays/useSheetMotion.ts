"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import styles from "./SheetMotion.module.css";

const EXIT_DURATION_MS = 380;

let bodyLockCount = 0;
let previousBodyOverflow = "";

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyLockCount += 1;
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
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
}: {
  open?: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const pointerRef = useRef<DragPointer | null>(null);

  const clearMotionTimers = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
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

  const requestClose = useCallback(() => {
    if (closingRef.current || closeDisabled) return;

    closingRef.current = true;
    pointerRef.current = null;
    setDragging(false);
    setVisible(false);
    clearMotionTimers();

    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setRendered(false);
      setDragY(0);
      onClose();
      closingRef.current = false;
    }, animationDuration());
  }, [animationDuration, clearMotionTimers, closeDisabled, onClose]);

  useEffect(() => {
    if (open) {
      clearMotionTimers();
      closingRef.current = false;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setRendered(true);
        setDragY(0);
        secondFrameRef.current = requestAnimationFrame(() => {
          secondFrameRef.current = null;
          setVisible(true);
        });
      });
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setVisible(false);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setRendered(false);
        setDragY(0);
      }, animationDuration());
    });
  }, [animationDuration, clearMotionTimers, open]);

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
    const nextY = rawY < 0
      ? -Math.min(Math.abs(rawY) * 0.12, 18)
      : rawY;

    pointer.lastY = event.clientY;
    pointer.lastTime = now;
    pointer.currentY = nextY;
    pointer.velocityY = pointer.velocityY * 0.64 + instantVelocity * 0.36;
    setDragY(nextY);

    const dismissThreshold = Math.min(window.innerHeight * 0.16, 150);
    if (nextY > dismissThreshold) {
      requestClose();
    }
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
    const threshold = Math.min(window.innerHeight * 0.16, 150);
    if (projectedY > threshold || pointer.velocityY > 0.62) {
      requestClose();
      return;
    }

    setDragY(0);
  }

  function cancelPointer(event: ReactPointerEvent<HTMLElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;

    pointerRef.current = null;
    setDragging(false);
    setDragY(0);
  }

  return {
    rendered,
    visible,
    dragging,
    requestClose,
    backdropClassName: styles.backdrop,
    panelClassName: styles.panel,
    handleClassName: styles.handle,
    backdropProps: {
      "data-visible": visible ? "true" : "false",
    },
    panelProps: {
      "data-visible": visible ? "true" : "false",
      "data-dragging": dragging ? "true" : "false",
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
