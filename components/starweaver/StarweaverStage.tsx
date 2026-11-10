"use client";

import { useEffect, useRef } from "react";

import { revealProgress, type HangyumiRound } from "@/lib/hangyumi/rules";
import type { YumiOutfit } from "@/lib/shop/catalog";

import styles from "@/components/hangyumi/Hangyumi.module.css";

type Props = {
  round: HangyumiRound | null;
  /** What she wears from the shop, from the moment she arrives. */
  outfit: YumiOutfit | null;
  /** The wallet has been read (or could not be): she can be dressed. */
  dressed: boolean;
  /** The first deal has come back, whatever it held: she can come in. */
  dealt: boolean;
  /** She has arrived, or there is no studio to arrive in. */
  onArrived: () => void;
  label: string;
  skipLabel: string;
};

/* Where the star track runs on the flat chart: from Yumi to the gate. */
const TRACK = { from: [34, 70], via: [66, 22], to: [104, 46] } as const;

function point(t: number): [number, number] {
  const [x0, y0] = TRACK.from;
  const [x1, y1] = TRACK.via;
  const [x2, y2] = TRACK.to;
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2];
}

/* One piece of track for each place in the word, with a hairline gap. */
function segments(count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = i / count + 0.008;
    const end = (i + 1) / count - 0.008;
    const steps = 6;
    const points = Array.from({ length: steps + 1 }, (_, k) => point(start + ((end - start) * k) / steps));
    out.push(points.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(""));
  }
  return out;
}

/* An incomplete ring of the gate: an arc from one angle to another. */
function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const a = (from * Math.PI) / 180;
  const b = (to * Math.PI) / 180;
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}A${r} ${r} 0 ${large} 1 ${(cx + r * Math.cos(b)).toFixed(2)} ${(cy + r * Math.sin(b)).toFixed(2)}`;
}

const GATE = { x: 118, y: 46 };
/* Where U, I and O wait on the gate's outer orbit, in that order. */
const CLONE_SPOTS: readonly [number, number][] = [[142, 30], [146, 50], [140, 68]];
const CLONE_NAMES = ["U", "I", "O"] as const;

/**
 * Yumi Starweaver's stage (Chi, 2026-11-10): the letters of the word woven
 * into a track of light towards a star gate, which the finished word opens.
 *
 * This is the chart drawn flat: the same state as the studio, read off the
 * round, never ahead of it. Each place a right guess filled lights one
 * piece of track (so the P of APPLE lights two, paid once); a wrong guess
 * sends out a copy of her U, then her I, then her O, which wait by the
 * gate while she stays whole; a lost word brings them home and lights
 * nothing it did not earn, though the answer is shown; a won word closes
 * the track and opens the gate.
 *
 * Nothing here pays or awards. The server has decided the cookies and any
 * relic before the stage hears of the guess.
 */
export default function StarweaverStage({ round, dealt, onArrived, label }: Props) {
  const arrivedRef = useRef(false);

  /* No studio to arrive in yet: the page lays out as soon as a word is dealt. */
  useEffect(() => {
    if (!dealt || arrivedRef.current) return;
    arrivedRef.current = true;
    onArrived();
  }, [dealt, onArrived]);

  const built = round ? revealProgress(round) : { total: 0, revealed: 0, fraction: 0 };
  const lit = new Set<number>();
  if (round) {
    /* Lit in the order the places stand in the word, as guessed. */
    let place = 0;
    for (const slot of round.slots) {
      if (!slot.letter) continue;
      if (slot.char !== null && round.guessed.includes(slot.char.normalize("NFC").toLocaleLowerCase())) lit.add(place);
      place += 1;
    }
  }
  const out = round && round.status === "playing" ? round.misses : 0;
  const open = round?.status === "won";
  const track = segments(Math.max(1, built.total));

  return (
    <div className={styles.stage} role="img" aria-label={label} data-live="false" data-game="starweaver">
      <svg className={styles.flat} viewBox="0 0 160 100" aria-hidden="true" focusable="false" data-open={open ? "true" : "false"}>
        <defs>
          <radialGradient id="sw-core" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#d6eef2" />
            <stop offset="100%" stopColor="#9fc9d2" />
          </radialGradient>
        </defs>
        {/* The floor, and the contact shadow behind her. */}
        <ellipse className={styles.swShadow} cx="26" cy="86" rx="16" ry="2.4" />
        {/* The gate: three supports, two incomplete rings, a lens. */}
        <path className={styles.swSupport} d={`M${GATE.x - 14} 84L${GATE.x - 6} 66M${GATE.x + 14} 84L${GATE.x + 6} 66M${GATE.x} 84V72`} />
        <path className={styles.swRing} d={open ? arc(GATE.x, GATE.y, 24, -90, 269.9) : arc(GATE.x, GATE.y, 24, -60, 220)} />
        <path className={styles.swRing} d={open ? arc(GATE.x, GATE.y, 18, 90, 449.9) : arc(GATE.x, GATE.y, 18, 120, 400)} data-inner="true" />
        <circle className={styles.swCore} cx={GATE.x} cy={GATE.y} r={open ? 12 : 7} fill="url(#sw-core)" />
        {/* The star track, one piece for each place in the word. */}
        {track.map((d, i) => (
          <path key={i} className={styles.swTrack} d={d} data-lit={lit.has(i) || open ? "true" : "false"} />
        ))}
        {/* Yumi, whole: her O as an eye, her U below it. */}
        <circle className={styles.flatEye} cx="26" cy="64" r="6" />
        <path className={styles.flatBody} d="M16 70a10 10 0 0 0 20 0" />
        {/* The copies a wrong guess sent out, waiting by the gate. */}
        {CLONE_SPOTS.map(([x, y], i) => (
          <text key={CLONE_NAMES[i]} className={styles.swClone} x={x} y={y} data-out={i < out ? "true" : "false"}>
            {CLONE_NAMES[i]}
          </text>
        ))}
      </svg>
    </div>
  );
}
