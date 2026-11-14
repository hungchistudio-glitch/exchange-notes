"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import OrbitalBackdrop, { Burst } from "@/components/shop/OrbitalBackdrop";
import StationDock from "@/components/shop/StationDock";
import YumiLoading from "@/components/yumi3d/YumiLoading";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { QUIET_SCENE } from "@/lib/shop/atmosphere";
import type { ShopItem, YumiOutfit } from "@/lib/shop/catalog";
import type { Blob } from "./earthPainter";
import { prepareWhenIdle } from "@/lib/yumi3d/prepareWhenIdle";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";

import { createEarthPainter, type EarthPainter } from "./earthPainter";
import { createEarthShader } from "./earthShader";
import {
  ACT_STILLS_MS,
  END_CARD_AT_MS,
  MERGE_AT_MS,
  STORY_ACTS,
  STORY_DURATION_MS,
  STORY_TRACKS,
  DOCKED_AT_MS,
  LAYERS_DRAWN_AT_MS,
  lookAt,
  outfitAt,
  planetTrack,
  actAt,
  yumiAt,
  type StoryTrack,
} from "./storyTimeline";
import styles from "./YumiOriginStory.module.css";

type StoryCopy = TranslationDictionary["landing"]["story"];

/* =========================================================
   YU + MI = Yumi

   The film's pictures and its clock are in storyTimeline.ts; this is the
   projector. It plays once the film is mostly on screen, pauses when it is
   scrolled away or the tab is hidden, and holds still for anyone who has
   asked for less motion, who steps through it scene by scene instead.

   One WebGL Yumi, made when the film comes near the screen and drawn only
   while it is on it. In the Station 33 scene she wears the shop's real
   pieces — the same catalogue and the same 3D models the app sells — and
   whatever she is wearing, she lands on Earth in: the looks she tries on by
   herself (STATION_LOOKS), or what the reader picks for her.
   ========================================================= */

/**
 * A few of the shop's pieces: something to wear, something from Earth.
 *
 * In the order of her own looks (STATION_LOOKS), so each look's two pieces
 * sit side by side: on a phone the list is a rail that shows about two at a
 * time, and it scrolls to each look as it goes on (Chi, 2026-11-13: she put
 * on the bubble tea and nothing on the rail said so).
 */
const TRY_ON_IDS = ["monocle", "beret", "bubble-tea", "headphones", "star-pupil"] as const;

/*
 * The planet's continents and clouds, in percent of one turn of it: centre
 * x and y, half width and half height, and the colour. Painted each frame
 * by earthPainter.ts, wrapped round the globe.
 */
const LAND: Blob[] = [
  // A long continent, a broad one with a desert, an island chain, the ice.
  [9, 34, 7, 15, "#6e9a5c"], [13, 52, 6, 9, "#7fa463"], [16, 66, 5, 8, "#8a9d5f"],
  [38, 30, 13, 9, "#6f9a5e", 72], [44, 40, 9, 8, "#b5a26f"], [36, 46, 7, 11, "#7aa365"],
  [62, 62, 3, 3, "#7aa365"], [66, 66, 2.4, 2.4, "#8eaa6c"], [69, 71, 2, 2, "#7aa365"],
  [82, 22, 10, 7, "#86a768", 72], [86, 34, 6, 10, "#6e9a5c"],
  [50, 94, 18, 5, "#e9f1f4", 72], [50, 4, 18, 5, "#e9f1f4", 72],
];
const CLOUDS: Blob[] = [
  [16, 22, 18, 4, "rgba(255, 255, 255, 0.85)"], [46, 48, 22, 5, "rgba(255, 255, 255, 0.7)", 72],
  [70, 30, 14, 3.5, "rgba(255, 255, 255, 0.8)"], [84, 68, 20, 4.5, "rgba(255, 255, 255, 0.65)", 72],
  [30, 80, 12, 3, "rgba(255, 255, 255, 0.7)"],
];

/* The air over the end of the descent: up as she nears it, gone by the dock. */
const smooth = (from: number, to: number, time: number) => {
  const x = Math.min(1, Math.max(0, (time - from) / (to - from)));
  return x * x * (3 - 2 * x);
};
const airAt = (time: number) => smooth(15_500, 18_600, time) * (1 - smooth(19_400, 20_400, time));
/* How much she watches the Earth itself, rather than the film's set gaze. */
const watchAt = (time: number) => smooth(10_300, 11_500, time) * (1 - smooth(19_600, DOCKED_AT_MS, time));
/** The Earth canvas's pixels at most, in device pixels (see ratioFor). */
const EARTH_PIXEL_BUDGET = 760_000;
/** The Earth is on screen between these, give or take its fades. */
const EARTH_FROM_MS = 9_900;
const EARTH_TO_MS = 31_600;

/** Everything else drifting out there with YU and MI. */
const MATTER: ReadonlyArray<{
  x: number; y: number; size: number; tone: string; ring?: boolean;
  dx: number; dy: number; duration: number; delay: number;
}> = [
  { x: 8, y: 18, size: 10, tone: "#9fdcff", dx: 18, dy: 10, duration: 14, delay: -3 },
  { x: 21, y: 72, size: 6, tone: "#ffc96b", dx: -12, dy: -16, duration: 11, delay: -7 },
  { x: 33, y: 30, size: 4, tone: "#e8edf6", dx: 10, dy: 14, duration: 9, delay: -2 },
  { x: 44, y: 82, size: 14, tone: "#c7a8dc", ring: true, dx: 14, dy: -8, duration: 17, delay: -9 },
  { x: 58, y: 14, size: 7, tone: "#ffc96b", dx: -16, dy: 12, duration: 13, delay: -5 },
  { x: 67, y: 64, size: 5, tone: "#9fdcff", dx: 12, dy: 10, duration: 10, delay: -1 },
  { x: 79, y: 26, size: 12, tone: "#e8edf6", ring: true, dx: -10, dy: 16, duration: 16, delay: -11 },
  { x: 88, y: 78, size: 8, tone: "#c7a8dc", dx: -14, dy: -12, duration: 12, delay: -4 },
  { x: 14, y: 46, size: 3, tone: "#e8edf6", dx: 8, dy: -10, duration: 8, delay: -6 },
  { x: 92, y: 44, size: 4, tone: "#ffc96b", dx: -8, dy: 8, duration: 9, delay: -3 },
  { x: 52, y: 52, size: 3, tone: "#9fdcff", dx: 10, dy: -6, duration: 7, delay: -2 },
  { x: 72, y: 90, size: 5, tone: "#e8edf6", dx: -6, dy: -14, duration: 11, delay: -8 },
];

type FilmClock = {
  time(): number;
  playing(): boolean;
  play(): void;
  pause(): void;
  seek(time: number): void;
  dispose(): void;
  /** True when the clock is the layers' own Web Animations. */
  compositor: boolean;
  /** The screen changed size: tracks drawn to its size are redrawn. */
  resize?(width: number, height: number): void;
};

/**
 * The film's clock: every layer's Web Animation, moved together. A
 * chapter jump is one currentTime write on each, and the 3D Yumi reads the
 * time back from the first.
 */
function createLayerClock(root: HTMLElement, screen: HTMLElement): FilmClock | null {
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
  const lead = animations[0];
  const time = () => Math.min(STORY_DURATION_MS, Number(lead.currentTime ?? 0));

  return {
    compositor: true,
    time,
    playing: () => lead.playState === "running",
    play() {
      if (time() >= STORY_DURATION_MS - 1) for (const a of animations) a.currentTime = 0;
      for (const a of animations) a.play();
    },
    pause() {
      for (const a of animations) a.pause();
    },
    seek(next) {
      for (const a of animations) a.currentTime = next;
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
function createPlainClock(): FilmClock {
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

type Catalog = {
  items: ShopItem[];
  toggle: (outfit: YumiOutfit, item: ShopItem) => YumiOutfit;
};

function CaptionBody({ copy, index }: { copy: StoryCopy; index: number }) {
  const item = copy.acts[index];
  return (
    <>
      <p className={styles.captionEyebrow}>
        {copy.sceneLabel
          .replace("{n}", String(index + 1))
          .replace("{total}", String(copy.acts.length))}
        <span> · </span>
        {item.name}
      </p>
      <p className={styles.captionTitle}>{item.title}</p>
      <p className={styles.captionText}>{item.text}</p>
    </>
  );
}

export default function YumiOriginStory({
  copy,
  language,
  cta,
}: {
  copy: StoryCopy;
  language: InterfaceLanguage;
  /** The call to action on the end card. */
  cta: ReactNode;
}) {
  const filmRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** The Earth's canvas, and the invisible layers whose animations place it. */
  const earthRef = useRef<HTMLCanvasElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const planetRef = useRef<HTMLDivElement>(null);
  const flareRef = useRef<HTMLSpanElement>(null);
  /** A little of the Earth's blue in her eye while she watches it. */
  const glintRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<FilmClock | null>(null);
  const handleRef = useRef<YumiSceneHandle | null>(null);
  const reducedRef = useRef(false);
  const actRef = useRef(0);
  const endRef = useRef(false);
  const dockedRef = useRef(false);
  const lookRef = useRef(-1);
  const ownRef = useRef(outfitAt(0));
  const mergedRef = useRef(false);
  const drawnRef = useRef(false);
  const veilRef = useRef<HTMLDivElement>(null);
  const veilAnimationRef = useRef<Animation | null>(null);
  /** The reader has pressed play, pause or a scene: autoplay stands down. */
  const tookOverRef = useRef(false);
  /** The try-on rail, and whether the reader has moved it themselves. */
  const railRef = useRef<HTMLUListElement>(null);
  const railTouchedRef = useRef(false);
  /** The look before this one, to tell which pieces have just gone on. */
  const lastLookRef = useRef<YumiOutfit>({});

  const [act, setAct] = useState(0);
  /** The act whose words are fading out under the new act's. */
  const [leaving, setLeaving] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [endCard, setEndCard] = useState(false);
  /** Yumi is on Station 33's stand: the shop's pieces may come up. */
  const [docked, setDocked] = useState(false);
  /** Once YU and MI are one, she can be turned. */
  const [merged, setMerged] = useState(false);
  /** The later layers are drawn, still unseen (see LAYERS_DRAWN_AT_MS). */
  const [layersDrawn, setLayersDrawn] = useState(false);
  const [yumi, setYumi] = useState<"loading" | "live" | "unavailable">("loading");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  /** Which of her own looks she has on (STATION_LOOKS); -1 before them. */
  const [look, setLook] = useState(-1);
  /** What she has on by herself (outfitAt). */
  const [ownOutfit, setOwnOutfit] = useState<YumiOutfit>(() => outfitAt(0));
  /** What the reader picked for her, which takes over from her own looks
     until the film is played again from the start. */
  const [chosen, setChosen] = useState<YumiOutfit | null>(null);
  const outfit = chosen ?? ownOutfit;

  const showTime = useCallback((time: number) => {
    const nextAct = actAt(time);
    if (nextAct !== actRef.current) {
      setLeaving(actRef.current);
      actRef.current = nextAct;
      setAct(nextAct);
    }
    const nextMerged = time >= MERGE_AT_MS;
    const nextDrawn = time >= LAYERS_DRAWN_AT_MS;
    if (nextDrawn !== drawnRef.current) {
      drawnRef.current = nextDrawn;
      setLayersDrawn(nextDrawn);
    }
    if (nextMerged !== mergedRef.current) {
      mergedRef.current = nextMerged;
      setMerged(nextMerged);
    }
    const nextLook = lookAt(time);
    if (nextLook !== lookRef.current) {
      lookRef.current = nextLook;
      setLook(nextLook);
    }
    const nextOwn = outfitAt(time);
    if (nextOwn !== ownRef.current) {
      ownRef.current = nextOwn;
      setOwnOutfit(nextOwn);
    }
    const nextDocked = time >= DOCKED_AT_MS;
    if (nextDocked !== dockedRef.current) {
      dockedRef.current = nextDocked;
      setDocked(nextDocked);
    }
    const nextEnd = time >= END_CARD_AT_MS;
    if (nextEnd !== endRef.current) {
      endRef.current = nextEnd;
      setEndCard(nextEnd);
    }
  }, []);

  /*
   * A dip to black and back, with the change made in the dark: how a film
   * cuts between scenes, instead of the picture jumping in place (Chi,
   * 2026-10-16). 0.16s down, 0.26s up. Under reduced motion it is a plain cut.
   */
  const cut = useCallback((change: () => void) => {
    const veil = veilRef.current;
    if (reducedRef.current || !veil || typeof veil.animate !== "function") {
      change();
      return;
    }
    // A second press mid-dip starts from wherever the first one had got to.
    const from = Number(getComputedStyle(veil).opacity) || 0;
    veilAnimationRef.current?.cancel();
    const down = veil.animate([{ opacity: from }, { opacity: 1 }], {
      duration: 160 * (1 - from),
      easing: "cubic-bezier(0.55, 0, 1, 0.45)",
      fill: "forwards",
    });
    veilAnimationRef.current = down;
    down.onfinish = () => {
      change();
      veilAnimationRef.current = veil.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 260,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      });
    };
  }, []);

  const play = useCallback(() => {
    const clock = clockRef.current;
    if (!clock) return;
    tookOverRef.current = true;
    const start = () => {
      clock.play();
      setPlaying(true);
      setEnded(false);
    };
    // From the end card back to the first frame is a cut, not a jump, and
    // a fresh showing: she tries her own looks on again.
    if (clock.time() >= STORY_DURATION_MS - 1) cut(() => {
      setChosen(null);
      railTouchedRef.current = false;
      start();
    });
    else start();
  }, [cut]);

  const pause = useCallback(() => {
    tookOverRef.current = true;
    clockRef.current?.pause();
    setPlaying(false);
  }, []);

  const goTo = useCallback((index: number) => {
    const clock = clockRef.current;
    if (!clock) return;
    tookOverRef.current = true;
    const reduced = reducedRef.current;
    const time = reduced ? ACT_STILLS_MS[index] : STORY_ACTS[index].start;
    cut(() => {
      clock.seek(time);
      showTime(time);
      setEnded(false);
      if (!reduced) {
        clock.play();
        setPlaying(true);
      }
    });
  }, [cut, showTime]);

  // --------------------------------------------------------- the projector
  useEffect(() => {
    const film = filmRef.current;
    const screen = screenRef.current;
    const canvas = canvasRef.current;
    if (!film || !screen || !canvas) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduced;

    const clock = createLayerClock(film, screen) ?? createPlainClock();
    clockRef.current = clock;
    if (reduced) {
      clock.seek(ACT_STILLS_MS[0]);
      showTime(ACT_STILLS_MS[0]);
    }

    let disposed = false;
    let raf = 0;
    let onScreen = false;
    let ratio = 0;
    let started = false;
    let autoPaused = false;
    let sceneRequested = false;
    /** Yumi is drawn, or is not coming: either way the film may begin. */
    let sceneSettled = false;
    let settleTimer = 0;
    let sceneDone: () => void = () => {};
    const sceneSettledPromise = new Promise<void>(resolve => { sceneDone = resolve; });
    let pending: YumiSceneHandle | null = null;
    let lastDraw = -Infinity;
    const size = { width: screen.clientWidth, height: screen.clientHeight };

    /* The Earth (earthPainter.ts): its box read once, and again on resize. */
    const earthCanvas = earthRef.current;
    /* Every browser the film plays in has both; a test's DOM has neither. */
    const painter: EarthPainter | null =
      earthCanvas && typeof DOMMatrix === "function" && typeof CanvasRenderingContext2D === "function"
        ? (createEarthShader(earthCanvas, LAND, CLOUDS) ?? createEarthPainter(earthCanvas, LAND, CLOUDS))
        : null;
    const planetBox = { left: 0, top: 0, size: 0 };
    let earthDrawnAt = Number.NaN;
    /*
     * Its resolution: 1.5x at most (as her own canvas), and no more pixels
     * than EARTH_PIXEL_BUDGET. When the Earth is the horizon it fills half
     * the frame and every pixel of it is worked out each frame; on a 2018
     * MacBook's Iris 655, a desktop-sized film at 1.5x beside her held the
     * station's act near 50 frames a second, and at 1x it held 60 (measured
     * 2026-11-13). A phone's film is small enough to stay at 1.5x. Its
     * edges are smooth at any of these, never stepped.
     *
     * And a step down from there while the film plays slower than the
     * screen: a quarter of the last second's frames late, and it is drawn a
     * quarter step coarser. Never back up within a showing, so it cannot
     * see-saw.
     */
    const ratioFor = () =>
      Math.max(1, Math.min(1.5, window.devicePixelRatio || 1, Math.sqrt(EARTH_PIXEL_BUDGET / Math.max(1, size.width * size.height))));
    let earthRatio = ratioFor();
    let ratioSteps = 0;
    const recentGaps: number[] = [];
    let lastTick = Number.NaN;
    const measureEarth = () => {
      const planet = planetRef.current;
      if (planet) {
        planetBox.left = planet.offsetLeft;
        planetBox.top = planet.offsetTop;
        planetBox.size = planet.offsetWidth;
      }
      earthRatio = Math.max(1, ratioFor() - 0.25 * ratioSteps);
      painter?.resize(size.width, size.height, earthRatio);
      earthDrawnAt = Number.NaN;
    };
    measureEarth();
    let glintShown = false;

    /*
     * Where the planet's and the window's animations have put the Earth this
     * frame, as one matrix from the planet's box to the screen, and draw it.
     * Returns its centre and radius on screen, for her gaze.
     */
    const drawEarth = (time: number) => {
      const orbit = orbitRef.current;
      const planet = planetRef.current;
      if (!painter || !orbit || !planet) return null;
      if (time < EARTH_FROM_MS || time > EARTH_TO_MS) {
        painter.clear();
        earthDrawnAt = Number.NaN;
        return null;
      }
      const orbitStyle = getComputedStyle(orbit);
      const planetStyle = getComputedStyle(planet);
      const toMatrix = (value: string) => new DOMMatrix(value && value !== "none" ? value : undefined);
      const half = planetBox.size / 2;
      const matrix = new DOMMatrix()
        .translate(0.5 * size.width, 0.7 * size.height)
        .multiply(toMatrix(orbitStyle.transform))
        .translate(-0.5 * size.width, -0.7 * size.height)
        .translate(planetBox.left + half, planetBox.top + half)
        .multiply(toMatrix(planetStyle.transform))
        .translate(-half, -half);
      if (time !== earthDrawnAt) {
        earthDrawnAt = time;
        painter.draw({
          width: size.width,
          height: size.height,
          size: planetBox.size,
          matrix,
          opacity: Number(orbitStyle.opacity) * Number(planetStyle.opacity),
          flare: flareRef.current ? Number(getComputedStyle(flareRef.current).opacity) : 0,
          time,
          air: reduced ? 0 : airAt(time),
        });
      }
      const centre = matrix.transformPoint(new DOMPoint(half, half));
      return { x: centre.x, y: centre.y, radius: half * Math.hypot(matrix.a, matrix.b) };
    };

    const finish = () => {
      clock.pause();
      clock.seek(STORY_DURATION_MS);
      setPlaying(false);
      setEnded(true);
    };

    /*
     * One frame of the film. The painted layers run on the compositor by
     * themselves; this draws Yumi where the same clock says she is.
     *
     * At most 60 draws a second while playing — a 120Hz screen would
     * otherwise draw her twice as often for nothing it can show — and 30
     * while paused, when only her blink and idle turn are moving.
     */
    const loop = (now: number) => {
      raf = 0;
      if (disposed || !onScreen) return;
      raf = requestAnimationFrame(loop);

      /* The screen's own pace, while the Earth is being drawn and the film
         plays: frames twice as long as they should be, half a second's
         worth, and the Earth is drawn a step coarser. */
      const gap = now - lastTick;
      lastTick = now;
      if (clock.playing() && !Number.isNaN(earthDrawnAt) && earthRatio > 1 && gap < 200) {
        recentGaps.push(gap);
        if (recentGaps.length > 60) recentGaps.shift();
        if (recentGaps.length === 60 && recentGaps.filter(value => value > 20).length >= 15) {
          recentGaps.length = 0;
          ratioSteps += 1;
          measureEarth();
        }
      }

      const interval = clock.playing() ? 1000 / 60 : 1000 / 30;
      if (now - lastDraw < interval - 2) return;
      lastDraw = now;

      const time = clock.time();
      if (clock.playing() && time >= STORY_DURATION_MS) finish();
      showTime(time);

      const earth = drawEarth(time);

      const handle = handleRef.current;
      if (handle) {
        const pose = yumiAt(time, size.width < size.height * 0.9, reduced);
        const radius = pose.r * Math.min(size.width, size.height);
        const yumiX = pose.x * size.width;
        const yumiY = pose.y * size.height;
        handle.setParts?.(pose.parts);
        handle.setScreenAnchor(yumiX, yumiY, radius);

        /*
         * She watches the Earth itself (Chi, 2026-11-13): the nearest point
         * of it, as it slides in, grows, and becomes the horizon under her.
         * Blended in from the film's own gaze as she turns to it, and back
         * out as the stand takes her.
         */
        let gazeX = pose.gaze?.x ?? 0;
        let gazeY = pose.gaze?.y ?? 0;
        const watch = earth ? watchAt(time) : 0;
        if (earth && watch > 0) {
          const dx = yumiX - earth.x;
          const dy = yumiY - earth.y;
          const away = Math.hypot(dx, dy) || 1;
          const reach = Math.min(earth.radius, away);
          const lookX = earth.x + (dx / away) * reach - yumiX;
          const lookY = earth.y + (dy / away) * reach - yumiY;
          const span = 0.45 * Math.min(size.width, size.height);
          const clamp = (value: number) => Math.max(-1, Math.min(1, value));
          gazeX += (clamp(lookX / span) - gazeX) * watch;
          gazeY += (clamp(lookY / span) - gazeY) * watch;
        }
        handle.setGaze?.(gazeX, gazeY);
        handle.frame(now);

        /* And a little of its blue in her eye, stronger as it fills the frame. */
        const glint = glintRef.current;
        if (glint) {
          if (earth && watch > 0.01 && !reduced) {
            const eye = handle.eyeScreenPosition();
            const near = Math.min(1, earth.radius / (0.6 * size.width));
            /* A highlight on the side of the eye that faces it, not a tint
               over the whole eye. */
            const diameter = 0.3 * radius;
            glint.style.width = `${diameter}px`;
            glint.style.height = `${diameter}px`;
            glint.style.transform = `translate(${eye.x - diameter / 2 + gazeX * 0.13 * radius}px, ${eye.y - diameter / 2 + gazeY * 0.13 * radius}px)`;
            glint.style.opacity = String(watch * (0.3 + 0.5 * near));
            glintShown = true;
          } else if (glintShown) {
            glint.style.opacity = "0";
            glintShown = false;
          }
        }
      }
    };
    const run = () => {
      if (!raf && onScreen && !disposed) raf = requestAnimationFrame(loop);
    };

    /*
     * The film starts once it is mostly on screen and Yumi is ready to be in
     * it. Starting without her had YU and MI pop in mid-drift a moment
     * later. A reader who has pressed anything has taken over and is never
     * overruled.
     */
    const tryStart = () => {
      if (started || reduced || !sceneSettled || ratio < 0.55 || document.hidden) return;
      if (tookOverRef.current) return;
      started = true;
      clock.play();
      setPlaying(true);
    };
    const settle = () => {
      if (sceneSettled) return;
      sceneSettled = true;
      window.clearTimeout(settleTimer);
      sceneDone();
      tryStart();
    };

    /* When the browser has a moment, rather than in the middle of a scroll. */
    const whenIdle = (task: () => void) => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(task, { timeout: 1200 });
      } else {
        window.setTimeout(task, 0);
      }
    };

    // The engine chunk, the catalogue, and a context: made in the quiet after
    // the page loads (lib/yumi3d/prepareWhenIdle), or on approach if the
    // reader gets here first.
    const requestScene = () => {
      if (sceneRequested) return;
      sceneRequested = true;
      /* A slow network must not hold the film forever: after this long it
         starts without her, and she joins when she arrives. */
      settleTimer = window.setTimeout(settle, 8000);
      void Promise.all([import("@/lib/yumi3d/scene"), import("@/lib/shop/catalog")])
        .then(([{ createYumiScene }, shop]) => {
          if (disposed) return;
          setCatalog({
            items: TRY_ON_IDS.map(id => shop.shopItem(id)).filter((item): item is ShopItem => !!item),
            toggle: shop.toggleInOutfit,
          });
          whenIdle(() => {
            if (disposed) return;
            const handle = createYumiScene(canvas, {
              reducedMotion: reduced,
              maxPixelRatio: 1.5,
              embedded: true,
              exactAnchor: true,
            });
            if (!handle) {
              setYumi("unavailable");
              settle();
              return;
            }
            pending = handle;
            /* Her shaders compile before her first frame, off the main
               thread where the browser can: the first frame used to compile
               them all at once, mid-scroll. */
            void (handle.ready?.() ?? Promise.resolve()).then(() => {
              pending = null;
              if (disposed) {
                handle.dispose();
                return;
              }
              handleRef.current = handle;
              setYumi("live");
              settle();
              run();
            });
          });
        })
        .catch(() => {
          if (disposed) return;
          setYumi("unavailable");
          settle();
        });
    };
    const cancelPrepare = prepareWhenIdle(() => {
      requestScene();
      return sceneSettledPromise;
    });

    const near =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            entries => { if (entries.some(entry => entry.isIntersecting)) requestScene(); },
            { rootMargin: "600px 0px" },
          );
    near?.observe(film);
    if (!near) requestScene();

    /* Plays when it is mostly on screen, once; pauses when scrolled away and
       picks up where it was on the way back. */
    const watch = (next: number) => {
      ratio = next;
      onScreen = ratio > 0;
      if (onScreen) run();
      if (ratio >= 0.55) {
        if (!started) tryStart();
        else if (autoPaused) {
          autoPaused = false;
          clock.play();
          setPlaying(true);
        }
      } else if (ratio < 0.15 && clock.playing()) {
        autoPaused = true;
        clock.pause();
        setPlaying(false);
      }
    };
    const visible =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            entries => { for (const entry of entries) watch(entry.intersectionRatio); },
            { threshold: [0, 0.15, 0.55] },
          );
    visible?.observe(film);
    if (!visible) watch(1);

    const onHidden = () => {
      if (document.visibilityState === "hidden" && clock.playing()) {
        autoPaused = true;
        clock.pause();
        setPlaying(false);
      } else if (document.visibilityState === "visible") {
        if (autoPaused && onScreen) {
          autoPaused = false;
          clock.play();
          setPlaying(true);
        } else {
          tryStart();
        }
      }
    };
    document.addEventListener("visibilitychange", onHidden);

    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            size.width = screen.clientWidth;
            size.height = screen.clientHeight;
            handleRef.current?.resize();
            clock.resize?.(size.width, size.height);
            measureEarth();
          });
    resize?.observe(screen);

    /* The lead animation's own end, so a film that finishes while its tab
       is in the background still shows its last frame and the replay. */
    const lead = film.querySelector<HTMLElement>("[data-track]")?.getAnimations?.()[0];
    if (lead) lead.onfinish = () => { if (!disposed) finish(); };

    return () => {
      disposed = true;
      cancelPrepare();
      sceneDone();
      cancelAnimationFrame(raf);
      window.clearTimeout(settleTimer);
      near?.disconnect();
      visible?.disconnect();
      resize?.disconnect();
      document.removeEventListener("visibilitychange", onHidden);
      clock.dispose();
      clockRef.current = null;
      pending?.dispose();
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [showTime]);

  useEffect(() => {
    handleRef.current?.setOutfit?.(outfit);
  }, [outfit, yumi]);

  /*
   * The rail follows her own looks: as each goes on, it scrolls to the
   * pieces she has just put on, so what she is wearing is on screen. Both of
   * a look's pieces if they fit; else the later of the two, centred, with
   * the other showing at the edge. Only the rail moves (never the page),
   * and not once the reader has scrolled or picked something themselves.
   */
  const railVisible = STORY_ACTS[act].id === "station" && docked && Boolean(catalog?.items.length);
  useEffect(() => {
    const rail = railRef.current;
    const previous = lastLookRef.current;
    lastLookRef.current = ownOutfit;
    if (!rail || chosen || railTouchedRef.current) return;
    if (rail.scrollWidth <= rail.clientWidth + 1) return;

    const fresh = Object.entries(ownOutfit)
      .filter(([slot, id]) => previous[slot as keyof YumiOutfit] !== id)
      .map(([, id]) => id);
    const wanted = (fresh.length ? fresh : Object.values(ownOutfit)).filter(Boolean);
    const buttons = Array.from(rail.querySelectorAll<HTMLElement>("[data-piece]"))
      .filter(button => wanted.includes(button.dataset.piece ?? ""));
    if (!buttons.length) return;

    const box = rail.getBoundingClientRect();
    const spans = buttons.map(button => {
      const r = button.getBoundingClientRect();
      return { left: r.left - box.left + rail.scrollLeft, right: r.right - box.left + rail.scrollLeft };
    });
    const left = Math.min(...spans.map(span => span.left));
    const right = Math.max(...spans.map(span => span.right));
    const last = spans[spans.length - 1];
    const centre = right - left <= rail.clientWidth ? (left + right) / 2 : (last.left + last.right) / 2;
    rail.scrollTo({
      left: Math.max(0, centre - rail.clientWidth / 2),
      behavior: reducedRef.current ? "auto" : "smooth",
    });
  }, [ownOutfit, chosen, railVisible]);

  /* The rail's edges fade where there is more to scroll to. */
  const markRailEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    rail.toggleAttribute("data-more-start", rail.scrollLeft > 2);
    rail.toggleAttribute("data-more-end", rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2);
  }, []);
  useEffect(() => {
    if (railVisible) markRailEdges();
  }, [railVisible, markRailEdges]);

  const tryOn = (item: ShopItem) => {
    if (!catalog) return;
    // Trying something on is a reason to stop and look.
    if (clockRef.current?.playing()) pause();
    // From what she has on now, her own look or the reader's last pick.
    setChosen(catalog.toggle(outfit, item));
  };

  const onPrimary = () => {
    if (playing) pause();
    else play();
  };

  const acts = copy.acts;
  return (
    <section
      id="yumi-story"
      className={styles.story}
      aria-labelledby="yumi-story-title"
    >
      <header className={styles.heading}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h2 id="yumi-story-title">{copy.title}</h2>
        <p>{copy.intro}</p>
      </header>

      <div
        ref={filmRef}
        className={styles.film}
        role="region"
        aria-label={copy.ariaLabel}
        data-playing={playing || undefined}
        data-act={STORY_ACTS[act].id}
        data-docked={docked || undefined}
        data-drawn={layersDrawn || undefined}
      >
        <div className={styles.frame}>
          <div ref={screenRef} className={styles.screen}>
            <div data-track="camera" className={styles.camera}>
              <div className={styles.nebula} />
              <div data-track="starsFar" className={styles.starsFar} />
              <div data-track="starsNear" className={styles.starsNear} />
              <div data-track="matter" className={styles.matter}>
                {MATTER.map((piece, index) => (
                  <span
                    key={index}
                    data-ring={piece.ring || undefined}
                    style={{
                      left: `${piece.x}%`,
                      top: `${piece.y}%`,
                      "--size": `${piece.size}px`,
                      "--tone": piece.tone,
                      "--dx": `${piece.dx}px`,
                      "--dy": `${piece.dy}px`,
                      "--duration": `${piece.duration}s`,
                      "--delay": `${piece.delay}s`,
                    } as CSSProperties}
                  />
                ))}
              </div>
              <div data-track="flash" className={styles.flash} />
              <div data-track="ring" className={styles.ring} />
            </div>

            {/* The view from Station 33, and the one Earth in it: the planet
                she sees far off is the Earth under the station (see globe()
                in storyTimeline.ts). The window's own Earth is left out; by
                day, as the planet always is here. */}
            <div ref={orbitRef} data-track="orbit" className={styles.orbit}>
              <div data-track="station" className={styles.station}>
                <OrbitalBackdrop scene={QUIET_SCENE} celebrateKey={0} earth={false} />
              </div>
              {/* The planet's and the flare's animations still run here, on
                  layers that paint nothing: they are where the Earth is.
                  The Earth itself is the canvas below (earthPainter.ts). */}
              <div ref={planetRef} data-track="planet" className={styles.planet}>
                <span ref={flareRef} data-track="flare" className={styles.flare} />
              </div>
            </div>
            <canvas ref={earthRef} className={styles.earth} aria-hidden="true" />
            {/* Each of her own looks goes on with a ring of light from the
                stand, the shop's own for a purchase. On the window's own
                track, so it moves with the view as it did inside it. */}
            <div data-track="orbit" className={styles.orbit}>
              {look >= 0 && !chosen ? <Burst key={look} /> : null}
            </div>
            <div data-track="dock" className={styles.dock}>
              <StationDock />
            </div>
            <div data-track="streaks" className={styles.streaks}>
              <span />
            </div>
            <div data-track="sky" className={styles.sky}>
              <span className={styles.sun} />
              <span className={styles.cloudOne} />
              <span className={styles.cloudTwo} />
            </div>

            <canvas
              ref={canvasRef}
              className={styles.canvas}
              data-live={yumi === "live" || undefined}
              data-turnable={merged || undefined}
              aria-hidden="true"
              onPointerDown={event => {
                handleRef.current?.pointerDown(event.clientX, event.clientY);
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={event => handleRef.current?.pointerMove(event.clientX, event.clientY)}
              onPointerUp={() => handleRef.current?.pointerUp()}
              onPointerCancel={() => handleRef.current?.pointerCancel?.()}
            />
            <div ref={glintRef} className={styles.eyeGlint} aria-hidden="true" />
            <YumiLoading
              className={styles.loader}
              state={yumi === "live" ? "done" : yumi}
            />

            <div className={styles.vignette} aria-hidden="true" />
            <div ref={veilRef} className={styles.veil} aria-hidden="true" />
            <div data-track="letterbox" className={`${styles.letterbox} ${styles.letterboxTop}`} aria-hidden="true" />
            <div data-track="letterbox" className={`${styles.letterbox} ${styles.letterboxBottom}`} aria-hidden="true" />

            {endCard ? (
              <div className={styles.endCard}>
                <p className={styles.endTitle}>{copy.endTitle}</p>
                <p className={styles.endText}>{copy.endText}</p>
                <div className={styles.endCta}>{cta}</div>
              </div>
            ) : null}
          </div>

          {/* The scene's words. Visual only: the list below reads all five
              to a screen reader, in order, without the film's clock.

              Every act's words are laid in the same cell, unseen, under the
              one that shows, so the box is always as tall as the longest:
              on a phone, where the words sit under the picture, nothing
              below them moves when the scene changes, or at the end card. */}
          <div
            className={styles.caption}
            data-ended={endCard || undefined}
            aria-hidden="true"
          >
            {acts.map((item, index) => (
              <div key={index} className={styles.captionGhost}>
                <CaptionBody copy={copy} index={index} />
              </div>
            ))}
            {/* The last act's words go as the next act's come: a crossfade,
                so the box is never empty between scenes while the picture
                runs on (Chi, 2026-10-17). */}
            {leaving !== null && leaving !== act ? (
              <div
                key={`leaving-${leaving}`}
                className={styles.captionLeaving}
                onAnimationEnd={event => {
                  if (event.target === event.currentTarget) setLeaving(null);
                }}
              >
                <CaptionBody copy={copy} index={leaving} />
              </div>
            ) : null}
            <div key={act} className={styles.captionLive}>
              <CaptionBody copy={copy} index={act} />
            </div>
          </div>

          {railVisible && catalog ? (
            <div className={styles.tryOn} role="group" aria-label={copy.tryOn.title}>
              <p className={styles.tryOnTitle}>{copy.tryOn.title}</p>
              <ul
                ref={railRef}
                onScroll={markRailEdges}
                onPointerDown={() => { railTouchedRef.current = true; }}
                onWheel={() => { railTouchedRef.current = true; }}
              >
                {catalog.items.map(item => {
                  const wearing = outfit[item.slot] === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        data-piece={item.id}
                        aria-pressed={wearing}
                        onClick={() => tryOn(item)}
                        disabled={yumi !== "live"}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/shop-thumbs/${item.id}.webp`} alt="" width={44} height={44} />
                        <span>
                          <strong>{item.names[language]}</strong>
                          <small>{copy.tryOn.cookies.replace("{n}", String(item.price))}</small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.tryOnHint}>{copy.tryOn.hint}</p>
              {Object.keys(outfit).length ? (
                <button type="button" className={styles.takeOff} onClick={() => setChosen({})}>
                  {copy.tryOn.takeOff}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.playButton}
            onClick={onPrimary}
            aria-label={playing ? copy.pause : ended ? copy.replay : copy.play}
          >
            {playing ? (
              <Pause size={16} aria-hidden="true" />
            ) : ended ? (
              <RotateCcw size={16} aria-hidden="true" />
            ) : (
              <Play size={16} aria-hidden="true" />
            )}
            <span>{playing ? copy.pause : ended ? copy.replay : copy.play}</span>
          </button>

          <ol className={styles.chapters} aria-label={copy.chaptersLabel}>
            {acts.map((item, index) => (
              <li key={item.name}>
                <button
                  type="button"
                  aria-current={index === act ? "step" : undefined}
                  onClick={() => goTo(index)}
                >
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.chapterName}>{item.name}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className={styles.progressTrack} aria-hidden="true">
            <span data-track="progress" className={styles.progress} />
          </div>
        </div>

        <ol className="sr-only">
          {acts.map(item => (
            <li key={item.name}>
              <strong>{item.title}.</strong> {item.text}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
