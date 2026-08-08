"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import type { Cookie, CookieType } from "@/lib/pet/types";
import type { TranslationDictionary } from "@/lib/i18n/types";

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
};

const DEFAULT_VISIBLE_LIMIT = 8;
const DRAG_THRESHOLD = 10;

function cookieLabel(copy: MascotCopy, type: CookieType) {
  switch (type) {
    case "letter":
      return copy.cookieTypeLetter;
    case "zhuyin":
      return copy.cookieTypeZhuyin;
  }
}

function CookieGlyph({ cookie }: { cookie: Cookie }) {
  return <span className={styles.glyphText}>{cookie.glyph}</span>;
}

type DragState = {
  cookie: Cookie;
  originX: number;
  originY: number;
  x: number;
  y: number;
  dragging: boolean;
  releasing: boolean;
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
}: CookieTrayProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (!onDragPoint) return;

    if (drag && drag.dragging && !drag.releasing) {
      onDragPoint({ x: drag.x, y: drag.y });
    } else {
      onDragPoint(null);
    }
  }, [drag, onDragPoint]);

  const visible = cookies.slice(0, maxVisible);
  const overflowCount = Math.max(cookies.length - maxVisible, 0);

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

  function isOverYumi(clientX: number, clientY: number) {
    const zone = yumiZoneRef.current;
    if (!zone) return false;

    const rect = zone.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
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
      dragging: false,
      releasing: false,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || current.releasing) return;

    const dx = event.clientX - current.originX;
    const dy = event.clientY - current.originY;
    const moved = Math.hypot(dx, dy) > DRAG_THRESHOLD;

    updateDrag({
      ...current,
      x: event.clientX,
      y: event.clientY,
      dragging: current.dragging || moved,
    });
  }

  // On release: either let go over Yumi, or a plain tap (never dragged
  // past the threshold) — both count as feeding, and both play the same
  // "fly to Yumi" transition for a consistent, satisfying finish. A drag
  // released anywhere else just snaps back (cancelled, no feed).
  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current) return;

    const overYumi = isOverYumi(event.clientX, event.clientY);

    if (!current.dragging || overYumi) {
      settledRef.current = false;
      onFeedStart?.(current.cookie);
      updateDrag({
        ...current,
        x: current.dragging ? event.clientX : current.originX,
        y: current.dragging ? event.clientY : current.originY,
        dragging: false,
        releasing: true,
      });
    } else {
      updateDrag(null);
    }
  }

  // Accessibility activation and a few WebKit/assistive-touch paths can
  // produce a click without delivering the matching pointer-up back to the
  // captured element. This is a guarded fallback: a normal pointer-up has
  // already marked the drag as releasing, so it cannot feed twice.
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
      dragging: false,
      releasing: false,
    };

    if (
      current.cookie.id !== cookie.id
      || current.dragging
      || current.releasing
    ) {
      return;
    }

    settledRef.current = false;
    onFeedStart?.(current.cookie);
    updateDrag({
      ...current,
      x: event.clientX || current.originX,
      y: event.clientY || current.originY,
      dragging: false,
      releasing: true,
    });
  }

  function settleRelease() {
    if (settledRef.current) return;
    settledRef.current = true;

    const current = dragRef.current;
    if (current) onFeed(current.cookie);
    updateDrag(null);
  }

  // Second half of the release: on the next frame, move the ghost's target
  // position to Yumi's center so the CSS transition on the ghost animates
  // it flying there, then settle (feed + clear) when that finishes.
  useEffect(() => {
    if (!drag || !drag.releasing) return;

    const zone = yumiZoneRef.current;
    if (!zone) {
      onFeed(drag.cookie);
      updateDrag(null);
      return;
    }

    const target = feedTargetRef?.current ?? zone;
    const rect = target.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    const raf = requestAnimationFrame(() => {
      updateDrag((prev) =>
        prev && prev.releasing ? { ...prev, x: targetX, y: targetY } : prev,
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
  }, [drag?.releasing]);

  return (
    <div className={styles.wrap}>
      {visible.length === 0 ? (
        <p className={styles.empty}>{copy.cookieTrayEmpty}</p>
      ) : (
        <>
          <div className={styles.tray}>
            {visible.map((cookie) => {
              const isDragging = drag?.cookie.id === cookie.id;

              return (
                <button
                  key={cookie.id}
                  type="button"
                  disabled={disabled}
                  aria-label={copy.feedAriaLabel.replace("{word}", cookie.word)}
                  title={cookieLabel(copy, cookie.type)}
                  className={`${styles.cookie} ${styles[`cookie--${cookie.type}`]} ${
                    isDragging ? styles.cookieHidden : ""
                  }`}
                  onPointerDown={(event) => handlePointerDown(event, cookie)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={() => updateDrag(null)}
                  onClick={(event) => handleClick(event, cookie)}
                >
                  <CookieGlyph cookie={cookie} />
                </button>
              );
            })}

            {overflowCount > 0 ? (
              <span className={styles.more}>
                {copy.cookieTrayMore.replace("{count}", String(overflowCount))}
              </span>
            ) : null}
          </div>

          {hideHint ? null : <p className={styles.hint}>{copy.cookieTrayHint}</p>}
        </>
      )}

      {drag && typeof document !== "undefined"
        ? createPortal(
            <div
              className={`${styles.ghost} ${styles[`cookie--${drag.cookie.type}`]} ${
                drag.releasing ? styles.ghostFlying : styles.ghostDragging
              }`}
              style={{ left: drag.x, top: drag.y }}
              onTransitionEnd={drag.releasing ? settleRelease : undefined}
            >
              <CookieGlyph cookie={drag.cookie} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
