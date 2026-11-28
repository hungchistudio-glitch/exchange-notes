import { STORY_DURATION_MS, STORY_TRACKS, planetTrack, type StoryTrack } from "./storyTimeline";

export type FilmClock = {
  time(): number;
  playing(): boolean;
  play(): void;
  pause(): void;
  seek(time: number): void;
  dispose(): void;
  /** Repair an interrupted layer without writing to every layer each frame. */
  sync?(): void;
  /** True when the clock is the layers' own Web Animations. */
  compositor: boolean;
  /** The screen changed size: tracks drawn to its size are redrawn. */
  resize?(width: number, height: number): void;
};

/**
 * The film's clock: every layer's Web Animation, moved together. A
 * shared document timeline drives both the 3D Yumi and all painted layers.
 * Setting startTime explicitly avoids independent pending play tasks starting
 * layers on different frames. A suspended/cancelled layer rejoins the clock.
 */
export function createLayerClock(root: HTMLElement, screen: HTMLElement): FilmClock | null {
  const elements = Array.from(root.querySelectorAll<HTMLElement>("[data-track]"));
  if (!elements.length || typeof elements[0].animate !== "function") return null;

  /* The planet's descent ends on Station 33's horizon, which is placed in
     proportion to the screen's width and height; its keyframes are worked
     out for this screen. */
  const framesFor = (name: StoryTrack) =>
    name === "planet" && screen.clientWidth > 0 && screen.clientHeight > 0
      ? planetTrack(screen.clientWidth, screen.clientHeight)
      : STORY_TRACKS[name];

  let planet: Animation | null = null;
  const animations = elements.map(element => {
    const name = element.dataset.track as StoryTrack;
    const animation = element.animate(framesFor(name), {
      duration: STORY_DURATION_MS,
      fill: "both",
    });
    animation.pause();
    animation.currentTime = 0;
    if (name === "planet") planet = animation;
    return animation;
  });
  const now = () => Number(document.timeline?.currentTime ?? performance.now());
  let base = 0;
  let startedAt: number | null = null;
  let lastSync = -Infinity;
  const time = () => Math.min(STORY_DURATION_MS, Math.max(0, base + (startedAt === null ? 0 : now() - startedAt)));
  const start = (animation: Animation, timestamp: number, elapsed: number) => {
    animation.play();
    animation.startTime = timestamp - elapsed;
  };

  return {
    compositor: true,
    time,
    playing: () => startedAt !== null,
    play() {
      base = time() >= STORY_DURATION_MS - 1 ? 0 : time();
      startedAt = now();
      for (const animation of animations) start(animation, startedAt, base);
      lastSync = startedAt;
    },
    pause() {
      base = time();
      startedAt = null;
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = base;
      }
    },
    seek(next) {
      base = Math.max(0, Math.min(STORY_DURATION_MS, next));
      const timestamp = now();
      if (startedAt !== null) startedAt = timestamp;
      for (const animation of animations) {
        if (startedAt !== null) start(animation, timestamp, base);
        else animation.currentTime = base;
      }
    },
    sync() {
      if (startedAt === null) return;
      const timestamp = now();
      if (timestamp - lastSync < 250) return;
      lastSync = timestamp;
      const elapsed = time();
      for (const animation of animations) {
        if (animation.currentTime === null || Math.abs(Number(animation.currentTime) - elapsed) > 50) {
          start(animation, timestamp, elapsed);
        }
      }
    },
    dispose() {
      for (const a of animations) a.cancel();
    },
    resize(width, height) {
      if (width > 0 && height > 0) (planet?.effect as KeyframeEffect | null)?.setKeyframes(planetTrack(width, height));
    },
  };
}

/** Where Web Animations are missing: a plain clock, and still layers. */
export function createPlainClock(): FilmClock {
  let base = 0;
  let since: number | null = null;
  const time = () =>
    since === null ? base : Math.min(STORY_DURATION_MS, base + performance.now() - since);
  return {
    compositor: false,
    time,
    playing: () => since !== null,
    play() {
      if (time() >= STORY_DURATION_MS - 1) base = 0;
      else base = time();
      since = performance.now();
    },
    pause() {
      base = time();
      since = null;
    },
    seek(next) {
      base = next;
      if (since !== null) since = performance.now();
    },
    dispose() {},
  };
}

