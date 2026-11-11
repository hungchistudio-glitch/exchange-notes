"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import useReducedMotion from "@/hooks/useReducedMotion";
import type { HangyumiStatus } from "@/lib/hangyumi/rules";
import type { HangyumiStudio } from "@/lib/hangyumi/studio";
import type { YumiOutfit } from "@/lib/shop/catalog";
import { sweepLiquid } from "@/lib/starweaver/liquid";

import styles from "./Hangyumi.module.css";

type Props = {
  misses: number;
  status: HangyumiStatus;
  outfit: YumiOutfit | null;
  /** The first deal has come back, whatever it held: the keys can come in. */
  dealt: boolean;
  /** The first line has come to rest, or there is no studio to wait for. */
  onArrived: () => void;
  /** A Nightscale piece a guess just unlocked, keyed by its round. */
  present?: { key: string; itemId: string } | null;
  /** The piece has been lowered and flown to us: the page shows it whole. */
  onPresented?: () => void;
  label: string;
};

/**
 * The studio, loaded only once the page is up (three.js and every outfit
 * builder are a large download). Until then the studio is empty, in its
 * own white, and the real gallows fades in: a drawing standing in for it
 * could never be the same shape and size, and the swap showed (Chi,
 * 2026-10-26). The flat drawing is only for where WebGL is not to be had,
 * or while the GPU has taken the canvas back.
 *
 * The page comes in on the first line (Chi, 2026-11-11, as in the other
 * two games): when it has lowered and come to rest and the first word is
 * dealt, the games' liquid light sweeps down the screen in honey gold and
 * the page lays out the clue and the keys. Once only: a studio built again
 * finds the page already in. With no studio to wait for, the page comes in
 * at once, and with nothing moving (reduced motion) there is no sweep.
 */
export default function HangyumiStage({ misses, status, outfit, dealt, onArrived, present = null, onPresented, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<HangyumiStudio | null>(null);
  const poseRef = useRef({ misses, status, outfit });
  const latestRef = useRef({ dealt, onArrived, onPresented });
  /* The gift sent for, and whether the page has been told it arrived. */
  const presentedRef = useRef<string | null>(null);
  const awaitingRef = useRef(false);
  /* The line has come to rest: true once it lowered, false if nothing moved. */
  const restedRef = useRef<boolean | null>(null);
  /* The page has been told. */
  const arrivedRef = useRef(false);
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const reducedMotion = useReducedMotion();

  /* The page comes in once the line is at rest and the word is dealt. */
  const comeIn = useCallback(() => {
    if (arrivedRef.current || restedRef.current === null || !latestRef.current.dealt) return;
    arrivedRef.current = true;
    if (restedRef.current) sweepLiquid("hangyumi");
    latestRef.current.onArrived();
  }, []);
  /* The gift has been shown, or cannot be: the page shows it whole. */
  const presented = useCallback(() => {
    if (!awaitingRef.current) return;
    awaitingRef.current = false;
    latestRef.current.onPresented?.();
  }, []);
  /* No studio to wait for: the page comes in now, as it is, and a gift on
     its way goes straight to the page. */
  const giveUp = useCallback(() => {
    presented();
    if (arrivedRef.current) return;
    arrivedRef.current = true;
    latestRef.current.onArrived();
  }, [presented]);

  useEffect(() => {
    latestRef.current = { dealt, onArrived, onPresented };
    comeIn();
  }, [dealt, onArrived, onPresented, comeIn]);

  /* A piece a guess just unlocked: the studio lowers it on the line, or,
     with no studio, the page shows it at once. Once per round. */
  useEffect(() => {
    if (!present || presentedRef.current === present.key) return;
    presentedRef.current = present.key;
    awaitingRef.current = true;
    const studio = studioRef.current;
    if (studio) studio.present(present.itemId, presented);
    else presented();
  }, [present, presented]);

  useEffect(() => {
    poseRef.current = { misses, status, outfit };
    studioRef.current?.set(poseRef.current);
  }, [misses, status, outfit]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let create: typeof import("@/lib/hangyumi/studio").createHangyumiStudio | null = null;

    /* (Re)builds the studio on the canvas, in the pose the round is in now. */
    const build = () => {
      if (cancelled || !create) return;
      studioRef.current?.dispose();
      const studio = create(canvas, {
        reducedMotion,
        onArrived: lowered => {
          if (cancelled) return;
          restedRef.current ??= lowered;
          comeIn();
        },
      });
      studioRef.current = studio;
      if (!studio) {
        setLive(false);
        setFailed(true);
        giveUp();
        return;
      }
      studio.set(poseRef.current);
      setFailed(false);
      setLive(true);
    };

    /*
     * The GPU can take the canvas back: an iPhone after a long while in the
     * background, or memory running short. The studio would sit blank.
     * Instead the flat drawing stands in, and when the browser gives the
     * context back the studio is built again where the round has got to
     * (Chi, 2026-10-26). preventDefault is what asks for it back.
     */
    const lost = (event: Event) => {
      event.preventDefault();
      setLive(false);
      setFailed(true);
      giveUp();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", build);

    void import("@/lib/hangyumi/studio").then(studio => {
      create = studio.createHangyumiStudio;
      build();
    }, () => {
      if (cancelled) return;
      setFailed(true);
      giveUp();
    });
    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", build);
      studioRef.current?.dispose();
      studioRef.current = null;
      setLive(false);
    };
  }, [reducedMotion, comeIn, giveUp]);

  const hung = status === "playing" ? misses : 3;
  return (
    <div className={styles.stage} role="img" aria-label={label} data-live={live ? "true" : "false"} data-liquid-stage="">
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {failed && (
        <svg className={styles.flat} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <path className={styles.flatGallows} d="M18 108h46M30 108V14h52M30 34l20-20" />
          <path className={styles.flatLine} d={status === "won" ? "M82 14v4" : "M82 14v22"} />
          <g className={styles.flatYumi} data-free={status === "won" ? "true" : "false"}>
            {(hung >= 1 || status === "won") && <circle className={styles.flatEye} cx="82" cy="44" r="7" />}
            {(hung >= 2 || status === "won") && <path className={styles.flatArm} d="M82 51v15" />}
            {(hung >= 3 || status === "won") && <path className={styles.flatBody} d="M64 46a18 18 0 0 0 36 0" />}
          </g>
        </svg>
      )}
    </div>
  );
}
