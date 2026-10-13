"use client";

import { useEffect, useRef, type CSSProperties, type MutableRefObject } from "react";

import type { Scene, Sky } from "@/lib/shop/atmosphere";
import { isScrolling } from "@/lib/shop/scrollQuiet";

import styles from "./ShopAtmosphere.module.css";

/* =========================================================
   The sky behind the stand

   A painted backdrop (sky, sun or moon, clouds, two paper-cut hills) and one
   2D canvas of things that move through it: rain, snow, leaves, petals,
   butterflies, fireflies, dust in the sun, stars and the odd shooting star.
   It sits behind Yumi's own canvas, so a butterfly passes behind her.

   Two things answer the reader: a drag that turns Yumi blows a gust through
   whatever is falling, and a purchase throws a handful of the season's
   colours, and a few cookies, up from the stand.

   The budget: a 2D canvas (no second WebGL context), at most 1.5× device
   pixels, a few dozen particles scaled to the stand's size, drawn only while
   on screen and visible. Clouds, rays and lightning are CSS, transform and
   opacity only. Reduced motion paints one still frame and stops.
   ========================================================= */

type Palette = { sky: [string, string, string]; hills: [string, string]; cloud: string; cloudOpacity: number };

const STANDARD: Record<Sky, Palette> = {
  morning: { sky: ["#f2dcc0", "#f9ecda", "#f5ede0"], hills: ["#e2d4b8", "#d3c3a0"], cloud: "#fffaf2", cloudOpacity: 0.85 },
  day: { sky: ["#d9e6ec", "#eef2ee", "#f6f1e6"], hills: ["#d6dcc4", "#c3cbaa"], cloud: "#ffffff", cloudOpacity: 0.9 },
  dusk: { sky: ["#e6c0ae", "#f2d6bd", "#f4e6d4"], hills: ["#dcbfa4", "#c9a98a"], cloud: "#fbe7dc", cloudOpacity: 0.8 },
  night: { sky: ["#252d47", "#3f4562", "#6d6a7e"], hills: ["#343a54", "#272c42"], cloud: "#5c6180", cloudOpacity: 0.55 },
  overcast: { sky: ["#c9ced1", "#dcdcd7", "#ebe7de"], hills: ["#c4c7bc", "#b3b8ab"], cloud: "#eef0ef", cloudOpacity: 0.95 },
  storm: { sky: ["#8e959e", "#aeb2b3", "#cfcdc6"], hills: ["#a5a9a3", "#949992"], cloud: "#c4c8cc", cloudOpacity: 0.95 },
};

/* Cosmic keeps its obsidian: every sky is deep, and the weather is told in
   the light rather than by turning the deck pale. */
const COSMIC: Record<Sky, Palette> = {
  morning: { sky: ["#1b1a2b", "#2a2433", "#1a1820"], hills: ["#15141c", "#0f0e14"], cloud: "#3b3446", cloudOpacity: 0.55 },
  day: { sky: ["#132430", "#1d2b33", "#18181f"], hills: ["#13171c", "#0e1014"], cloud: "#2f3d47", cloudOpacity: 0.5 },
  dusk: { sky: ["#2a1b2c", "#33202d", "#1a1519"], hills: ["#171117", "#100c10"], cloud: "#4a3040", cloudOpacity: 0.5 },
  night: { sky: ["#0a0b14", "#141526", "#121119"], hills: ["#101019", "#0b0b11"], cloud: "#262840", cloudOpacity: 0.45 },
  overcast: { sky: ["#1d1f26", "#24252c", "#18181d"], hills: ["#141519", "#0f1013"], cloud: "#34353e", cloudOpacity: 0.7 },
  storm: { sky: ["#15161f", "#1e1c29", "#141318"], hills: ["#111117", "#0b0b10"], cloud: "#2c2a38", cloudOpacity: 0.8 },
};

type Particle = {
  x: number; y: number; vx: number; vy: number;
  size: number; rot: number; spin: number; phase: number; colour: number;
  life?: number; age?: number; kind?: "coin" | "bit";
  tx?: number; ty?: number; retarget?: number;
};

const LEAF_COLOURS = ["#d9822b", "#c0542b", "#e0a23a", "#a8642a", "#b7472e"];
const PETAL_COLOURS = ["#f4c3d2", "#f8d8e2", "#fbe9ee", "#efb1c5"];
const WINGS: Array<[string, string]> = [["#f29e38", "#3a2a1c"], ["#7fb2e5", "#2d4f73"], ["#f5dc6b", "#6b5a1c"], ["#e98ab3", "#6e2f4a"]];
const CONFETTI = ["#e8ce8c", "#4f6248", "#c2483a", "#3a8fb7", "#f4c3d2", "#f5dc6b"];

const random = (min: number, max: number) => min + Math.random() * (max - min);

export default function ShopAtmosphere({
  scene,
  cosmic,
  gustRef,
  celebrateKey,
}: {
  scene: Scene;
  cosmic: boolean;
  /** The stand adds a drag's horizontal speed here; the sky turns it into wind. */
  gustRef: MutableRefObject<number>;
  /** Changes once per purchase. */
  celebrateKey: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef<(() => void) | null>(null);
  const palette = (cosmic ? COSMIC : STANDARD)[scene.sky];
  /* The parent builds a new Scene object on every render; the sky restarts
     only when what it describes changes. */
  const sceneKey = JSON.stringify(scene);

  useEffect(() => {
    const scene = JSON.parse(sceneKey) as Scene;
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !box || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    let last = 0;
    let onScreen = true;
    let wind = 0;
    let clock = 0;
    let nextShootingStar = random(4, 9);
    let shootingStar: { x: number; y: number; age: number } | null = null;

    let falling: Particle[] = [];
    let drifting: Particle[] = [];
    let stars: Particle[] = [];
    let burst: Particle[] = [];
    let ripples: Array<{ x: number; y: number; age: number }> = [];

    const ground = () => height * 0.86;

    function seed() {
      const area = Math.max(0.6, Math.min(2.2, (width * height) / (350 * 320)));
      const n = (count: number) => Math.round(count * area);
      falling = [];
      drifting = [];
      stars = [];
      if (scene.precipitation === "rain" || scene.precipitation === "drizzle") {
        const count = n(scene.precipitation === "rain" ? 70 : 34);
        for (let i = 0; i < count; i += 1) {
          falling.push({ x: random(-20, width + 20), y: random(-height, height), vx: 0, vy: random(560, 860),
            size: random(scene.precipitation === "rain" ? 12 : 7, scene.precipitation === "rain" ? 22 : 12), rot: 0, spin: 0, phase: 0, colour: 0 });
        }
      } else if (scene.precipitation === "snow") {
        for (let i = 0; i < n(46); i += 1) {
          falling.push({ x: random(0, width), y: random(-height, height), vx: 0, vy: random(22, 55),
            size: random(1.3, 3.4), rot: 0, spin: 0, phase: random(0, 6.28), colour: 0 });
        }
      }
      const drifter = scene.drifter;
      const counts = { leaves: 18, petals: 20, butterflies: 5, fireflies: 14, motes: 26, none: 0 } as const;
      for (let i = 0; i < n(counts[drifter]); i += 1) {
        const p: Particle = {
          x: random(0, width), y: random(-height * 0.2, height), vx: 0, vy: 0,
          size: 0, rot: random(0, 6.28), spin: random(-1.6, 1.6), phase: random(0, 6.28), colour: Math.floor(random(0, 6)),
        };
        if (drifter === "leaves") { p.size = random(8, 13); p.vy = random(28, 52); }
        if (drifter === "petals") { p.size = random(4, 7); p.vy = random(20, 40); }
        if (drifter === "butterflies") {
          p.size = random(0.8, 1.15);
          p.y = random(height * 0.15, height * 0.7);
          p.tx = random(0, width); p.ty = random(height * 0.1, height * 0.75); p.retarget = random(1.5, 3.5);
          p.colour = i % WINGS.length;
        }
        if (drifter === "fireflies") { p.size = random(1.4, 2.4); p.y = random(height * 0.3, height * 0.9); }
        if (drifter === "motes") { p.size = random(0.7, 1.6); p.vy = random(-10, -4); }
        drifting.push(p);
      }
      if (scene.stars || cosmic) {
        for (let i = 0; i < n(cosmic && !scene.stars ? 30 : 60); i += 1) {
          stars.push({ x: random(0, width), y: random(0, height * 0.62), vx: 0, vy: 0,
            size: random(0.5, 1.5), rot: 0, spin: random(0.6, 2), phase: random(0, 6.28), colour: 0 });
        }
      }
    }

    function resize() {
      // Its size in layout, not on screen: the stand scales as one picture as the catalogue scrolls.
      // Soft shapes on a soft sky: 1.25 device pixels is indistinguishable and cheaper.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.max(1, box!.offsetWidth);
      const h = Math.max(1, box!.offsetHeight);
      if (w === width && h === height) return;
      const first = width === 0;
      width = w;
      height = h;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (first || falling.length + drifting.length + stars.length === 0) seed();
      if (reduced) draw(0);
    }

    function drawLeaf(p: Particle) {
      const s = p.size;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.scale(Math.cos(p.phase), 1);
      ctx!.fillStyle = LEAF_COLOURS[p.colour % LEAF_COLOURS.length];
      ctx!.beginPath();
      ctx!.moveTo(0, -s);
      ctx!.quadraticCurveTo(s * 0.95, -s * 0.15, 0, s);
      ctx!.quadraticCurveTo(-s * 0.95, -s * 0.15, 0, -s);
      ctx!.fill();
      ctx!.strokeStyle = "rgba(90,40,10,0.45)";
      ctx!.lineWidth = 0.8;
      ctx!.beginPath();
      ctx!.moveTo(0, -s * 0.85);
      ctx!.lineTo(0, s * 1.25);
      ctx!.stroke();
      ctx!.restore();
    }

    function drawPetal(p: Particle) {
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.scale(Math.cos(p.phase) * 0.9 + 0.1, 1);
      ctx!.fillStyle = PETAL_COLOURS[p.colour % PETAL_COLOURS.length];
      ctx!.beginPath();
      ctx!.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    }

    function drawButterfly(p: Particle, t: number) {
      const [wing, edge] = WINGS[p.colour % WINGS.length];
      const flap = 0.2 + 0.8 * Math.abs(Math.sin(t * 11 + p.phase));
      const heading = Math.atan2(p.vy, p.vx) + Math.PI / 2;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(heading);
      ctx!.scale(p.size, p.size);
      ctx!.fillStyle = cosmic ? `${wing}cc` : wing;
      ctx!.strokeStyle = edge;
      ctx!.lineWidth = 0.9;
      for (const side of [-1, 1]) {
        ctx!.beginPath();
        ctx!.ellipse(side * 5.5 * flap, -2.5, 5.5 * flap, 6.5, side * 0.45, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.ellipse(side * 4 * flap, 4.2, 4 * flap, 4.4, -side * 0.35, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.stroke();
      }
      ctx!.strokeStyle = "#2a1e16";
      ctx!.lineWidth = 1.6;
      ctx!.beginPath();
      ctx!.moveTo(0, -6);
      ctx!.lineTo(0, 7);
      ctx!.stroke();
      ctx!.lineWidth = 0.7;
      ctx!.beginPath();
      ctx!.moveTo(0, -6);
      ctx!.lineTo(-2.5, -10);
      ctx!.moveTo(0, -6);
      ctx!.lineTo(2.5, -10);
      ctx!.stroke();
      ctx!.restore();
    }

    /* A firefly's glow, painted once and stamped, rather than a new radial
       gradient for every firefly on every frame. */
    const glowSprite = document.createElement("canvas");
    glowSprite.width = glowSprite.height = 64;
    const sprite = glowSprite.getContext("2d");
    if (sprite) {
      const g = sprite.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,226,120,1)");
      g.addColorStop(1, "rgba(255,226,120,0)");
      sprite.fillStyle = g;
      sprite.fillRect(0, 0, 64, 64);
    }
    function glow(x: number, y: number, r: number, alpha: number) {
      if (alpha <= 0.01) return;
      ctx!.globalAlpha = alpha;
      ctx!.drawImage(glowSprite, x - r, y - r, r * 2, r * 2);
      ctx!.globalAlpha = 1;
    }

    function draw(dt: number) {
      clock += dt;
      const t = clock;
      ctx!.clearRect(0, 0, width, height);
      wind += gustRef.current;
      gustRef.current = 0;
      wind = Math.max(-420, Math.min(420, wind * Math.exp(-dt * 1.8)));

      for (const s of stars) {
        const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.spin + s.phase));
        ctx!.fillStyle = `rgba(255,250,235,${a * (scene.stars ? 1 : 0.5)})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      if ((scene.stars || cosmic) && !reduced) {
        nextShootingStar -= dt;
        if (nextShootingStar <= 0 && !shootingStar) {
          shootingStar = { x: random(width * 0.2, width * 0.9), y: random(height * 0.05, height * 0.3), age: 0 };
          nextShootingStar = random(6, 13);
        }
        if (shootingStar) {
          shootingStar.age += dt;
          const k = shootingStar.age / 0.8;
          const x = shootingStar.x - k * 160;
          const y = shootingStar.y + k * 70;
          const tail = ctx!.createLinearGradient(x, y, x + 60, y - 26);
          tail.addColorStop(0, `rgba(255,248,225,${0.9 * (1 - k)})`);
          tail.addColorStop(1, "rgba(255,248,225,0)");
          ctx!.strokeStyle = tail;
          ctx!.lineWidth = 1.4;
          ctx!.beginPath();
          ctx!.moveTo(x, y);
          ctx!.lineTo(x + 60, y - 26);
          ctx!.stroke();
          if (k >= 1) shootingStar = null;
        }
      }

      // What drifts.
      for (const p of drifting) {
        if (scene.drifter === "leaves" || scene.drifter === "petals") {
          p.phase += dt * (scene.drifter === "leaves" ? 2.2 : 3);
          p.rot += p.spin * dt;
          p.x += (Math.sin(t * 0.9 + p.phase) * 22 + wind * 0.5) * dt;
          p.y += p.vy * dt;
          if (p.y > height + 16) { p.y = -16; p.x = random(0, width); }
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (scene.drifter === "leaves") drawLeaf(p); else drawPetal(p);
        } else if (scene.drifter === "butterflies") {
          p.retarget = (p.retarget ?? 0) - dt;
          if (p.retarget <= 0) {
            p.tx = random(width * 0.05, width * 0.95);
            p.ty = random(height * 0.08, height * 0.72);
            p.retarget = random(1.8, 3.8);
          }
          const ax = ((p.tx ?? p.x) - p.x) * 0.9 + Math.sin(t * 3 + p.phase) * 40 + wind * 0.6;
          const ay = ((p.ty ?? p.y) - p.y) * 0.9 + Math.cos(t * 2.4 + p.phase) * 40;
          p.vx += ax * dt;
          p.vy += ay * dt;
          const speed = Math.hypot(p.vx, p.vy);
          const max = 70;
          if (speed > max) { p.vx *= max / speed; p.vy *= max / speed; }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          drawButterfly(p, t);
        } else if (scene.drifter === "fireflies") {
          p.x += (Math.sin(t * 0.7 + p.phase) * 14 + wind * 0.2) * dt;
          p.y += Math.cos(t * 0.5 + p.phase * 1.3) * 10 * dt;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          const a = Math.max(0, Math.sin(t * 1.6 + p.phase));
          glow(p.x, p.y, 10 * p.size, 0.55 * a);
          ctx!.fillStyle = `rgba(255,244,190,${0.9 * a})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        } else if (scene.drifter === "motes") {
          p.x += (Math.sin(t * 0.6 + p.phase) * 6 + wind * 0.15) * dt;
          p.y += p.vy * dt;
          if (p.y < -6) { p.y = height + 6; p.x = random(0, width); }
          const a = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.4 + p.phase));
          ctx!.fillStyle = cosmic ? `rgba(232,206,140,${a})` : `rgba(255,236,170,${a})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // What falls.
      if (scene.precipitation === "rain" || scene.precipitation === "drizzle") {
        const slant = (wind * 0.8 - 60) / 700;
        ctx!.strokeStyle = cosmic ? "rgba(160,220,255,0.45)" : "rgba(98,114,136,0.42)";
        ctx!.lineWidth = scene.precipitation === "rain" ? 1.1 : 0.8;
        ctx!.beginPath();
        for (const p of falling) {
          p.y += p.vy * dt;
          p.x += p.vy * slant * dt;
          if (p.y > ground() + random(-6, 10)) {
            if (ripples.length < 14 && Math.random() < 0.5 && p.x > width * 0.15 && p.x < width * 0.85) {
              ripples.push({ x: p.x, y: ground() + random(-4, 8), age: 0 });
            }
            p.y = random(-60, -10);
            p.x = random(-20, width + 20);
          }
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p.x - p.size * slant, p.y - p.size);
        }
        ctx!.stroke();
        ripples = ripples.filter(r => (r.age += dt) < 0.35);
        for (const r of ripples) {
          const k = r.age / 0.35;
          ctx!.strokeStyle = cosmic ? `rgba(160,220,255,${0.4 * (1 - k)})` : `rgba(98,114,136,${0.45 * (1 - k)})`;
          ctx!.beginPath();
          ctx!.ellipse(r.x, r.y, 3 + k * 9, 1 + k * 2.5, 0, 0, Math.PI * 2);
          ctx!.stroke();
        }
      } else if (scene.precipitation === "snow") {
        for (const p of falling) {
          p.phase += dt;
          p.y += p.vy * dt;
          p.x += (Math.sin(p.phase * 1.3) * 18 + wind * 0.7) * dt;
          if (p.y > height + 6) { p.y = -6; p.x = random(0, width); }
          if (p.x < -6) p.x = width + 6;
          if (p.x > width + 6) p.x = -6;
          ctx!.fillStyle = cosmic ? "rgba(225,240,255,0.85)" : "rgba(255,255,255,0.95)";
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
          if (!cosmic) {
            ctx!.strokeStyle = "rgba(120,130,145,0.3)";
            ctx!.lineWidth = 0.6;
            ctx!.stroke();
          }
        }
      }

      // A purchase.
      for (const p of burst) p.age = (p.age ?? 0) + dt;
      burst = burst.filter(p => (p.age ?? 0) < (p.life ?? 0));
      for (const p of burst) {
        const age = p.age ?? 0;
        const life = p.life ?? 1;
        p.vy += 520 * dt;
        p.vx *= Math.exp(-dt * 1.2);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        const fade = Math.min(1, (life - age) / 0.5);
        ctx!.save();
        ctx!.globalAlpha = fade;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        if (p.kind === "coin") {
          ctx!.fillStyle = "#d99445";
          ctx!.strokeStyle = "#8a4f16";
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.stroke();
          ctx!.fillStyle = "#fff4d6";
          ctx!.beginPath();
          ctx!.moveTo(p.size * 0.15, -p.size * 0.65);
          ctx!.lineTo(-p.size * 0.3, p.size * 0.1);
          ctx!.lineTo(p.size * 0.05, p.size * 0.1);
          ctx!.lineTo(-p.size * 0.15, p.size * 0.65);
          ctx!.lineTo(p.size * 0.35, -p.size * 0.12);
          ctx!.lineTo(0, -p.size * 0.12);
          ctx!.closePath();
          ctx!.fill();
        } else {
          ctx!.scale(Math.cos(p.phase + age * 9), 1);
          ctx!.fillStyle = scene.drifter === "leaves" ? LEAF_COLOURS[p.colour % LEAF_COLOURS.length]
            : scene.drifter === "petals" ? PETAL_COLOURS[p.colour % PETAL_COLOURS.length]
              : CONFETTI[p.colour % CONFETTI.length];
          ctx!.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        }
        ctx!.restore();
      }
    }

    burstRef.current = () => {
      if (reduced || !width) return;
      const cx = width * 0.5;
      const cy = height * 0.5;
      for (let i = 0; i < 46; i += 1) {
        const a = random(-Math.PI * 0.95, -Math.PI * 0.05);
        const speed = random(160, 430);
        burst.push({
          x: cx + random(-20, 20), y: cy + random(-10, 10),
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          size: random(2.5, 5), rot: random(0, 6.28), spin: random(-8, 8), phase: random(0, 6.28),
          colour: Math.floor(random(0, 6)), life: random(1.3, 2), age: 0,
          kind: i % 6 === 0 ? "coin" : "bit",
        });
        if (i % 6 === 0) burst[burst.length - 1].size = random(4.5, 6.5);
      }
      if (!raf) loop(performance.now());
    };

    /* Off screen, it looks again twice a second rather than stopping: an
       observer that reported "not visible" once, mid-layout, never speaks
       again if nothing moves, and the sky would stay frozen. */
    let idle = 0;
    const loop = (now: number) => {
      raf = 0;
      if (document.hidden) return;
      if (!onScreen) {
        idle = window.setTimeout(() => { if (!raf) raf = requestAnimationFrame(loop); }, 500);
        return;
      }
      /* Thirty frames a second: falling leaves and rain read the same, and
         on a phone it halves what the sky costs beside the 3D stand. Held
         entirely while the catalogue scrolls. */
      if (isScrolling(now) || (last && now - last < 30)) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, 1 / 15) : 1 / 30;
      last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    };

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    resizeObserver?.observe(box);
    const intersection = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(entries => {
          onScreen = entries.some(entry => entry.isIntersecting);
          if (onScreen && !reduced && !raf) { last = 0; raf = requestAnimationFrame(loop); }
        });
    intersection?.observe(box);
    const onVisibility = () => {
      if (!document.hidden && !reduced && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    };
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    // The first frame at once, so the sky is never empty while it starts.
    draw(reduced ? 0 : 1 / 60);
    if (!reduced) raf = requestAnimationFrame(loop);

    if (process.env.NODE_ENV === "development") {
      // For checking the sky from a script while the window is hidden.
      (window as unknown as { __shopSky?: unknown }).__shopSky = {
        counts: () => ({ width, height, falling: falling.length, drifting: drifting.length, stars: stars.length, drifter: scene.drifter }),
        draw: (frames = 1) => { for (let i = 0; i < frames; i += 1) draw(1 / 60); },
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      raf = 0;
      burstRef.current = null;
      resizeObserver?.disconnect();
      intersection?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sceneKey, cosmic, gustRef]);

  /* A purchase: once per change of the key, never on first paint. */
  const seenKey = useRef(celebrateKey);
  useEffect(() => {
    if (celebrateKey === seenKey.current) return;
    seenKey.current = celebrateKey;
    burstRef.current?.();
  }, [celebrateKey]);

  const sky = {
    "--sky-top": palette.sky[0],
    "--sky-mid": palette.sky[1],
    "--sky-low": palette.sky[2],
    "--hill-back": palette.hills[0],
    "--hill-front": palette.hills[1],
    "--cloud": palette.cloud,
    "--cloud-opacity": palette.cloudOpacity,
  } as CSSProperties;

  return (
    <div
      ref={boxRef}
      className={styles.atmosphere}
      style={sky}
      data-sky={scene.sky}
      data-cosmic={cosmic ? "true" : "false"}
      aria-hidden="true"
    >
      {scene.rays && <div className={styles.rays} />}
      {scene.sun && <div className={styles.sun} />}
      {scene.moon && <div className={styles.moon} />}
      {Array.from({ length: scene.clouds }, (_, i) => (
        <svg key={i} className={styles.cloud} data-cloud={i} viewBox="0 0 120 50">
          <path d="M18 44c-9 0-15-6-15-13s6-12 13-12c2-9 10-16 20-16 8 0 15 5 18 12 3-2 6-3 10-3 9 0 16 6 17 14 9 0 16 6 16 13 0 3-1 5-3 5Z" />
        </svg>
      ))}
      {scene.fog && (
        <>
          <div className={styles.fog} />
          <div className={styles.fog} data-second="" />
        </>
      )}
      <svg className={styles.hills} viewBox="0 0 400 120" preserveAspectRatio="none">
        <path className={styles.hillBack} d="M0 70C40 46 80 40 120 52s70 22 110 10 80-34 120-26 40 18 50 22V120H0Z" />
        <path className={styles.hillFront} d="M0 92c50-18 100-26 150-14s80 18 130 6 90-16 120-8V120H0Z" />
      </svg>
      <canvas ref={canvasRef} className={styles.particles} />
      <div className={styles.veil} />
      {scene.lightning && <div className={styles.lightning} />}
    </div>
  );
}
