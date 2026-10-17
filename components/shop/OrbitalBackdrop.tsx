"use client";

import type { CSSProperties } from "react";

import type { Scene } from "@/lib/shop/atmosphere";

import styles from "./OrbitalBackdrop.module.css";

/* =========================================================
   The view from Station 33

   Chi (2026-10-13): the shop is a supply station in orbit, the last stop
   Yumi makes before going down to Earth to exchange languages. So the
   stand is the station's window: space, and below it the curve of Earth.

   The weather the shop already knows (lib/shop/atmosphere) is now the
   weather down there: clouds over the planet when it is cloudy where the
   reader is, a storm's flashes inside them, the night side's city lights
   after dark, a sunrise along the rim in the morning and at dusk.

   Painted with layers the compositor moves (transforms and opacity only):
   no canvas, nothing measured, nothing drawn per frame here.
   ========================================================= */

export type OrbitView = {
  time: "day" | "twilight" | "night";
  /** 0–3: how much of the planet is under cloud. */
  cloud: number;
  weather: "fine" | "rain" | "snow" | "storm" | "fog";
};

/** What the window shows, from the scene the shop already chose. */
export function orbitView(scene: Scene): OrbitView {
  const time = scene.sky === "night" ? "night"
    : scene.sky === "morning" || scene.sky === "dusk" ? "twilight"
      : "day";
  const weather = scene.lightning ? "storm"
    : scene.precipitation === "snow" ? "snow"
      : scene.precipitation !== "none" ? "rain"
        : scene.fog ? "fog"
          : "fine";
  const cloud = weather === "storm" || weather === "rain" || scene.sky === "overcast" ? 3
    : weather === "snow" || weather === "fog" ? 2
      : Math.min(3, Math.max(0, scene.clouds));
  return { time, cloud, weather };
}

/**
 * A ring of light from the stand and twelve sparks with it: a purchase in
 * the shop, a new look in the landing film. Centred on its container; a new
 * key plays it again.
 */
export function Burst() {
  return (
    <div className={styles.burst} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} style={{ "--a": `${i * 30}deg` } as CSSProperties} />
      ))}
    </div>
  );
}

export default function OrbitalBackdrop({
  scene,
  celebrateKey,
  earth = true,
}: {
  scene: Scene;
  /** Changes once per purchase: a ring of sparks from the dock. */
  celebrateKey: number;
  /** Off where the caller draws the Earth itself (the landing film). */
  earth?: boolean;
}) {
  const view = orbitView(scene);
  return (
    <div
      className={styles.window}
      data-time={view.time}
      data-weather={view.weather}
      data-cloud={view.cloud}
      aria-hidden="true"
    >
      <div className={styles.nebula} />
      <div className={styles.stars} />
      <div className={styles.starsTwinkle} />
      <div className={styles.sun} />
      <div className={styles.moon} />
      <div className={styles.satellite}><i /></div>
      <div className={styles.meteor} />

      {earth ? (
        <>
          <div className={styles.earth}>
            <div className={styles.ocean} />
            <div className={styles.drift}>
              <div className={styles.land} />
              <div className={styles.lights} />
            </div>
            <div className={styles.cloudDrift}>
              <div className={styles.clouds} />
            </div>
            <div className={styles.flash} />
            <div className={styles.shade} />
          </div>
          <div className={styles.rim} />
        </>
      ) : null}

      <div className={styles.glass} />
      {celebrateKey > 0 && <Burst key={celebrateKey} />}
    </div>
  );
}
