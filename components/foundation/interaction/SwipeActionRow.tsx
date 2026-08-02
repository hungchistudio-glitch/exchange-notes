"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.5;
const SNAP_TRANSITION = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";

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
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;

    const delta = event.clientX - startXRef.current;

    if (Math.abs(delta) > 4) {
      draggedRef.current = true;
    }

    setTranslateX(clamp(startTranslateRef.current + delta));
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

  return (
    <div className={`relative overflow-hidden rounded-[24px] ${className}`}>
      {trailingAction && (
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

      {leadingAction && (
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
          // Suppress the click that follows a real drag so taps on
          // buttons inside the row don't fire while/after swiping.
          if (draggedRef.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : SNAP_TRANSITION,
          touchAction: "pan-y",
        }}
        className="relative z-10 select-none bg-white"
      >
        {children}
      </div>
    </div>
  );
}
