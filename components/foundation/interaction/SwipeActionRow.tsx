"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.5;
const SNAP_TRANSITION = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";

/*
 * How far a finger may wander before the press stops being a tap.
 *
 * This was 4px, and 4px is not a tap — it is a still finger. A thumb landing
 * on a card in a scrolling list drifts five to fifteen pixels between contact
 * and release without the reader intending anything by it, and every one of
 * those presses crossed the line, was recorded as a drag, and had its click
 * suppressed below. That is the whole of "the word cards need tapping
 * twice": the first tap was thrown away, and the second one, made more
 * carefully because the first appeared to do nothing, got through.
 *
 * Ten pixels is what the platforms themselves use for the same decision —
 * Android's ViewConfiguration touch slop and UIKit's scroll-view hysteresis
 * are both in this range — and it is still far below the 44px needed to open
 * an action, so the swipe gesture is unchanged.
 */
const DRAG_SLOP = 10;

type SwipeAction = {
  label: string;
  icon?: ReactNode;
  onAction: () => void;
  className?: string;
};

type SwipeActionRowProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  /** Revealed by swiping the row to the LEFT (sits on the right edge). */
  trailingAction?: SwipeAction;
  /** Revealed by swiping the row to the RIGHT (sits on the left edge). */
  leadingAction?: SwipeAction;
};

export default function SwipeActionRow({
  children,
  className = "",
  disabled = false,
  trailingAction,
  leadingAction,
}: SwipeActionRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startTranslateRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const draggedRef = useRef(false);
  /*
   * The slop, taken up once. Without it the row would jump the full ten
   * pixels the moment the drag is recognised, so a deliberate swipe would
   * start with a visible snap. Subtracting it means the row starts moving
   * from exactly where the finger crossed the line.
   */
  const slopOffsetRef = useRef(0);

  const minX = trailingAction ? -ACTION_WIDTH : 0;
  const maxX = leadingAction ? ACTION_WIDTH : 0;

  function clamp(value: number) {
    return Math.min(maxX, Math.max(minX, value));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return;

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startTranslateRef.current = translateX;
    draggedRef.current = false;
    slopOffsetRef.current = 0;
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;

    const delta = event.clientX - startXRef.current;

    /*
     * Below the slop the row does not move at all. It used to follow every
     * pixel, so a press that was never going to be a swipe still nudged the
     * card sideways and still counted as a drag.
     */
    if (!draggedRef.current) {
      if (Math.abs(delta) <= DRAG_SLOP) return;

      draggedRef.current = true;
      slopOffsetRef.current = Math.sign(delta) * DRAG_SLOP;
    }

    setTranslateX(
      clamp(startTranslateRef.current + delta - slopOffsetRef.current),
    );
  }

  function endDrag() {
    if (!isDragging) return;

    setIsDragging(false);
    pointerIdRef.current = null;
    setTranslateX((current) => {
      if (current <= -OPEN_THRESHOLD) return minX;
      if (current >= OPEN_THRESHOLD) return maxX;
      return 0;
    });
  }

  function runAction(action: SwipeAction) {
    setTranslateX(0);
    action.onAction();
  }

  /*
   * The actions are mounted only once the row has been touched.
   *
   * They were always in the tree, both of them, behind every row — each a
   * button carrying a 16px-blur box-shadow and an SVG icon, for a control
   * that is invisible until you swipe. On a library of 300 words that was 600
   * blurred shadows and 600 icons in the paint tree at rest, and a blurred
   * shadow is among the most expensive things a browser rasterises. It is
   * what made the list feel gritty to scroll rather than smooth.
   *
   * Mounting on pointer-down is early enough: the row cannot have moved far
   * enough to reveal anything in the same frame the finger lands, and React
   * has committed long before the first pointermove.
   */
  const revealed = isDragging || translateX !== 0;

  return (
    <div className={`relative overflow-hidden rounded-[24px] ${className}`}>
      {revealed && trailingAction && (
        <button
          type="button"
          onClick={() => runAction(trailingAction)}
          aria-label={trailingAction.label}
          className={`absolute right-3 top-1/2 z-0 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition-transform active:scale-90 ${
            trailingAction.className ?? "bg-red-500 text-white"
          }`}
        >
          {trailingAction.icon}
        </button>
      )}

      {revealed && leadingAction && (
        <button
          type="button"
          onClick={() => runAction(leadingAction)}
          aria-label={leadingAction.label}
          className={`absolute left-3 top-1/2 z-0 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition-transform active:scale-90 ${
            leadingAction.className ?? "bg-black text-white"
          }`}
        >
          {leadingAction.icon}
        </button>
      )}

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(event) => {
          /*
           * Suppress the click that follows a real drag, so a swipe does not
           * also open the card it swiped.
           *
           * `detail` is how many times the pointer was clicked, and it is 0
           * for a click the keyboard synthesised — Enter or Space on a
           * focused control inside the row. Those never follow a drag, and
           * suppressing one would make the row unusable without a mouse.
           *
           * One click, not every click from here on. The flag used to be
           * cleared only by the next pointer-down, so a drag that ended
           * without a click left it armed and the next press paid for it.
           */
          if (!draggedRef.current || event.detail === 0) return;

          draggedRef.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : SNAP_TRANSITION,
          touchAction: "pan-y",
        }}
        /*
         * Selection is only suppressed while a drag is actually happening.
         *
         * `select-none` was unconditional, and it inherits — so every word
         * card, which is rendered inside one of these rows, had its text made
         * unselectable. The vocabulary card wraps its content in
         * VocabularySelection precisely so a reader can pick a phrase out of
         * an example sentence and save it or send it; that feature could not
         * work at all, because the selection it waits for was impossible to
         * make. Nothing else re-enabled it anywhere.
         *
         * Suppressing it during a drag is what this was for in the first
         * place: a horizontal swipe over text would otherwise start selecting
         * it. `isDragging` is true from pointer-down, before the finger has
         * travelled far enough to move the row, so the guard is in place for
         * the whole of any gesture that turns out to be a swipe.
         */
        className={`relative z-10 bg-white ${isDragging ? "select-none" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
