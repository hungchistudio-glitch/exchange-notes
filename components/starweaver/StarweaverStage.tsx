"use client";

import { SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import useCosmicMode from "@/hooks/useCosmicMode";
import useReducedMotion from "@/hooks/useReducedMotion";
import { revealProgress, type HangyumiRound } from "@/lib/hangyumi/rules";
import type { YumiOutfit } from "@/lib/shop/catalog";
import { sweepLiquid } from "@/lib/starweaver/liquid";
import { litPlaces, plan } from "@/lib/starweaver/presentation";
import type { StarweaverStudio, WeaveScene } from "@/lib/starweaver/studio";

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
  /** A seventh's relic is out of the gate, or there is no gate to show it: the page shows it whole. */
  onRelic?: () => void;
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

/* The chart drawn flat: where WebGL cannot run, the same state as the studio. */
function FlatChart({ round }: { round: HangyumiRound | null }) {
  const built = round ? revealProgress(round) : { total: 0, revealed: 0, fraction: 0 };
  const lit = new Set(round ? litPlaces(round) : []);
  const out = round && round.status === "playing" ? round.misses : 0;
  const open = round?.status === "won";
  const track = segments(Math.max(1, built.total));
  return (
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
        <text key={CLONE_NAMES[i]} className={styles.swClone} x={x} y={y} fontSize={9} data-out={i < out ? "true" : "false"}>
          {CLONE_NAMES[i]}
        </text>
      ))}
    </svg>
  );
}

const sceneOf = (round: HangyumiRound): WeaveScene => ({
  places: revealProgress(round).total,
  lit: litPlaces(round),
  misses: round.misses,
  status: round.status,
  relic: round.status === "won" ? round.starweaver?.award?.itemId ?? null : null,
});

/** How long a wallet that has not answered may hold her up. */
const WALLET_WAIT_MS = 2500;

/**
 * Yumi Starweaver's stage (Chi, 2026-11-10): the real Yumi, in what she
 * wears, beside a star gate; the letters of the word woven into a track of
 * light to it (lib/starweaver/studio.ts). The studio loads once the page is
 * up (three.js and the outfit builders are a large download); the flat
 * chart stands in only where WebGL cannot be had, or while the GPU has
 * taken the canvas back, and shows the same state.
 *
 * The show is read off the round itself, the round before a guess and the
 * round after it (lib/starweaver/presentation.ts). Nothing here pays or
 * awards: the server has decided the cookies and any relic before the
 * stage hears of the guess, and skipping changes nothing.
 */
export default function StarweaverStage({ round, outfit, dressed, dealt, onArrived, onRelic, label, skipLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<StarweaverStudio | null>(null);
  const shownRef = useRef<HangyumiRound | null>(null);
  const latestRef = useRef({ round, outfit, dressed, dealt, onArrived, onRelic });
  const readyRef = useRef(false);
  const sentRef = useRef(false);
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [walletLate, setWalletLate] = useState(false);
  const reducedMotion = useReducedMotion();
  const cosmic = useCosmicMode();

  /* Sends for her once everything she arrives with is here. */
  const arriveRef = useRef(() => {});
  useEffect(() => {
    arriveRef.current = () => {
      const studio = studioRef.current;
      const latest = latestRef.current;
      if (!studio || !readyRef.current || sentRef.current || !latest.dealt) return;
      if (!latest.dressed && !walletLate) return;
      sentRef.current = true;
      studio.arrive(latest.dressed ? latest.outfit : null);
    };
  });

  useEffect(() => {
    latestRef.current.dressed = dressed;
    latestRef.current.dealt = dealt;
    latestRef.current.onArrived = onArrived;
    latestRef.current.onRelic = onRelic;
    arriveRef.current();
  }, [dressed, dealt, onArrived, onRelic, walletLate]);

  /* The wallet's wait, counted from the deal. */
  useEffect(() => {
    if (!dealt || dressed) return;
    const timer = window.setTimeout(() => setWalletLate(true), WALLET_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [dealt, dressed]);

  // A guess, a new word, or the same round picked up again.
  useEffect(() => {
    latestRef.current.round = round;
    const studio = studioRef.current;
    const before = shownRef.current;
    shownRef.current = round;
    if (!round) return;
    const guessed = !!before && before.id === round.id && round.guessed.length > before.guessed.length;
    if (!studio) {
      /* No gate to bring it out of: the page shows the relic at once. */
      if (guessed && round.status === "won" && round.starweaver?.award) latestRef.current.onRelic?.();
      return;
    }
    if (guessed) {
      studio.play(plan(before, round), sceneOf(round));
    } else {
      studio.show(sceneOf(round), { reset: !!before && before.id !== round.id });
    }
  }, [round]);

  /* Once she is there; before, she is dressed as she arrives. */
  useEffect(() => {
    latestRef.current.outfit = outfit;
    if (sentRef.current) studioRef.current?.wear(outfit);
  }, [outfit]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let create: typeof import("@/lib/starweaver/studio").createStarweaverStudio | null = null;

    /* (Re)builds the studio on the canvas, where the round has got to. */
    const build = () => {
      if (cancelled || !create) return;
      studioRef.current?.dispose();
      readyRef.current = false;
      const studio = create(canvas, {
        reducedMotion,
        cosmic,
        onBusy: next => { if (!cancelled) setBusy(next); },
        onArrived: () => { if (!cancelled) latestRef.current.onArrived(); },
        /* As she touches down, light sweeps down the page and the keys rise with it. */
        onLanded: () => { if (!cancelled) sweepLiquid("starweaver"); },
        onRelic: () => { if (!cancelled) latestRef.current.onRelic?.(); },
      });
      studioRef.current = studio;
      if (!studio) {
        setLive(false);
        setFailed(true);
        latestRef.current.onArrived();
        return;
      }
      const current = latestRef.current.round;
      shownRef.current = current;
      if (current) studio.show(sceneOf(current));
      void studio.ready().then(() => {
        if (cancelled || studioRef.current !== studio) return;
        readyRef.current = true;
        setFailed(false);
        setLive(true);
        if (sentRef.current) studio.arrive(latestRef.current.outfit, { instant: true });
        else arriveRef.current();
      });
    };

    /* The GPU can take the canvas back; the flat chart stands in until the
       browser returns it, and then the studio is built again. */
    const lost = (event: Event) => {
      event.preventDefault();
      setLive(false);
      setFailed(true);
      setBusy(false);
      latestRef.current.onArrived();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", build);

    void import("@/lib/starweaver/studio").then(studio => {
      create = studio.createStarweaverStudio;
      build();
    }, () => {
      if (cancelled) return;
      setFailed(true);
      latestRef.current.onArrived();
    });
    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", build);
      studioRef.current?.dispose();
      studioRef.current = null;
      setLive(false);
    };
  }, [reducedMotion, cosmic]);

  return (
    <>
      {/* A tap on the stage skips what is playing, the arrival included, as the button does. */}
      <div
        className={styles.stage}
        role="img"
        aria-label={label}
        data-live={live ? "true" : "false"}
        data-game="starweaver"
        data-liquid-stage=""
        onPointerDown={() => { if (busy) studioRef.current?.skip(); }}
      >
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        {failed && <FlatChart round={round} />}
      </div>
      {busy && (
        <button
          type="button"
          className={styles.skip}
          onClick={() => studioRef.current?.skip()}
          aria-label={skipLabel}
          title={skipLabel}
        >
          <SkipForward size={15} strokeWidth={1.9} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
