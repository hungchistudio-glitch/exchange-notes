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
  /** While the frame is being read: the target breathes, the rest dims. */
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
            Brackets rather than a full box: they mark the corners the crop
            will be taken at without drawing a line through the middle of
            the word being read.
          */}
          {(
            [
              ["left-0 top-0 border-l-2 border-t-2 rounded-tl-[10px]", "100% 100%"],
              ["right-0 top-0 border-r-2 border-t-2 rounded-tr-[10px]", "0% 100%"],
              ["left-0 bottom-0 border-b-2 border-l-2 rounded-bl-[10px]", "100% 0%"],
              ["right-0 bottom-0 border-b-2 border-r-2 rounded-br-[10px]", "0% 0%"],
            ] as const
          ).map(([corner, origin]) => (
            <span
              key={corner}
              className={`absolute h-6 w-6 border-white ${corner} ${busy ? styles.breathing : ""}`}
              style={
                busy
                  ? /* Grows outward from the target's inside, so all four
                       open and close around it together. */
                    { transformOrigin: origin }
                  : { filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))" }
              }
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
              boxShadow: `0 0 0 9999px rgba(0,0,0,${busy ? 0.5 : 0.18})`,
            }}
          />

          {/*
            The target breathing while it is read (Chi, 2026-09-28: "目標框
            呼吸光"). A soft white glow round the target's own rounded
            rectangle swells and settles with the corners — on the target and
            nowhere else, because nothing is reading the rest of the picture.
            It replaced a band sweeping the inside and a light running the
            edge: one slow, calm signal on a frozen frame rather than two
            fast ones.
          */}
          {busy && (
            <span className={styles.glow} aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  );
}
