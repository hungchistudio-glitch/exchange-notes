"use client";

import { LoaderCircle, Mic, Square } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";
import type useVoiceInput from "@/hooks/useVoiceInput";
import type { VoiceNotice } from "@/hooks/useVoiceInput";

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
}: VoiceView & {
  onPress: () => void;
  /** Size and shape; the colours come from the two below. */
  className: string;
  idleClassName: string;
  activeClassName: string;
  iconSize?: number;
}) {
  const { t } = useTranslation();
  const copy = t.lexicon;
  const phase = givenPhase ?? (listening ? "listening" : "idle");
  const active = phase !== "idle";

  /*
   * The light sits on a wrapper behind the button rather than inside it: a
   * glow painted over the button's own face washed the stop square out
   * against a pale bead.
   */
  return (
    <span ref={levelRef} className={styles.mic}>
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
        onClick={onPress}
        aria-label={phase === "listening" ? copy.voice.stop : copy.modeVoice}
        title={phase === "listening" ? copy.voice.stop : copy.modeVoice}
        aria-pressed={phase === "listening"}
        aria-busy={phase === "understanding"}
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
}: VoiceView & {
  caption?: string;
  notice?: VoiceNotice | null;
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
    if (!notice) return null;
    return (
      <p
        role="status"
        className={`${styles.caption} ${className} text-[0.75rem] leading-5 ${
          cosmic ? "text-[var(--cosmic-cyan)]" : "text-[var(--accent-amber-deep)]"
        }`}
      >
        {noticeText(notice, copy)}
      </p>
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
          {copy.listeningHint}
        </p>
      ) : null}
    </div>
  );
}
