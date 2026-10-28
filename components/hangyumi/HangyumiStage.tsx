"use client";

import { useEffect, useRef, useState } from "react";

import useReducedMotion from "@/hooks/useReducedMotion";
import type { HangyumiStatus } from "@/lib/hangyumi/rules";
import type { HangyumiStudio } from "@/lib/hangyumi/studio";
import type { YumiOutfit } from "@/lib/shop/catalog";

import styles from "./Hangyumi.module.css";

type Props = {
  misses: number;
  status: HangyumiStatus;
  outfit: YumiOutfit | null;
  label: string;
};

/**
 * The studio, loaded only once the page is up (three.js and every outfit
 * builder are a large download). Until then the studio is empty, in its
 * own white, and the real gallows fades in: a drawing standing in for it
 * could never be the same shape and size, and the swap showed (Chi,
 * 2026-10-26). The flat drawing is only for where WebGL is not to be had,
 * or while the GPU has taken the canvas back.
 */
export default function HangyumiStage({ misses, status, outfit, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<HangyumiStudio | null>(null);
  const poseRef = useRef({ misses, status, outfit });
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const reducedMotion = useReducedMotion();

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
      const studio = create(canvas, { reducedMotion });
      studioRef.current = studio;
      if (!studio) {
        setLive(false);
        setFailed(true);
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
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", build);

    void import("@/lib/hangyumi/studio").then(studio => {
      create = studio.createHangyumiStudio;
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

  const hung = status === "playing" ? misses : 3;
  return (
    <div className={styles.stage} role="img" aria-label={label} data-live={live ? "true" : "false"}>
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
