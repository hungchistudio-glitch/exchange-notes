"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

type Props = {
  children: ReactNode;
  onDelete: () => void;
  disabled?: boolean;
};

const REVEAL_WIDTH = 88;
const DELETE_THRESHOLD = 56;

export default function SwipeableConversationCard({
  children,
  onDelete,
  disabled = false,
}: Props) {
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    function closeOtherCards() {
      if (!dragging) {
        setOffsetX(0);
      }
    }

    window.addEventListener("conversation-swipe-open", closeOtherCards);

    return () => {
      window.removeEventListener("conversation-swipe-open", closeOtherCards);
    };
  }, [dragging]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startOffsetRef.current = offsetX;
    movedRef.current = false;
    setDragging(true);

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startXRef.current;

    if (Math.abs(deltaX) > 5) {
      movedRef.current = true;
    }

    const nextOffset = Math.max(
      -REVEAL_WIDTH,
      Math.min(0, startOffsetRef.current + deltaX),
    );

    setOffsetX(nextOffset);
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const shouldOpen = offsetX <= -DELETE_THRESHOLD;

    setOffsetX(shouldOpen ? -REVEAL_WIDTH : 0);
    setDragging(false);
    pointerIdRef.current = null;

    if (shouldOpen) {
      window.dispatchEvent(new Event("conversation-swipe-open"));

      setOffsetX(-REVEAL_WIDTH);
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  }

  function handleDelete() {
    setOffsetX(0);
    onDelete();
  }

  function handleContentClick(event: React.MouseEvent<HTMLDivElement>) {
    if (movedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      movedRef.current = false;
      return;
    }

    if (offsetX < 0) {
      event.preventDefault();
      event.stopPropagation();
      setOffsetX(0);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Remove friend"
        title="Remove friend"
        disabled={disabled}
        className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-red-500 text-white disabled:opacity-50"
      >
        <Trash2 size={22} strokeWidth={1.8} />
      </button>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClickCapture={handleContentClick}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging
            ? "none"
            : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          touchAction: "pan-y",
        }}
        className="relative z-10 select-none will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
