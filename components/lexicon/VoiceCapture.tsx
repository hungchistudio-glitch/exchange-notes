"use client";

import { LoaderCircle, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import type useVoiceInput from "@/hooks/useVoiceInput";
import type { VoicePhase, VoiceNotice } from "@/hooks/useVoiceInput";
import { openMicGuide, setVoiceMic } from "@/lib/voice/signal";

import styles from "./VoiceCapture.module.css";

/*
 * The two visible halves of speaking to the search: the microphone itself,
 * which glows with the reader's voice while it listens, and the line under
 * the field, which shows the words as they are heard and then what Yumi is
 * doing with them.
 *
 * Shared by the home field and the app-wide sheet. Cosmic draws its own
 * microphone (its console has a waveform already) and borrows only the
 * caption line, in its own colours.
 */

type Voice = ReturnType<typeof useVoiceInput>;

const CAPTION_TAIL = 120;

/* Held this long, a press is a held key rather than a tap. */
const HOLD_MS = 320;

/**
 * Push to talk (Chi, 2026-11-27: 按住說話). A tap still starts a recording
 * that ends itself on a pause; a key held for a third of a second records
 * until it is let go, for a noisy street where the pause never comes.
 * Every microphone key uses this, on both modes.
 *
 * The held recording starts from a timer rather than the press itself, so
 * a tap never opens the microphone twice. Letting go is the end of it, and
 * the click that follows the release is swallowed.
 */
export function usePressToTalk({
  phase,
  onTap,
  onHoldStart,
  onHoldEnd,
}: {
  phase: VoicePhase;
  onTap: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingRef = useRef(false);
  const swallow = useRef(false);
  const [holding, setHolding] = useState(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const letGo = () => {
    clear();
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    swallow.current = true;
    onHoldEnd?.();
  };

  return {
    holding,
    bind: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0) return;
        swallow.current = false;
        // Yumi looks at the key being pressed.
        setVoiceMic(event.currentTarget);
        if (!onHoldStart || phase !== "idle") return;
        clear();
        const key = event.currentTarget;
        const pointer = event.pointerId;
        try { key.setPointerCapture(pointer); } catch { /* Not capturable: the release still ends it. */ }
        timer.current = setTimeout(() => {
          timer.current = null;
          holdingRef.current = true;
          setHolding(true);
          onHoldStart();
        }, HOLD_MS);
      },
      onPointerUp: letGo,
      onPointerCancel: letGo,
      onClick(event: MouseEvent<HTMLElement>) {
        if (swallow.current) {
          swallow.current = false;
          event.preventDefault();
          return;
        }
        onTap();
      },
      /* A long press is a held key, not a menu. */
      onContextMenu(event: MouseEvent<HTMLElement>) {
        if (onHoldStart) event.preventDefault();
      },
    },
  };
}

/*
 * The parts of the voice session these draw from, passed one by one: handing
 * over the whole object along with its level ref callback makes the compiler
 * treat every field on it as a ref.
 */
type VoiceView = {
  phase?: Voice["phase"];
  listening: boolean;
  /** useVoiceInput's bindLevel. */
  levelRef?: Voice["bindLevel"];
};

export function VoiceMicButton({
  phase: givenPhase,
  listening,
  levelRef,
  onPress,
  className,
  idleClassName,
  activeClassName,
  iconSize = 17,
  labels,
  coachTarget,
  hold,
}: VoiceView & {
  onPress: () => void;
  /** Push to talk: what starts a held recording and what ends it. */
  hold?: { start: () => void; stop: () => void };
  /** Size and shape; the colours come from the two below. */
  className: string;
  idleClassName: string;
  activeClassName: string;
  iconSize?: number;
  /** The field's own words for the key, where it has them (the library's search). */
  labels?: { idle: string; listening: string };
  /** What the tour lights it by (components/tutorial/TutorialCoach.tsx). */
  coachTarget?: string;
}) {
  const { t } = useTranslation();
  const copy = t.lexicon;
  const phase = givenPhase ?? (listening ? "listening" : "idle");
  const active = phase !== "idle";
  const press = usePressToTalk({ phase, onTap: onPress, onHoldStart: hold?.start, onHoldEnd: hold?.stop });
  const label = press.holding
    ? copy.voice.holding
    : phase === "listening" ? labels?.listening ?? copy.voice.stop : labels?.idle ?? copy.modeVoice;
  const title = hold && phase === "idle" ? `${label} · ${copy.voice.holdHint}` : label;

  /*
   * The light sits on a wrapper behind the button rather than inside it: a
   * glow painted over the button's own face washed the stop square out
   * against a pale bead.
   */
  return (
    <span ref={levelRef} className={styles.mic} data-holding={press.holding || undefined}>
      {phase === "listening" && (
        <>
          <span className={styles.breath} aria-hidden="true" />
          <span className={styles.ring} aria-hidden="true" />
          <span className={styles.halo} aria-hidden="true" />
        </>
      )}
      {phase === "understanding" && (
        <span className={styles.orbit} aria-hidden="true" />
      )}

      <button
        type="button"
        {...press.bind}
        aria-label={label}
        title={title}
        aria-pressed={phase === "listening"}
        aria-busy={phase === "understanding"}
        data-coach-target={coachTarget}
        className={`${styles.micButton} ${className} ${
          active ? activeClassName : idleClassName
        }`}
      >
        {phase === "listening" ? (
          <Square size={iconSize - 4} fill="currentColor" strokeWidth={0} aria-hidden="true" />
        ) : phase === "understanding" ? (
          <LoaderCircle size={iconSize - 2} className="animate-spin" aria-hidden="true" />
        ) : (
          <Mic size={iconSize} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>
    </span>
  );
}

function noticeText(
  notice: VoiceNotice,
  copy: ReturnType<typeof useTranslation>["t"]["lexicon"]["voice"],
) {
  switch (notice) {
    case "no-speech":
      return copy.noSpeech;
    case "not-understood":
      return copy.notUnderstood;
    case "unavailable":
      return copy.unavailable;
    case "limit":
      return copy.limit;
    case "mic-denied":
      return copy.micDenied;
    case "mic-busy":
      return copy.micBusy;
    case "mic-missing":
      return copy.micMissing;
    case "weak-local":
      return copy.weakLocal;
    case "queued":
      return copy.queued;
  }
}

export function VoiceCaptureStatus({
  phase: givenPhase,
  listening,
  levelRef,
  caption = "",
  notice = null,
  tone = "warm",
  compact = false,
  className = "",
  held = false,
  better = null,
  onBetter,
}: VoiceView & {
  caption?: string;
  notice?: VoiceNotice | null;
  /** The key is held down: letting go sends it. */
  held?: boolean;
  /** Yumi's hearing of a sentence the phone answered on a weak signal. */
  better?: string | null;
  onBetter?: () => void;
  tone?: "warm" | "cosmic";
  /** Caption and notices only: the surface shows its own listening state. */
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const copy = t.lexicon.voice;
  const phase = givenPhase ?? (listening ? "listening" : "idle");
  const cosmic = tone === "cosmic";
  /*
   * The newest words, not the whole minute: on home the caption sits above
   * Yumi, and a paragraph growing down the screen would run into her.
   */
  const shownCaption =
    caption.length > CAPTION_TAIL ? `…${caption.slice(-CAPTION_TAIL).trimStart()}` : caption;

  if (phase === "idle") {
    if (!notice && !better) return null;
    const tint = cosmic ? "text-[var(--cosmic-cyan)]" : "text-[var(--accent-amber-deep)]";
    return (
      <div role="status" className={`${styles.caption} ${className} text-[0.75rem] leading-5 ${tint}`}>
        {notice ? (
          <p className="m-0">
            {noticeText(notice, copy)}
            {notice === "mic-denied" ? (
              <>
                {" "}
                <button type="button" className={styles.noticeAction} onClick={openMicGuide}>
                  {copy.micHowTo}
                </button>
              </>
            ) : null}
          </p>
        ) : null}
        {better ? (
          <p className={`m-0 ${notice ? "mt-1" : ""}`}>
            {copy.better} <q className={cosmic ? "" : "text-ink-strong"}>{better}</q>{" "}
            <button type="button" className={styles.noticeAction} onClick={onBetter}>
              {copy.useBetter}
            </button>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.caption} ${cosmic ? styles.cosmic : ""} ${className}`}
    >
      {compact ? null : (
      <p
        className={`flex items-center gap-2 text-[0.75rem] font-semibold ${
          cosmic ? "hud-label" : "text-ink-soft"
        }`}
      >
        {phase === "listening" ? (
          <span ref={levelRef} className={styles.bars} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
        ) : (
          <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
        )}
        {phase === "listening" ? copy.listening : copy.understanding}
      </p>
      )}

      {caption ? (
        <p
          className={`${styles.captionText} ${compact ? "" : "mt-1.5"} text-[1rem] leading-7 ${
            phase === "understanding" ? "opacity-60" : ""
          } ${cosmic ? "text-[var(--cosmic-cyan)]" : "text-ink-strong"}`}
        >
          {shownCaption}
        </p>
      ) : null}

      {phase === "listening" && !compact ? (
        <p
          className={`mt-1 text-[0.6875rem] leading-5 ${
            cosmic ? "text-[var(--cosmic-cyan-dim)]" : "text-ink-faint"
          }`}
        >
          {held ? copy.holding : copy.listeningHint}
        </p>
      ) : null}
    </div>
  );
}
