"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";

import { track } from "@/lib/analytics/track";
import type { TranslationDictionary } from "@/lib/i18n/types";

import SpeechSpeedControl from "./SpeechSpeedControl";
import styles from "./SignalControlSheet.module.css";
import { DISCOVER_COLORS, categoryAccent, type SpeechRate } from "./types";

/* Long enough to cover the exit transition in the module CSS. */
const CLOSE_MS = 240;

/*
 * How far down the sheet has to be pulled before letting go dismisses it, and
 * how fast a flick counts regardless of distance.
 *
 * Two tests rather than one, because they describe different gestures: a slow
 * deliberate pull is judged on where it ended up, and a quick flick is judged
 * on how it was moving. Distance alone makes a fast flick feel ignored;
 * velocity alone makes a careful drag to the bottom of the screen snap back.
 */
const DISMISS_DISTANCE_PX = 96;
const DISMISS_VELOCITY = 0.5;

/*
 * Guards on the velocity test.
 *
 * Velocity is a ratio, so it explodes as the denominator shrinks: two pointer
 * events in the same millisecond produce an arbitrarily large number from an
 * arbitrarily small movement. Both of these exist to stop that reading as a
 * flick — a sample has to span real time, and the gesture has to have gone
 * somewhere, before speed is allowed to decide anything.
 */
const MIN_VELOCITY_SAMPLE_MS = 8;
const MIN_FLICK_DISTANCE_PX = 24;

type SignalControlSheetProps = {
  open: boolean;
  onClose: () => void;
  copy: TranslationDictionary["discover"];

  speechRate: SpeechRate;
  onSpeechRateChange: (rate: SpeechRate) => void;

  /** Every category present in the current feed, in the order they appear. */
  topics: string[];
  /** Empty means everything — the absence of a filter, not a filter of none. */
  selectedTopics: Set<string>;
  onToggleTopic: (topic: string) => void;
  onClearTopics: () => void;
};

/**
 * What a long press on the Signal Radar opens.
 *
 * The brief lists six kinds of control this surface could carry: topic,
 * difficulty, source, speech speed, learning density and region. Two of them
 * exist. Speech speed is a real preference the page already honours, and topic
 * is a real filter over a field every card already carries — the rest would
 * need ranking, source metadata or a difficulty model that Discover does not
 * have, and a sheet full of switches wired to nothing is worse than a shorter
 * sheet that works.
 *
 * So this ships the two that are real and has room for the others. It is
 * reachable by long press and by an ordinary control in the header, because a
 * gesture cannot be the only way to reach a setting.
 */
export default function SignalControlSheet({
  open,
  onClose,
  copy,
  speechRate,
  onSpeechRateChange,
  topics,
  selectedTopics,
  onToggleTopic,
  onClearTopics,
}: SignalControlSheetProps) {
  /*
   * The sheet outlives `open` by the length of its exit.
   *
   * A component that unmounts the moment its prop goes false can only ever pop
   * out, so the closing phase is held here and the parent's `open` is treated
   * as the request rather than the state.
   */
  const [phase, setPhase] = useState<"closed" | "entering" | "open" | "closing">(
    open ? "entering" : "closed",
  );
  const [drag, setDrag] = useState<number | null>(null);

  const dragStartRef = useRef<{ y: number; t: number } | null>(null);
  const lastMoveRef = useRef<{ y: number; t: number } | null>(null);

  /*
   * The request-to-phase transition, derived during render.
   *
   * `open` is what the parent wants; `phase` is where the sheet actually is,
   * and the two differ for exactly as long as a transition takes. Comparing
   * against the previous value during render is React's documented way to
   * adjust state when a prop changes, and it matters here beyond style: an
   * effect would commit a frame with the old phase before correcting it, which
   * on the opening path is the one frame that decides whether the panel starts
   * off-screen or simply appears in place.
   */
  const [seenOpen, setSeenOpen] = useState(open);

  if (seenOpen !== open) {
    setSeenOpen(open);
    setPhase((current) => {
      if (open) return current === "open" ? current : "entering";
      return current === "closed" ? current : "closing";
    });
  }

  /*
   * Entering is one frame long on purpose.
   *
   * The panel has to be in the DOM at its off-screen position before the
   * on-screen position is applied, or there is nothing for the transition to
   * run between and the sheet simply appears. Two rAFs rather than one: the
   * first gets past the commit that mounted it, the second past the style
   * calculation.
   */
  useEffect(() => {
    if (phase !== "entering") return;

    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPhase("open")),
    );

    /*
     * Belt and braces, and not a theoretical one.
     *
     * requestAnimationFrame does not run in a backgrounded tab, so a sheet
     * opened as the app goes to the background — or opened in a tab that was
     * already hidden — would sit at its off-screen position indefinitely and
     * come back to a scrim with no panel under it. The timer is long enough
     * never to pre-empt the two frames above when they are available, and the
     * only path to the sheet being visible when they are not.
     */
    const fallback = setTimeout(() => setPhase("open"), 120);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "closing") return;

    const timer = setTimeout(() => setPhase("closed"), CLOSE_MS);

    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const endDrag = useCallback(
    (clientY: number, timeStamp: number) => {
      const start = dragStartRef.current;
      const previous = lastMoveRef.current;
      dragStartRef.current = null;
      lastMoveRef.current = null;

      if (!start) return;

      setDrag(null);

      const distance = clientY - start.y;

      // Far enough down is enough on its own — a slow, deliberate pull to the
      // bottom of the screen is unambiguous however long it took.
      if (distance > DISMISS_DISTANCE_PX) {
        onClose();
        return;
      }

      /*
       * Otherwise it has to have been a flick, judged on the last stretch of
       * movement rather than the whole gesture: someone who drags down, holds,
       * and then releases has not flicked anything, and averaging over the
       * whole press would say they had.
       */
      if (!previous) return;

      const elapsed = timeStamp - previous.t;
      if (elapsed < MIN_VELOCITY_SAMPLE_MS) return;
      if (distance < MIN_FLICK_DISTANCE_PX) return;

      if ((clientY - previous.y) / elapsed > DISMISS_VELOCITY) onClose();
    },
    [onClose],
  );

  if (phase === "closed") return null;

  const allSelected = selectedTopics.size === 0;

  return (
    <div
      className={`${styles.root} fixed inset-0 z-[300] flex items-end`}
      data-phase={phase}
      data-dragging={drag !== null ? "true" : "false"}
      style={{ "--drag": `${drag ?? 0}px` } as CSSProperties}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={copy.signalControlsClose}
        className={styles.scrim}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.signalControlsTitle}
        className={`${styles.panel} rounded-t-[28px] px-5 pb-8 pt-3`}
        style={{
          backgroundColor: DISCOVER_COLORS.card,
          borderTop: `1px solid ${DISCOVER_COLORS.divider}`,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
        }}
        /*
         * The whole panel is the drag surface, not just the handle — a sheet
         * that can only be pulled by a 40px bar is a sheet most people will
         * not discover is draggable at all. Buttons inside it still win,
         * because a drag that never passes the threshold ends as a tap on
         * whatever it started on.
         */
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          dragStartRef.current = { y: event.clientY, t: event.timeStamp };
          lastMoveRef.current = null;
        }}
        onPointerMove={(event) => {
          const start = dragStartRef.current;
          if (!start) return;

          // The previous sample, kept so release can measure speed over the
          // last stretch rather than over the whole press.
          lastMoveRef.current = { y: event.clientY, t: event.timeStamp };

          // Downward only. Dragging up would lift the sheet off the bottom of
          // the screen and show the page behind it through the gap.
          const delta = Math.max(0, event.clientY - start.y);
          if (delta > 0) setDrag(delta);
        }}
        onPointerUp={(event) => endDrag(event.clientY, event.timeStamp)}
        onPointerCancel={() => {
          dragStartRef.current = null;
          lastMoveRef.current = null;
          setDrag(null);
        }}
      >
        <span className={styles.handle} aria-hidden="true" />

        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="hud-label text-[11px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: DISCOVER_COLORS.accent }}
            >
              {copy.signalControlsEyebrow}
            </p>
            <h2
              className="mt-1 text-[22px] font-bold tracking-[-0.02em]"
              style={{ color: DISCOVER_COLORS.text }}
            >
              {copy.signalControlsTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={copy.signalControlsClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              border: `1px solid ${DISCOVER_COLORS.divider}`,
              color: DISCOVER_COLORS.textSecondary,
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <p
          className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          {copy.signalControlsSpeed}
        </p>

        <SpeechSpeedControl
          value={speechRate}
          onChange={(rate) => {
            track("radar.control_changed", { control: "speech_rate", value: rate });
            onSpeechRateChange(rate);
          }}
          copy={copy}
          showLabel={false}
        />

        {topics.length > 1 ? (
          <>
            <p
              className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: DISCOVER_COLORS.textSecondary }}
            >
              {copy.signalControlsTopics}
            </p>

            <div className="flex flex-wrap gap-2">
              {/*
                "All" is the absence of a filter rather than a seventh topic,
                which is why it clears the set instead of joining it — a feed
                filtered to nothing is a bug the user can walk into otherwise.
              */}
              <button
                type="button"
                onClick={() => {
                  track("radar.control_changed", { control: "topics", value: "all" });
                  onClearTopics();
                }}
                aria-pressed={allSelected}
                className="h-9 rounded-full px-4 text-[13px] font-medium transition"
                style={{
                  border: `1px solid ${
                    allSelected ? DISCOVER_COLORS.accent : DISCOVER_COLORS.divider
                  }`,
                  color: allSelected
                    ? DISCOVER_COLORS.onAccent
                    : DISCOVER_COLORS.textSecondary,
                  backgroundColor: allSelected
                    ? DISCOVER_COLORS.accent
                    : "transparent",
                }}
              >
                {copy.signalControlsAllTopics}
              </button>

              {topics.map((topic) => {
                const selected = selectedTopics.has(topic);
                const accent = categoryAccent(topic);

                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      track("radar.control_changed", { control: "topics", value: topic });
                      onToggleTopic(topic);
                    }}
                    aria-pressed={selected}
                    className="h-9 rounded-full px-4 text-[13px] font-medium uppercase tracking-[0.04em] transition"
                    style={{
                      border: `1px solid ${selected ? accent : DISCOVER_COLORS.divider}`,
                      color: selected ? DISCOVER_COLORS.onAccent : accent,
                      backgroundColor: selected ? accent : "transparent",
                    }}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
