"use client";

/* =========================================================
   Drawing the target without burying the picture

   The spec's visual instruction is the hard constraint here: corner marks
   rather than boxes, nothing permanent, and no debug overlay of a rectangle
   per character. The image is the subject and every pixel of chrome is
   taken from it.

   So candidates are drawn at a weight that reads as "you could tap here"
   and no louder — thin, half-transparent, no fill. The selected target is
   the only element allowed to be confident, and it earns that by being the
   thing that is about to be photographed.

   Selection is never carried by colour alone. The chosen target has corner
   brackets the candidates do not have, a visibly heavier stroke, and a
   label; a reader who cannot tell the amber from the white still sees which
   one is selected.
   ========================================================= */

import styles from "@/components/camera/TargetOverlay.module.css";
import type { NormalizedRect } from "@/lib/media/geometry";

type TargetOverlayProps = {
  candidates: readonly NormalizedRect[];
  selected: NormalizedRect | null;
  /** Announced beside the selected frame. Never the only signal. */
  selectedLabel: string;
  candidateLabel: string;
  /** Dimmed while the shutter is working, so the frame reads as committed. */
  busy?: boolean;
};

function percent(value: number) {
  return `${value * 100}%`;
}

function boxStyle(rect: NormalizedRect) {
  return {
    left: percent(rect.x),
    top: percent(rect.y),
    width: percent(rect.width),
    height: percent(rect.height),
  };
}

export default function TargetOverlay({
  candidates,
  selected,
  selectedLabel,
  candidateLabel,
  busy = false,
}: TargetOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden={candidates.length === 0 && !selected}
    >
      {candidates.map((rect, index) => {
        const isSelected =
          selected &&
          rect.x === selected.x &&
          rect.y === selected.y &&
          rect.width === selected.width &&
          rect.height === selected.height;

        if (isSelected) return null;

        return (
          <div
            /*
             * Keyed by slot, not by coordinates. The key used to contain
             * the rect's own floating-point position, so a hand-held
             * camera's jitter changed it every tick — React destroyed and
             * rebuilt every outline five times a second and restarted its
             * fade, which is why they never settled. Candidates are ordered
             * by area and capped at five; the slot is the stable identity.
             */
            key={index}
            className="absolute rounded-[10px] border border-white/35 transition-opacity duration-300"
            style={{ ...boxStyle(rect), opacity: busy ? 0 : 1 }}
            role="img"
            aria-label={candidateLabel}
          />
        );
      })}

      {selected && (
        <div
          className={styles.target}
          style={boxStyle(selected)}
          role="img"
          aria-label={selectedLabel}
        >
          {/*
            The band that makes it obvious from across a room. Clipped to the
            target's own rounded rectangle, so it sweeps the thing being read
            and nothing else.
          */}
          {busy && (
            <span className={styles.bandClip} aria-hidden="true">
              <span className={styles.band} />
            </span>
          )}
          {/*
            Brackets rather than a full box: they mark the corners the crop
            will be taken at without drawing a line through the middle of
            the word being read.
          */}
          {(
            [
              "left-0 top-0 border-l-2 border-t-2 rounded-tl-[10px]",
              "right-0 top-0 border-r-2 border-t-2 rounded-tr-[10px]",
              "left-0 bottom-0 border-b-2 border-l-2 rounded-bl-[10px]",
              "right-0 bottom-0 border-b-2 border-r-2 rounded-br-[10px]",
            ] as const
          ).map((corner) => (
            <span
              key={corner}
              className={`absolute h-6 w-6 border-white ${corner}`}
              style={{
                filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))",
              }}
            />
          ))}

          <span
            className="absolute inset-0 rounded-[10px] border border-white/25 transition-[box-shadow] duration-500"
            style={{
              /*
                The surround deepens while the target is being read, so the
                eye is held on the thing being worked on rather than on the
                room around it.
              */
              boxShadow: `0 0 0 9999px rgba(0,0,0,${busy ? 0.42 : 0.18})`,
            }}
          />

          {/*
            The scan, drawn on the target and nowhere else.

            The wait here is the model's, and it is three to seven seconds —
            measured, and not reducible by any parameter this app controls.
            So the job is to make it legible rather than shorter: a light
            travelling the target's own perimeter says which rectangle is
            being read, and that something is still happening.

            Deliberately not a line sweeping the whole viewfinder. The spec
            rules that out by name, and it would also be a lie — nothing is
            scanning the rest of the frame.

            SVG with an animated dash offset rather than a moving element:
            it is one compositor-friendly property, it follows the rounded
            rectangle exactly at any aspect ratio, and it costs nothing when
            the reader has asked for less motion, where it simply holds
            still as a brighter outline.
          */}
          {busy && (
            <svg className={styles.edge} aria-hidden="true">
              <rect
                x="1"
                y="1"
                width="calc(100% - 2px)"
                height="calc(100% - 2px)"
                rx="10"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="22 78"
                className={styles.edgeStroke}
              />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
