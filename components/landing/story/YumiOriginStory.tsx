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

import OrbitalBackdrop from "@/components/shop/OrbitalBackdrop";
import StationDock from "@/components/shop/StationDock";
import YumiLoading from "@/components/yumi3d/YumiLoading";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { QUIET_SCENE, sceneFor, type Scene } from "@/lib/shop/atmosphere";
import type { ShopItem, YumiOutfit } from "@/lib/shop/catalog";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";

import {
  ACT_STILLS_MS,
  END_CARD_AT_MS,
  MERGE_AT_MS,
  STORY_ACTS,
  STORY_DURATION_MS,
  STORY_TRACKS,
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
   whatever she is wearing, she lands on Earth in.
   ========================================================= */

/** A few of the shop's pieces: something to wear, something from Earth. */
const TRY_ON_IDS = ["monocle", "headphones", "star-pupil", "beret", "bubble-tea"] as const;

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
};

/**
 * The film's clock: every layer's Web Animation, moved together. A
 * chapter jump is one currentTime write on each, and the 3D Yumi reads the
 * time back from the first.
 */
function createLayerClock(root: HTMLElement): FilmClock | null {
  const elements = Array.from(root.querySelectorAll<HTMLElement>("[data-track]"));
  if (!elements.length || typeof elements[0].animate !== "function") return null;

  const animations = elements.map(element => {
    const name = element.dataset.track as StoryTrack;
    const animation = element.animate(STORY_TRACKS[name], {
      duration: STORY_DURATION_MS,
      fill: "both",
    });
    animation.pause();
    animation.currentTime = 0;
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
  const clockRef = useRef<FilmClock | null>(null);
  const handleRef = useRef<YumiSceneHandle | null>(null);
  const reducedRef = useRef(false);
  const actRef = useRef(0);
  const endRef = useRef(false);
  const mergedRef = useRef(false);

  const [act, setAct] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [endCard, setEndCard] = useState(false);
  /** Once YU and MI are one, she can be turned. */
  const [merged, setMerged] = useState(false);
  const [yumi, setYumi] = useState<"loading" | "live" | "unavailable">("loading");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [outfit, setOutfit] = useState<YumiOutfit>({});
  const [scene, setScene] = useState<Scene>(QUIET_SCENE);

  /* The Earth under Station 33 is in the reader's own time of day, as it is
     in the shop; the server cannot know it, so it arrives after hydration. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScene(sceneFor("auto", null, new Date()));
  }, []);

  const showTime = useCallback((time: number) => {
    const nextAct = actAt(time);
    if (nextAct !== actRef.current) {
      actRef.current = nextAct;
      setAct(nextAct);
    }
    const nextMerged = time >= MERGE_AT_MS;
    if (nextMerged !== mergedRef.current) {
      mergedRef.current = nextMerged;
      setMerged(nextMerged);
    }
    const nextEnd = time >= END_CARD_AT_MS;
    if (nextEnd !== endRef.current) {
      endRef.current = nextEnd;
      setEndCard(nextEnd);
    }
  }, []);

  const play = useCallback(() => {
    const clock = clockRef.current;
    if (!clock) return;
    clock.play();
    setPlaying(true);
    setEnded(false);
  }, []);

  const pause = useCallback(() => {
    clockRef.current?.pause();
    setPlaying(false);
  }, []);

  const goTo = useCallback((index: number) => {
    const clock = clockRef.current;
    if (!clock) return;
    const reduced = reducedRef.current;
    const time = reduced ? ACT_STILLS_MS[index] : STORY_ACTS[index].start;
    clock.seek(time);
    showTime(time);
    setEnded(false);
    if (!reduced) {
      clock.play();
      setPlaying(true);
    }
  }, [showTime]);

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

    const clock = createLayerClock(film) ?? createPlainClock();
    clockRef.current = clock;
    if (reduced) {
      clock.seek(ACT_STILLS_MS[0]);
      showTime(ACT_STILLS_MS[0]);
    }

    let disposed = false;
    let raf = 0;
    let onScreen = false;
    let started = false;
    let autoPaused = false;
    let sceneRequested = false;
    const size = { width: screen.clientWidth, height: screen.clientHeight };

    const finish = () => {
      clock.pause();
      clock.seek(STORY_DURATION_MS);
      setPlaying(false);
      setEnded(true);
    };

    const loop = (now: number) => {
      raf = 0;
      if (disposed || !onScreen) return;
      const time = clock.time();
      if (clock.playing() && time >= STORY_DURATION_MS) finish();
      showTime(time);

      const handle = handleRef.current;
      if (handle) {
        const pose = yumiAt(time, size.width < size.height * 0.9, reduced);
        handle.setParts?.(pose.parts);
        handle.setScreenAnchor(
          pose.x * size.width,
          pose.y * size.height,
          pose.r * Math.min(size.width, size.height),
        );
        handle.setGaze?.(pose.gaze?.x ?? 0, pose.gaze?.y ?? 0);
        handle.frame(now);
      }
      raf = requestAnimationFrame(loop);
    };
    const run = () => {
      if (!raf && onScreen && !disposed) raf = requestAnimationFrame(loop);
    };

    // Only near the screen: the engine chunk, the catalogue, and a context.
    const requestScene = () => {
      if (sceneRequested) return;
      sceneRequested = true;
      void Promise.all([import("@/lib/yumi3d/scene"), import("@/lib/shop/catalog")])
        .then(([{ createYumiScene }, shop]) => {
          if (disposed) return;
          setCatalog({
            items: TRY_ON_IDS.map(id => shop.shopItem(id)).filter((item): item is ShopItem => !!item),
            toggle: shop.toggleInOutfit,
          });
          const handle = createYumiScene(canvas, { reducedMotion: reduced, maxPixelRatio: 1.75 });
          if (!handle) {
            setYumi("unavailable");
            return;
          }
          handleRef.current = handle;
          setYumi("live");
          run();
        })
        .catch(() => {
          if (!disposed) setYumi("unavailable");
        });
    };

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
    const watch = (ratio: number) => {
      onScreen = ratio > 0;
      if (onScreen) run();
      if (ratio >= 0.55) {
        if (!started && !reduced) {
          started = true;
          clock.play();
          setPlaying(true);
        } else if (autoPaused) {
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
    if (!visible) {
      onScreen = true;
      run();
    }

    const onHidden = () => {
      if (document.visibilityState === "hidden" && clock.playing()) {
        autoPaused = true;
        clock.pause();
        setPlaying(false);
      } else if (document.visibilityState === "visible" && autoPaused && onScreen) {
        autoPaused = false;
        clock.play();
        setPlaying(true);
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
          });
    resize?.observe(screen);

    /* The lead animation's own end, so a film that finishes while its tab
       is in the background still shows its last frame and the replay. */
    const lead = film.querySelector<HTMLElement>("[data-track]")?.getAnimations?.()[0];
    if (lead) lead.onfinish = () => { if (!disposed) finish(); };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      near?.disconnect();
      visible?.disconnect();
      resize?.disconnect();
      document.removeEventListener("visibilitychange", onHidden);
      clock.dispose();
      clockRef.current = null;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [showTime]);

  useEffect(() => {
    handleRef.current?.setOutfit?.(outfit);
  }, [outfit, yumi]);

  const tryOn = (item: ShopItem) => {
    if (!catalog) return;
    // Trying something on is a reason to stop and look.
    if (clockRef.current?.playing()) pause();
    setOutfit(current => catalog.toggle(current, item));
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
              <div data-track="planet" className={styles.planet}>
                <span className={styles.planetSurface}>
                  <span className={styles.planetLand} />
                  <span className={styles.planetClouds} />
                </span>
                <span className={styles.planetShade} />
                <span className={styles.planetAtmosphere} />
              </div>
              <div data-track="flare" className={styles.flare} />
              <div data-track="flash" className={styles.flash} />
              <div data-track="ring" className={styles.ring} />
            </div>

            <div data-track="orbit" className={styles.orbit}>
              <OrbitalBackdrop scene={scene} celebrateKey={0} />
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
            <YumiLoading
              className={styles.loader}
              state={yumi === "live" ? "done" : yumi}
            />

            <div className={styles.vignette} aria-hidden="true" />
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
            <div key={act} className={styles.captionLive}>
              <CaptionBody copy={copy} index={act} />
            </div>
          </div>

          {STORY_ACTS[act].id === "station" && catalog && catalog.items.length ? (
            <div className={styles.tryOn} role="group" aria-label={copy.tryOn.title}>
              <p className={styles.tryOnTitle}>{copy.tryOn.title}</p>
              <ul>
                {catalog.items.map(item => {
                  const wearing = outfit[item.slot] === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
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
                <button type="button" className={styles.takeOff} onClick={() => setOutfit({})}>
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
