"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { LOGO_TIERS, exchangeNotesLogoGeometry } from "@/lib/brand/exchangeNotesLogo";
import type { LaunchRendererProps } from "./types";
import { YUMI_PRISM_CHECKPOINTS, YUMI_PRISM_DURATION_MS, YUMI_PRISM_HOLD_MS, YUMI_PRISM_REDUCED_DURATION_MS, buildYumiPrismTracks, computeYumiPrismFrame } from "./yumiPrismTimeline";
import styles from "./YumiPrismLaunch.module.css";

const geometry = exchangeNotesLogoGeometry({ canvas: 512, ...LOGO_TIERS.inApp });
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const readMotion = () => window.matchMedia(motionQuery).matches;
const serverMotion = () => false;

/** The reduced-motion film has no beats of its own; these name its three frames. */
const REDUCED_CHECKPOINTS = [[0, "開始"], [250, "定格"], [YUMI_PRISM_REDUCED_DURATION_MS, "App"]] as const;

type Props = LaunchRendererProps & {
  forceReducedMotion?: boolean;
  showHandoffPreview?: boolean;
  showReviewControls?: boolean;
};

/**
 * Pearl glass, an ice-blue light pass, and a quiet brand hold. No external
 * assets, and no colour of its own: every value the film paints with comes
 * from the token block in the stylesheet, which Cosmic Mode redefines.
 */
export default function YumiPrismLaunch({
  launchId, reviewMode = false, onComplete, forceReducedMotion,
  showHandoffPreview = reviewMode, showReviewControls = reviewMode,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLInputElement>(null);
  const readoutRef = useRef<HTMLOutputElement>(null);
  const currentTime = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const completed = useRef(false);
  const id = useId();
  const systemReduced = useSyncExternalStore(subscribeMotion, readMotion, serverMotion);
  const [override, setOverride] = useState<boolean | null>(null);
  const reduced = override ?? forceReducedMotion ?? systemReduced;
  const [playing, setPlaying] = useState(true);
  const [run, setRun] = useState(0);
  const [phone, setPhone] = useState(false);
  const duration = reduced ? YUMI_PRISM_REDUCED_DURATION_MS : YUMI_PRISM_DURATION_MS;

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const paint = useCallback((time: number) => {
    const root = rootRef.current;
    if (!root) return;
    for (const [key, value] of Object.entries(computeYumiPrismFrame(time, reduced))) {
      root.style.setProperty(key, value);
    }
    if (readoutRef.current) readoutRef.current.textContent = `${(time / 1000).toFixed(2)}s / ${(duration / 1000).toFixed(2)}s`;
    if (scrubberRef.current) scrubberRef.current.value = `${time}`;
  }, [duration, reduced]);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    // Persist the last frame before cancelling fill:both animations. This also
    // keeps the standalone production review from flashing back to frame zero.
    paint(duration);
    setPlaying(false);
    onCompleteRef.current?.();
  }, [duration, paint]);

  useEffect(() => {
    if (!reviewMode) return;
    currentTime.current = Math.min(currentTime.current, duration);
    paint(currentTime.current);
  }, [duration, paint, reviewMode]);

  useEffect(() => {
    if (reviewMode || !playing) return;
    const root = rootRef.current;
    if (!root) return;
    const animations: Animation[] = [];
    let disposed = false;
    let fallback: number | undefined;
    const complete = () => { if (!disposed) finish(); };
    const deadline = Date.now() + duration + 250;
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() >= deadline) complete();
    };
    document.addEventListener("visibilitychange", onVisible);
    // Both a stalled compositor and a backgrounded tab must eventually release.
    const ceiling = window.setTimeout(complete, duration + 250);

    try {
      if (typeof root.animate !== "function") throw new Error("Animations unavailable");
      for (const [name, frames] of Object.entries(buildYumiPrismTracks(reduced))) {
        // All of them: a track name is a role in the film, and the caption's
        // two hairlines are one role played by two elements.
        for (const element of root.querySelectorAll<HTMLElement>(`[data-track="${name}"]`)) {
          const animation = element.animate(frames, { duration, easing: "linear", fill: "both" });
          animations.push(animation);
          // Attach rejection handling immediately, including partial setup failure.
          void animation.finished.catch(() => {});
        }
      }
      void Promise.all(animations.map(animation => animation.finished)).then(complete).catch(complete);
    } catch {
      for (const animation of animations) animation.cancel();
      // A readable static lockup, then an early handoff; never a blank four seconds.
      paint(reduced ? 250 : YUMI_PRISM_HOLD_MS);
      fallback = window.setTimeout(complete, YUMI_PRISM_REDUCED_DURATION_MS);
    }

    return () => {
      disposed = true;
      window.clearTimeout(ceiling);
      window.clearTimeout(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      for (const animation of animations) animation.cancel();
    };
  }, [duration, finish, paint, playing, reduced, reviewMode]);

  useEffect(() => {
    if (reviewMode || !onComplete) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); finish(); }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [finish, onComplete, reviewMode]);

  useEffect(() => {
    if (!reviewMode || !playing) return;
    let frame = 0;
    let origin: number | undefined;
    const tick = (now: number) => {
      origin ??= now - currentTime.current;
      const time = Math.min(duration, now - origin);
      currentTime.current = time;
      paint(time);
      if (time >= duration) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, paint, playing, reviewMode, run]);

  const seek = (time: number) => {
    currentTime.current = Math.max(0, Math.min(duration, time));
    setPlaying(false);
    paint(currentTime.current);
  };
  const replay = () => {
    currentTime.current = 0;
    paint(0);
    setPlaying(true);
    setRun(value => value + 1);
  };

  return (
    <div ref={rootRef} className={styles.launch}
      style={computeYumiPrismFrame(0, reduced) as CSSProperties}
      data-launch-id={launchId} data-review={reviewMode || undefined}
      data-phone={phone || undefined} data-reduced-motion={reduced || undefined}
      role={reviewMode ? "region" : undefined}
      aria-label={reviewMode ? "Yumi 光環開場預覽" : undefined}>
      <div className={styles.canvas}>
        <div data-track="sceneWash" className={styles.sceneWash} aria-hidden="true" />
        <div data-track="dawn" className={styles.dawn} aria-hidden="true" />
        {showHandoffPreview && (
          <div data-track="handoffPreview" className={styles.handoffPreview} aria-hidden="true">
            <span className={styles.previewKicker}>EXCHANGE NOTES</span>
            <h2>A world in your words.</h2>
            <p>Every little exchange opens something new.</p>
            <span className={styles.previewLine} />
            <small>開場結束 · App 交接示意</small>
          </div>
        )}
        <div data-track="brandScene" className={styles.brandScene} aria-hidden="true">
          <div className={styles.ambient} />
          <div className={styles.composition}>
            <div className={styles.symbol}>
              <div data-track="aura" className={styles.aura} />
              <div data-track="halo" className={styles.halo}>
                <div className={styles.haloRing} />
                <div className={styles.haloInner} />
                <div className={styles.haloAxis} />
              </div>
              <div className={styles.orbitPlane}>
                <div data-track="orbit" className={styles.orbit}>
                  <span className={styles.orbitLight} />
                </div>
              </div>
              <div data-track="actor" className={styles.actor}>
                <div className={styles.glass}>
                  <div data-track="sweep" className={styles.sweep} />
                  <svg className={styles.yumi} viewBox="0 0 512 512" fill="none">
                    <defs>
                      <linearGradient id={`${id}-ink`} x1="70" y1="110" x2="440" y2="420" gradientUnits="userSpaceOnUse">
                        <stop className={styles.inkFrom} /><stop offset="0.52" className={styles.inkVia} /><stop offset="1" className={styles.inkTo} />
                      </linearGradient>
                      <clipPath id={`${id}-eye`}><circle cx={geometry.eye.cx} cy={geometry.eye.cy} r={geometry.eye.fieldRadius} /></clipPath>
                    </defs>
                    <g stroke={`url(#${id}-ink)`} strokeLinecap="round" strokeLinejoin="round">
                      <path d={geometry.arc.d} strokeWidth={geometry.strokes.main} />
                      <path d={geometry.bridge.d} strokeWidth={geometry.strokes.main} strokeLinecap="butt" />
                      <circle className={styles.eyeField} cx={geometry.eye.cx} cy={geometry.eye.cy} r={geometry.eye.ringRadius} strokeWidth={geometry.strokes.ring} />
                    </g>
                    <g clipPath={`url(#${id}-eye)`}>
                      <g data-track="pupil" className={styles.pupil}>
                        <circle cx={geometry.pupil.cx} cy={geometry.pupil.cy} r={geometry.pupil.r} fill={`url(#${id}-ink)`} />
                        {geometry.highlight && <circle className={styles.eyeSpark} cx={geometry.highlight.cx} cy={geometry.highlight.cy} r={geometry.highlight.r} />}
                      </g>
                      <path data-track="closedEye" className={`${styles.closedEye} ${styles.markStroke}`} d={`M ${geometry.eye.cx - geometry.eye.fieldRadius * 0.58} ${geometry.eye.cy} Q ${geometry.eye.cx} ${geometry.eye.cy + 8} ${geometry.eye.cx + geometry.eye.fieldRadius * 0.58} ${geometry.eye.cy}`} strokeWidth="8" strokeLinecap="round" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
            <div className={styles.lockup}>
              <div data-track="wordmark" className={styles.wordmark}>Exchange Notes<span className={styles.brandDot}>.</span></div>
              <div className={styles.caption}>
                <span data-track="captionRule" className={styles.captionRule} />
                <span data-track="caption" className={styles.captionText}>A LITTLE EXCHANGE. A WIDER WORLD.</span>
                <span data-track="captionRule" className={styles.captionRule} />
              </div>
            </div>
          </div>
          <div className={styles.signature}>A WORLD IN YOUR WORDS</div>
        </div>
      </div>
      {!reviewMode && onComplete && <button type="button" className={styles.skip} onClick={finish}>略過 <span aria-hidden="true">↗</span></button>}
      {showReviewControls && (
        <section className={styles.reviewControls} aria-label="開場動畫控制">
          <div className={styles.controlHeading}><span>YUMI / PRISM</span><output ref={readoutRef}>0.00s / {(duration / 1000).toFixed(2)}s</output></div>
          <input ref={scrubberRef} type="range" min="0" max={duration} step="1" defaultValue="0" onChange={event => seek(Number(event.target.value))} aria-label="動畫時間軸" />
          <div className={styles.controlButtons}>
            <button type="button" onClick={() => { if (currentTime.current >= duration) replay(); else setPlaying(!playing); }}>{playing ? "暫停" : "播放"}</button>
            <button type="button" className={styles.primaryControl} onClick={replay}>重播開場 ↗</button>
            <button type="button" aria-pressed={reduced} onClick={() => { currentTime.current = 0; setOverride(!reduced); setPlaying(true); setRun(value => value + 1); }}>{reduced ? "完整動態" : "減少動態"}</button>
            <button type="button" aria-pressed={phone} onClick={() => setPhone(!phone)}>{phone ? "全螢幕" : "手機比例"}</button>
          </div>
          <div className={styles.checkpoints}>
            {(reduced ? REDUCED_CHECKPOINTS : YUMI_PRISM_CHECKPOINTS).map(([time, label]) => <button type="button" key={time} onClick={() => seek(time)}>{label}</button>)}
          </div>
        </section>
      )}
    </div>
  );
}
