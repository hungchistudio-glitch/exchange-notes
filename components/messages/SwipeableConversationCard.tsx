"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

type Props = {
  children: ReactNode;
  onDelete: () => void;
  disabled?: boolean;
};

const ACTION_WIDTH = 82;
const OPEN_THRESHOLD = 42;

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

  const isOpen = offsetX < -4;

  useEffect(() => {
    function closeCard() {
      if (!dragging) {
        setOffsetX(0);
      }
    }

    window.addEventListener("conversation-swipe-close-all", closeCard);

    return () => {
      window.removeEventListener("conversation-swipe-close-all", closeCard);
    };
  }, [dragging]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;

    window.dispatchEvent(new Event("conversation-swipe-close-all"));

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

    if (Math.abs(deltaX) > 4) {
      movedRef.current = true;
    }

    const nextOffset = Math.max(
      -ACTION_WIDTH,
      Math.min(0, startOffsetRef.current + deltaX),
    );

    setOffsetX(nextOffset);
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const shouldOpen = offsetX <= -OPEN_THRESHOLD;

    setOffsetX(shouldOpen ? -ACTION_WIDTH : 0);

    setDragging(false);
    pointerIdRef.current = null;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
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

  function handleDelete() {
    setOffsetX(0);
    onDelete();
  }

  return (
    <div className="relative">
      <div
        aria-hidden={!isOpen}
        className={`absolute inset-y-1 right-1 flex w-[74px] items-center justify-center rounded-[22px] bg-red-500 transition-opacity duration-150 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Remove friend"
          title="Remove friend"
          disabled={disabled}
          className="flex h-full w-full items-center justify-center rounded-[22px] text-white transition-transform active:scale-95 disabled:opacity-40"
        >
          <Trash2 size={21} strokeWidth={1.8} />
        </button>
      </div>

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
            : "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
          touchAction: "pan-y",
        }}
        className="relative z-10 select-none rounded-3xl bg-white shadow-sm will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
