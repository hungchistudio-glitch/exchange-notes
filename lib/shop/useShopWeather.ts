"use client";

import { useEffect, useState } from "react";

import type { ShopWeather, SceneChoice } from "./atmosphere";
import { SCENE_CHOICES } from "./atmosphere";

/* Once per quarter hour per device is plenty for a sky. */
const WEATHER_KEY = "exchange-notes:shop-weather";
const WEATHER_TTL_MS = 15 * 60 * 1000;
const SCENE_KEY = "exchange-notes:shop-scene";

let inFlight: Promise<ShopWeather | null> | null = null;

function readCached(): { weather: ShopWeather | null } | null {
  try {
    const raw = window.sessionStorage.getItem(WEATHER_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { at: number; weather: ShopWeather | null };
    return Date.now() - cached.at < WEATHER_TTL_MS ? { weather: cached.weather } : null;
  } catch {
    return null;
  }
}

function fetchWeather(): Promise<ShopWeather | null> {
  inFlight ??= fetch("/api/shop/weather")
    .then(response => (response.ok ? response.json() : { weather: null }))
    .then((body: { weather?: ShopWeather | null }) => {
      const weather = body.weather ?? null;
      try {
        window.sessionStorage.setItem(WEATHER_KEY, JSON.stringify({ at: Date.now(), weather }));
      } catch {
        // Not kept; asked again next time.
      }
      return weather;
    })
    .catch(() => null)
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** The weather where the reader is, or null until (or unless) it is known. */
export function useShopWeather(): { weather: ShopWeather | null; settled: boolean } {
  const [state, setState] = useState<{ weather: ShopWeather | null; settled: boolean }>({ weather: null, settled: false });

  useEffect(() => {
    let cancelled = false;
    const cached = readCached();
    const done = (weather: ShopWeather | null) => { if (!cancelled) setState({ weather, settled: true }); };
    if (cached) queueMicrotask(() => done(cached.weather));
    else void fetchWeather().then(done);
    return () => { cancelled = true; };
  }, []);

  return state;
}

/* The time the sky is painted for, to the quarter hour. A store rather than
   state, so the server (which has no idea of the reader's clock, and answers
   null) and the first client render agree, and the sky arrives right after. */
const QUARTER_MS = 15 * 60 * 1000;

export function getQuarterHour(): number {
  return Math.floor(Date.now() / QUARTER_MS) * QUARTER_MS;
}

export function getServerQuarterHour(): number | null {
  return null;
}

export function subscribeToQuarterHour(listener: () => void) {
  const timer = window.setInterval(listener, 60 * 1000);
  return () => window.clearInterval(timer);
}

/* The scene the reader picked on this device: a per-device preference, kept
   like the language picker's, and read through a store so the server's
   render ("auto") and the device's agree on hydration. */
const sceneListeners = new Set<() => void>();
let sceneChoice: SceneChoice | null = null;

function readSceneChoice(): SceneChoice {
  try {
    const stored = window.localStorage.getItem(SCENE_KEY);
    return SCENE_CHOICES.includes(stored as SceneChoice) ? (stored as SceneChoice) : "auto";
  } catch {
    return "auto";
  }
}

export function getSceneChoice(): SceneChoice {
  sceneChoice ??= readSceneChoice();
  return sceneChoice;
}

export function getServerSceneChoice(): SceneChoice {
  return "auto";
}

export function subscribeToSceneChoice(listener: () => void) {
  sceneListeners.add(listener);
  return () => { sceneListeners.delete(listener); };
}

export function setSceneChoice(choice: SceneChoice) {
  sceneChoice = choice;
  try {
    if (choice === "auto") window.localStorage.removeItem(SCENE_KEY);
    else window.localStorage.setItem(SCENE_KEY, choice);
  } catch {
    // Kept for this visit only.
  }
  for (const listener of sceneListeners) listener();
}
