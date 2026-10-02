"use client";

import type { ImageClassifier } from "@mediapipe/tasks-vision";

import { objectWordForClass, type ObjectWord } from "@/lib/vision/objectLexicon";

/* =========================================================
   Naming what the camera sees, on the phone

   See objectLexicon.ts for why this exists: at a Gemini peak every model
   refused the camera at once, and a photograph is the one lookup a reader
   cannot re-type. This classifier needs no network once it is loaded and
   answers in a tenth to a fifth of a second (measured in the in-app browser
   2026-09-28: 166ms for one frame; 1.3s to load the model the first time).

   It is a first answer, not the answer. The camera still asks Gemini, and a
   Gemini reply replaces this one — the model names a "mug" where this says
   "cup", and writes the example sentences this cannot. What this changes is
   that a peak no longer means nothing at all.

   ── What it downloads ──────────────────────────────────────────────────

   The WebAssembly runtime (about 3MB compressed) from this site, copied out
   of node_modules at build time; and EfficientNet-Lite0, int8 (about 4.5MB),
   from Google's model bucket, kept in Cache Storage so it is fetched once
   per device rather than once per visit. Chi chose to fetch both in the
   background after sign-in, so the first photograph is already fast — see
   components/foundation/OnDeviceVisionWarmup.tsx.
   ========================================================= */

const WASM_BASE = "/mediapipe/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/int8/latest/efficientnet_lite0.tflite";

/*
 * Its own cache, versioned by model, and deliberately not the service
 * worker's: public/sw.js clears every cache but its own on each release,
 * which would throw 4.5MB away and download it again after every deploy.
 * The worker leaves caches with this prefix alone.
 */
export const VISION_CACHE_PREFIX = "exchange-notes-vision";
const VISION_CACHE = `${VISION_CACHE_PREFIX}-efficientnet-lite0-int8-v1`;

/*
 * How sure the classifier must be before a word is shown.
 *
 * Scores are summed per everyday word first — a photo of a dog spreads its
 * probability over a dozen breeds, none of which alone looks confident — and
 * the best word must then reach this. Below it the phone says nothing and
 * the reader waits for Gemini, which is the right trade: a wrong word shown
 * at once is worse than the right one shown a few seconds later.
 */
export const MIN_WORD_SCORE = 0.3;
/*
 * Was 0.35. Chi's iPhone reported fifteen photos between 2026-09-28 and
 * 10-02 (ai_call_log, purpose on-device-camera). The two right answers were
 * well clear of either line (bottle 0.54, menu 0.88); the two shown at 0.36
 * and 0.40 were both "wheelbarrow", which Chi saw as wrong — that class is
 * no longer mapped at all; and a supermarket twice at exactly 0.30 said
 * nothing. Chi's choice (10-02): keep this model, tune the line and the
 * table rather than download a bigger one.
 */

/** Classes considered per photo. Enough to gather a word's spread. */
const MAX_RESULTS = 10;

let classifierPromise: Promise<ImageClassifier | null> | null = null;
let lastLoadError = "";

function describe(error: unknown) {
  return error instanceof Error
    ? `${error.name}: ${error.message}`.slice(0, 160)
    : String(error).slice(0, 160);
}

/*
 * What happened, sent to the server's failure log (see
 * app/api/diagnostics/on-device/route.ts). Chi's iPhone showed nothing at all
 * for a photo on 2026-09-28, and nothing about this recogniser ever reached
 * the server — so there was no telling a model that never loaded on that
 * phone from one that was simply not sure. Fire and forget: a report that
 * cannot be sent changes nothing for the reader.
 */
type OnDeviceReport = {
  outcome: "answered" | "no_word" | "unavailable" | "not_ready" | "failed";
  ms: number;
  word?: string;
  score?: number;
  /** The classifier's own top class and score, e.g. "coffee mug@0.41". */
  raw?: string;
  error?: string;
};

function report(body: OnDeviceReport) {
  if (process.env.NODE_ENV === "test") return;

  try {
    void fetch("/api/diagnostics/on-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* Nothing to do: the report is only ever a courtesy. */
  }
}

function supported() {
  return (
    typeof window !== "undefined" &&
    typeof WebAssembly === "object" &&
    typeof fetch === "function"
  );
}

async function modelBytes(): Promise<Uint8Array> {
  if ("caches" in window) {
    try {
      const cache = await caches.open(VISION_CACHE);
      const hit = await cache.match(MODEL_URL);
      if (hit) return new Uint8Array(await hit.arrayBuffer());

      const response = await fetch(MODEL_URL);
      if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
      await cache.put(MODEL_URL, response.clone());
      return new Uint8Array(await response.arrayBuffer());
    } catch {
      /* Storage refused (private mode, quota): fetch without keeping it. */
    }
  }

  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function createClassifier(): Promise<ImageClassifier | null> {
  if (!supported()) return null;

  try {
    const [{ FilesetResolver, ImageClassifier }, bytes] = await Promise.all([
      import("@mediapipe/tasks-vision"),
      modelBytes(),
    ]);

    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);

    return await ImageClassifier.createFromOptions(fileset, {
      /*
       * CPU, not GPU. The GPU delegate needs WebGL2 in a state this app
       * cannot promise — Yumi's own WebGL scene is often holding a context —
       * and a classifier that fails to start is worse than one that takes
       * 150ms instead of 50.
       */
      baseOptions: { modelAssetBuffer: bytes, delegate: "CPU" },
      maxResults: MAX_RESULTS,
      runningMode: "IMAGE",
    });
  } catch (error) {
    console.warn("On-device recognition is unavailable:", error);
    lastLoadError = describe(error);
    report({ outcome: "unavailable", ms: 0, error: lastLoadError });
    return null;
  }
}

/**
 * Starts loading the classifier, once. Safe to call any number of times;
 * a failed load is forgotten so a later call can try again.
 */
export function preloadObjectClassifier(): Promise<ImageClassifier | null> {
  if (!classifierPromise) {
    classifierPromise = createClassifier().then((classifier) => {
      if (!classifier) classifierPromise = null;
      return classifier;
    });
  }

  return classifierPromise;
}

export type OnDeviceObject = { word: ObjectWord; score: number };

/**
 * The everyday word the classifier's top classes add up to, when it adds up
 * to enough. Exposed for tests; recognizeOnDevice is what callers use.
 */
export function pickObjectWord(
  categories: ReadonlyArray<{ index: number; score: number }>,
): OnDeviceObject | null {
  const best = bestObjectWord(categories);
  return best && best.score >= MIN_WORD_SCORE ? best : null;
}

/** The best everyday word, however unsure — for the report, not the reader. */
function bestObjectWord(
  categories: ReadonlyArray<{ index: number; score: number }>,
): OnDeviceObject | null {
  const totals = new Map<ObjectWord, number>();

  for (const { index, score } of categories) {
    const word = objectWordForClass(index);
    if (word) totals.set(word, (totals.get(word) ?? 0) + score);
  }

  let best: OnDeviceObject | null = null;
  for (const [word, score] of totals) {
    if (!best || score > best.score) best = { word, score };
  }

  return best;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the photo."));
    image.src = src;
  });
}

/**
 * What the phone thinks is in this photo, or null — for any reason: the
 * model not loaded yet and not loadable within `waitMs`, no confident word,
 * or anything failing. Never throws; the camera goes on to Gemini either way.
 */
export async function recognizeOnDevice(
  imageDataUrl: string,
  /*
   * How long to wait for the recogniser to finish loading, when it has not.
   * Was 2.5s, which on an iPhone that had not warmed it up yet was likely
   * shorter than compiling the runtime — so the first photo of a session
   * got no phone answer at all. The AI's answer still wins whenever it
   * arrives first, so waiting longer costs nothing when Google is up, and is
   * the whole answer when it is down.
   */
  waitMs = 12_000,
): Promise<OnDeviceObject | null> {
  const startedAt = Date.now();

  try {
    const classifier = await Promise.race([
      preloadObjectClassifier(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), waitMs)),
    ]);

    if (!classifier) {
      report({
        outcome: lastLoadError ? "unavailable" : "not_ready",
        ms: Date.now() - startedAt,
        error: lastLoadError || undefined,
      });
      return null;
    }

    const image = await loadImage(imageDataUrl);
    const result = classifier.classify(image);
    const categories = result.classifications[0]?.categories ?? [];

    const best = bestObjectWord(categories);
    const answered = best && best.score >= MIN_WORD_SCORE ? best : null;

    report({
      outcome: answered ? "answered" : "no_word",
      ms: Date.now() - startedAt,
      word: best?.word.en,
      score: best?.score,
      raw: categories[0]
        ? `${categories[0].categoryName}@${categories[0].score.toFixed(2)}`
        : undefined,
    });

    return answered;
  } catch (error) {
    console.warn("On-device recognition failed:", error);
    report({ outcome: "failed", ms: Date.now() - startedAt, error: describe(error) });
    return null;
  }
}
