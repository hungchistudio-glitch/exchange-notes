"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";
import OverlayPortal from "@/components/foundation/overlays/OverlayPortal";
import useReducedMotion from "@/hooks/useReducedMotion";
import type { FriendProfile } from "@/lib/friends";

/*
 * Sixty per cent of the screen, and no more.
 *
 * This is a question — "which friend?" — not a screen of its own, so the
 * page behind it should stay visible enough to be the thing the reader is
 * sending. Past this the list scrolls inside the sheet.
 */
const PANEL_MAX_HEIGHT = "min(60dvh, 640px)";

/*
 * The list keeps this much room whatever is in it.
 *
 * The sheet is anchored to the bottom of the screen, so its height is also
 * its position: every time the contents changed size while it was arriving,
 * the top edge moved, and because the entrance transform is a percentage of
 * the panel's own height the in-flight animation re-resolved against the new
 * size. That is what read as the sheet flying up too far and dropping back.
 *
 * Holding the common cases — loading, no friends, a handful of friends — at
 * one height means the sheet arrives once, at the height it will stay at.
 *
 * A floor is not enough on its own, though. Four friends or more is taller
 * than this, and the list is what gives the panel its height, so a reader
 * with a real friend list still watched the sheet grow by up to 190px while
 * it was arriving — measured at 294px on the loading state and 484px once
 * six friends landed, on a 375x812 screen. Bottom-anchored, that is 190px of
 * upward jump, and the entrance transform is a percentage of the panel's own
 * height so it re-resolved in mid-flight on top of that. Hence the explicit
 * height below, which is held at this value until the sheet has landed.
 */
const SETTLED_LIST_HEIGHT = 184;

/*
 * The list is allowed to grow to its contents, but only after the entrance
 * is over, and then as a movement of its own rather than as a correction to
 * one already in progress.
 */
const LIST_GROWTH_TRANSITION = "height 280ms cubic-bezier(0.22, 1, 0.36, 1)";

type FriendPickerModalProps = {
  friends: FriendProfile[];
  loading: boolean;
  errorMessage: string;
  sendingFriendId: string | null;
  onClose: () => void;
  onPick: (friendId: string) => void;
  onRetry: () => void;
};

export default function FriendPickerModal({
  friends,
  loading,
  errorMessage,
  sendingFriendId,
  onClose,
  onPick,
  onRetry,
}: FriendPickerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const motion = useSheetMotion({ onClose });
  const reducedMotion = useReducedMotion();

  /*
   * The panel's height, in effect: the list is the only part of the sheet
   * that changes size, so pinning it pins the sheet.
   */
  const [listHeight, setListHeight] = useState(SETTLED_LIST_HEIGHT);

  useEffect(() => {
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  /*
   * Nothing happens here until the sheet has landed — that is the point.
   * `settled` is the sheet telling us its entrance transition is over, so
   * whatever the friend list turns out to be, it cannot move the panel while
   * the panel is still animating into place.
   *
   * The ceiling is read off the panel's own max-height rather than restated,
   * so the sheet and this stay the same size by construction. Without it a
   * long friend list would animate its height to a number the panel is never
   * going to show, and the growth would appear to stop halfway through.
   */
  useEffect(() => {
    if (!motion.settled) return;

    const panel = dialogRef.current;
    const list = listRef.current;
    if (!panel || !list) return;

    const panelMax = Number.parseFloat(getComputedStyle(panel).maxHeight);
    const chrome = panel.offsetHeight - list.offsetHeight;
    const room = Number.isFinite(panelMax)
      ? Math.max(SETTLED_LIST_HEIGHT, panelMax - chrome)
      : Number.POSITIVE_INFINITY;

    setListHeight(
      Math.min(Math.max(SETTLED_LIST_HEIGHT, list.scrollHeight), room),
    );
  }, [motion.settled, loading, errorMessage, friends]);

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[300] flex items-end justify-center overflow-hidden overscroll-none sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={motion.requestClose}
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm ${motion.backdropClassName}`}
        {...motion.backdropProps}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-to-partner-title"
        tabIndex={-1}
        {...motion.panelProps}
        className={`${motion.panelClassName} relative z-10 flex w-full max-w-xl flex-col rounded-t-[28px] border border-white/40 bg-white/75 shadow-2xl backdrop-blur-2xl sm:rounded-[28px]`}
        style={{
          ...motion.panelProps.style,
          /*
           * dvh, not vh. vh is the *large* viewport — the height the page
           * would have if the browser's toolbars were hidden — so on a phone
           * with a visible address bar a vh-sized sheet is taller than the
           * space it is being shown in. Every other sheet here uses dvh.
           */
          maxHeight: PANEL_MAX_HEIGHT,
          paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        }}
      >
        <div
          className={`${motion.handleClassName} flex h-8 shrink-0 items-center justify-center sm:hidden`}
          {...motion.handleProps}
        >
          <span className="h-1 w-9 rounded-full bg-black/15" />
        </div>

        <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-3">
          <h2
            id="send-to-partner-title"
            className="text-base font-semibold tracking-tight text-black"
          >
            傳送給夥伴
          </h2>

          <button
            type="button"
            onClick={motion.requestClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/5 hover:text-black"
          >
            <X size={15} />
          </button>
        </div>

        <div
          ref={listRef}
          /*
           * No `flex-1`. A flex-basis of 0% against a panel of indefinite
           * height resolves to the content, which is precisely the thing
           * that must not decide the sheet's height while it is arriving.
           * The explicit height below decides it instead, and `min-h-0`
           * still lets the list shrink if the panel meets its ceiling.
           */
          className="min-h-0 touch-pan-y space-y-1.5 overflow-y-auto overscroll-contain px-4 pb-2"
          style={{
            minHeight: SETTLED_LIST_HEIGHT,
            height: listHeight,
            transition: reducedMotion ? undefined : LIST_GROWTH_TRANSITION,
          }}
        >
          {loading && (
            <div className="space-y-1.5 px-2 py-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="flex animate-pulse items-center gap-3 rounded-2xl bg-black/[0.03] p-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-black/10" />

                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 rounded-full bg-black/10" />
                    <div className="h-2.5 w-16 rounded-full bg-black/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && errorMessage && (
            <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
              <p className="text-sm text-red-600">{errorMessage}</p>

              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5"
              >
                重試
              </button>
            </div>
          )}

          {!loading && !errorMessage && friends.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-ink-faint">
              還沒有朋友——先加一位才能分享單字。
            </p>
          )}

          {!loading &&
            !errorMessage &&
            friends.map((friend) => {
              const isSending = sendingFriendId === friend.id;
              const isDisabled = sendingFriendId !== null;

              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => onPick(friend.id)}
                  disabled={isDisabled}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-sm font-semibold text-ink-strong">
                    {(friend.displayName ?? friend.exchangeId)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black">
                      {friend.displayName ?? `@${friend.exchangeId}`}
                    </p>

                    <p className="truncate text-xs text-ink-faint">
                      @{friend.exchangeId}
                    </p>
                  </div>

                  {isSending && (
                    <LoaderCircle
                      size={16}
                      className="shrink-0 animate-spin text-ink-faint"
                    />
                  )}
                </button>
              );
            })}
        </div>
      </div>
      </div>
    </OverlayPortal>
  );
}
