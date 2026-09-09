"use client";

import { useId, type CSSProperties } from "react";

import useInView from "@/hooks/useInView";
import { RADAR_NODE_COUNT } from "@/lib/discover/signalRadar";
import type { SignalRadarController } from "@/hooks/discover/useSignalRadar";
import type { TranslationDictionary } from "@/lib/i18n/types";

import styles from "./YumiSignalRadar.module.css";

type DiscoverCopy = TranslationDictionary["discover"];

type YumiSignalRadarProps = {
  controller: SignalRadarController;
  copy: DiscoverCopy;
};

/*
 * Signal traffic on the rings.
 *
 * Two periods per node and they are unrelated to each other: how long it takes
 * to go round, and how often it is lit. A point that orbits in 13s but shows
 * for a fifth of every 17s is somewhere different every time it appears, so
 * three of them never settle into a pattern the eye can follow. Same trick the
 * Command Deck and the vocabulary hero use — it is the cheapest honest way to
 * make continuous motion stop looking like a loop.
 *
 * The angles matter for the same reason they do on Yumi: with the animation
 * taken away, three nodes frozen at 0° would stack in a line and read as a
 * fault, where three at these angles read as traffic that happens to be still.
 */
const NODES: Array<{
  orbit: string;
  cycle: string;
  radius: string;
  angle: string;
  delay: string;
}> = [
  { orbit: "13s", cycle: "17s", radius: "0.40", angle: "42deg", delay: "-3.1s" },
  { orbit: "19s", cycle: "11s", radius: "0.47", angle: "171deg", delay: "-7.6s" },
  { orbit: "27s", cycle: "23s", radius: "0.34", angle: "286deg", delay: "-14.2s" },
];

/**
 * The Yumi Cosmic Signal Radar.
 *
 * It replaces Discover's refresh button in Cosmic Mode and it is not a refresh
 * button with an animation on it. Idle says the receiver is online, scanning
 * says it is looking because you asked, success says it found something, and
 * offline says it cannot. Every one of those is a real system fact arriving
 * from the feed — none of them is a timer invented to make the control look
 * busy, and the brief's own test is the one applied throughout: if a motion
 * cannot answer "what system behaviour is this", it is not here.
 *
 * The state machine is in lib/discover/signalRadar.ts and the windows it
 * cannot know about are in useSignalRadar. This file draws.
 */
export default function YumiSignalRadar({
  controller,
  copy,
}: YumiSignalRadarProps) {
  const { state, policy, scan, pressHandlers } = controller;

  // Scoped so two radars on one screen can never share a clip path.
  const eyeClipId = `radar-eye-${useId().replace(/:/g, "")}`;

  const busy = state === "scanning" || state === "syncing";

  /*
   * What a screen reader is told.
   *
   * State is never carried by colour or motion alone — the label changes with
   * it, so the radar reports the same thing to everyone. The action name stays
   * constant because the action does: whatever the receiver is doing, the
   * button refreshes Discover.
   */
  const stateLabel: string = {
    offline: copy.radarOffline,
    error: copy.radarError,
    syncing: copy.radarSyncing,
    scanning: copy.radarScanning,
    success: copy.radarSuccess,
    idle: copy.radarIdle,
  }[state];

  const nodeCount = RADAR_NODE_COUNT[policy.tier];

  const { ref, inView } = useInView<HTMLButtonElement>();

  return (
    <button
      ref={ref}
      /* Paused when scrolled away — see [data-in-view] in globals.css. */
      data-in-view={inView ? "true" : "false"}
      type="button"
      onClick={scan}
      {...pressHandlers}
      /*
       * Never disabled, even mid-scan.
       *
       * A disabled control drops out of the accessibility tree and stops
       * reporting the very state it is in — and the tap is already absorbed
       * by the cooldown in the hook, which is the right place for it. aria-busy
       * says what a disabled attribute would have said, without the cost.
       */
      aria-busy={busy}
      aria-label={`${copy.radarLabel} ${stateLabel} ${copy.refreshAction}`}
      title={stateLabel}
      className={styles.radar}
      data-state={state}
      data-tier={policy.tier}
    >
      {/* L0–L1: the field the instrument sits in, and the halo it throws. */}
      <span className={styles.ambient} aria-hidden="true" />
      <span className={styles.halo} aria-hidden="true" />

      {/* L2: the structural orb — dark glass, and the only opaque layer. */}
      <span className={styles.orb} aria-hidden="true" />

      {/* L4–L5: the inner orbit, and the segmented ring that does the
          scanning. Dashed rather than solid, because a turning solid ring
          looks identical to a still one. */}
      <span className={styles.innerOrbit} aria-hidden="true" />
      <span className={styles.scanRing} aria-hidden="true" />

      {/* L6: signal traffic, as many as this tier's budget allows. */}
      {NODES.slice(0, nodeCount).map((node) => (
        <span
          key={node.orbit}
          className={styles.signal}
          aria-hidden="true"
          style={
            {
              "--signal-orbit": node.orbit,
              "--signal-cycle": node.cycle,
              "--signal-radius": node.radius,
              "--signal-angle": node.angle,
              "--signal-delay": node.delay,
            } as CSSProperties
          }
        >
          <span className={styles.signalDot} />
        </span>
      ))}

      {/* L7: the scan sweep. Present only while actually scanning. */}
      {busy ? <span className={styles.sweep} aria-hidden="true" /> : null}

      {/* L8: the pulse a completed scan throws off, once. */}
      {state === "success" ? (
        <span className={styles.pulse} aria-hidden="true" />
      ) : null}

      {/*
        L3: the core, which is Yumi.
        
        Drawn here rather than by ExchangeNotesMark, and that is a size
        decision rather than a shortcut. The full mark is four gradients, a
        mask, a seventeen-point constellation and a gaussian blur, authored
        against a 400-unit box for hero sizes; at the 30px this core renders
        at, every one of those is invisible and all of them still cost — the
        same filter-on-an-animating-element that had to come off the vocabulary
        hero for dropping frames.
        
        So this is the same creature at the size available: the mark's own body
        geometry, its eye where the mark puts it, and its blink on the app's
        shared rhythm (app/yumi-motion.css — the identical keyframes the splash,
        Messages and the Command Deck use). What is left out is only detail that
        could not be seen.
      */}
      <span className={`${styles.core} yumi-breath`}>
        <svg className={styles.coreMark} viewBox="0 0 400 400" aria-hidden="true">
          <defs>
            <clipPath id={eyeClipId}>
              <circle cx="285" cy="180" r="40" />
            </clipPath>
          </defs>

          {/* The open C — Yumi's body, in the signal colour. */}
          <path
            d="M 300,70 Q 110,70 100,180 Q 110,320 300,320"
            fill="none"
            stroke="currentColor"
            strokeWidth="58"
            strokeLinecap="round"
          />

          {/*
            The eye. A dark socket with a bright pupil rather than the mark's
            pale sclera: at this size a light disc with a dark dot inside it
            collapses into a grey smudge, where a lit point in a dark socket
            stays a lit point.
          */}
          <circle cx="285" cy="180" r="40" fill="var(--radar-core-bg)" />

          <g clipPath={`url(#${eyeClipId})`}>
            <circle cx="290" cy="176" r="17" fill="currentColor" />

            {/* Lids, on the mark's own geometry and the app's own blink. Both
                must carry the same duration or the eye tears in half — which
                is why one custom property drives them. */}
            <rect
              className="yumi-blink-upper"
              x="245"
              y="100"
              width="80"
              height="120"
              fill="var(--radar-core-bg)"
            />
            <rect
              className="yumi-blink-lower"
              x="245"
              y="215"
              width="80"
              height="25"
              fill="var(--radar-core-bg)"
            />
          </g>
        </svg>
      </span>
    </button>
  );
}
