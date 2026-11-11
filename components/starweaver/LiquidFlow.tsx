"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import useReducedMotion from "@/hooks/useReducedMotion";
import { FRAGMENT, LIQUID, LIQUID_EVENT, VERTEX, paletteFor, type LiquidFlowRequest } from "@/lib/starweaver/liquid";

import styles from "@/components/hangyumi/Hangyumi.module.css";

/* Drawn at half the screen's CSS pixels: the light is soft, and a phone
   fills a quarter of the pixels a full-resolution canvas would. */
const RESOLUTION = 0.5;

/* Mounted on the client only: the overlay is portalled to the body. */
const subscribeNothing = () => () => {};

const UNIFORMS = ["uRes", "uFrom", "uTo", "uT", "uSeed", "uStrength", "uWidth", "uMiss", "uDeep", "uBody", "uTint", "uCrest"] as const;
type UniformName = (typeof UNIFORMS)[number];

type Gl = {
  gl: WebGLRenderingContext;
  uniforms: Record<UniformName, WebGLUniformLocation | null>;
  dispose: () => void;
};

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
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
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

/**
 * The liquid light over the whole screen, in all three games
 * (lib/starweaver/liquid.ts): a fixed canvas that takes no taps and is
 * drawn only while a flow plays, hidden otherwise so the page composites
 * nothing extra. Where WebGL is not to be had, or under reduced motion, a
 * soft glow at the key fades in and out instead, and a miss blushes the
 * screen's edge red: no movement, the same news.
 */
export default function LiquidFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    if (!canvas || !glow) return;
    const state: { gl: Gl | null; frame: number; failed: boolean } = { gl: null, frame: 0, failed: false };

    const glowAt = (request: LiquidFlowRequest) => {
      glow.style.setProperty("--liquid-x", `${request.from.x}px`);
      glow.style.setProperty("--liquid-y", `${request.from.y}px`);
      glow.dataset.kind = request.kind;
      glow.dataset.game = request.game;
      glow.dataset.on = "false";
      void glow.offsetWidth;
      glow.dataset.on = "true";
    };

    const play = (event: Event) => {
      const request = (event as CustomEvent<LiquidFlowRequest>).detail;
      if (!request || document.hidden) return;
      if (reducedMotion || state.failed) {
        glowAt(request);
        return;
      }
      state.gl ??= setUp(canvas);
      const handle = state.gl;
      if (!handle) {
        state.failed = true;
        glowAt(request);
        return;
      }
      const { gl, uniforms } = handle;
      const width = Math.max(1, Math.round(window.innerWidth * RESOLUTION));
      const height = Math.max(1, Math.round(window.innerHeight * RESOLUTION));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      const settings = LIQUID[request.kind];
      const cosmic = document.documentElement.dataset.interfaceMode === "yumi-cosmic";
      /* Viewport pixels, top down, to the canvas's own, bottom up. */
      gl.uniform2f(uniforms.uRes, width, height);
      gl.uniform2f(uniforms.uFrom, request.from.x * RESOLUTION, height - request.from.y * RESOLUTION);
      gl.uniform2f(uniforms.uTo, request.to.x * RESOLUTION, height - request.to.y * RESOLUTION);
      gl.uniform1f(uniforms.uSeed, Math.random() * 10);
      gl.uniform1f(uniforms.uStrength, cosmic ? settings.cosmicStrength : settings.strength);
      gl.uniform1f(uniforms.uWidth, settings.width);
      gl.uniform1f(uniforms.uMiss, request.kind === "miss" ? 1 : 0);
      const palette = paletteFor(request);
      gl.uniform3fv(uniforms.uDeep, palette.deep);
      gl.uniform3fv(uniforms.uBody, palette.body);
      gl.uniform3fv(uniforms.uTint, palette.tint);
      gl.uniform3fv(uniforms.uCrest, palette.crest);
      if (state.frame) cancelAnimationFrame(state.frame);
      canvas.dataset.on = "true";
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / 1000 / settings.seconds);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uniforms.uT, t);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (t < 1 && !document.hidden) {
          state.frame = requestAnimationFrame(step);
        } else {
          state.frame = 0;
          gl.clear(gl.COLOR_BUFFER_BIT);
          canvas.dataset.on = "false";
        }
      };
      state.frame = requestAnimationFrame(step);
    };

    const lost = (event: Event) => {
      event.preventDefault();
      state.gl = null;
      state.failed = true;
    };
    window.addEventListener(LIQUID_EVENT, play);
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      window.removeEventListener(LIQUID_EVENT, play);
      canvas.removeEventListener("webglcontextlost", lost);
      if (state.frame) cancelAnimationFrame(state.frame);
      state.gl?.dispose();
    };
  }, [reducedMotion, mounted]);

  if (!mounted) return null;
  return createPortal(
    <>
      <canvas ref={canvasRef} className={styles.liquid} data-on="false" aria-hidden="true" />
      <div ref={glowRef} className={styles.liquidGlow} data-on="false" aria-hidden="true" />
    </>,
    document.body,
  );
}
