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
  /** What she wears from the shop, from the moment she arrives. */
  outfit: YumiOutfit | null;
  /** The wallet has been read (or could not be): she can be dressed. */
  dressed: boolean;
  /** The first deal has come back, whatever it held: she can come in. */
  dealt: boolean;
  /** She has touched the stone, or there is no studio to arrive in. */
  onArrived: () => void;
  label: string;
  skipLabel: string;
};

const sceneOf = (round: HangyumiRound): VaultScene => ({
  progress: progress(round).fraction,
  misses: round.misses,
  status: round.status,
  answer: round.answer ?? "",
  chest: round.chest,
});

/**
 * Wordvault's stage, in the same frame as Hangyumi's: the studio loads
 * once the page is up (three.js and the outfit builders are a large
 * download), and a flat drawing stands in only where WebGL cannot be had.
 *
 * She arrives once (Chi, 2026-10-26): the set is compiled before the
 * canvas fades in, so it comes in empty and whole; when the wallet says
 * what she wears and the first word is dealt, she is dressed out of sight
 * and drops in, and the page lays the clue and the keys out as she lands.
 * A wallet that has not answered in WALLET_WAIT_MS no longer holds her up:
 * she comes as she is and dresses when it does. A studio built again (the
 * GPU took the canvas back) finds her already there.
 *
 * The stage reads the show off the round itself: the round before a guess
 * and the round after it say how many steps she takes and which copy
 * flies (lib/wordvault/presentation.ts). A new word walks her back and
 * closes the lid. Anything playing can be skipped; the cookies were paid
 * before the show began, by the server, and skipping changes nothing.
 */
const WALLET_WAIT_MS = 2500;

export default function WordvaultStage({ round, outfit, dressed, dealt, onArrived, label, skipLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<WordvaultStudio | null>(null);
  const shownRef = useRef<HangyumiRound | null>(null);
  const latestRef = useRef({ round, outfit, dressed, dealt, onArrived });
  /* The studio is drawn and showing; she has been sent for. */
  const readyRef = useRef(false);
  const sentRef = useRef(false);
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [walletLate, setWalletLate] = useState(false);
  const reducedMotion = useReducedMotion();

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
    arriveRef.current();
  }, [dressed, dealt, onArrived, walletLate]);

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
    if (!studio || !round) return;
    if (before && before.id === round.id && round.guessed.length > before.guessed.length) {
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
    let create: typeof import("@/lib/wordvault/studio").createWordvaultStudio | null = null;

    /* (Re)builds the studio on the canvas, where the round has got to. */
    const build = () => {
      if (cancelled || !create) return;
      studioRef.current?.dispose();
      readyRef.current = false;
      const studio = create(canvas, {
        reducedMotion,
        onBusy: next => { if (!cancelled) setBusy(next); },
        onArrived: () => { if (!cancelled) latestRef.current.onArrived(); },
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

    /* The GPU can take the canvas back; the drawing stands in until the
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

    void import("@/lib/wordvault/studio").then(studio => {
      create = studio.createWordvaultStudio;
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
