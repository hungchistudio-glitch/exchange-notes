"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import useCosmicMode from "@/hooks/useCosmicMode";
import useReducedMotion from "@/hooks/useReducedMotion";
import { SEA, SEA_FRAGMENT, SEA_PALETTES, SEA_VERTEX, type SeaPhase } from "@/lib/voice/sea";
import { voiceSignal } from "@/lib/voice/signal";

import styles from "./VoiceSea.module.css";

/* Drawn at 0.6 of the screen's device pixels (at most two a CSS pixel): the
   liquid is soft, and the crest is antialiased in the shader. */
const RESOLUTION = 0.6;

const subscribeNothing = () => () => {};

const UNIFORMS = [
  "uRes", "uScale", "uSlow", "uFast", "uTime", "uFill", "uLevel", "uLow", "uHigh", "uCalm", "uCosmic",
  "uSurface", "uBody", "uDeep", "uCrest", "uSheenA", "uSheenB",
] as const;
type UniformName = (typeof UNIFORMS)[number];
type Gl = { gl: WebGLRenderingContext; uniforms: Record<UniformName, WebGLUniformLocation | null>; dispose: () => void };

function setUp(canvas: HTMLCanvasElement): Gl | null {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, SEA_VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, SEA_FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return {
    gl,
    uniforms: Object.fromEntries(UNIFORMS.map(name => [name, gl.getUniformLocation(program, name)])) as Gl["uniforms"],
    dispose: () => {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}

/* Toward a target at a rate, whatever the frame's length. */
const approach = (now: number, target: number, rate: number, dt: number) => now + (target - now) * (1 - Math.exp(-rate * dt));

/**
 * The sea that listens (lib/voice/sea.ts): a fixed canvas over the bottom
 * half of the screen that takes no taps, drawn only while a microphone is
 * open, the words are being understood, or the sea is still draining.
 * It reads the voice off lib/voice/signal.ts, which whoever is metering
 * writes every frame. Under reduced motion, or where WebGL is not to be
 * had, a still glow at the bottom fades in and out instead.
 */
export default function VoiceSea({ phase }: { phase: SeaPhase }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  const wakeRef = useRef<(() => void) | null>(null);
  const reducedMotion = useReducedMotion();
  const cosmic = useCosmicMode();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  useEffect(() => {
    phaseRef.current = phase;
    if (glowRef.current) glowRef.current.dataset.on = phase;
    wakeRef.current?.();
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    if (!canvas || !glow) return;
    const state = {
      gl: null as Gl | null, failed: reducedMotion, frame: 0, last: 0,
      fill: 0, calm: 0, level: 0, low: 0, high: 0, slow: 0, fast: 0, time: 0,
    };
    const palette = SEA_PALETTES[cosmic ? "cosmic" : "day"];

    const draw = (now: number) => {
      const handle = state.gl;
      if (!handle) { state.frame = 0; return; }
      const dt = Math.min(0.05, Math.max(0, (now - state.last) / 1000));
      state.last = now;
      const current = phaseRef.current;
      const listening = current === "listening";
      const fillTarget = listening ? 1 : current === "understanding" ? SEA.understandingFill : 0;
      state.fill = approach(state.fill, fillTarget, fillTarget > state.fill ? 4.2 / SEA.riseS : 3.6 / SEA.drainS, dt);
      state.calm = approach(state.calm, current === "understanding" ? 1 : 0, 3, dt);
      const follow = (now: number, target: number) => approach(now, target, target > now ? 16 : 5, dt);
      state.level = follow(state.level, listening ? voiceSignal.level : 0);
      state.low = follow(state.low, listening ? voiceSignal.low : 0);
      state.high = follow(state.high, listening ? voiceSignal.high : 0);
      state.slow += dt * (0.6 + 1.5 * state.level + 0.9 * state.low);
      state.fast += dt * (1.8 + 6 * state.high + 2 * state.level);
      state.time += dt;

      const { gl, uniforms } = handle;
      const scale = Math.min(window.devicePixelRatio || 1, 2) * RESOLUTION;
      const cssHeight = window.innerHeight * SEA.height;
      const width = Math.max(1, Math.round(window.innerWidth * scale));
      const height = Math.max(1, Math.round(cssHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.height = `${cssHeight}px`;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(uniforms.uRes, width, height);
      gl.uniform1f(uniforms.uScale, window.innerWidth / 390);
      gl.uniform1f(uniforms.uSlow, state.slow);
      gl.uniform1f(uniforms.uFast, state.fast);
      gl.uniform1f(uniforms.uTime, state.time);
      gl.uniform1f(uniforms.uFill, state.fill);
      gl.uniform1f(uniforms.uLevel, state.level);
      gl.uniform1f(uniforms.uLow, state.low);
      gl.uniform1f(uniforms.uHigh, state.high);
      gl.uniform1f(uniforms.uCalm, state.calm);
      gl.uniform1f(uniforms.uCosmic, cosmic ? 1 : 0);
      gl.uniform3fv(uniforms.uSurface, palette.surface);
      gl.uniform3fv(uniforms.uBody, palette.body);
      gl.uniform3fv(uniforms.uDeep, palette.deep);
      gl.uniform3fv(uniforms.uCrest, palette.crest);
      gl.uniform3fv(uniforms.uSheenA, palette.sheenA);
      gl.uniform3fv(uniforms.uSheenB, palette.sheenB);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (current === "idle" && state.fill < 0.004) {
        /* Drained: nothing more to draw until the next time it listens. */
        gl.clear(gl.COLOR_BUFFER_BIT);
        canvas.dataset.on = "false";
        state.frame = 0;
        return;
      }
      state.frame = requestAnimationFrame(draw);
    };

    const wake = () => {
      if (state.frame || state.failed) return;
      if (phaseRef.current === "idle" && state.fill < 0.004) return;
      state.gl ??= setUp(canvas);
      if (!state.gl) { state.failed = true; return; }
      canvas.dataset.on = "true";
      state.last = performance.now();
      state.frame = requestAnimationFrame(draw);
    };
    wakeRef.current = wake;
    glow.dataset.on = phaseRef.current;
    wake();

    const lost = (event: Event) => {
      event.preventDefault();
      if (state.frame) cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.gl = null;
      state.failed = true;
      canvas.dataset.on = "false";
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      wakeRef.current = null;
      canvas.removeEventListener("webglcontextlost", lost);
      if (state.frame) cancelAnimationFrame(state.frame);
      state.gl?.dispose();
    };
  }, [mounted, reducedMotion, cosmic]);

  if (!mounted) return null;
  return createPortal(
    <>
      <canvas ref={canvasRef} className={styles.sea} data-on="false" aria-hidden="true" />
      <div ref={glowRef} className={styles.glow} data-on="idle" data-still={reducedMotion ? "true" : "false"} aria-hidden="true" />
    </>,
    document.body,
  );
}
