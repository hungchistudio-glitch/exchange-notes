import * as THREE from "three";
import { buildCulturalPiece, buildCulturalScarf, CULTURAL_FINISHES } from "./culturalOutfit";
import {
  STATION33_BROW as BASE_BROW, STATION33_BUILDABLE, STATION33_CHARM as BASE_CHARM, STATION33_EARRINGS as BASE_EARRINGS, STATION33_EYEWEAR as BASE_EYEWEAR, STATION33_FINISHES as BASE_FINISHES,
  STATION33_HEAD as BASE_HEAD, STATION33_IRISES as BASE_IRISES, STATION33_MOUTH as BASE_MOUTH, STATION33_NECK as BASE_NECK, STATION33_NECKLACE as BASE_NECKLACE, STATION33_PIN as BASE_PIN, STATION33_PUPILS as BASE_PUPILS,
} from "./station33Outfit";
import { COLLECTION03_BROW, COLLECTION03_CHARM, COLLECTION03_EARRINGS, COLLECTION03_EYEWEAR, COLLECTION03_HEAD, COLLECTION03_IRISES, COLLECTION03_MOUTH, COLLECTION03_NECK, COLLECTION03_NECKLACE, COLLECTION03_PIN, COLLECTION03_PUPILS } from "./collection03Outfit";
import { COLLECTION03_FINISHES } from "./collection03Finishes";
import { COLLECTION04_BROW, COLLECTION04_CHARM, COLLECTION04_EARRINGS, COLLECTION04_EYEWEAR, COLLECTION04_HEAD, COLLECTION04_IRISES, COLLECTION04_MOUTH, COLLECTION04_NECK, COLLECTION04_NECKLACE, COLLECTION04_PIN, COLLECTION04_PUPILS } from "./collection04Outfit";
import { COLLECTION04_FINISHES } from "./collection04Finishes";
import { collectCollection03Motion, updateCollection03Motion } from "./collection03Motion";
import {
  MYTHIC_BROW, MYTHIC_BUILDABLE, MYTHIC_CHARM, MYTHIC_EARRINGS, MYTHIC_EYEWEAR, MYTHIC_FINISHES, MYTHIC_HEAD, MYTHIC_IRISES,
  MYTHIC_MOUTH, MYTHIC_NECK, MYTHIC_NECKLACE, MYTHIC_PIN, MYTHIC_PUPILS,
} from "./mythicOutfit";
import { CULTURAL_ITEMS } from "@/lib/shop/culturalCollection";

import { cleanOutfit, shopItem, type ShopSlot, type YumiOutfit } from "@/lib/shop/catalog";

import {
  bendToEye, brass, chain, chrome, clothBand, ellipseRing, extrude, feltTexture, glaze, group, heartPath, irisCap, irisTexture, lathe, mesh, paint, phys, radialShape, ringFrame, roundedRect, seeded, std, stripes, tail, taperedTube, tintedLens,
  SHELL_REPEAT, type NeckPiece, type Rand, type ShellFinish,
} from "./outfitKit";
import {
  ARM_RADIUS, EYE_RADIUS, GAP_HALF, SHELL_DEPTH, SHELL_RADIUS, TUBE_FRONT, TUBE_RADIUS,
  tubeCentre,
} from "./anatomy";

const STATION33_BROW = { ...BASE_BROW, ...COLLECTION03_BROW, ...COLLECTION04_BROW, ...MYTHIC_BROW };
const STATION33_CHARM = { ...BASE_CHARM, ...COLLECTION03_CHARM, ...COLLECTION04_CHARM, ...MYTHIC_CHARM };
const STATION33_EARRINGS = { ...BASE_EARRINGS, ...COLLECTION03_EARRINGS, ...COLLECTION04_EARRINGS, ...MYTHIC_EARRINGS };
const STATION33_EYEWEAR = { ...BASE_EYEWEAR, ...COLLECTION03_EYEWEAR, ...COLLECTION04_EYEWEAR, ...MYTHIC_EYEWEAR };
const STATION33_HEAD = { ...BASE_HEAD, ...COLLECTION03_HEAD, ...COLLECTION04_HEAD, ...MYTHIC_HEAD };
const STATION33_IRISES = { ...BASE_IRISES, ...COLLECTION03_IRISES, ...COLLECTION04_IRISES, ...MYTHIC_IRISES };
const STATION33_MOUTH = { ...BASE_MOUTH, ...COLLECTION03_MOUTH, ...COLLECTION04_MOUTH, ...MYTHIC_MOUTH };
const STATION33_NECK = { ...BASE_NECK, ...COLLECTION03_NECK, ...COLLECTION04_NECK, ...MYTHIC_NECK };
const STATION33_NECKLACE = { ...BASE_NECKLACE, ...COLLECTION03_NECKLACE, ...COLLECTION04_NECKLACE, ...MYTHIC_NECKLACE };
const STATION33_PIN = { ...BASE_PIN, ...COLLECTION03_PIN, ...COLLECTION04_PIN, ...MYTHIC_PIN };
const STATION33_PUPILS = { ...BASE_PUPILS, ...COLLECTION03_PUPILS, ...COLLECTION04_PUPILS, ...MYTHIC_PUPILS };
const STATION33_FINISHES = { ...BASE_FINISHES, ...COLLECTION03_FINISHES, ...COLLECTION04_FINISHES, ...MYTHIC_FINISHES };

/* =========================================================
   What Yumi wears

   Every piece in the shop (lib/shop/catalog.ts), built from primitives the
   way she is: no model files, nothing to download, and the same piece on
   the shop's stand, in its thumbnail and on the home screen.

   A piece is authored in its own small frame and put on at one of a few
   places that belong to her shape rather than to a body she does not have:

     head    on top of the shell, a little left of centre, upright
     neck    a band around the tube at the lower left
     pin     flat on the front face of the shell, upper left
     mouth   hanging from a brass collar at the tip of the lower jaw
     charm   hanging from a band under the shell, lower left
     eyewear in front of the eye, turning with her gaze but not her blink
     pupil   in place of the round pupil

   Shell materials are not pieces: they repaint the shell's own material, and
   the scene stops recolouring it for Cosmic while one is on (scene.ts). The
   lights still change with the mode; jade stays jade.

   Everything here is created per piece and disposed when it comes off, so
   trying on sixty things in a row leaves the GPU where it started.
   ========================================================= */

// ------------------------------------------------------------------ helpers


// ---------------------------------------------------------------- materials

const SHELL_FINISHES: Record<string, ShellFinish> = {
  ...CULTURAL_FINISHES,
  ...STATION33_FINISHES,
  jade: {
    color: 0xffffff, metalness: 0.02, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.08,
    map: () => paint(512, 256, 11, (ctx, rand, w, h) => {
      ctx.fillStyle = "#6c9a76";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 18 + rand() * 70;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const light = rand() > 0.45;
        g.addColorStop(0, light ? "rgba(172,208,170,0.55)" : "rgba(52,96,66,0.5)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.lineCap = "round";
      for (let i = 0; i < 16; i += 1) {
        ctx.strokeStyle = `rgba(226,240,220,${0.18 + rand() * 0.25})`;
        ctx.lineWidth = 0.8 + rand() * 1.6;
        ctx.beginPath();
        let x = rand() * w;
        let y = rand() * h;
        ctx.moveTo(x, y);
        for (let k = 0; k < 5; k += 1) {
          x += (rand() - 0.3) * 70;
          y += (rand() - 0.5) * 40;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }, SHELL_REPEAT),
  },
  celadon: {
    color: 0xffffff, metalness: 0, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06,
    map: () => paint(512, 256, 23, (ctx, rand, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#b6d2c6");
      g.addColorStop(1, "#9dbdb0");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Crackle: short random walks, joined like a glaze that has crazed.
      ctx.strokeStyle = "rgba(78,110,99,0.45)";
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 140; i += 1) {
        let x = rand() * w;
        let y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k += 1) {
          const a = rand() * Math.PI * 2;
          x += Math.cos(a) * (10 + rand() * 22);
          y += Math.sin(a) * (10 + rand() * 22);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }, SHELL_REPEAT),
  },
  terrazzo: {
    color: 0xffffff, metalness: 0, roughness: 0.42, clearcoat: 0.35,
    map: () => paint(512, 256, 37, (ctx, rand, w, h) => {
      ctx.fillStyle = "#efe6d8";
      ctx.fillRect(0, 0, w, h);
      const chips = ["#c2483a", "#d9826a", "#a9a39b", "#f8f4ec", "#8e3a2f", "#e3c9b2", "#4a4642"];
      for (let i = 0; i < 260; i += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 3 + rand() * (rand() > 0.85 ? 16 : 8);
        ctx.fillStyle = chips[Math.floor(rand() * chips.length) % chips.length];
        ctx.beginPath();
        const sides = 4 + Math.floor(rand() * 4);
        for (let k = 0; k < sides; k += 1) {
          const a = (k / sides) * Math.PI * 2 + rand() * 0.6;
          const rr = r * (0.6 + rand() * 0.5);
          if (k) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
      }
    }, SHELL_REPEAT),
  },
  denim: {
    color: 0xffffff, metalness: 0, roughness: 0.94,
    map: () => paint(512, 256, 41, (ctx, rand, w, h) => {
      ctx.fillStyle = "#2f4a72";
      ctx.fillRect(0, 0, w, h);
      // Twill: a diagonal weave, then wear, then two seams of orange thread.
      for (let i = -h; i < w; i += 3) {
        ctx.strokeStyle = i % 2 ? "rgba(92,122,168,0.55)" : "rgba(24,40,66,0.5)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
      }
      for (let i = 0; i < 26; i += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 20 + rand() * 50;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(190,210,235,0.16)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.strokeStyle = "#d98a3a";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 5]);
      for (const y of [h * 0.18, h * 0.24]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }, SHELL_REPEAT),
  },
  "brushed-silver": {
    color: 0xffffff, metalness: 0.95, roughness: 0.3, envMapIntensity: 1.1,
    map: () => paint(512, 256, 53, (ctx, rand, w, h) => {
      ctx.fillStyle = "#b9bfc4";
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 1) {
        ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,255,255" : "70,76,82"},${rand() * 0.12})`;
        ctx.fillRect(0, y, w, 1);
      }
    }, SHELL_REPEAT),
  },
  "cherry-enamel": { color: 0xa3192f, metalness: 0.08, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04 },
  porcelain: { color: 0xf3eee5, metalness: 0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 },
  "champagne-brass": { color: 0xd4bd8f, metalness: 0.9, roughness: 0.26, envMapIntensity: 1.15 },
  "burgundy-lacquer": { color: 0x5c1a2d, metalness: 0.12, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.05 },
  "amber-glass": {
    color: 0xffffff, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02,
    opacity: 0.88, emissive: 0x7a3f0a, emissiveIntensity: 0.25,
    map: () => paint(512, 256, 61, (ctx, rand, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#c27a1f");
      g.addColorStop(0.5, "#9c5814");
      g.addColorStop(1, "#d08a2a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      for (let i = 0; i < 22; i += 1) {
        ctx.strokeStyle = `rgba(255,226,160,${0.15 + rand() * 0.25})`;
        ctx.lineWidth = 2 + rand() * 6;
        ctx.beginPath();
        const y = rand() * h;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.3, y + (rand() - 0.5) * 120, w * 0.6, y + (rand() - 0.5) * 120, w, y);
        ctx.stroke();
      }
    }, SHELL_REPEAT),
  },
  "carrara-marble": {
    color: 0xffffff, metalness: 0, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.1,
    map: () => paint(512, 256, 71, (ctx, rand, w, h) => {
      ctx.fillStyle = "#eeede9";
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      for (let i = 0; i < 26; i += 1) {
        ctx.strokeStyle = `rgba(84,88,96,${0.4 + rand() * 0.45})`;
        ctx.lineWidth = 1 + rand() * (rand() > 0.75 ? 4.5 : 2);
        ctx.beginPath();
        let x = rand() * w;
        let y = rand() * h;
        ctx.moveTo(x, y);
        for (let k = 0; k < 7; k += 1) {
          const nx = x + 20 + rand() * 60;
          const ny = y + (rand() - 0.5) * 60;
          ctx.quadraticCurveTo((x + nx) / 2 + (rand() - 0.5) * 30, (y + ny) / 2, nx, ny);
          x = nx;
          y = ny;
        }
        ctx.stroke();
      }
    }, SHELL_REPEAT),
  },
  terracotta: {
    color: 0xffffff, metalness: 0, roughness: 0.92,
    map: () => paint(512, 256, 83, (ctx, rand, w, h) => {
      ctx.fillStyle = "#b8714f";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i += 1) {
        ctx.fillStyle = rand() > 0.5 ? "rgba(214,150,112,0.35)" : "rgba(120,62,38,0.3)";
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
      }
    }, SHELL_REPEAT),
  },
  trencadis: {
    color: 0xffffff, metalness: 0, roughness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.06,
    /* Half size: a nearest-cell pass over every pixel is the one costly
       texture here, and on a phone it ran once per wear and once per
       thumbnail. The tiles are large enough not to need the detail. */
    map: () => paint(256, 128, 97, (ctx, rand, w, h) => {
      // Broken tile: nearest-point cells, with grout where two cells meet.
      const points = Array.from({ length: 60 }, () => [rand() * w, rand() * h]);
      const palette = [[44, 88, 160], [243, 241, 234], [127, 168, 216], [36, 70, 132], [233, 194, 74]];
      const colours = points.map(() => palette[rand() > 0.93 ? 4 : Math.floor(rand() * 4)]);
      const image = ctx.createImageData(w, h);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          let best = Infinity;
          let second = Infinity;
          let index = 0;
          for (let i = 0; i < points.length; i += 1) {
            let dx = Math.abs(points[i][0] - x);
            dx = Math.min(dx, w - dx);
            let dy = Math.abs(points[i][1] - y);
            dy = Math.min(dy, h - dy);
            const d = dx * dx + dy * dy;
            if (d < best) { second = best; best = d; index = i; } else if (d < second) second = d;
          }
          const grout = Math.sqrt(second) - Math.sqrt(best) < 1.4;
          const c = grout ? [214, 210, 200] : colours[index];
          const o = (y * w + x) * 4;
          image.data[o] = c[0]; image.data[o + 1] = c[1]; image.data[o + 2] = c[2]; image.data[o + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    }, SHELL_REPEAT),
  },
  azulejo: {
    color: 0xffffff, metalness: 0, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.06,
    map: () => paint(512, 256, 101, (ctx, _rand, w, h) => {
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(0, 0, w, h);
      const size = 64;
      for (let ty = 0; ty < h; ty += size) {
        for (let tx = 0; tx < w; tx += size) {
          const cx = tx + size / 2;
          const cy = ty + size / 2;
          ctx.fillStyle = "#24519a";
          for (let k = 0; k < 4; k += 1) {
            const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
            ctx.beginPath();
            ctx.ellipse(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, 14, 8, a, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#24519a";
          for (const [x, y] of [[tx + 6, ty + 6], [tx + size - 6, ty + 6], [tx + 6, ty + size - 6], [tx + size - 6, ty + size - 6]]) {
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#e3b23c";
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#5f84bf";
          ctx.lineWidth = 3;
          for (const [x, y] of [[tx, ty], [tx + size, ty], [tx, ty + size], [tx + size, ty + size]]) {
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.strokeStyle = "rgba(120,130,140,0.4)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(tx, ty, size, size);
        }
      }
    }, [2, 1]),
  },
  "sun-brass": {
    color: 0xffffff, metalness: 0.9, roughness: 0.34, envMapIntensity: 1.15,
    map: () => paint(256, 128, 107, (ctx, rand, w, h) => {
      ctx.fillStyle = "#c2a158";
      ctx.fillRect(0, 0, w, h);
      // Hammered: soft dimples catching the light.
      for (let i = 0; i < 220; i += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 3 + rand() * 6;
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        g.addColorStop(0, "rgba(255,236,180,0.35)");
        g.addColorStop(1, "rgba(120,90,30,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, SHELL_REPEAT),
  },
};

export function isShellMaterial(id: string | undefined): boolean {
  return !!id && id in SHELL_FINISHES;
}

/** The shell as it ships: obsidian black, a little metal, a little gloss. */
const SHELL_DEFAULT = {
  color: 0x040507, metalness: 0.5, roughness: 0.4, envMapIntensity: 0.38,
};

export function applyShellFinish(material: THREE.MeshPhysicalMaterial, id: string | undefined) {
  const finish = id ? SHELL_FINISHES[id] : undefined;
  material.map?.dispose();
  material.map = finish?.map ? finish.map() : null;
  // One texture serves both channels, so it is disposed once.
  material.roughnessMap?.dispose();
  const surface = finish?.surface ? finish.surface() : null;
  material.roughnessMap = surface;
  material.metalnessMap = surface;
  material.color.set(finish ? finish.color : SHELL_DEFAULT.color);
  material.metalness = finish ? finish.metalness : SHELL_DEFAULT.metalness;
  material.roughness = finish ? finish.roughness : SHELL_DEFAULT.roughness;
  material.iridescence = finish?.iridescence ?? 0;
  material.sheen = finish?.sheen ?? 0;
  material.sheenColor.set(finish?.sheenColor ?? 0xffffff);
  material.sheenRoughness = finish?.sheenRoughness ?? 1;
  material.clearcoat = finish?.clearcoat ?? 0;
  material.clearcoatRoughness = finish?.clearcoatRoughness ?? 0;
  material.envMapIntensity = finish?.envMapIntensity ?? (finish ? 0.9 : SHELL_DEFAULT.envMapIntensity);
  material.emissive.set(finish?.emissive ?? 0x000000);
  material.emissiveIntensity = finish?.emissiveIntensity ?? 0;
  material.userData.finishOpacity = finish?.opacity ?? 1;
  material.opacity = finish?.opacity ?? 1;
  material.needsUpdate = true;
}

// ------------------------------------------------------------------ pupils

/* Pupils and irises live in the eye's look frame: they turn with her gaze
   and close with her blink. +Z is out through the middle of the eye, and
   the eyeball's surface there is at EYE_RADIUS. */


function pupilShape(id: string): THREE.Shape {
  if (id === "heart-pupil") return heartPath(new THREE.Shape()) as THREE.Shape;
  if (id === "star-pupil") return radialShape(10, i => (i % 2 ? 0.13 : 0.31));
  if (id === "moon-pupil") {
    /* A crescent: the outer circle's arc, then back along the inside of a
       second circle set off to the right. */
    const s = new THREE.Shape();
    const R = 0.29;
    const d = 0.15;
    const r = 0.25;
    const alpha = Math.acos((d * d + R * R - r * r) / (2 * d * R));
    const beta = Math.atan2(R * Math.sin(alpha), R * Math.cos(alpha) - d);
    s.moveTo(Math.cos(alpha) * R, Math.sin(alpha) * R);
    s.absarc(0, 0, R, alpha, Math.PI * 2 - alpha, false);
    s.absarc(d, 0, r, -beta, beta, true);
    return s;
  }
  if (id === "cat-pupil") {
    const s = new THREE.Shape();
    s.absellipse(0, 0, 0.075, 0.31, 0, Math.PI * 2, false, 0);
    return s;
  }
  // Five round petals: a plum blossom, not a star with soft corners.
  return radialShape(160, (_i, a) => 0.17 + 0.12 * Math.pow(Math.abs(Math.cos((a - Math.PI / 2) * 2.5)), 0.7));
}


function muranoTexture() {
  return paint(256, 256, 131, (ctx, _rand, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = w / 2;
    const g = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R);
    g.addColorStop(0, "#0f2c66");
    g.addColorStop(1, "#1d4fa8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Millefiori: two rings of glass flowers, the way a Murano cane is cut.
    const rings: Array<[number, number, string[]]> = [
      [0.62, 9, ["#c2483a", "#f4f1ea", "#e9c24a"]],
      [0.86, 13, ["#f4f1ea", "#3fa37a", "#e98aa8"]],
    ];
    for (const [rr, count, colours] of rings) {
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * Math.PI * 2;
        const x = cx + Math.cos(a) * R * rr;
        const y = cy + Math.sin(a) * R * rr;
        const size = R * (rr > 0.7 ? 0.1 : 0.12);
        ctx.fillStyle = colours[i % colours.length];
        for (let k = 0; k < 6; k += 1) {
          const b = (k / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x + Math.cos(b) * size * 0.55, y + Math.sin(b) * size * 0.55, size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#fff8e0";
        ctx.beginPath();
        ctx.arc(x, y, size * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

const IRISES: Record<string, () => THREE.Texture> = {
  "lake-iris": () => irisTexture(137, "#3a8fb7", "#123f58", "#bfe6f5"),
  "amber-iris": () => irisTexture(139, "#c98a2a", "#5e3408", "#f5d58a"),
  "violet-iris": () => irisTexture(149, "#8a5cc4", "#36205e", "#dcc6f4"),
  "jade-iris": () => irisTexture(151, "#3f8f5f", "#143f25", "#bfe6c9"),
  "murano-iris": muranoTexture,
};

function buildIris(id: string): THREE.Object3D {
  return group(irisCap(IRISES[id]()));
}

function star4Shape(outer: number, inner: number) {
  return radialShape(8, i => (i % 2 ? inner : outer));
}

function buildPupil(id: string): THREE.Object3D {
  const ink = std(id === "plum-pupil" ? 0x1e0f17 : 0x050505, 0.15, 0.08, { envMapIntensity: 0.6 });
  const g = group();

  if (id === "spiral-pupil") {
    // A spiral of ink laid on the curve of the eye: hypnotic, not flat.
    const points: THREE.Vector3[] = [];
    for (let t = 0; t <= Math.PI * 6; t += 0.08) {
      const r = 0.015 + 0.0145 * t;
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r;
      points.push(new THREE.Vector3(x, y, Math.sqrt(EYE_RADIUS * EYE_RADIUS - r * r) + 0.012));
    }
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 360, 0.024, 8), ink));
    return g;
  }

  if (id === "diamond-pupil") {
    // A sapphire-blue brilliant on a dark setting: a clear stone on a white eye disappears.
    const backing = mesh(new THREE.CircleGeometry(0.3, 48), std(0x0b1630, 0.2, 0.3), 0, 0, EYE_RADIUS * 0.985);
    const gem = phys(0x5fb4ea, {
      metalness: 0.2, roughness: 0.02, clearcoat: 1, flatShading: true, envMapIntensity: 2.6,
      emissive: 0x15406b, emissiveIntensity: 0.45,
    });
    const crown = new THREE.CylinderGeometry(0.13, 0.25, 0.08, 8);
    crown.rotateX(Math.PI / 2);
    const pavilion = new THREE.ConeGeometry(0.25, 0.14, 8);
    pavilion.rotateX(-Math.PI / 2);
    const top = mesh(crown, gem, 0, 0, EYE_RADIUS * 1.06);
    const bottom = mesh(pavilion, gem, 0, 0, EYE_RADIUS * 0.98);
    top.rotation.z = bottom.rotation.z = Math.PI / 8;
    g.add(backing, top, bottom);
    return g;
  }

  if (id === "clover-pupil") {
    const leaf = glaze(0x1f5a2c, 0.12);
    for (let k = 0; k < 4; k += 1) {
      // Each leaf a heart, tip at the centre.
      const heart = heartPath(new THREE.Shape(), 0.52, 0, 0.27 * 0.52) as THREE.Shape;
      const m = mesh(extrude(heart, 0.05, 0.012, 24), leaf, 0, 0, EYE_RADIUS * 0.98);
      m.rotation.z = (k / 4) * Math.PI * 2 + Math.PI / 4;
      g.add(m);
    }
    g.add(mesh(new THREE.SphereGeometry(0.035, 12, 10), leaf, 0, 0, EYE_RADIUS * 1.04));
    return g;
  }

  if (id === "sparkle-pupil") {
    const disc = new THREE.Shape();
    disc.absarc(0, 0, 0.3, 0, Math.PI * 2, false);
    g.add(mesh(extrude(disc, 0.05, 0.015, 48), std(0x0c1430, 0.2, 0.08, { envMapIntensity: 0.7 }), 0, 0, EYE_RADIUS * 0.97));
    const shine = std(0xffffff, 0, 0.2, { emissive: 0xffffff, emissiveIntensity: 0.8 });
    for (const [x, y, size] of [[-0.11, 0.1, 0.13], [0.12, -0.12, 0.07]] as const) {
      g.add(mesh(extrude(star4Shape(size, size * 0.28), 0.01, 0.004, 8), shine, x, y, EYE_RADIUS * 1.04));
    }
    const dot = mesh(new THREE.CircleGeometry(0.03, 16), shine, 0.1, 0.13, EYE_RADIUS * 1.04);
    g.add(dot);
    return g;
  }

  const geometry = extrude(pupilShape(id), 0.07, 0.018, 32);
  g.add(mesh(geometry, ink, 0, 0, EYE_RADIUS * 0.97));
  if (id === "plum-pupil") {
    // The stamen: a bead of brass in the middle of the blossom.
    g.add(mesh(new THREE.SphereGeometry(0.05, 16, 12), brass(), 0, 0, EYE_RADIUS * 1.04));
  }
  if (id === "cat-pupil") {
    // A cat's eye brings its own yellow-green iris, laid just above any other.
    g.add(irisCap(irisTexture(157, "#b6c43a", "#4d5a10", "#eef3a0"), 1.009));
  }
  return g;
}

// ----------------------------------------------------------------- eyewear

function buildMonocle(): THREE.Object3D {
  const metal = brass();
  const rim = mesh(new THREE.TorusGeometry(0.5, 0.045, 14, 72), metal, 0, 0, 0.72);
  const lens = mesh(
    new THREE.CircleGeometry(0.48, 48),
    phys(0xffffff, { roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.12, depthWrite: false }),
    0, 0, 0.74,
  );
  const hinge = mesh(new THREE.SphereGeometry(0.06, 14, 10), metal, -0.34, -0.36, 0.72);
  const links = chain([
    new THREE.Vector3(-0.36, -0.38, 0.72),
    new THREE.Vector3(-0.55, -0.75, 0.6),
    new THREE.Vector3(-0.62, -1.05, 0.42),
    new THREE.Vector3(-0.78, -1.2, 0.3),
  ], metal, 0.03);
  return group(rim, lens, hinge, links);
}

function buildVenetianMask(): THREE.Object3D {
  const outline = new THREE.Shape();
  outline.moveTo(-0.9, 0.1);
  outline.bezierCurveTo(-0.85, 0.5, -0.35, 0.62, 0, 0.5);
  outline.bezierCurveTo(0.35, 0.62, 0.85, 0.5, 0.9, 0.1);
  outline.bezierCurveTo(0.8, -0.35, 0.35, -0.55, 0, -0.42);
  outline.bezierCurveTo(-0.35, -0.55, -0.8, -0.35, -0.9, 0.1);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, 0.43, 0.42, 0, Math.PI * 2, false, 0);
  outline.holes.push(hole);

  const geometry = extrude(outline, 0.04, 0.012, 48);
  // Curve it round the eye, so it reads as a mask and not a sign.
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    position.setZ(i, position.getZ(i) - 0.32 * (x * x) - 0.12 * (y * y));
  }
  geometry.computeVertexNormals();

  const face = mesh(geometry, std(0xd4b062, 0.85, 0.3, { envMapIntensity: 1.2 }), 0, 0, 0.7);

  const trimPoints = outline.getSpacedPoints(80).map(p =>
    new THREE.Vector3(p.x, p.y, 0.72 - 0.32 * p.x * p.x - 0.12 * p.y * p.y));
  const trim = mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trimPoints, true), 160, 0.022, 6, true),
    std(0x7d1f33, 0.3, 0.35),
  );

  const jewel = mesh(new THREE.SphereGeometry(0.07, 18, 12), glaze(0xb3122d, 0.05), 0, 0.5, 0.66);

  const featherShape = new THREE.Shape();
  featherShape.moveTo(0, 0);
  featherShape.bezierCurveTo(0.14, 0.2, 0.16, 0.55, 0.02, 0.85);
  featherShape.bezierCurveTo(-0.1, 0.55, -0.1, 0.2, 0, 0);
  const featherMaterial = std(0x6b2c6e, 0, 0.7, { side: THREE.DoubleSide });
  const feathers = group();
  for (const [x, rot, scale, color] of [[0.62, -0.5, 1, 0x6b2c6e], [0.72, -0.85, 0.8, 0x2d2a54]] as const) {
    const m = mesh(extrude(featherShape, 0.01, 0.004), color === 0x6b2c6e ? featherMaterial : std(color, 0, 0.7), x, 0.38, 0.55);
    m.rotation.z = rot;
    m.scale.setScalar(scale);
    feathers.add(m);
  }
  return group(face, trim, jewel, feathers);
}


function buildRoundGlasses(): THREE.Object3D {
  const acetate = glaze(0x2a2522, 0.18);
  const rim = mesh(new THREE.TorusGeometry(0.5, 0.055, 16, 72), acetate, 0, 0, 0.74);
  const lens = mesh(new THREE.CircleGeometry(0.48, 48), tintedLens(0xffffff, 0.1), 0, 0, 0.76);
  const hinge = mesh(new THREE.BoxGeometry(0.1, 0.07, 0.06), acetate, -0.53, 0.06, 0.72);
  const temple = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.56, 0.06, 0.7), new THREE.Vector3(-0.8, 0.08, 0.45), new THREE.Vector3(-0.92, 0.04, 0.1),
  ]), 24, 0.025, 8), acetate);
  const pins = [-0.38, 0.38].map(x => mesh(new THREE.SphereGeometry(0.022, 10, 8), brass(), x, 0.3, 0.77));
  return group(rim, lens, hinge, temple, ...pins);
}

function buildCatEyeGlasses(): THREE.Object3D {
  const outline = new THREE.Shape();
  outline.moveTo(-0.62, 0.02);
  outline.bezierCurveTo(-0.62, -0.38, -0.2, -0.56, 0.12, -0.5);
  outline.bezierCurveTo(0.5, -0.44, 0.66, -0.2, 0.68, 0.06);
  outline.bezierCurveTo(0.74, 0.22, 0.86, 0.38, 0.92, 0.52);
  outline.bezierCurveTo(0.6, 0.5, 0.3, 0.5, 0, 0.47);
  outline.bezierCurveTo(-0.36, 0.45, -0.62, 0.36, -0.62, 0.02);
  const hole = new THREE.Path();
  hole.absellipse(0.02, 0, 0.45, 0.42, 0, Math.PI * 2, false, 0);
  outline.holes.push(hole);
  const frame = mesh(bendToEye(extrude(outline, 0.05, 0.014, 48), 0.22, 0.08), glaze(0x1c1a1b, 0.12), 0, 0, 0.75);
  const lens = mesh(new THREE.CircleGeometry(0.44, 48), tintedLens(0xf3d6dc, 0.14), 0.02, 0, 0.76);
  const stones = group();
  for (const [x, y] of [[0.84, 0.44], [0.74, 0.36], [0.64, 0.3]] as const) {
    stones.add(mesh(new THREE.SphereGeometry(0.03, 12, 8), brass(), x, y, 0.75 - 0.22 * x * x + 0.04));
  }
  return group(frame, lens, stones);
}

function buildAviatorShades(): THREE.Object3D {
  const outline = new THREE.Shape();
  outline.moveTo(-0.5, 0.3);
  outline.bezierCurveTo(-0.2, 0.36, 0.25, 0.36, 0.52, 0.28);
  outline.bezierCurveTo(0.62, 0.05, 0.5, -0.36, 0.18, -0.5);
  outline.bezierCurveTo(-0.08, -0.6, -0.48, -0.42, -0.56, -0.08);
  outline.bezierCurveTo(-0.6, 0.1, -0.56, 0.24, -0.5, 0.3);
  const lens = mesh(new THREE.ShapeGeometry(outline, 32), tintedLens(0x1f2a24, 0.74), 0, 0, 0.78);
  const gold = brass();
  const wire = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    outline.getSpacedPoints(80).map(p => new THREE.Vector3(p.x, p.y, 0.78)), true), 160, 0.018, 6, true), gold);
  const bar = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.7, 8), gold, -0.12, 0.42, 0.77);
  bar.rotation.z = Math.PI / 2;
  const temple = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.56, 0.28, 0.76), new THREE.Vector3(-0.82, 0.3, 0.5), new THREE.Vector3(-0.92, 0.22, 0.12),
  ]), 24, 0.016, 6), gold);
  return group(lens, wire, bar, temple);
}

function buildHeartShades(): THREE.Object3D {
  const outline = heartPath(new THREE.Shape(), 2.35, 0, 0.05) as THREE.Shape;
  const hole = heartPath(new THREE.Path(), 1.85, 0, 0.06);
  outline.holes.push(hole as THREE.Path);
  const frame = mesh(bendToEye(extrude(outline, 0.05, 0.014, 48), 0.2, 0.08), glaze(0xc1272d, 0.15), 0, 0, 0.76);
  const lensShape = heartPath(new THREE.Shape(), 1.9, 0, 0.06) as THREE.Shape;
  const lens = mesh(new THREE.ShapeGeometry(lensShape, 32), tintedLens(0xe2627a, 0.42), 0, 0, 0.78);
  return group(frame, lens);
}

function buildPiratePatch(): THREE.Object3D {
  const outline = new THREE.Shape();
  outline.absellipse(0, -0.02, 0.5, 0.43, 0, Math.PI * 2, false, 0.15);
  const leather = std(0x151515, 0.1, 0.62);
  const patch = mesh(bendToEye(extrude(outline, 0.04, 0.014, 48), 0.5, 0.4), leather, 0, 0, 0.78);
  const stitch = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    outline.getSpacedPoints(64).map(p => new THREE.Vector3(p.x * 0.88, p.y * 0.88 - 0.002, 0.81 - 0.5 * (p.x * 0.88) ** 2 - 0.4 * (p.y * 0.88) ** 2)), true),
    128, 0.008, 4, true), std(0x5a5550, 0, 0.7));
  const straps = group();
  for (const [x0, y0, x1, y1] of [[-0.36, 0.28, -0.98, 0.72], [0.4, 0.26, 0.98, 0.62]] as const) {
    const a = new THREE.Vector3(x0, y0, 0.72);
    const b = new THREE.Vector3(x1, y1, 0.28);
    const strap = mesh(new THREE.BoxGeometry(0.06, a.distanceTo(b), 0.015), leather);
    strap.position.copy(a).add(b).multiplyScalar(0.5);
    strap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    straps.add(strap);
  }
  return group(patch, stitch, straps);
}

function buildLongLashes(): THREE.Object3D {
  const ink = std(0x111111, 0.1, 0.4);
  const g = group();
  const count = 7;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const a = THREE.MathUtils.degToRad(35 + 110 * t);
    const length = 0.2 + 0.08 * Math.sin(Math.PI * t);
    const root = new THREE.Vector3(Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0);
    root.z = Math.sqrt(EYE_RADIUS * EYE_RADIUS - root.x * root.x - root.y * root.y);
    const out = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    const curve = new THREE.QuadraticBezierCurve3(
      root,
      root.clone().addScaledVector(out, length * 0.6).add(new THREE.Vector3(0, 0, 0.12)),
      root.clone().addScaledVector(out, length).add(new THREE.Vector3(0, length * 0.45, 0.08)),
    );
    g.add(mesh(taperedTube(curve, u => 0.02 * (1 - u * 0.75), 16, 8), ink));
  }
  return g;
}

// -------------------------------------------------------------------- head


function buildBeret(): THREE.Object3D {
  const felt = std(0xffffff, 0, 0.96, { map: feltTexture(5, "#3c3a3b", "#8a8789") });
  const crown = mesh(new THREE.SphereGeometry(0.8, 48, 24), felt, 0, 0.1, 0);
  crown.scale.set(1, 0.36, 1);
  const band = mesh(new THREE.TorusGeometry(0.5, 0.07, 12, 56), std(0x2b2a2b, 0, 0.9), 0, -0.02, 0);
  band.rotation.x = Math.PI / 2;
  const stalk = mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.13, 12), felt, 0, 0.43, 0);
  const g = group(crown, band, stalk);
  g.rotation.set(0.06, 0, -0.2);
  return g;
}

function buildBaseballCap(): THREE.Object3D {
  const cloth = std(0x26344f, 0, 0.85);
  const crown = mesh(new THREE.SphereGeometry(0.55, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), cloth);
  crown.scale.set(1.08, 0.9, 1.12);
  // Six panels, by their seams.
  const seams = group();
  for (let i = 0; i < 3; i += 1) {
    const seam = mesh(new THREE.TorusGeometry(0.552, 0.007, 6, 48, Math.PI), std(0x1b253a, 0, 0.8));
    seam.rotation.y = (i / 3) * Math.PI;
    seam.scale.set(1.08, 0.9, 1.12);
    seams.add(seam);
  }
  const button = mesh(new THREE.SphereGeometry(0.05, 14, 10), cloth, 0, 0.5, 0);
  const brimShape = new THREE.Shape();
  brimShape.absellipse(0, 0, 0.56, 0.46, 0, Math.PI, false, 0);
  const brim = mesh(extrude(brimShape, 0.03, 0.012), std(0x1f2b42, 0, 0.8), 0, 0.03, 0.46);
  brim.rotation.x = Math.PI / 2 + 0.12;
  brim.scale.set(1, 1, 1);
  const g = group(crown, seams, button, brim);
  g.rotation.y = 0.25;
  return g;
}

function buildSteamerHat(): THREE.Object3D {
  const slats = paint(512, 64, 7, (ctx, rand, w, h) => {
    ctx.fillStyle = "#d9b77c";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) {
      ctx.fillStyle = `rgba(150,110,52,${0.25 + rand() * 0.2})`;
      ctx.fillRect(x, 0, 1.4, h);
    }
  }, [2, 1]);
  const weave = paint(256, 256, 9, (ctx, _rand, w, h) => {
    ctx.fillStyle = "#e0c086";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(140,98,44,0.55)";
    ctx.lineWidth = 2;
    for (let i = -h; i < w; i += 12) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke();
    }
  });
  const bamboo = std(0xffffff, 0, 0.7, { map: slats, side: THREE.DoubleSide });
  const walls = mesh(new THREE.CylinderGeometry(0.6, 0.62, 0.3, 56, 1, true), bamboo, 0, 0.15, 0);
  const lid = mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.05, 56), [
    std(0xc9a46a, 0, 0.7), std(0xffffff, 0, 0.75, { map: weave }), std(0xc9a46a, 0, 0.7),
  ], 0, 0.32, 0);
  const rimMaterial = std(0xb8925a, 0, 0.6);
  const rimTop = mesh(new THREE.TorusGeometry(0.63, 0.035, 10, 64), rimMaterial, 0, 0.3, 0);
  rimTop.rotation.x = Math.PI / 2;
  const rimBottom = mesh(new THREE.TorusGeometry(0.62, 0.035, 10, 64), rimMaterial, 0, 0.02, 0);
  rimBottom.rotation.x = Math.PI / 2;
  const red = glaze(0xc0262d, 0.3);
  const knot = mesh(new THREE.SphereGeometry(0.06, 14, 10), red, 0.42, 0.14, 0.46);
  const tassel = mesh(new THREE.ConeGeometry(0.05, 0.22, 12), std(0xc0262d, 0, 0.8), 0.42, -0.02, 0.46);
  tassel.rotation.z = Math.PI;
  return group(walls, lid, rimTop, rimBottom, knot, tassel);
}

function buildHeadphones(): THREE.Object3D {
  const metal = chrome();
  const band = mesh(new THREE.TorusGeometry(0.64, 0.045, 12, 64, Math.PI), metal, 0, -0.08, 0);
  band.rotation.y = Math.PI / 2;
  const pad = mesh(new THREE.TorusGeometry(0.66, 0.06, 12, 40, Math.PI * 0.5), std(0x2b2b2e, 0, 0.6), 0, -0.08, 0);
  pad.rotation.set(0, Math.PI / 2, Math.PI * 0.25);
  const cups = group();
  for (const side of [1, -1]) {
    const shellMat = std(0x2f3033, 0.3, 0.45);
    const cup = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.14, 40), shellMat, 0, -0.32, 0.68 * side);
    cup.rotation.x = Math.PI / 2;
    const rim = mesh(new THREE.TorusGeometry(0.27, 0.025, 10, 48), metal, 0, -0.32, 0.75 * side);
    const cushion = mesh(new THREE.TorusGeometry(0.2, 0.075, 14, 40), std(0x1c1c1e, 0, 0.75), 0, -0.32, 0.58 * side);
    const yoke = mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 32, Math.PI), metal, 0, -0.32, 0.68 * side);
    yoke.rotation.set(0, Math.PI / 2, 0);
    cups.add(cup, rim, cushion, yoke);
  }
  return group(band, pad, cups);
}

function buildHairComb(): THREE.Object3D {
  const s = new THREE.Shape();
  s.moveTo(-0.46, 0);
  s.bezierCurveTo(-0.5, 0.35, -0.3, 0.72, 0, 0.8);
  s.bezierCurveTo(0.3, 0.72, 0.5, 0.35, 0.46, 0);
  s.lineTo(-0.46, 0);
  // Pierced work: a rosette and a ring of drops.
  const holes: Array<[number, number, number]> = [
    [0, 0.42, 0.11], [-0.24, 0.3, 0.06], [0.24, 0.3, 0.06], [-0.13, 0.6, 0.05], [0.13, 0.6, 0.05],
    [-0.32, 0.12, 0.045], [0.32, 0.12, 0.045], [0, 0.17, 0.05],
  ];
  for (const [x, y, r] of holes) {
    const h = new THREE.Path();
    h.absarc(x, y, r, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  const shell = paint(256, 256, 13, (ctx, rand, w, h) => {
    ctx.fillStyle = "#3b2418";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i += 1) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 8 + rand() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(201,128,52,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
  shell.repeat.set(1.2, 1.2);
  const tortoise = phys(0xffffff, { map: shell, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  const plate = mesh(extrude(s, 0.035, 0.01, 32), tortoise);
  const teeth = group();
  for (let i = 0; i < 9; i += 1) {
    teeth.add(mesh(new THREE.BoxGeometry(0.035, 0.26, 0.03), tortoise, -0.4 + i * 0.1, -0.12, 0));
  }
  const g = group(plate, teeth);
  g.position.set(0.05, 0, -0.18);
  g.rotation.x = -0.18;
  return g;
}

// -------------------------------------------------------------------- neck


function buildSilkScarf(): NeckPiece {
  const silk = phys(0xffffff, {
    map: stripes(17, "#7d1f33", "#efe3cf", 34, 8, 1), roughness: 0.42, sheen: 1, sheenColor: 0xffd9e0, sheenRoughness: 0.5,
    side: THREE.DoubleSide,
  });
  const band = clothBand(silk, 0.34, 0.05);
  const knot = mesh(new THREE.SphereGeometry(0.14, 20, 14), silk);
  knot.scale.set(1.2, 0.9, 0.7);
  const left = tail(0.62, 0.22, silk);
  left.rotation.set(-0.35, 0, 0.42);
  const right = tail(0.5, 0.2, silk);
  right.rotation.set(-0.3, 0, -0.32);
  right.position.x = 0.04;
  return { band, front: group(knot, left, right) };
}

function buildLeatherStrap(): NeckPiece {
  const leather = phys(0x7a4a2a, { roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const band = clothBand(leather, 0.2, 0.035);
  const thread = std(0xe8dcc0, 0, 0.8);
  const stitches = group();
  for (const z of [-0.075, 0.075]) {
    const s = ellipseRing(TUBE_RADIUS + 0.06, TUBE_FRONT + 0.06, 0.006, thread);
    s.position.z = z;
    stitches.add(s);
  }
  const frameShape = roundedRect(0.28, 0.32, 0.05);
  const inner = roundedRect(0.18, 0.22, 0.03);
  frameShape.holes.push(new THREE.Path(inner.getPoints()));
  const metal = brass();
  const buckle = mesh(extrude(frameShape, 0.03, 0.01), metal, 0, 0, 0.02);
  const prong = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 8), metal, 0, 0, 0.05);
  prong.rotation.z = Math.PI / 2;
  const bandGroup = group(band, stitches);
  return { band: bandGroup, front: group(buckle, prong) };
}

function buildSilkKnot(): NeckPiece {
  const silk = phys(0xffffff, {
    map: stripes(19, "#5f7046", "#7b8c5c", 18, 4, 0.4), roughness: 0.4, sheen: 1, sheenColor: 0xe6f0c8, sheenRoughness: 0.45,
    side: THREE.DoubleSide,
  });
  const band = clothBand(silk, 0.24, 0.045);
  const loops = group();
  for (const side of [-1, 1]) {
    const loop = mesh(new THREE.TorusGeometry(0.12, 0.045, 10, 28), silk, 0.14 * side, 0.02, 0);
    loop.scale.set(1.25, 0.75, 0.5);
    loop.rotation.z = 0.35 * side;
    loops.add(loop);
  }
  const centre = mesh(new THREE.SphereGeometry(0.075, 16, 12), silk, 0, 0, 0.03);
  const left = tail(0.34, 0.12, silk);
  left.rotation.set(-0.2, 0, 0.25);
  const right = tail(0.3, 0.12, silk);
  right.rotation.set(-0.2, 0, -0.3);
  return { band, front: group(loops, centre, left, right) };
}

// --------------------------------------------------------------------- pins

function buildOrchidClip(): THREE.Object3D {
  const petal = phys(0xe2b2e6, { roughness: 0.35, sheen: 1, sheenColor: 0xffffff, clearcoat: 0.3 });
  const sepal = phys(0xcf94d8, { roughness: 0.4, sheen: 0.8, sheenColor: 0xffffff });
  const parts: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const p = mesh(new THREE.SphereGeometry(0.16, 24, 16), petal, 0.15 * side, 0.03, 0.02);
    p.scale.set(1, 0.92, 0.18);
    parts.push(p);
    const s = mesh(new THREE.SphereGeometry(0.12, 20, 14), sepal, 0.1 * side, -0.14, 0);
    s.scale.set(0.55, 1.1, 0.16);
    s.rotation.z = 0.7 * side;
    parts.push(s);
  }
  const top = mesh(new THREE.SphereGeometry(0.12, 20, 14), sepal, 0, 0.17, 0);
  top.scale.set(0.6, 1.1, 0.16);
  const lip = mesh(new THREE.SphereGeometry(0.075, 18, 12), glaze(0xa0306f, 0.3), 0, -0.06, 0.06);
  lip.scale.set(1, 0.85, 0.6);
  const column = mesh(new THREE.SphereGeometry(0.035, 12, 10), std(0xf6eed8, 0, 0.4), 0, 0.03, 0.07);
  const pollen = mesh(new THREE.SphereGeometry(0.02, 10, 8), std(0xf2c230, 0, 0.4), 0, 0.0, 0.09);
  const clip = mesh(new THREE.BoxGeometry(0.42, 0.06, 0.03), brass(), 0, 0, -0.04);
  return group(...parts, top, lip, column, pollen, clip);
}

function buildLavenderBrooch(): THREE.Object3D {
  const stem = std(0x6f8a52, 0, 0.7);
  const buds = [std(0x8f7bc0, 0, 0.6), std(0x7461ab, 0, 0.6), std(0xa894d4, 0, 0.6)];
  const budGeometry = new THREE.SphereGeometry(0.03, 10, 8);
  const g = group();
  for (const [angle, length] of [[-0.32, 0.5], [0, 0.58], [0.3, 0.52]] as const) {
    const sprig = group();
    sprig.rotation.z = angle;
    sprig.add(mesh(new THREE.CylinderGeometry(0.01, 0.012, length, 6), stem, 0, length / 2, 0));
    for (let i = 0; i < 11; i += 1) {
      const y = length * 0.55 + i * (length * 0.045);
      const side = i % 2 ? 1 : -1;
      const b = mesh(budGeometry, buds[i % 3], 0.022 * side, y, 0.01 * (i % 3));
      b.scale.set(1, 1.5, 1);
      sprig.add(b);
    }
    g.add(sprig);
  }
  const ribbon = std(0xf1e6cf, 0, 0.6);
  for (const side of [-1, 1]) {
    const loop = mesh(new THREE.SphereGeometry(0.06, 16, 10), ribbon, 0.06 * side, 0.1, 0.03);
    loop.scale.set(1.2, 0.6, 0.35);
    loop.rotation.z = 0.5 * side;
    const end = mesh(new THREE.SphereGeometry(0.04, 12, 8), ribbon, 0.035 * side, 0.03, 0.03);
    end.scale.set(0.5, 1.4, 0.3);
    end.rotation.z = -0.4 * side;
    g.add(loop, end);
  }
  g.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), ribbon, 0, 0.08, 0.04));
  g.position.y = -0.28;
  return group(g);
}

function buildLemonBrooch(): THREE.Object3D {
  const peel = glaze(0xf0d241, 0.25);
  const lemon = mesh(new THREE.SphereGeometry(0.17, 32, 20), peel);
  lemon.scale.set(1.25, 0.9, 0.7);
  const tips = [-1, 1].map(side => mesh(new THREE.SphereGeometry(0.045, 12, 10), peel, 0.21 * side, 0, 0));
  const leaf = mesh(new THREE.SphereGeometry(0.1, 20, 12), glaze(0x4f8a3c, 0.3), -0.1, 0.16, 0.03);
  leaf.scale.set(1.5, 0.5, 0.18);
  leaf.rotation.z = 0.5;
  const blossom = group();
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    const p = mesh(new THREE.SphereGeometry(0.03, 10, 8), std(0xfbf7ee, 0, 0.5), Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0);
    p.scale.z = 0.4;
    blossom.add(p);
  }
  blossom.add(mesh(new THREE.SphereGeometry(0.015, 8, 6), std(0xe8b923, 0, 0.5), 0, 0, 0.012));
  blossom.position.set(0.06, 0.17, 0.06);
  return group(lemon, ...tips, leaf, blossom);
}

function buildSunBrooch(): THREE.Object3D {
  const gold = brass();
  const disc = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 48), glaze(0xe7a531, 0.2));
  disc.rotation.x = Math.PI / 2;
  const ring = mesh(new THREE.TorusGeometry(0.165, 0.022, 10, 48), gold);
  const centre = mesh(new THREE.SphereGeometry(0.08, 20, 14), glaze(0xd2491f, 0.2), 0, 0, 0.03);
  centre.scale.z = 0.5;
  const rays = group();
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    const long = i % 2 === 0;
    const ray = mesh(new THREE.ConeGeometry(0.045, long ? 0.17 : 0.11, 8), gold);
    const r = 0.18 + (long ? 0.085 : 0.055);
    ray.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    ray.rotation.z = a - Math.PI / 2;
    ray.scale.z = 0.4;
    rays.add(ray);
  }
  return group(disc, ring, centre, rays);
}

// ------------------------------------------------------------------- mouth

/* Mouth pieces and charms hang: their origin is where they are held, and
   they fall away below it. */

function buildBubbleTea(): THREE.Object3D {
  const plastic = phys(0xffffff, { roughness: 0.05, transparent: true, opacity: 0.26, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const cup = mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.6, 40, 1, true), plastic, 0, -0.42, 0);
  const tea = mesh(new THREE.CylinderGeometry(0.205, 0.18, 0.4, 40), std(0xcfa47c, 0, 0.35), 0, -0.36, 0);
  // The pearls sit in the bottom of the cup, against the plastic, where they can be seen.
  const syrup = mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.15, 32), std(0x7a4a2a, 0, 0.3), 0, -0.64, 0);
  const pearls = group();
  const pearl = glaze(0x231612, 0.15);
  const pearlGeometry = new THREE.SphereGeometry(0.042, 12, 10);
  for (const [y, count, offset] of [[-0.68, 12, 0], [-0.6, 12, 0.26]] as const) {
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + offset;
      pearls.add(mesh(pearlGeometry, pearl, Math.cos(a) * 0.135, y, Math.sin(a) * 0.135));
    }
  }
  const rim = mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 48), plastic, 0, -0.12, 0);
  rim.rotation.x = Math.PI / 2;
  const lid = mesh(new THREE.SphereGeometry(0.22, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), plastic, 0, -0.12, 0);
  lid.scale.y = 0.4;
  const straw = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.7, 12), std(0x161616, 0, 0.3), 0.06, -0.1, 0);
  straw.rotation.z = -0.18;
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), -0.2, -0.16, 0);
  const g = group(cup, tea, syrup, pearls, rim, lid, straw, loop);
  g.position.x = 0.2;
  return group(g);
}

function buildPineappleCake(): THREE.Object3D {
  const top = paint(256, 256, 29, (ctx, _rand, w, h) => {
    ctx.fillStyle = "#e0ad5c";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(150,90,30,0.65)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.58, w * 0.18, h * 0.24, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath(); ctx.moveTo(w / 2 + i * 18 - 40, h * 0.36); ctx.lineTo(w / 2 + i * 18 + 40, h * 0.82); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2 + i * 18 + 40, h * 0.36); ctx.lineTo(w / 2 + i * 18 - 40, h * 0.82); ctx.stroke();
    }
    ctx.lineWidth = 5;
    for (const dx of [-24, 0, 24]) {
      ctx.beginPath(); ctx.moveTo(w / 2, h * 0.34); ctx.lineTo(w / 2 + dx, h * 0.14); ctx.stroke();
    }
  });
  top.repeat.set(2.2, 2.2);
  top.offset.set(0.5, 0.5);
  const crust = std(0xd59a49, 0, 0.6);
  const face = std(0xffffff, 0, 0.55, { map: top });
  const cake = mesh(extrude(roundedRect(0.44, 0.44, 0.07), 0.16, 0.035, 12), [face, crust], 0.08, -0.36, 0);
  cake.rotation.set(0.25, -0.35, 0.12);
  const loop = mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 20), brass(), -0.14, -0.12, 0);
  return group(cake, loop);
}

function buildSoupDumpling(): THREE.Object3D {
  const geometry = new THREE.SphereGeometry(0.22, 64, 32);
  const p = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 1) {
    v.fromBufferAttribute(p, i);
    const t = Math.max(0, v.y / 0.22);
    const a = Math.atan2(v.z, v.x);
    const pleat = 1 + 0.08 * Math.sin(a * 16) * t;
    const pinch = 1 - 0.55 * t * t;
    v.x *= pleat * pinch;
    v.z *= pleat * pinch;
    v.y = v.y < -0.12 ? -0.12 : v.y * (1 + 0.25 * t);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  const dough = phys(0xf1dfc0, { roughness: 0.5, sheen: 0.6, sheenColor: 0xffffff });
  const dumpling = mesh(geometry, dough, 0.12, -0.32, 0.04);
  const porcelain = glaze(0x9fc2b3, 0.15);
  const bowl = mesh(new THREE.SphereGeometry(0.26, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), porcelain, 0.12, -0.4, 0);
  bowl.scale.set(1.15, 0.45, 0.9);
  (bowl.material as THREE.Material).side = THREE.DoubleSide;
  const handle = mesh(new THREE.BoxGeometry(0.34, 0.045, 0.07), porcelain, -0.18, -0.3, 0);
  handle.rotation.z = -0.5;
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), -0.32, -0.18, 0);
  return group(dumpling, bowl, handle, loop);
}

function sesame(target: THREE.Object3D, count: number, place: (rand: Rand) => THREE.Vector3, seed: number) {
  const hull = std(0xf5ecd2, 0, 0.6);
  const geometry = new THREE.SphereGeometry(0.012, 6, 4);
  const rand = seeded(seed);
  for (let i = 0; i < count; i += 1) {
    const m = mesh(geometry, hull);
    m.position.copy(place(rand));
    m.scale.set(1, 1.8, 0.6);
    m.rotation.z = rand() * Math.PI;
    target.add(m);
  }
}

function buildBagel(): THREE.Object3D {
  const crust = glaze(0xc98d4a, 0.45);
  const ring = mesh(new THREE.TorusGeometry(0.21, 0.11, 24, 48), crust, 0.12, -0.32, 0);
  ring.scale.z = 0.8;
  sesame(ring, 46, rand => {
    const a = rand() * Math.PI * 2;
    const b = (rand() - 0.5) * 1.6;
    return new THREE.Vector3(
      Math.cos(a) * (0.21 + Math.sin(b) * 0.11),
      Math.sin(a) * (0.21 + Math.sin(b) * 0.11),
      Math.cos(b) * 0.11 + 0.003,
    );
  }, 5);
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), 0.12, -0.04, 0);
  return group(ring, loop);
}

function buildPretzel(): THREE.Object3D {
  const pts = [
    [-0.24, -0.02, 0], [-0.3, 0.12, 0.02], [-0.2, 0.24, 0.03], [-0.05, 0.16, 0.05],
    [0.05, 0.0, 0.07], [0.14, -0.16, 0.03], [0.24, -0.16, 0], [0.26, -0.02, -0.02],
    [0.18, 0.14, 0.0], [0.05, 0.18, 0.03], [-0.04, 0.02, 0.06], [-0.12, -0.16, 0.03],
    [-0.22, -0.18, 0], [-0.26, -0.08, 0], [-0.24, -0.02, 0],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
  const dough = glaze(0x7e4520, 0.35);
  const pretzel = mesh(new THREE.TubeGeometry(curve, 200, 0.055, 12, true), dough, 0.12, -0.34, 0);
  const salt = std(0xffffff, 0, 0.3);
  const rand = seeded(17);
  const saltGeometry = new THREE.BoxGeometry(0.018, 0.018, 0.018);
  for (let i = 0; i < 26; i += 1) {
    const point = curve.getPointAt(rand());
    const grain = mesh(saltGeometry, salt, point.x, point.y + 0.03, point.z + 0.045);
    grain.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    pretzel.add(grain);
  }
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), 0.06, -0.06, 0);
  return group(pretzel, loop);
}

function buildPancakes(): THREE.Object3D {
  const g = group();
  const cake = std(0xd59a52, 0, 0.6);
  const edge = std(0xecc98c, 0, 0.7);
  for (let i = 0; i < 3; i += 1) {
    const c = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.065, 40), [edge, cake, cake], 0, i * 0.07, 0);
    g.add(c);
  }
  const syrup = mesh(new THREE.SphereGeometry(0.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    phys(0x9a4f12, { roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.8 }), 0, 0.17, 0);
  syrup.scale.y = 0.12;
  const butter = mesh(new THREE.BoxGeometry(0.09, 0.05, 0.09), std(0xf5dd8a, 0, 0.4), 0.02, 0.21, 0.02);
  butter.rotation.y = 0.4;
  const plate = mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.025, 48), glaze(0xf7f4ee, 0.15), 0, -0.045, 0);
  g.add(syrup, butter, plate);
  g.position.set(0.18, -0.42, 0);
  g.rotation.set(0.55, 0, 0.1);
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), -0.06, -0.12, 0);
  return group(g, loop);
}

function buildCroissant(): THREE.Object3D {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.32, -0.1, 0), new THREE.Vector3(-0.2, 0.06, 0.02), new THREE.Vector3(0, 0.12, 0.04),
    new THREE.Vector3(0.2, 0.06, 0.02), new THREE.Vector3(0.32, -0.1, 0),
  ]);
  // Fat in the middle, horns at the ends, and the rolled layers as ridges.
  const geometry = taperedTube(curve, t => {
    const body = 0.03 + 0.14 * Math.pow(Math.sin(Math.PI * t), 0.85);
    const ridge = 1 - 0.13 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2 * 5));
    return body * ridge;
  }, 96, 28);
  geometry.scale(1, 1, 0.82);
  const croissant = mesh(geometry, glaze(0xc77f36, 0.42), 0.2, -0.36, 0);
  croissant.rotation.z = 0.25;
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), 0.0, -0.06, 0);
  return group(croissant, loop);
}

function buildBaguette(): THREE.Object3D {
  const crust = glaze(0xc98b45, 0.5);
  const bread = mesh(new THREE.CapsuleGeometry(0.075, 0.72, 8, 20), crust);
  const scores = group();
  for (let i = 0; i < 4; i += 1) {
    const s = mesh(new THREE.SphereGeometry(0.05, 12, 8), std(0xe9c48c, 0, 0.7), 0.045, -0.24 + i * 0.16, 0.05);
    s.scale.set(0.45, 1.5, 0.4);
    s.rotation.z = 0.5;
    scores.add(s);
  }
  const sleeveTex = paint(256, 128, 31, (ctx, _rand, w, h) => {
    ctx.fillStyle = "#efe4cf";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#284a8c"; ctx.fillRect(0, h * 0.55, w, 6);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, h * 0.55 + 6, w, 6);
    ctx.fillStyle = "#c2263a"; ctx.fillRect(0, h * 0.55 + 12, w, 6);
  });
  const sleeve = mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.36, 24, 1, true), std(0xffffff, 0, 0.85, { map: sleeveTex, side: THREE.DoubleSide }), 0, -0.2, 0);
  const g = group(bread, scores, sleeve);
  g.position.set(0.22, -0.42, 0.02);
  g.rotation.z = 0.5;
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), 0.0, -0.06, 0);
  return group(g, loop);
}

function buildMacarons(): THREE.Object3D {
  const g = group();
  const colours = [0xe9a7b8, 0xb7d38a, 0xb8a3dc];
  colours.forEach((colour, i) => {
    const shell = phys(colour, { roughness: 0.55, sheen: 0.4, sheenColor: 0xffffff });
    const m = group();
    for (const side of [-1, 1]) {
      const half = mesh(new THREE.SphereGeometry(0.14, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.035 * side, 0);
      half.scale.y = 0.5 * side;
      m.add(half);
      // The ruffled foot at each shell's rim.
      const foot = mesh(new THREE.TorusGeometry(0.135, 0.016, 8, 32), shell, 0, 0.03 * side, 0);
      foot.rotation.x = Math.PI / 2;
      m.add(foot);
    }
    m.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 28), std(0xfaf3e6, 0, 0.6)));
    m.position.set(0.06 * i, -0.17 * i, 0.03 * i);
    m.rotation.set(0.38, 0, 0.12 - i * 0.12);
    g.add(m);
  });
  g.position.set(0.16, -0.24, 0);
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), -0.04, -0.06, 0);
  return group(g, loop);
}

function cupAndSaucer(cupColour: THREE.ColorRepresentation, coffee: THREE.ColorRepresentation, small: boolean) {
  const porcelain = glaze(0xf7f4ee, 0.12);
  const outer = small ? glaze(cupColour, 0.18) : porcelain;
  const k = small ? 0.78 : 1;
  const cup = mesh(lathe([[0.001, 0], [0.11 * k, 0], [0.15 * k, 0.04], [0.18 * k, 0.16 * k], [0.19 * k, 0.24 * k], [0.18 * k, 0.24 * k], [0.17 * k, 0.16 * k], [0.14 * k, 0.05], [0.001, 0.05]]), outer);
  (cup.material as THREE.Material).side = THREE.DoubleSide;
  const surface = mesh(new THREE.CircleGeometry(0.168 * k, 32), std(coffee, 0, 0.2), 0, 0.2 * k, 0);
  surface.rotation.x = -Math.PI / 2;
  const rim = mesh(new THREE.TorusGeometry(0.188 * k, 0.008, 6, 48), brass(), 0, 0.24 * k, 0);
  rim.rotation.x = Math.PI / 2;
  const handle = mesh(new THREE.TorusGeometry(0.07 * k, 0.018, 8, 20, Math.PI * 1.3), outer, 0.2 * k, 0.12 * k, 0);
  handle.rotation.z = -Math.PI * 0.65;
  const saucer = mesh(lathe([[0.001, -0.02], [0.18, -0.02], [0.3, 0.02], [0.31, 0.03], [0.001, 0.0]]), porcelain);
  const saucerRim = mesh(new THREE.TorusGeometry(0.305, 0.007, 6, 64), brass(), 0, 0.028, 0);
  saucerRim.rotation.x = Math.PI / 2;
  return group(cup, surface, rim, handle, saucer, saucerRim);
}

function buildCafeCup(): THREE.Object3D {
  const g = cupAndSaucer(0xffffff, 0x3a2215, false);
  g.position.set(0.2, -0.4, 0);
  g.rotation.set(0.45, -0.3, 0.08);
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), -0.08, -0.12, 0);
  return group(g, loop);
}

function buildEspresso(): THREE.Object3D {
  const g = cupAndSaucer(0x5a3522, 0xb98552, true);
  const spoon = mesh(new THREE.BoxGeometry(0.22, 0.01, 0.03), chrome(), 0.12, 0.035, 0.16);
  spoon.rotation.y = -0.5;
  g.add(spoon);
  g.position.set(0.2, -0.38, 0);
  g.rotation.set(0.45, -0.3, 0.08);
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), -0.08, -0.12, 0);
  return group(g, loop);
}

function buildGelato(): THREE.Object3D {
  const waffle = paint(128, 128, 43, (ctx, _rand, w, h) => {
    ctx.fillStyle = "#d9a65d";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(140,90,40,0.7)";
    ctx.lineWidth = 3;
    for (let i = -h; i < w + h; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke();
    }
  });
  waffle.repeat.set(3, 2);
  const cone = mesh(new THREE.ConeGeometry(0.16, 0.46, 32, 1, true), std(0xffffff, 0, 0.7, { map: waffle, side: THREE.DoubleSide }), 0, -0.55, 0);
  cone.rotation.z = Math.PI;
  const scoop = mesh(new THREE.SphereGeometry(0.19, 32, 20), phys(0xb2cb86, { roughness: 0.6, sheen: 0.5, sheenColor: 0xffffff }), 0, -0.26, 0);
  scoop.scale.y = 0.9;
  const lip = mesh(new THREE.TorusGeometry(0.16, 0.04, 10, 32), scoop.material as THREE.Material, 0, -0.33, 0);
  lip.rotation.x = Math.PI / 2;
  const nuts = group();
  const rand = seeded(47);
  for (let i = 0; i < 10; i += 1) {
    const a = rand() * Math.PI * 2;
    const b = rand() * 1.1;
    nuts.add(mesh(new THREE.BoxGeometry(0.025, 0.02, 0.02), std(0x6f9a3c, 0, 0.6),
      Math.cos(a) * Math.sin(b) * 0.18, -0.26 + Math.cos(b) * 0.17, Math.sin(a) * Math.sin(b) * 0.18));
  }
  const wafer = mesh(new THREE.BoxGeometry(0.05, 0.22, 0.02), std(0xe8c27c, 0, 0.6), 0.09, -0.08, 0.05);
  wafer.rotation.z = -0.35;
  const g = group(cone, scoop, lip, nuts, wafer);
  g.position.x = 0.16;
  g.rotation.z = 0.12;
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), 0.0, -0.06, 0);
  return group(g, loop);
}

function buildPastaTwirl(): THREE.Object3D {
  const steel = chrome();
  const fork = group();
  fork.add(mesh(new THREE.BoxGeometry(0.05, 0.42, 0.015), steel, 0, 0.21, 0));
  for (let i = 0; i < 4; i += 1) {
    fork.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), steel, -0.03 + i * 0.02, -0.08, 0));
  }
  const noodle = std(0xead07a, 0, 0.45);
  const rand = seeded(53);
  const nest = group();
  for (let i = 0; i < 9; i += 1) {
    const r = mesh(new THREE.TorusGeometry(0.09 + rand() * 0.05, 0.016, 8, 40), noodle, 0, -0.1 + (rand() - 0.5) * 0.06, 0);
    r.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.7, rand(), (rand() - 0.5) * 0.7);
    nest.add(r);
  }
  for (let i = 0; i < 3; i += 1) {
    const x = (rand() - 0.5) * 0.16;
    const strand = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, -0.14, 0.05),
      new THREE.Vector3(x + 0.04, -0.24, 0.07),
      new THREE.Vector3(x - 0.02, -0.34, 0.05),
      new THREE.Vector3(x + 0.03, -0.42, 0.03),
    ]);
    nest.add(mesh(new THREE.TubeGeometry(strand, 20, 0.014, 6), noodle));
  }
  const sauce = mesh(new THREE.SphereGeometry(0.07, 16, 10), glaze(0xb3261e, 0.3), 0.03, -0.04, 0.08);
  sauce.scale.set(1, 0.5, 0.6);
  const basil = mesh(new THREE.SphereGeometry(0.05, 12, 8), glaze(0x3f7a32, 0.4), -0.05, -0.02, 0.1);
  basil.scale.set(1.4, 0.4, 0.8);
  fork.add(nest, sauce, basil);
  fork.position.set(0.18, -0.42, 0);
  fork.rotation.z = 0.25;
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), 0.0, -0.06, 0);
  return group(fork, loop);
}

function buildFlamencoFan(): THREE.Object3D {
  const g = group();
  const red = std(0xc1272d, 0, 0.55, { side: THREE.DoubleSide });
  const dark = std(0x8e1a20, 0, 0.6, { side: THREE.DoubleSide });
  const pleats = 14;
  const spread = Math.PI * 0.95;
  for (let i = 0; i < pleats; i += 1) {
    const a0 = Math.PI / 2 - spread / 2 + (i / pleats) * spread;
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * 0.1, Math.sin(a0) * 0.1);
    s.absarc(0, 0, 0.55, a0, a0 + spread / pleats, false);
    s.lineTo(Math.cos(a0 + spread / pleats) * 0.1, Math.sin(a0 + spread / pleats) * 0.1);
    s.closePath();
    const pleat = mesh(new THREE.ShapeGeometry(s, 4), i % 2 ? red : dark);
    pleat.rotation.y = (i % 2 ? 1 : -1) * 0.08;
    g.add(pleat);
  }
  const lace = mesh(new THREE.TorusGeometry(0.55, 0.018, 6, 64, spread), std(0x151515, 0, 0.7));
  lace.rotation.z = Math.PI / 2 - spread / 2;
  const guards = group();
  for (const a of [Math.PI / 2 - spread / 2, Math.PI / 2 + spread / 2]) {
    const stick = mesh(new THREE.BoxGeometry(0.03, 0.56, 0.02), std(0x5a3520, 0, 0.5), Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0.01);
    stick.rotation.z = a - Math.PI / 2;
    guards.add(stick);
  }
  const rivet = mesh(new THREE.SphereGeometry(0.035, 12, 8), brass(), 0, 0, 0.02);
  g.add(lace, guards, rivet);
  g.scale.setScalar(0.85);
  g.position.set(0.18, -0.52, 0.02);
  g.rotation.z = 0.25;
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), 0.05, -0.08, 0);
  return group(g, loop);
}

function buildChurros(): THREE.Object3D {
  const dough = glaze(0xb9772f, 0.5);
  const sugar = std(0xfbf6ea, 0, 0.4);
  const sugarGeometry = new THREE.BoxGeometry(0.012, 0.012, 0.012);
  const rand = seeded(29);
  const g = group();
  [-0.07, 0.02, 0.11].forEach((x, i) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, -0.66, 0),
      new THREE.Vector3(x + 0.02, -0.42, 0.02),
      new THREE.Vector3(x + 0.05 + i * 0.03, -0.14, 0),
    ]);
    // A star nozzle's ridges, and a rounded end.
    const geometry = taperedTube(curve, (t, a) =>
      0.046 * (0.78 + 0.22 * Math.cos(a * 6)) * Math.min(1, (1 - t) * 14 + 0.02), 48, 36);
    g.add(mesh(geometry, dough));
    for (let k = 0; k < 14; k += 1) {
      const p = curve.getPointAt(0.35 + rand() * 0.6);
      const grain = mesh(sugarGeometry, sugar, p.x + (rand() - 0.5) * 0.06, p.y, p.z + 0.04);
      grain.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      g.add(grain);
    }
  });
  const cup = mesh(lathe([[0.001, 0], [0.12, 0], [0.15, 0.2], [0.14, 0.2], [0.11, 0.02], [0.001, 0.02]]), glaze(0x6b3b22, 0.2), 0.02, -0.75, 0);
  (cup.material as THREE.Material).side = THREE.DoubleSide;
  const chocolate = mesh(new THREE.CircleGeometry(0.14, 24), glaze(0x2e140a, 0.1), 0.02, -0.57, 0);
  chocolate.rotation.x = -Math.PI / 2;
  g.add(cup, chocolate);
  g.position.x = 0.16;
  g.scale.setScalar(0.9);
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), 0.14, -0.08, 0);
  return group(g, loop);
}

function buildOliveTapas(): THREE.Object3D {
  const dish = mesh(lathe([[0.001, 0], [0.2, 0], [0.27, 0.06], [0.28, 0.08], [0.26, 0.08], [0.2, 0.025], [0.001, 0.025]]), glaze(0xb8673f, 0.35));
  (dish.material as THREE.Material).side = THREE.DoubleSide;
  const olive = glaze(0x6b7a34, 0.2);
  const pimento = glaze(0xc4281f, 0.3);
  const g = group(dish);
  const spots: Array<[number, number]> = [[0, 0], [0.11, 0.04], [-0.1, 0.06], [0.05, -0.11], [-0.07, -0.1], [0.14, -0.07], [-0.14, -0.03]];
  spots.forEach(([x, z], i) => {
    const o = mesh(new THREE.SphereGeometry(0.06, 16, 12), olive, x, 0.07 + (i === 0 ? 0.04 : 0), z);
    o.scale.set(1, 0.8, 0.8);
    o.rotation.y = i;
    g.add(o);
    if (i % 3 === 0) g.add(mesh(new THREE.SphereGeometry(0.022, 10, 8), pimento, x + 0.05, 0.08 + (i === 0 ? 0.04 : 0), z));
  });
  const pick = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), std(0xe8d3a8, 0, 0.7), 0, 0.2, 0);
  pick.rotation.z = 0.3;
  g.add(pick);
  g.position.set(0.2, -0.4, 0);
  g.rotation.set(0.85, 0, 0.12);
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), -0.04, -0.1, 0);
  return group(g, loop);
}

function buildPaellaPan(): THREE.Object3D {
  const steel = std(0x2e2d2b, 0.7, 0.4);
  const pan = mesh(lathe([[0.001, 0], [0.26, 0], [0.32, 0.05], [0.33, 0.06], [0.31, 0.06], [0.25, 0.012], [0.001, 0.012]]), steel);
  (pan.material as THREE.Material).side = THREE.DoubleSide;
  const riceTex = paint(256, 256, 59, (ctx, rand, w, h) => {
    ctx.fillStyle = "#e4b440";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i += 1) {
      ctx.fillStyle = rand() > 0.5 ? "rgba(255,226,140,0.7)" : "rgba(196,128,32,0.5)";
      ctx.save();
      ctx.translate(rand() * w, rand() * h);
      ctx.rotate(rand() * Math.PI);
      ctx.fillRect(-3, -1, 6, 2.5);
      ctx.restore();
    }
  });
  const rice = mesh(new THREE.CircleGeometry(0.3, 40), std(0xffffff, 0, 0.8, { map: riceTex }), 0, 0.045, 0);
  rice.rotation.x = -Math.PI / 2;
  const g = group(pan, rice);
  const shrimp = glaze(0xe8754a, 0.3);
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const s = mesh(new THREE.TorusGeometry(0.05, 0.022, 8, 16, Math.PI * 1.3), shrimp, Math.cos(a) * 0.17, 0.07, Math.sin(a) * 0.17);
    s.rotation.set(-Math.PI / 2, 0, a);
    g.add(s);
  }
  for (let i = 0; i < 2; i += 1) {
    const a = (i / 2) * Math.PI * 2 + 1.4;
    const m = mesh(new THREE.SphereGeometry(0.05, 14, 10), std(0x1d1f2b, 0.3, 0.3), Math.cos(a) * 0.12, 0.06, Math.sin(a) * 0.12);
    m.scale.set(1.5, 0.45, 0.8);
    m.rotation.y = a;
    g.add(m);
  }
  const lemon = mesh(new THREE.SphereGeometry(0.06, 14, 10, 0, Math.PI), glaze(0xf2d440, 0.3), 0, 0.07, 0);
  lemon.scale.set(1.3, 0.6, 1);
  g.add(lemon);
  const peas = std(0x5d9a3a, 0, 0.5);
  const rand = seeded(61);
  for (let i = 0; i < 12; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.25;
    g.add(mesh(new THREE.SphereGeometry(0.016, 8, 6), peas, Math.cos(a) * r, 0.055, Math.sin(a) * r));
  }
  for (const side of [-1, 1]) {
    const handle = mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 20, Math.PI), steel, 0.35 * side, 0.05, 0);
    handle.rotation.set(Math.PI / 2, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    g.add(handle);
  }
  g.position.set(0.22, -0.4, 0);
  g.rotation.set(0.95, 0, 0.12);
  g.scale.setScalar(0.92);
  const loop = mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), brass(), -0.08, -0.1, 0);
  return group(g, loop);
}

// ------------------------------------------------------------------ charms

function buildMarketBag(): THREE.Object3D {
  const pattern = paint(256, 256, 67, (ctx, _rand, w, h) => {
    const colours = ["#c8473f", "#f4f1ea", "#2f6fb0", "#f4f1ea", "#3b8a4f", "#f4f1ea"];
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = colours[i % colours.length];
      ctx.fillRect(0, (i * h) / 16, w, h / 16 + 1);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    for (let x = 0; x < w; x += 4) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  });
  const bag = mesh(new THREE.BoxGeometry(0.5, 0.4, 0.16), std(0xffffff, 0, 0.85, { map: pattern }), 0, -0.38, 0);
  const red = std(0xc8473f, 0, 0.6);
  const handles = group();
  for (const z of [-0.06, 0.06]) {
    const h = mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 32, Math.PI), red, 0, -0.18, z);
    handles.add(h);
  }
  return group(bag, handles);
}

function buildTeapotCharm(): THREE.Object3D {
  const celadon = glaze(0x9fc2b3, 0.15);
  const body = mesh(new THREE.SphereGeometry(0.2, 32, 20), celadon, 0, -0.34, 0);
  body.scale.set(1.15, 0.85, 1.15);
  const lid = mesh(new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), celadon, 0, -0.19, 0);
  lid.scale.y = 0.5;
  const knob = mesh(new THREE.SphereGeometry(0.035, 12, 10), celadon, 0, -0.13, 0);
  const spout = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.18, -0.38, 0), new THREE.Vector3(0.28, -0.32, 0), new THREE.Vector3(0.34, -0.22, 0),
  ]), 12, 0.03, 10), celadon);
  const handle = mesh(new THREE.TorusGeometry(0.09, 0.022, 8, 20, Math.PI * 1.2), celadon, -0.22, -0.33, 0);
  handle.rotation.z = Math.PI * 0.4;
  const flower = mesh(new THREE.CircleGeometry(0.05, 5), std(0xf4f1ea, 0, 0.5), 0, -0.34, 0.235);
  return group(body, lid, knob, spout, handle, flower);
}

function buildSkyLantern(): THREE.Object3D {
  const paperTexture = paint(256, 256, 113, (ctx, rand, w, h) => {
    const glow = ctx.createLinearGradient(0, 0, 0, h);
    glow.addColorStop(0, "#a8281c");
    glow.addColorStop(0.55, "#e0583e");
    glow.addColorStop(1, "#ffc46b");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Ribs of bamboo at the panel edges, and a wish brushed on in ink.
    ctx.fillStyle = "rgba(70,30,10,0.55)";
    for (const x of [0, w / 4, w / 2, (3 * w) / 4]) ctx.fillRect(x - 2, 0, 4, h);
    ctx.strokeStyle = "rgba(30,12,6,0.6)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let panel = 0; panel < 4; panel += 1) {
      const cx = panel * (w / 4) + w / 8;
      for (let k = 0; k < 3; k += 1) {
        const y = h * (0.3 + k * 0.14);
        ctx.beginPath();
        ctx.moveTo(cx - 12 + rand() * 4, y);
        ctx.lineTo(cx + 10 + rand() * 4, y + (rand() - 0.5) * 8);
        ctx.stroke();
      }
    }
  });
  const paper = std(0xffffff, 0, 0.8, {
    map: paperTexture, emissive: 0xffffff, emissiveMap: paperTexture, emissiveIntensity: 0.55, side: THREE.DoubleSide,
  });
  const lantern = mesh(new THREE.CylinderGeometry(0.23, 0.16, 0.52, 4, 1, true), paper, 0, -0.38, 0);
  lantern.rotation.y = Math.PI / 4;
  const top = mesh(new THREE.ConeGeometry(0.23, 0.07, 4), std(0xa8281c, 0, 0.8, { emissive: 0x5a120a, emissiveIntensity: 0.4 }), 0, -0.085, 0);
  top.rotation.y = Math.PI / 4;
  const ring = mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 4), std(0x6b4a2a, 0.2, 0.6), 0, -0.64, 0);
  ring.rotation.set(Math.PI / 2, 0, Math.PI / 4);
  const flame = mesh(new THREE.SphereGeometry(0.045, 12, 10), std(0xffd27a, 0, 0.4, { emissive: 0xffc04a, emissiveIntensity: 1.6 }), 0, -0.62, 0);
  flame.scale.y = 1.5;
  return group(lantern, top, ring, flame);
}

function buildJazzMic(): THREE.Object3D {
  const metal = chrome();
  const grille = paint(128, 128, 71, (ctx, _rand, w, h) => {
    ctx.fillStyle = "#c5cacf";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#3a3d41";
    for (let y = 4; y < h; y += 8) ctx.fillRect(0, y, w, 3);
  });
  const body = mesh(new THREE.CapsuleGeometry(0.12, 0.16, 8, 24), std(0xffffff, 0.85, 0.25, { map: grille }), 0, -0.36, 0);
  const holder = mesh(new THREE.TorusGeometry(0.15, 0.022, 10, 40), metal, 0, -0.36, 0);
  holder.rotation.y = Math.PI / 2;
  const stem = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 12), metal, 0, -0.6, 0);
  const base = mesh(new THREE.SphereGeometry(0.05, 12, 10), metal, 0, -0.7, 0);
  const top = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), metal, 0, -0.14, 0);
  return group(body, holder, stem, base, top);
}

function buildSkateboard(): THREE.Object3D {
  const art = paint(128, 256, 73, (ctx, _rand, w, h) => {
    ctx.fillStyle = "#c97b3f";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f1e3c6";
    ctx.fillRect(0, h * 0.35, w, h * 0.08);
    ctx.fillStyle = "#26344f";
    ctx.fillRect(0, h * 0.47, w, h * 0.08);
    ctx.fillStyle = "#c1272d";
    ctx.fillRect(0, h * 0.59, w, h * 0.08);
  });
  art.repeat.set(4, 1.6);
  art.offset.set(0.5, 0.5);
  const deck = mesh(extrude(roundedRect(0.22, 0.64, 0.1), 0.025, 0.008, 16), [std(0xffffff, 0, 0.6, { map: art }), std(0xd8b98a, 0, 0.7)], 0, -0.42, 0);
  const truckMaterial = chrome();
  const wheelMaterial = std(0xf1ead6, 0, 0.5);
  const parts = group(deck);
  for (const y of [-0.22, -0.62]) {
    parts.add(mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), truckMaterial, 0, y, -0.04));
    for (const x of [-0.1, 0.1]) {
      const wheel = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.035, 16), wheelMaterial, x, y, -0.07);
      wheel.rotation.z = Math.PI / 2;
      parts.add(wheel);
    }
  }
  parts.rotation.y = 0.5;
  return parts;
}

function buildRoadSign(): THREE.Object3D {
  const s = new THREE.Shape();
  s.moveTo(0, -0.26);
  s.bezierCurveTo(0.16, -0.2, 0.23, -0.06, 0.22, 0.12);
  s.lineTo(0.22, 0.2);
  s.bezierCurveTo(0.12, 0.17, 0.05, 0.2, 0, 0.24);
  s.bezierCurveTo(-0.05, 0.2, -0.12, 0.17, -0.22, 0.2);
  s.lineTo(-0.22, 0.12);
  s.bezierCurveTo(-0.23, -0.06, -0.16, -0.2, 0, -0.26);
  const face = paint(256, 256, 79, (ctx, _rand, w, h) => {
    ctx.fillStyle = "#f4f2ea";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#151515";
    ctx.font = "bold 92px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("66", w / 2, h * 0.56);
    ctx.fillRect(w * 0.18, h * 0.3, w * 0.64, 6);
  });
  face.repeat.set(2, 2);
  face.offset.set(0.5, 0.5);
  const shield = mesh(extrude(s, 0.03, 0.012), [std(0xffffff, 0, 0.5, { map: face }), std(0x151515, 0, 0.5)], 0, -0.38, 0);
  const border = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s.getSpacedPoints(60).map(p => new THREE.Vector3(p.x, p.y, 0.028)), true), 120, 0.012, 6, true),
    std(0x151515, 0, 0.5), 0, -0.38, 0);
  return group(shield, border);
}

function buildPerfume(): THREE.Object3D {
  const glass = phys(0xe07f9c, { roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.84, flatShading: true });
  const bottle = mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.26, 8), glass, 0, -0.46, 0);
  const shoulder = mesh(new THREE.ConeGeometry(0.15, 0.1, 8), glass, 0, -0.28, 0);
  const base = mesh(new THREE.ConeGeometry(0.2, 0.08, 8), glass, 0, -0.63, 0);
  base.rotation.x = Math.PI;
  const gold = brass();
  const collar = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 16), gold, 0, -0.2, 0);
  const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.17, 0), new THREE.Vector3(0.1, -0.12, 0), new THREE.Vector3(0.18, -0.15, 0),
  ]), 12, 0.012, 6), gold);
  const bulb = mesh(new THREE.SphereGeometry(0.07, 20, 14), phys(0x7d1f33, { roughness: 0.7, sheen: 1, sheenColor: 0xffc0cc }), 0.24, -0.17, 0);
  bulb.scale.y = 1.2;
  return group(bottle, shoulder, base, collar, tube, bulb);
}

function buildMokaCharm(): THREE.Object3D {
  const aluminium = std(0xa7acb1, 0.85, 0.35, { flatShading: true });
  const lower = mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.22, 8), aluminium, 0, -0.6, 0);
  const waist = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.04, 8), aluminium, 0, -0.47, 0);
  const upper = mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.22, 8), aluminium, 0, -0.34, 0);
  const lid = mesh(new THREE.ConeGeometry(0.16, 0.07, 8), aluminium, 0, -0.2, 0);
  const knob = mesh(new THREE.SphereGeometry(0.03, 10, 8), std(0x151515, 0, 0.5), 0, -0.15, 0);
  const handle = mesh(new THREE.BoxGeometry(0.05, 0.2, 0.04), std(0x151515, 0, 0.5), -0.21, -0.34, 0);
  handle.rotation.z = 0.15;
  const spout = mesh(new THREE.ConeGeometry(0.04, 0.08, 4), aluminium, 0.16, -0.25, 0);
  spout.rotation.z = -Math.PI / 2.5;
  return group(lower, waist, upper, lid, knob, handle, spout);
}

function buildArtBook(): THREE.Object3D {
  const painting = paint(256, 128, 83, (ctx, _rand, w, h) => {
    ctx.fillStyle = "#f6f1e4";
    ctx.fillRect(0, 0, w, h);
    // The spread: a landscape on the right, a cypress and its caption on the left.
    ctx.fillStyle = "#8fb3d1"; ctx.fillRect(w * 0.55, h * 0.12, w * 0.38, h * 0.4);
    ctx.fillStyle = "#e3b55a"; ctx.fillRect(w * 0.55, h * 0.52, w * 0.38, h * 0.18);
    ctx.fillStyle = "#4f7a3c"; ctx.fillRect(w * 0.55, h * 0.7, w * 0.38, h * 0.16);
    ctx.fillStyle = "#c2483a"; ctx.beginPath(); ctx.arc(w * 0.82, h * 0.26, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2f4a2a"; ctx.beginPath(); ctx.ellipse(w * 0.24, h * 0.48, 10, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(60,60,60,0.5)";
    for (let i = 0; i < 4; i += 1) ctx.fillRect(w * 0.08, h * (0.72 + i * 0.05), w * 0.32, 2);
  });
  const pages = std(0xffffff, 0, 0.8, { map: painting, side: THREE.DoubleSide });
  const cover = std(0x2f5d7c, 0, 0.6);
  const g = group();
  const spread = mesh(new THREE.PlaneGeometry(0.56, 0.36, 8, 1), pages, 0, 0, 0.012);
  const p = spread.geometry.attributes.position;
  for (let i = 0; i < p.count; i += 1) p.setZ(i, -Math.abs(p.getX(i)) * 0.25);
  spread.geometry.computeVertexNormals();
  for (const side of [-1, 1]) {
    const board = mesh(new THREE.BoxGeometry(0.29, 0.38, 0.015), cover, 0.145 * side, 0, -0.035 * 1 - 0.03);
    board.rotation.y = 0.25 * side;
    const block = mesh(new THREE.BoxGeometry(0.27, 0.35, 0.03), std(0xf3ecdc, 0, 0.9), 0.135 * side, 0, -0.04);
    block.rotation.y = 0.25 * side;
    g.add(board, block);
  }
  g.add(spread);
  g.position.set(0, -0.36, 0);
  g.rotation.x = 0.2;
  return group(g);
}

function buildGuitarCharm(): THREE.Object3D {
  const s = new THREE.Shape();
  s.moveTo(0, -0.24);
  s.bezierCurveTo(0.2, -0.24, 0.2, -0.04, 0.11, 0.0);
  s.bezierCurveTo(0.16, 0.06, 0.15, 0.18, 0, 0.18);
  s.bezierCurveTo(-0.15, 0.18, -0.16, 0.06, -0.11, 0.0);
  s.bezierCurveTo(-0.2, -0.04, -0.2, -0.24, 0, -0.24);
  const wood = glaze(0xc9894a, 0.25);
  const body = mesh(extrude(s, 0.07, 0.012, 32), [wood, std(0x7a4a26, 0, 0.5)], 0, -0.6, 0);
  const hole = mesh(new THREE.CircleGeometry(0.05, 24), std(0x1d120a, 0, 0.9), 0, -0.56, 0.047);
  const rosette = mesh(new THREE.TorusGeometry(0.058, 0.007, 6, 32), std(0x3a2414, 0, 0.6), 0, -0.56, 0.047);
  const neck = mesh(new THREE.BoxGeometry(0.055, 0.34, 0.03), std(0x5a3520, 0, 0.5), 0, -0.25, 0.01);
  const head = mesh(new THREE.BoxGeometry(0.08, 0.1, 0.03), std(0x3a2414, 0, 0.5), 0, -0.04, 0.01);
  const bridge = mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), std(0x2a1a10, 0, 0.5), 0, -0.72, 0.045);
  const strings = group();
  for (let i = 0; i < 4; i += 1) {
    strings.add(mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.66, 4), chrome(), -0.015 + i * 0.01, -0.4, 0.04));
  }
  const g = group(body, hole, rosette, neck, head, bridge, strings);
  g.rotation.z = 0.15;
  return g;
}

function buildEspadrille(): THREE.Object3D {
  const footprint = new THREE.Shape();
  footprint.moveTo(0, -0.26);
  footprint.bezierCurveTo(0.12, -0.26, 0.12, -0.08, 0.1, 0.02);
  footprint.bezierCurveTo(0.12, 0.16, 0.1, 0.26, 0, 0.26);
  footprint.bezierCurveTo(-0.1, 0.26, -0.12, 0.16, -0.1, 0.02);
  footprint.bezierCurveTo(-0.12, -0.08, -0.12, -0.26, 0, -0.26);
  const jute = paint(128, 64, 89, (ctx, _rand, w, h) => {
    ctx.fillStyle = "#cdb487";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(120,90,50,0.6)";
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 6) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 4, h); ctx.stroke();
    }
  });
  jute.repeat.set(6, 1);
  const sole = mesh(extrude(footprint, 0.06, 0.012), [std(0xd9c79f, 0, 0.9), std(0xffffff, 0, 0.9, { map: jute })]);
  sole.rotation.x = Math.PI / 2;
  const canvas = std(0xe9e1cf, 0, 0.85);
  const toe = mesh(new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), canvas, 0, 0.03, 0.12);
  toe.scale.set(0.95, 0.8, 1.2);
  const heel = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24, 1, true, Math.PI * 0.5, Math.PI), canvas, 0, 0.07, -0.16);
  (heel.material as THREE.Material).side = THREE.DoubleSide;
  const ribbon = mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 32), std(0x26344f, 0, 0.6), 0, 0.1, -0.12);
  ribbon.rotation.x = Math.PI / 2;
  const shoe = group(sole, toe, heel, ribbon);
  shoe.position.set(0, -0.36, 0);
  shoe.rotation.set(0.45, 1.2, 0.1);
  return group(shoe);
}

// ------------------------------------------------------------- registry

type Builder = () => THREE.Object3D;

const PUPILS = new Set([
  "plum-pupil", "star-pupil", "heart-pupil", "moon-pupil", "cat-pupil", "spiral-pupil",
  "diamond-pupil", "clover-pupil", "sparkle-pupil",
]);

const EYEWEAR: Record<string, Builder> = {
  monocle: buildMonocle,
  "venetian-mask": buildVenetianMask,
  "round-glasses": buildRoundGlasses,
  "cat-eye-glasses": buildCatEyeGlasses,
  "aviator-shades": buildAviatorShades,
  "heart-shades": buildHeartShades,
  "pirate-patch": buildPiratePatch,
  "long-lashes": buildLongLashes,
  ...STATION33_EYEWEAR,
};

/* Lashes are part of the eye: they close with the blink, so they go in the
   look frame rather than the eyewear frame that skips it. */
const BLINKS_WITH_EYE = new Set(["long-lashes"]);

const HEAD: Record<string, Builder> = {
  beret: buildBeret,
  "baseball-cap": buildBaseballCap,
  "steamer-hat": buildSteamerHat,
  headphones: buildHeadphones,
  "hair-comb": buildHairComb,
};

const NECK: Record<string, () => NeckPiece> = {
  "silk-scarf": buildSilkScarf,
  "leather-strap": buildLeatherStrap,
  "silk-knot": buildSilkKnot,
};

const PIN: Record<string, Builder> = {
  "orchid-clip": buildOrchidClip,
  "lavender-brooch": buildLavenderBrooch,
  "lemon-brooch": buildLemonBrooch,
  "sun-brooch": buildSunBrooch,
};

const MOUTH: Record<string, Builder> = {
  "bubble-tea": buildBubbleTea,
  "pineapple-cake": buildPineappleCake,
  "soup-dumpling": buildSoupDumpling,
  bagel: buildBagel,
  pretzel: buildPretzel,
  pancakes: buildPancakes,
  croissant: buildCroissant,
  baguette: buildBaguette,
  macarons: buildMacarons,
  "cafe-cup": buildCafeCup,
  espresso: buildEspresso,
  gelato: buildGelato,
  "pasta-twirl": buildPastaTwirl,
  "flamenco-fan": buildFlamencoFan,
  churros: buildChurros,
  "olive-tapas": buildOliveTapas,
  "paella-pan": buildPaellaPan,
};

const CHARM: Record<string, Builder> = {
  "market-bag": buildMarketBag,
  "teapot-charm": buildTeapotCharm,
  "sky-lantern": buildSkyLantern,
  "jazz-mic": buildJazzMic,
  skateboard: buildSkateboard,
  "road-sign": buildRoadSign,
  perfume: buildPerfume,
  "moka-charm": buildMokaCharm,
  "art-book": buildArtBook,
  "guitar-charm": buildGuitarCharm,
  espadrille: buildEspadrille,
};

/** Ids this module can build, for the catalogue test. */
export function buildableIds(): string[] {
  return [
    ...CULTURAL_ITEMS.map(item => item.id),
    ...STATION33_BUILDABLE,
    ...MYTHIC_BUILDABLE,
    ...[ COLLECTION03_BROW, COLLECTION03_CHARM, COLLECTION03_EARRINGS, COLLECTION03_EYEWEAR, COLLECTION03_HEAD, COLLECTION03_IRISES, COLLECTION03_MOUTH, COLLECTION03_NECK, COLLECTION03_NECKLACE, COLLECTION03_PIN, COLLECTION03_PUPILS].flatMap(record => Object.keys(record)),
    ...[ COLLECTION04_BROW, COLLECTION04_CHARM, COLLECTION04_EARRINGS, COLLECTION04_EYEWEAR, COLLECTION04_HEAD, COLLECTION04_IRISES, COLLECTION04_MOUTH, COLLECTION04_NECK, COLLECTION04_NECKLACE, COLLECTION04_PIN, COLLECTION04_PUPILS].flatMap(record => Object.keys(record)),
    ...Object.keys(SHELL_FINISHES), ...PUPILS, ...Object.keys(IRISES), ...Object.keys(EYEWEAR), ...Object.keys(HEAD),
    ...Object.keys(NECK), ...Object.keys(PIN), ...Object.keys(MOUTH), ...Object.keys(CHARM),
  ];
}

// ---------------------------------------------------------------- anchors

/* Where each slot sits on her, in the model's frame. Measured against the
   shell: the head a little left of the top, the neck band at the lower left,
   the pin on the front face upper left, the mouth collar at the tip of the
   lower jaw, the charm band under the shell. */
const HEAD_ANGLE = THREE.MathUtils.degToRad(100);
const NECK_ANGLE = THREE.MathUtils.degToRad(208);
const PIN_ANGLE = THREE.MathUtils.degToRad(148);
const CHARM_ANGLE = THREE.MathUtils.degToRad(246);
const JAW_ANGLE = -GAP_HALF;

function headAnchor() {
  const a = new THREE.Group();
  const r = SHELL_RADIUS + TUBE_RADIUS * 0.82;
  a.position.set(Math.cos(HEAD_ANGLE) * r, Math.sin(HEAD_ANGLE) * r, 0);
  a.rotation.z = HEAD_ANGLE - Math.PI / 2;
  return a;
}

function pinAnchor() {
  const a = new THREE.Group();
  a.position.copy(tubeCentre(PIN_ANGLE));
  a.position.z = TUBE_FRONT * 0.96;
  return a;
}

/** A brass band round the tube and a short chain down to where a piece hangs. */
function hangingAnchor(angle: number, along: number, collarRadius: number, drop: number) {
  const metal = brass();
  const frame = ringFrame(angle, along);
  const collar = ellipseRing(collarRadius + 0.02, collarRadius * SHELL_DEPTH + 0.02, 0.028, metal);
  frame.add(collar);

  const anchor = new THREE.Group();
  const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  const top = frame.position.clone().addScaledVector(radial, collarRadius + 0.04);
  const hang = top.clone().add(new THREE.Vector3(0, -drop, 0.02));
  const links = chain([top, top.clone().lerp(hang, 0.5).add(new THREE.Vector3(0.01, 0, 0.01)), hang], metal, 0.03);
  anchor.position.copy(hang);

  const parts = group(frame, links);
  return { parts, anchor };
}

const buildCulturalScarfId = (id: string) => CULTURAL_ITEMS.some(item => item.id === id && item.slot === "neck");

// -------------------------------------------------------------------- rig

export type OutfitRigParts = {
  model: THREE.Group;
  eyeGroup: THREE.Group;
  lookGroup: THREE.Group;
  pupil: THREE.Mesh;
  shellMaterial: THREE.MeshPhysicalMaterial;
  /**
   * A piece's shaders may still be compiling when it comes off (the reader
   * tapped the next one quickly). three.js polls its materials until they
   * are ready, and a material disposed under it throws from that poll. So
   * a piece that is still compiling is taken off at once but disposed only
   * once its compile has settled.
   */
  settling?: (object: THREE.Object3D) => Promise<unknown> | undefined;
};

export type OutfitRig = {
  /** Puts the outfit on; returns the pieces it had to build. */
  apply(outfit: YumiOutfit): THREE.Object3D[];
  /** True while a shop material is on the shell. */
  hasShellFinish(): boolean;
  /** Per frame: keep eyewear in front of the eye, minus the blink. */
  sync(dt?: number, reducedMotion?: boolean): void;
  setVisible(visible: boolean): void;
  dispose(): void;
};

function disposeObject(object: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  object.traverse(child => {
    const m = child as THREE.Mesh;
    if (m.geometry) geometries.add(m.geometry);
    const mat = m.material;
    if (Array.isArray(mat)) mat.forEach(x => materials.add(x));
    else if (mat) materials.add(mat);
  });
  for (const g of geometries) g.dispose();
  for (const m of materials) {
    for (const value of Object.values(m)) {
      if (value instanceof THREE.Texture) value.dispose();
    }
    m.dispose();
  }
}

/* Yumi has no ears: her single earring has a cuff around her shell, with a
   real chain running from the cuff to the earring's top loop. */
const EARRING_ANGLE = THREE.MathUtils.degToRad(164);

function earringMount() {
  const cuff = ringFrame(EARRING_ANGLE);
  const metal = brass();
  cuff.add(ellipseRing(TUBE_RADIUS + .018, TUBE_FRONT + .018, .024, metal));
  // The clasp emerges from the front of the cuff. A centre-plane hanger
  // would bury the upper drop inside the curved shell.
  const top = tubeCentre(EARRING_ANGLE);
  top.z = TUBE_FRONT + .035;
  const hang = top.clone().add(new THREE.Vector3(-.16, -.12, .075));
  const links = chain([top, top.clone().lerp(hang, .5), hang], metal, .022);
  return { parts: group(cuff, links), hang };
}

/* A necklace hangs across the front of the lower tube from two studs. */
const NECKLACE_CENTRE = new THREE.Vector3(0, -SHELL_RADIUS + .05, TUBE_FRONT + .035);

function necklaceStuds() {
  const fasteners = group();
  for (const side of [-1, 1]) {
    const stud = mesh(new THREE.CylinderGeometry(.048, .048, .15, 12), brass(), side * .65, -SHELL_RADIUS + .30, TUBE_FRONT - .015);
    stud.rotation.x = Math.PI / 2;
    fasteners.add(stud);
  }
  return fasteners;
}

/* A brow piece clamps round the upper right of the tube, clear of the eye. */
const BROW_ANGLE = THREE.MathUtils.degToRad(68);

function browCuff(material: THREE.Material) {
  return ellipseRing(TUBE_RADIUS + .018, TUBE_FRONT + .018, .025, material);
}

/**
 * The Station 33 collection (station33Outfit.ts). Hats, pins, scarves,
 * eyes, brows and necklaces are made at the size they are worn; the small
 * hanging things are made at the design book's size and brought up here to
 * match the first collection's on the same chains (compared side by side
 * on the stand, 2026-10-17).
 */
const STATION33_HANGING_SCALE = { mouth: 1.25, charm: 1.35, earrings: 1.15 } as const;

function buildStation33(slot: ShopSlot, id: string): { model?: THREE.Object3D; eye?: THREE.Object3D; look?: THREE.Object3D } | null {
  if (slot === "pupil" && STATION33_PUPILS[id]) return { look: STATION33_PUPILS[id]() };
  if (slot === "iris" && STATION33_IRISES[id]) return { look: STATION33_IRISES[id]() };
  if (slot === "head" && STATION33_HEAD[id]) {
    const anchor = headAnchor();
    anchor.add(STATION33_HEAD[id]());
    return { model: anchor };
  }
  if (slot === "neck" && STATION33_NECK[id]) {
    const piece = STATION33_NECK[id]();
    const frame = ringFrame(NECK_ANGLE);
    frame.add(piece.band);
    piece.front.position.copy(tubeCentre(NECK_ANGLE));
    piece.front.position.z = TUBE_FRONT + 0.07;
    return { model: group(frame, piece.front) };
  }
  if (slot === "pin" && STATION33_PIN[id]) {
    // The plate's back just clear of the tube; its pins go into the shell.
    const anchor = pinAnchor();
    anchor.position.z = TUBE_FRONT + 0.014;
    anchor.add(STATION33_PIN[id]());
    return { model: anchor };
  }
  if (slot === "mouth" && STATION33_MOUTH[id]) {
    const { parts, anchor } = hangingAnchor(JAW_ANGLE, -0.24, 0.32, 0.12);
    anchor.add(STATION33_MOUTH[id]());
    anchor.scale.setScalar(STATION33_HANGING_SCALE.mouth);
    return { model: group(parts, anchor) };
  }
  if (slot === "charm" && STATION33_CHARM[id]) {
    const { parts, anchor } = hangingAnchor(CHARM_ANGLE, 0, TUBE_RADIUS, 0.16);
    anchor.add(STATION33_CHARM[id]());
    anchor.scale.setScalar(STATION33_HANGING_SCALE.charm);
    return { model: group(parts, anchor) };
  }
  if (slot === "earrings" && STATION33_EARRINGS[id]) {
    const { parts, hang } = earringMount();
    const drop = STATION33_EARRINGS[id]();
    drop.position.copy(hang);
    drop.scale.setScalar(STATION33_HANGING_SCALE.earrings);
    return { model: group(parts, drop) };
  }
  if (slot === "brow" && STATION33_BROW[id]) {
    const frame = ringFrame(BROW_ANGLE);
    frame.add(browCuff(brass()), STATION33_BROW[id]());
    return { model: frame };
  }
  if (slot === "necklace" && STATION33_NECKLACE[id]) {
    const piece = STATION33_NECKLACE[id]();
    piece.position.copy(NECKLACE_CENTRE);
    return { model: group(piece, necklaceStuds()) };
  }
  return null;
}

/** Builds the piece for one slot, already placed in the model's frame. */
function buildForSlot(slot: ShopSlot, id: string): { model?: THREE.Object3D; eye?: THREE.Object3D; look?: THREE.Object3D } | null {
  const station = buildStation33(slot, id);
  if (station) return station;
  const culturalItem = CULTURAL_ITEMS.find(item => item.id === id);
  if (culturalItem?.slot === "earrings") {
    const { parts, hang } = earringMount();
    const drop = buildCulturalPiece(id)!;
    drop.scale.setScalar(1.3);
    drop.position.copy(hang).add(new THREE.Vector3(0, -.319, 0));
    return { model: group(parts, drop) };
  }
  if (culturalItem?.slot === "brow") {
    // A piercing-sized ornament on a structural cuff, following the upper
    // shell instead of floating in front of the eyeball or blinking flat.
    const frame = ringFrame(BROW_ANGLE);
    frame.add(browCuff(chrome()));
    const ornament = buildCulturalPiece(id)!;
    ornament.position.copy(tubeCentre(BROW_ANGLE));
    ornament.position.z = TUBE_FRONT;
    ornament.rotation.z = -.45;
    return { model: group(frame, ornament) };
  }
  const cultural = buildCulturalPiece(id);
  if (cultural) {
    if (slot === "head") { const a = headAnchor(); a.add(cultural); return { model: a }; }
    if (slot === "pin") { const a = pinAnchor(); a.add(cultural); return { model: a }; }
    if (slot === "charm") { const {parts, anchor} = hangingAnchor(CHARM_ANGLE, 0, TUBE_RADIUS, .16); anchor.add(cultural); return {model: group(parts,anchor)}; }
    if (slot === "necklace") {
      cultural.position.copy(NECKLACE_CENTRE);
      return { model: group(cultural, necklaceStuds()) };
    }
    return { model: cultural };
  }
  if (slot === "pupil" && PUPILS.has(id)) return { look: buildPupil(id) };
  if (slot === "iris" && IRISES[id]) return { look: buildIris(id) };
  if (slot === "eyewear" && EYEWEAR[id]) {
    return BLINKS_WITH_EYE.has(id) ? { look: EYEWEAR[id]() } : { eye: EYEWEAR[id]() };
  }
  if (slot === "head" && HEAD[id]) {
    const anchor = headAnchor();
    anchor.add(HEAD[id]());
    anchor.scale.setScalar(1.1);
    return { model: anchor };
  }
  if (slot === "neck" && (NECK[id] || buildCulturalScarfId(id))) {
    const piece = NECK[id] ? NECK[id]() : buildCulturalScarf(id)!;
    const frame = ringFrame(NECK_ANGLE);
    frame.add(piece.band);
    const front = piece.front;
    front.position.copy(tubeCentre(NECK_ANGLE));
    front.position.z = TUBE_FRONT + 0.07;
    return { model: group(frame, front) };
  }
  if (slot === "pin" && PIN[id]) {
    const anchor = pinAnchor();
    anchor.add(PIN[id]());
    anchor.scale.setScalar(1.3);
    return { model: anchor };
  }
  if (slot === "mouth" && MOUTH[id]) {
    /* The collar sits on the rounded tip of the lower jaw: 0.24 past the end
       of the tube, where the cap's section has narrowed to 0.32. */
    const { parts, anchor } = hangingAnchor(JAW_ANGLE, -0.24, 0.32, 0.12);
    anchor.add(MOUTH[id]());
    anchor.scale.setScalar(1.35);
    return { model: group(parts, anchor) };
  }
  if (slot === "charm" && CHARM[id]) {
    const { parts, anchor } = hangingAnchor(CHARM_ANGLE, 0, TUBE_RADIUS, 0.16);
    anchor.add(CHARM[id]());
    anchor.scale.setScalar(1.2);
    return { model: group(parts, anchor) };
  }
  return null;
}

export function createOutfitRig(parts: OutfitRigParts): OutfitRig {
  const { model, eyeGroup, lookGroup, pupil, shellMaterial } = parts;

  /* Eyewear turns with the gaze (lookGroup) but sits outside the blink: a
     monocle squashed flat every few seconds reads as broken. */
  const eyewear = new THREE.Group();
  eyeGroup.add(eyewear);

  const worn = new Map<ShopSlot, { id: string; objects: THREE.Object3D[]; motion: ReturnType<typeof collectCollection03Motion> }>();
  let motionTime = 0;
  let finish: string | undefined;

  function remove(slot: ShopSlot) {
    const current = worn.get(slot);
    if (!current) return;
    for (const object of current.objects) {
      object.parent?.remove(object);
      const pending = parts.settling?.(object);
      if (pending) void pending.then(() => disposeObject(object), () => disposeObject(object));
      else disposeObject(object);
    }
    worn.delete(slot);
    if (slot === "pupil") pupil.visible = true;
  }

  return {
    apply(next) {
      const outfit = cleanOutfit(next);
      const added: THREE.Object3D[] = [];

      if (outfit.material !== finish) {
        finish = outfit.material && isShellMaterial(outfit.material) ? outfit.material : undefined;
        applyShellFinish(shellMaterial, finish);
      }

      for (const slot of ["pupil", "iris", "eyewear", "head", "neck", "pin", "mouth", "charm", "earrings", "brow", "necklace"] as const) {
        const id = outfit[slot];
        if (worn.get(slot)?.id === id) continue;
        remove(slot);
        if (!id || !shopItem(id)) continue;
        const built = buildForSlot(slot, id);
        if (!built) continue;
        const objects: THREE.Object3D[] = [];
        if (built.model) { model.add(built.model); objects.push(built.model); }
        if (built.eye) { eyewear.add(built.eye); objects.push(built.eye); }
        if (built.look) { lookGroup.add(built.look); objects.push(built.look); }
        if (slot === "pupil") pupil.visible = false;
        worn.set(slot, { id, objects, motion: collectCollection03Motion(objects) });
        added.push(...objects);
      }

      /* A coloured iris needs room to be seen: her own round pupil narrows
         while one is on, the way a pupil does in light. */
      pupil.scale.setScalar(worn.has("iris") && !worn.has("pupil") ? 0.72 : 1);
      return added;
    },

    hasShellFinish() {
      return finish !== undefined;
    },

    sync(dt = 0, reducedMotion = false) {
      motionTime += Math.max(0, Math.min(dt, 1 / 30));
      for (const piece of worn.values()) updateCollection03Motion(piece.motion, motionTime, reducedMotion);
      eyewear.quaternion.copy(lookGroup.quaternion);
      eyewear.scale.copy(lookGroup.scale);
    },

    setVisible(visible) {
      eyewear.visible = visible;
      for (const { objects } of worn.values()) for (const o of objects) o.visible = visible;
    },

    dispose() {
      for (const slot of [...worn.keys()]) remove(slot);
      eyeGroup.remove(eyewear);
      shellMaterial.map?.dispose();
      shellMaterial.roughnessMap?.dispose();
    },
  };
}

// ------------------------------------------------------------- thumbnails

/**
 * One piece on its own, for the catalogue's cards: a shell material as a
 * small bare C, an eye piece on an eye, everything else as itself. Centred
 * on the origin; the caller frames it.
 */
export function buildThumbnailObject(id: string): THREE.Object3D | null {
  const item = shopItem(id);
  if (!item) return null;

  if (item.slot === "material") {
    const material = new THREE.MeshPhysicalMaterial();
    applyShellFinish(material, id);
    material.transparent = material.opacity < 1;
    const shell = new THREE.Mesh(
      new THREE.TorusGeometry(SHELL_RADIUS, TUBE_RADIUS, 24, 96, Math.PI * 2 - GAP_HALF * 2),
      material,
    );
    shell.rotation.z = GAP_HALF;
    shell.scale.z = SHELL_DEPTH;
    const g = group(shell);
    for (const angle of [GAP_HALF, -GAP_HALF]) {
      const cap = mesh(new THREE.SphereGeometry(TUBE_RADIUS, 24, 16), material,
        Math.cos(angle) * SHELL_RADIUS, Math.sin(angle) * SHELL_RADIUS, 0);
      cap.scale.z = SHELL_DEPTH;
      g.add(cap);
    }
    return g;
  }

  if (item.slot === "pupil" || item.slot === "iris" || item.slot === "eyewear") {
    const eye = group(
      mesh(new THREE.SphereGeometry(EYE_RADIUS, 40, 28), std(0xf2f0e8, 0.03, 0.2)),
      mesh(new THREE.TorusGeometry(0.4, 0.05, 16, 64), std(0x030405, 0.5, 0.26), 0, 0, EYE_RADIUS * 0.7),
    );
    const arm = mesh(new THREE.CylinderGeometry(ARM_RADIUS, ARM_RADIUS, 0.9, 24), std(0x8d9399, 0.95, 0.23), -0.9, 0, 0);
    arm.rotation.z = Math.PI / 2;
    eye.add(arm);
    if (item.slot === "pupil") eye.add(STATION33_PUPILS[id]?.() ?? buildPupil(id));
    else {
      const round = mesh(new THREE.SphereGeometry(0.3, 28, 18), std(0x000000, 0.15, 0.07), 0, 0, EYE_RADIUS * 0.74);
      if (item.slot === "iris") {
        round.scale.setScalar(0.72);
        eye.add(STATION33_IRISES[id]?.() ?? buildIris(id));
      } else {
        eye.add(EYEWEAR[id]());
      }
      eye.add(round);
    }
    return eye;
  }

  if (item.slot === "neck") {
    const piece = STATION33_NECK[id]?.() ?? (NECK[id] ? NECK[id]() : buildCulturalScarf(id)!);
    const tube = mesh(new THREE.CapsuleGeometry(TUBE_RADIUS, 0.7, 10, 32), std(0x17181b, 0.5, 0.4));
    tube.scale.z = SHELL_DEPTH;
    const band = piece.band;
    band.rotation.x = Math.PI / 2;
    const front = piece.front;
    front.position.z = TUBE_FRONT + 0.07;
    const g = group(tube, band, front);
    g.rotation.z = 0.9;
    return g;
  }

  if (item.slot === "brow" && STATION33_BROW[id]) {
    // On a short length of tube, as the scarves are, turned so the piece
    // across its front faces the card: on its own, the cuff is all a
    // reader would see.
    const tube = mesh(new THREE.CapsuleGeometry(TUBE_RADIUS, 0.6, 10, 32), std(0x17181b, 0.5, 0.4));
    tube.rotation.x = Math.PI / 2;
    tube.scale.set(1, 1, SHELL_DEPTH);
    const g = group(tube, browCuff(brass()), STATION33_BROW[id]());
    // Front to the card, the tube lying across it like a brow.
    g.rotation.set(Math.PI / 2, Math.PI / 2, 0);
    return group(g);
  }
  if (item.slot === "necklace" && STATION33_NECKLACE[id]) {
    const studs = group(...[-1, 1].map(side => mesh(new THREE.SphereGeometry(.045, 14, 10), brass(), side * .65, .25, -.05)));
    return group(STATION33_NECKLACE[id](), studs);
  }

  const cultural = buildCulturalPiece(id);
  if (cultural) return cultural;
  const builder = HEAD[id] ?? PIN[id] ?? MOUTH[id] ?? CHARM[id]
    ?? STATION33_HEAD[id] ?? STATION33_PIN[id] ?? STATION33_MOUTH[id] ?? STATION33_CHARM[id] ?? STATION33_EARRINGS[id];
  return builder ? builder() : null;
}

export { disposeObject };
