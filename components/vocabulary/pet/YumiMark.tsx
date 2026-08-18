"use client";

import type { CSSProperties, RefObject } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import type { YumiFeedingPhase } from "@/hooks/pet/useYumiFeedingSequence";
import type {
  YumiLookTarget,
  YumiOrbitPhase,
} from "@/hooks/pet/useYumiOrbitMenu";
import type { GrowthStage } from "@/lib/pet/moodEngine";
import type { YumiMood } from "@/lib/pet/types";

import YumiFeedingFace from "./YumiFeedingFace";
import styles from "./YumiMark.module.css";

type YumiMarkProps = {
  mood: YumiMood;
  isWaking: boolean;
  isEating: boolean;
  feedingPhase?: YumiFeedingPhase;
  chewBeat?: number;
  feedTargetRef?: RefObject<HTMLSpanElement | null>;
  growthStage: GrowthStage;
  crownEarned: boolean;
  // One-shot: a brief downward glance, used right after Yumi wakes up to
  // suggest awareness of the vocabulary list below — not a steady mood.
  glanceDown?: boolean;
  onWakeAnimationEnd?: () => void;
  onEatAnimationEnd?: () => void;
  orbitPhase?: YumiOrbitPhase;
  lookTarget?: YumiLookTarget;
  /*
   * Yumi's cosmic refit on this page. The mark itself already knows how to
   * wear it (see the `cosmic` prop on ExchangeNotesMark); what is added here
   * is the space around it — the orbital system, the halo and the landing pad
   * that turn a mascot on a page into a body suspended in a field.
   */
  cosmic?: boolean;
  /*
   * A Learning Core is inside the attraction zone and about to arrive. Yumi
   * answers before the drop rather than after it: the rings tighten, the halo
   * lifts, and the seam brightens.
   */
  attracted?: boolean;
};

/*
 * The orbital system, per §10 of the brief: several paths, no two on the same
 * clock.
 *
 * Each ring is two elements and one animated property. The outer one is
 * static — it tilts the plane and foreshortens it, which is what turns a
 * circle into an orbit seen from slightly above — and the inner one simply
 * turns inside it. Splitting them is not tidiness: an element can run one
 * transform animation at a time, and a single element trying to hold the tilt,
 * the squash and the rotation would lose the first two the moment the third
 * started.
 *
 * The four periods — 23, 31, 47 and the signal traffic below — share no
 * common factor worth speaking of, so the arrangement they make does not come
 * back around inside any session anyone will have.
 *
 * The three planes are separated by foreshortening rather than by radius, and
 * that is a hard constraint rather than a preference: the widest ring here is
 * 1.48× Yumi's body, which is the most that still fits inside a 320px phone
 * once the hero is at its smallest. Nothing on this page clips horizontally,
 * so a ring any wider would not be cropped — it would give the whole app a
 * horizontal scrollbar. Squash carries the depth instead, and carries it
 * better: 0.5, 0.32 and 0.18 read as three planes at three angles, where
 * three radii a few percent apart would read as one ring drawn badly.
 */
const ORBITS: Array<{
  key: string;
  inset: string;
  tilt: string;
  squash: string;
  spin: string;
  reverse?: boolean;
}> = [
  // The middle plane: the brightest, tilted with the page.
  { key: "primary", inset: "-17%", tilt: "-13deg", squash: "0.32", spin: "23s" },
  // Nearest, least foreshortened, and counter-turning — so the two cross
  // rather than nest, which is what makes them read as separate planes.
  {
    key: "secondary",
    inset: "-3%",
    tilt: "27deg",
    squash: "0.5",
    spin: "31s",
    reverse: true,
  },
  // The far plane. Steeply foreshortened and barely there — it exists to put
  // something behind the other two, not to be looked at.
  { key: "deep", inset: "-24%", tilt: "-37deg", squash: "0.18", spin: "47s" },
];

/*
 * Signal traffic, on the deck's own pattern (see CommandDeck.module.css).
 *
 * Two unrelated periods per signal: how long it takes to go round, and how
 * often it is lit. A point that orbits in 11s but only shows for a fifth of
 * every 17s appears somewhere different every time, which is what stops three
 * dots from reading as a rotating diagram.
 */
const SIGNALS: Array<{
  spin: string;
  cycle: string;
  radius: string;
  angle: string;
  delay: string;
}> = [
  { spin: "11s", cycle: "17s", radius: "0.63", angle: "38deg", delay: "-2.9s" },
  { spin: "19s", cycle: "13s", radius: "0.52", angle: "164deg", delay: "-8.4s" },
  { spin: "29s", cycle: "23s", radius: "0.74", angle: "277deg", delay: "-16.2s" },
];

/*
 * How lit Yumi is, 0–1.
 *
 * Resting is deliberately near the floor. The seam, the constellation and the
 * iris rings all read from this one number, so if it sat high by default there
 * would be nothing left to spend when something actually happened — and the
 * moments below are the ones worth spending it on: being fed, and a Core
 * coming in to land.
 */
function energyFor({
  feedingPhase,
  attracted,
  tracking,
  mood,
}: {
  feedingPhase: YumiFeedingPhase;
  attracted: boolean;
  tracking: boolean;
  mood: YumiMood;
}) {
  if (feedingPhase !== "idle") return 1;
  if (attracted) return 0.82;
  if (tracking) return 0.55;

  switch (mood) {
    case "excited":
      return 0.5;
    case "proud":
      return 0.44;
    case "happy":
      return 0.34;
    case "curious":
      return 0.28;
    case "confused":
      return 0.2;
    case "missingYou":
      return 0.14;
    case "hungry":
      return 0.12;
  }
}

// Yumi is the same breathing "E"-mark used on the splash screen, loader,
// and the Messages mood swiper — grown up into a full companion via CSS
// layering only (glow ring / particles / crown), never by changing the
// underlying SVG shape, so it keeps its identity as it grows.
export default function YumiMark({
  mood,
  isWaking,
  isEating,
  feedingPhase,
  chewBeat = 0,
  feedTargetRef,
  growthStage,
  crownEarned,
  glanceDown = false,
  onWakeAnimationEnd,
  onEatAnimationEnd,
  orbitPhase = "closed",
  lookTarget = "viewer",
  cosmic = false,
  attracted = false,
}: YumiMarkProps) {
  const resolvedFeedingPhase =
    feedingPhase ?? (isEating ? "chewing" : "idle");

  const energy = energyFor({
    feedingPhase: resolvedFeedingPhase,
    attracted,
    tracking: lookTarget === "food",
    mood,
  });

  return (
    <div
      className={styles.stage}
      data-cosmic={cosmic ? "true" : "false"}
      data-attract={attracted ? "true" : "false"}
      data-feeding={resolvedFeedingPhase}
    >
      {cosmic ? (
        <div className={styles.orbits} aria-hidden="true">
          {ORBITS.map((orbit) => (
            <span
              key={orbit.key}
              className={styles.orbit}
              data-ring={orbit.key}
              style={
                {
                  "--orbit-inset": orbit.inset,
                  "--orbit-tilt": orbit.tilt,
                  "--orbit-squash": orbit.squash,
                  "--orbit-spin": orbit.spin,
                  "--orbit-direction": orbit.reverse ? "reverse" : "normal",
                } as CSSProperties
              }
            >
              <span className={styles.orbitRing} />
            </span>
          ))}

          {SIGNALS.map((signal) => (
            <span
              key={signal.spin}
              className={styles.signal}
              style={
                {
                  "--signal-spin": signal.spin,
                  "--signal-cycle": signal.cycle,
                  "--signal-radius": signal.radius,
                  "--signal-angle": signal.angle,
                  "--signal-delay": signal.delay,
                } as CSSProperties
              }
            >
              <span className={styles.signalDot} />
            </span>
          ))}

          <span className={styles.halo} />
          <span className={styles.haloWide} />
          <span className={styles.pad} />
        </div>
      ) : null}

      {orbitPhase !== "closed" ? (
        <div className={styles.menuAura} data-phase={orbitPhase} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}

      {growthStage >= 2 ? <div className={styles.glowRing} aria-hidden="true" /> : null}

      {growthStage >= 1 ? (
        <div className={styles.particles} aria-hidden="true">
          <span className={styles.particle} />
          <span className={styles.particle} />
          <span className={styles.particle} />
          {growthStage >= 3 ? (
            <>
              <span className={styles.particle} />
              <span className={styles.particle} />
            </>
          ) : null}
        </div>
      ) : null}

      {crownEarned ? (
        <svg
          className={styles.crown}
          viewBox="0 0 64 40"
          aria-hidden="true"
        >
          <path
            d="M6 30 L2 10 L18 22 L32 6 L46 22 L62 10 L58 30 Z"
            fill="#E8B94D"
            stroke="#C9962E"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}

      {resolvedFeedingPhase !== "idle" ? (
        <div className={styles.sparkleBurst} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}

      <div className={styles.groundShadow} aria-hidden="true" />

      <div
        className={styles.shell}
        data-mood={mood}
        data-waking={isWaking ? "true" : "false"}
        data-glance={glanceDown ? "true" : "false"}
        data-feeding={resolvedFeedingPhase}
        data-chew-beat={chewBeat}
        data-orbit={orbitPhase}
        data-look={lookTarget}
        onAnimationEnd={(event) => {
          if (event.animationName.startsWith("wake")) {
            onWakeAnimationEnd?.();
          }

          if (
            event.animationName.startsWith("eat")
            || event.animationName.startsWith("markBite")
            || event.animationName.startsWith("markChew")
            || event.animationName.startsWith("markSwallow")
          ) {
            onEatAnimationEnd?.();
          }
        }}
      >
        <ExchangeNotesMark
          /*
           * The refit is the mark's own, not a second Yumi drawn for this
           * page: same body, same eye, same constellation, with the cool
           * shell, the energy seam and the iris optics switched on. See
           * components/ui/ExchangeNotesMark.tsx.
           */
          cosmic={cosmic}
          energy={energy}
          className={`${styles.logo} ${cosmic ? styles.cosmicTiming : ""}`}
          pupilClassName={styles.pupil}
          /*
           * The pass, the gleam and the iris are the app's shared motion
           * classes (app/yumi-motion.css); the module class beside them
           * carries only this screen's pace. They must be applied as global
           * names — a CSS module scopes every animation-name it sees, so a
           * module referring to a shared keyframe compiles to a name that
           * matches nothing and silently stops.
           */
          irisClassName={cosmic ? "yumi-iris" : undefined}
          upperLidClassName={`yumi-blink-upper ${styles.upperLid}`}
          lowerLidClassName={`yumi-blink-lower ${styles.lowerLid}`}
          sweepClassName={cosmic ? "yumi-sweep" : undefined}
          gleamClassName={cosmic ? "yumi-gleam" : undefined}
          /* Cooled to match the light it is standing in, on the same reading
             as the Messages mark — see --msg-mark-surface in app/cosmic.css.
             Warm cream on deep space reads as a lamp, not a lens. */
          surfaceColor={cosmic ? "#e9f3ff" : "#faf7f0"}
          highlightColor="#ffffff"
        />

        <YumiFeedingFace
          phase={resolvedFeedingPhase}
          chewBeat={chewBeat}
          targetRef={feedTargetRef}
        />
      </div>
    </div>
  );
}
