"use client";

import { PointerEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

const DELETE_WIDTH = 92;
const OPEN_THRESHOLD = 44;
const SWIPE_VELOCITY_THRESHOLD = 0.45;

type SwipeableConversationCardProps = {
  children: ReactNode;
  disabled?: boolean;
  onOpen: () => void;
  onRemove?: () => void | Promise<void>;
};

export default function SwipeableConversationCard({
  children,
  disabled = false,
  onOpen,
  onRemove,
}: SwipeableConversationCardProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const startTimeRef = useRef(0);
  const movedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (disabled) {
      setOffset(0);
      setDragging(false);
    }
  }, [disabled]);

  function clampOffset(value: number) {
    return Math.max(-DELETE_WIDTH, Math.min(0, value));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || deleting) return;

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startOffsetRef.current = offset;
    startTimeRef.current = performance.now();
    movedRef.current = false;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (disabled || deleting || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startXRef.current;

    if (Math.abs(deltaX) > 5) {
      movedRef.current = true;
    }

    // Only horizontal movement affects the card.
    const nextOffset = clampOffset(startOffsetRef.current + deltaX);

    setOffset(nextOffset);
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return;

    const elapsed = Math.max(performance.now() - startTimeRef.current, 1);

    const travelled = event.clientX - startXRef.current;

    const velocity = travelled / elapsed;

    const shouldOpen =
      offset <= -OPEN_THRESHOLD || velocity <= -SWIPE_VELOCITY_THRESHOLD;

    setOffset(shouldOpen ? -DELETE_WIDTH : 0);
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerIdRef.current = null;
  }

  function handleCardClick() {
    if (disabled || deleting) return;

    if (movedRef.current) {
      movedRef.current = false;
      return;
    }

    if (offset < 0) {
      setOffset(0);
      return;
    }

    onOpen();
  }

  async function handleDelete() {
    if (disabled || deleting) return;

    setDeleting(true);

    try {
      await onRemove?.();
      setOffset(0);
    } finally {
      setDeleting(false);
    }
  }

  const revealProgress = Math.min(Math.abs(offset) / DELETE_WIDTH, 1);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-transparent">
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={disabled || deleting || offset === 0}
        aria-label="Delete friend"
        aria-hidden={offset === 0}
        tabIndex={offset === 0 ? -1 : 0}
        className="absolute inset-y-0 right-0 flex w-[92px] items-center justify-center bg-red-500 text-white disabled:pointer-events-none"
        style={{
          opacity: revealProgress,
          visibility: offset === 0 ? "hidden" : "visible",
          pointerEvents: offset === 0 ? "none" : "auto",
          transform: `translateX(${
            (1 - revealProgress) * 18
          }px) scale(${0.9 + revealProgress * 0.1})`,
          transition: dragging
            ? "none"
            : "opacity 180ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 180ms",
        }}
      >
        {deleting ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/45 border-t-white" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Trash2 size={21} strokeWidth={1.9} />
            <span className="text-[11px] font-semibold">Delete</span>
          </div>
        )}
      </button>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCardClick();
          }
        }}
        className={[
          "relative z-10 touch-pan-y select-none",
          disabled ? "pointer-events-none opacity-45" : "cursor-pointer",
          dragging
            ? ""
            : "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        ].join(" ")}
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
