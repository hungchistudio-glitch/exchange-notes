"use client";

import { SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import useReducedMotion from "@/hooks/useReducedMotion";
import type { HangyumiRound } from "@/lib/hangyumi/rules";
import type { YumiOutfit } from "@/lib/shop/catalog";
import { plan, progress } from "@/lib/wordvault/presentation";
import type { VaultScene, WordvaultStudio } from "@/lib/wordvault/studio";

import styles from "@/components/hangyumi/Hangyumi.module.css";

type Props = {
  round: HangyumiRound | null;
  /** What she wears from the shop, from the first frame. */
  outfit: YumiOutfit | null;
  label: string;
  skipLabel: string;
};

const sceneOf = (round: HangyumiRound): VaultScene => ({
  progress: progress(round).fraction,
  misses: round.misses,
  status: round.status,
  answer: round.answer ?? "",
});

/**
 * Wordvault's stage, in the same frame as Hangyumi's: the studio loads
 * once the page is up (three.js and the outfit builders are a large
 * download), and a flat drawing stands in only where WebGL cannot be had.
 *
 * The stage reads the show off the round itself: the round before a guess
 * and the round after it say how many steps she takes and which copy
 * flies (lib/wordvault/presentation.ts). A new word walks her back and
 * closes the lid. Anything playing can be skipped; the cookies were paid
 * before the show began, by the server, and skipping changes nothing.
 */
export default function WordvaultStage({ round, outfit, label, skipLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<WordvaultStudio | null>(null);
  const shownRef = useRef<HangyumiRound | null>(null);
  const latestRef = useRef({ round, outfit });
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const reducedMotion = useReducedMotion();

  // A guess, a new word, or the same round picked up again.
  useEffect(() => {
    latestRef.current.round = round;
    const studio = studioRef.current;
    const before = shownRef.current;
    shownRef.current = round;
    if (!studio || !round) return;
    if (before && before.id === round.id && round.guessed.length > before.guessed.length) {
      studio.play(plan(before, round), sceneOf(round));
    } else {
      studio.show(sceneOf(round), { reset: !!before && before.id !== round.id });
    }
  }, [round]);

  useEffect(() => {
    latestRef.current.outfit = outfit;
    studioRef.current?.wear(outfit);
  }, [outfit]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let create: typeof import("@/lib/wordvault/studio").createWordvaultStudio | null = null;

    /* (Re)builds the studio on the canvas, where the round has got to. */
    const build = () => {
      if (cancelled || !create) return;
      studioRef.current?.dispose();
      const studio = create(canvas, { reducedMotion, onBusy: next => { if (!cancelled) setBusy(next); } });
      studioRef.current = studio;
      if (!studio) {
        setLive(false);
        setFailed(true);
        return;
      }
      studio.wear(latestRef.current.outfit);
      const current = latestRef.current.round;
      shownRef.current = current;
      if (current) studio.show(sceneOf(current));
      setFailed(false);
      setLive(true);
    };

    /* The GPU can take the canvas back; the drawing stands in until the
       browser returns it, and then the studio is built again. */
    const lost = (event: Event) => {
      event.preventDefault();
      setLive(false);
      setFailed(true);
      setBusy(false);
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", build);

    void import("@/lib/wordvault/studio").then(studio => {
      create = studio.createWordvaultStudio;
      build();
    }, () => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", build);
      studioRef.current?.dispose();
      studioRef.current = null;
      setLive(false);
    };
  }, [reducedMotion]);

  const along = round ? progress(round).fraction : 0;
  const thrown = round && round.status === "playing" ? round.misses : 0;
  const open = round?.status === "won";
  return (
    <>
    <div className={styles.stage} role="img" aria-label={label} data-live={live ? "true" : "false"} data-game="wordvault">
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {failed && (
        <svg className={styles.flat} viewBox="0 0 160 100" aria-hidden="true" focusable="false">
          <path className={styles.flatGallows} d="M8 84h112" />
          <rect className={styles.flatGallows} x="104" y="56" width="40" height="28" rx="3" />
          <path className={styles.flatGallows} d={open ? "M104 56l6-18h34" : "M104 56q20-14 40 0"} />
          <circle className={styles.flatEye} cx={18 + along * 72} cy="66" r="6" />
          <path className={styles.flatBody} d={`M${8 + along * 72} 70a10 10 0 0 0 20 0`} />
          {Array.from({ length: thrown }, (_, i) => (
            <circle key={i} className={styles.flatArm} cx={90 + i * 6} cy="82" r="2" />
          ))}
        </svg>
      )}
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
