import * as THREE from "three";

import { TUBE_FRONT } from "./anatomy";
import {
  SHELL_REPEAT, bendToEye, clothBand, extrude, group, irisCap, lathe, mesh, paint, phys,
  radialShape, roundedRect, std, tail, taperedTube, tintedLens,
  type NeckPiece, type ShellFinish,
} from "./outfitKit";
import {
  backPins, browPost, frameZ, irisCanvas, jumpRing, leaf, necklaceChain, onBrow, onEye, ovalRing, restingDrop,
  ring, rod, tubeClamp,
} from "./station33Outfit";

/* =========================================================
   The Mythic Vault — 33 limited pieces (lib/shop/mythicCollection.ts)

   Won only from Wordvault's premium chest. Each is an attribute or a
   sacred object out of classical myth and legend, never a likeness of a
   god, made in a colour and a finish the shelves do not have: light that
   runs in the material (emissive), aurora films (iridescence), pearl and
   silk sheens, gold showing through lapis and marble.

   Built the way Station 33 is (station33Outfit.ts, whose helpers these
   reuse), in the same frames per slot, with every part a solid with a
   back, and nothing that needs a second render pass on a phone.
   ========================================================= */

// --------------------------------------------------------------- materials

const gold = () => std(0xd9b25c, 0.95, 0.22, { envMapIntensity: 1.2 });
/** Gold that gives its own light: the myths' gold, not the shop's brass. */
const divineGold = (glow = 0.35) => std(0xf0c35a, 0.9, 0.2, { emissive: 0xe0a030, emissiveIntensity: glow, envMapIntensity: 1.2 });
const silver = () => std(0xdfe5ea, 0.95, 0.18, { envMapIntensity: 1.2 });
const enamel = (color: THREE.ColorRepresentation, glow = 0, roughness = 0.24) =>
  phys(color, { roughness, clearcoat: 0.9, clearcoatRoughness: 0.06, emissive: color, emissiveIntensity: glow });
const pearl = (tint: THREE.ColorRepresentation = 0xf3eee6) =>
  phys(tint, { roughness: 0.22, clearcoat: 0.7, sheen: 1, sheenColor: 0xd9e4ff, iridescence: 0.6, iridescenceIOR: 1.3 });
const lapis = () => phys(0x23418f, { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.1 });
const jade = (color: THREE.ColorRepresentation = 0x5fb39a) =>
  phys(color, { roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.08, sheen: 0.5, sheenColor: 0xd8fff0 });

const surfaceColour = (roughness: number, metalness: number) =>
  `rgb(0,${Math.round(roughness * 255)},${Math.round(metalness * 255)})`;

/**
 * Sinuous veins across the canvas, from their own seed, so the colour map
 * and the surface map put the same vein in the same place.
 */
function veins(ctx: CanvasRenderingContext2D, seed: number, colour: string, scale: number, w: number, h: number) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  ctx.strokeStyle = colour;
  ctx.lineCap = "round";
  for (let k = 0; k < 7; k += 1) {
    let x = rand() * w;
    let y = 0;
    ctx.lineWidth = (1.5 + rand() * 3) * scale;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < h) {
      x += (rand() - 0.5) * 70;
      y += 18 + rand() * 20;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- shells

export const MYTHIC_FINISHES: Record<string, ShellFinish> = {
  /* White marble from the oracle's hill, its veins running with ichor gold. */
  "myth-olympus-marble": {
    color: 0xffffff, metalness: 1, roughness: 1, clearcoat: 0.5, clearcoatRoughness: 0.15,
    emissive: 0x3a2806, emissiveIntensity: 0.25,
    map: () => paint(512, 256, 7101, (ctx, rand, w, h) => {
      ctx.fillStyle = "#efe9dc";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 50 + rand() * 120;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(196,190,178,0.35)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      veins(ctx, 71, "rgba(150,144,134,0.55)", 0.6, w, h);
      veins(ctx, 72, "#e8b84c", 1, w, h);
    }, SHELL_REPEAT),
    surface: () => paint(512, 256, 7102, (ctx, _rand, w, h) => {
      ctx.fillStyle = surfaceColour(0.4, 0.0);
      ctx.fillRect(0, 0, w, h);
      veins(ctx, 72, surfaceColour(0.2, 1), 1, w, h);
    }, SHELL_REPEAT),
  },
  /* Frost on the rainbow bridge: a pearl-white shell under an aurora film. */
  "myth-bifrost-frost": {
    color: 0xffffff, metalness: 0.15, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: 1, sheen: 0.8, sheenColor: 0x9fe8ff, sheenRoughness: 0.3,
    emissive: 0x0f2a3a, emissiveIntensity: 0.3,
    map: () => paint(512, 256, 7103, (ctx, rand, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "#bfefff");
      g.addColorStop(0.25, "#c8b7ff");
      g.addColorStop(0.5, "#ffd1ec");
      g.addColorStop(0.75, "#b6ffe1");
      g.addColorStop(1, "#bfefff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Frost: fine white crystals, soft so they do not shimmer.
      for (let i = 0; i < 260; i += 1) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.4})`;
        const x = rand() * w;
        const y = rand() * h;
        const r = 1 + rand() * 3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }, SHELL_REPEAT),
  },
  /* Lapis from the Nile's tombs: deep ultramarine, flecked with gold. */
  "myth-nile-lapis": {
    color: 0xffffff, metalness: 1, roughness: 1, clearcoat: 0.7, clearcoatRoughness: 0.1,
    map: () => paint(512, 256, 7104, (ctx, rand, w, h) => {
      ctx.fillStyle = "#1f3a86";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 30 + rand() * 90;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rand() > 0.5 ? "rgba(52,92,190,0.45)" : "rgba(14,26,70,0.5)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      const flecks = (seed: number) => {
        let s = seed;
        const r = () => ((s = (s * 48271) % 2147483647) / 2147483647);
        for (let i = 0; i < 180; i += 1) {
          ctx.fillStyle = "#e8c15e";
          ctx.beginPath();
          ctx.arc(r() * w, r() * h, 0.8 + r() * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      flecks(7105);
    }, SHELL_REPEAT),
    surface: () => paint(512, 256, 7106, (ctx, _rand, w, h) => {
      ctx.fillStyle = surfaceColour(0.32, 0);
      ctx.fillRect(0, 0, w, h);
      let s = 7105;
      const r = () => ((s = (s * 48271) % 2147483647) / 2147483647);
      ctx.fillStyle = surfaceColour(0.2, 1);
      for (let i = 0; i < 180; i += 1) {
        ctx.beginPath();
        ctx.arc(r() * w, r() * h, 0.8 + r() * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }, SHELL_REPEAT),
  },
};

// ------------------------------------------------------------------ pupils

function buildSunDisk(): THREE.Object3D {
  // A disk of sun-gold with twelve rays, giving its own light.
  const rays = radialShape(240, (_i, a) => 0.2 + 0.07 * Math.max(0, Math.cos(12 * a)) ** 3);
  const disc = onEye(rays, divineGold(0.6), 0.06, 0.012);
  const core = new THREE.Shape();
  core.absarc(0, 0, 0.1, 0, Math.PI * 2, false);
  const centre = onEye(core, std(0x2a1a06, 0.4, 0.3), 0.07, 0.012);
  centre.position.z += 0.01;
  return group(disc, centre);
}

function buildMoonRabbit(): THREE.Object3D {
  const moon = new THREE.Shape();
  moon.absarc(0, 0, 0.27, 0.5, Math.PI * 2 - 0.5, false);
  moon.absarc(0.12, 0, 0.21, Math.PI * 2 - 0.85, 0.85, true);
  const silverLight = std(0xdfe2ff, 0.6, 0.25, { emissive: 0x8f95ff, emissiveIntensity: 0.35 });
  const crescent = onEye(moon, silverLight, 0.06, 0.01);
  // The rabbit inside the crescent: a body, a head and two long ears.
  const rabbit = new THREE.Shape();
  rabbit.absellipse(0.02, -0.06, 0.075, 0.055, 0, Math.PI * 2, false, 0);
  const head = new THREE.Shape();
  head.absellipse(0.06, 0.01, 0.04, 0.035, 0, Math.PI * 2, false, 0);
  const ear = (x: number, tilt: number) => {
    const s = new THREE.Shape();
    s.absellipse(x, 0.08, 0.013, 0.05, 0, Math.PI * 2, false, tilt);
    return s;
  };
  const ink = std(0x1d1f3a, 0.2, 0.35);
  const parts = [rabbit, head, ear(0.05, 0.2), ear(0.075, -0.15)].map(s => {
    const m = onEye(s, ink, 0.07, 0.006);
    m.position.z += 0.012;
    return m;
  });
  return group(crescent, ...parts);
}

export const MYTHIC_PUPILS: Record<string, () => THREE.Object3D> = {
  "myth-sun-disk": buildSunDisk,
  "myth-moon-rabbit": buildMoonRabbit,
};

// ------------------------------------------------------------------ irises

/** Emerald with the Gorgon's serpents coiling through it. */
const gorgonIris = () => irisCanvas(7111, (ctx, rand, R) => {
  const g = ctx.createRadialGradient(0, 0, R * 0.25, 0, 0, R);
  g.addColorStop(0, "#08251a");
  g.addColorStop(0.4, "#1f8a5a");
  g.addColorStop(0.75, "#43c48a");
  g.addColorStop(1, "#0b3a26");
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.lineCap = "round";
  for (let k = 0; k < 9; k += 1) {
    const a0 = (k / 9) * Math.PI * 2;
    ctx.strokeStyle = k % 2 ? "#d9f7a8" : "#0d4a30";
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.04) {
      const r = R * (0.42 + t * 0.5);
      const a = a0 + Math.sin(t * Math.PI * 3 + k) * 0.22;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = "rgba(240,255,200,0.6)";
    const a = rand() * Math.PI * 2;
    const r = R * (0.45 + rand() * 0.45);
    ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 2, 2);
  }
  ring(ctx, R * 0.4, 3, "#e3c25e", 0.9);
  ring(ctx, R * 0.965, 6, "#062016");
});

/** The rainbow bridge in rings, with frost between them. */
const bifrostIris = () => irisCanvas(7112, (ctx, _rand, R) => {
  ctx.fillStyle = "#13203a";
  ctx.fillRect(-R, -R, R * 2, R * 2);
  const colours = ["#ff7a9c", "#ffb35c", "#fff07a", "#72f2b0", "#68c8ff", "#a78bff"];
  colours.forEach((c, i) => ring(ctx, R * (0.42 + i * 0.085), R * 0.06, c, 0.85));
  for (let i = 0; i < 6; i += 1) ring(ctx, R * (0.465 + i * 0.085), 1.2, "#ffffff", 0.6);
  ring(ctx, R * 0.965, 5, "#0b1222");
});

/** Ishtar's star of eight points, gold on night lapis. */
const ishtarIris = () => irisCanvas(7113, (ctx, rand, R) => {
  const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
  g.addColorStop(0, "#101a44");
  g.addColorStop(0.7, "#2a3f8a");
  g.addColorStop(1, "#0b1233");
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  for (let i = 0; i < 70; i += 1) {
    ctx.fillStyle = `rgba(255,230,160,${0.3 + rand() * 0.6})`;
    const a = rand() * Math.PI * 2;
    const r = R * (0.45 + rand() * 0.5);
    ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1.6, 1.6);
  }
  ctx.fillStyle = "#f3c75e";
  ctx.beginPath();
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? R * 0.52 : R * 0.92;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#101a44";
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ring(ctx, R * 0.965, 5, "#c9a55a");
});

export const MYTHIC_IRISES: Record<string, () => THREE.Object3D> = {
  "myth-gorgon-jade": () => group(irisCap(gorgonIris(), 1.006, std(0xffffff, 0.1, 0.25, { emissive: 0x0d3a24, emissiveIntensity: 0.4 }))),
  "myth-bifrost-iris": () => group(irisCap(bifrostIris(), 1.006, phys(0xffffff, { roughness: 0.18, clearcoat: 1, iridescence: 1, emissive: 0x223355, emissiveIntensity: 0.35 }))),
  "myth-ishtar-star": () => group(irisCap(ishtarIris(), 1.006, std(0xffffff, 0.3, 0.25, { emissive: 0x2a1a05, emissiveIntensity: 0.3 }))),
};

// ----------------------------------------------------------------- eyewear

function buildRavenMonocle(): THREE.Object3D {
  const gunmetal = std(0x2c2f3a, 0.9, 0.3, { envMapIntensity: 1.1 });
  const k = 0.26;
  const frame = mesh(bendToEye(extrude(ovalRing(0.62, 0.62, 0.53, 0.53), 0.06, 0.016, 72), k, 0.12), gunmetal, 0, 0, 0.76);
  const lensShape = new THREE.Shape();
  lensShape.absarc(0, 0, 0.535, 0, Math.PI * 2, false);
  const lens = mesh(bendToEye(new THREE.ShapeGeometry(lensShape, 64), k, 0.12), tintedLens(0x5a3f8f, 0.35), 0, 0, 0.762);
  // Two ravens' wings sweeping up from the rim, Huginn and Muninn.
  const wing = (side: number) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(side * 0.12, 0.08, side * 0.3, 0.2, side * 0.42, 0.34);
    s.lineTo(side * 0.3, 0.27);
    s.lineTo(side * 0.33, 0.33);
    s.lineTo(side * 0.2, 0.2);
    s.lineTo(side * 0.21, 0.27);
    s.bezierCurveTo(side * 0.1, 0.16, side * 0.04, 0.08, 0, 0.04);
    s.closePath();
    const x = side * 0.45;
    return mesh(extrude(s, 0.03, 0.008, 12), std(0x15161c, 0.6, 0.35, { emissive: 0x2a1f55, emissiveIntensity: 0.25 }), x, 0.4, frameZ(0.77, k, x));
  };
  const cord = rod([[0.62, -0.1, frameZ(0.76, k, 0.62)], [0.66, -0.45, 0.6], [0.6, -0.8, 0.52]], 0.012, gunmetal);
  return group(frame, lens, wing(-1), wing(1), cord);
}

function buildHorusVisor(): THREE.Object3D {
  const metal = divineGold(0.25);
  const k = 0.25;
  const frame = mesh(bendToEye(extrude(ovalRing(0.66, 0.42, 0.56, 0.33), 0.06, 0.016, 72), k, 0.1), metal, 0, 0, 0.76);
  const visorShape = new THREE.Shape();
  visorShape.absellipse(0, 0, 0.565, 0.335, 0, Math.PI * 2, false, 0);
  const visor = mesh(bendToEye(new THREE.ShapeGeometry(visorShape, 64), k, 0.1), tintedLens(0x2850b0, 0.42), 0, 0, 0.762);
  // The falcon's markings: the brow line over, the tear line and the
  // spiral under, in gold, on the rim.
  const brow = rod([[-0.5, 0.48, frameZ(0.79, k, -0.5)], [0, 0.55, 0.79], [0.55, 0.5, frameZ(0.79, k, 0.55)]], 0.03, metal);
  const tear = rod([[0.05, -0.42, frameZ(0.79, k, 0.05)], [0.02, -0.6, 0.75], [-0.04, -0.72, 0.7]], 0.026, metal);
  const spiral: Array<[number, number, number]> = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    const a = t * Math.PI * 1.6;
    const r = 0.13 * (1 - t * 0.7);
    spiral.push([0.32 + Math.cos(a) * r, -0.5 - Math.sin(a) * r, frameZ(0.78, k, 0.32)]);
  }
  const curl = rod([[0.2, -0.38, frameZ(0.78, k, 0.2)], [0.3, -0.44, 0.76], ...spiral], 0.022, metal);
  return group(frame, visor, brow, tear, curl);
}

function buildOwlSpectacles(): THREE.Object3D {
  const metal = silver();
  const k = 0.24;
  const g = group();
  for (const side of [-1, 1]) {
    const x = side * 0.3;
    g.add(mesh(bendToEye(extrude(ovalRing(0.27, 0.27, 0.22, 0.22), 0.04, 0.01, 48), k, 0.1), metal, x, 0, frameZ(0.77, k, x)));
    const lensShape = new THREE.Shape();
    lensShape.absarc(0, 0, 0.225, 0, Math.PI * 2, false);
    g.add(mesh(bendToEye(new THREE.ShapeGeometry(lensShape, 40), k, 0.1), tintedLens(0xbfe2ff, 0.25), x, 0, frameZ(0.772, k, x)));
    // The owl's ear tufts: feathers of silver over each rim.
    const tuft = new THREE.Shape();
    tuft.moveTo(-0.07, 0);
    tuft.quadraticCurveTo(side * 0.02, 0.1, side * 0.1, 0.2);
    tuft.quadraticCurveTo(side * 0.06, 0.06, 0.08, 0);
    tuft.closePath();
    g.add(mesh(extrude(tuft, 0.025, 0.006, 10), metal, x + side * 0.12, 0.22, frameZ(0.79, k, x)));
  }
  const bridge = rod([[-0.05, 0.05, 0.79], [0, 0.09, 0.8], [0.05, 0.05, 0.79]], 0.018, metal);
  const owlEye = mesh(new THREE.SphereGeometry(0.035, 14, 10), enamel(0xe3c25e, 0.3), 0, 0.1, 0.81);
  return group(g, bridge, owlEye);
}

export const MYTHIC_EYEWEAR: Record<string, () => THREE.Object3D> = {
  "myth-raven-monocle": buildRavenMonocle,
  "myth-horus-visor": buildHorusVisor,
  "myth-owl-spectacles": buildOwlSpectacles,
};

// -------------------------------------------------------------------- head

/** A laurel leaf, light enough that two dozen of them stay in budget. */
function laurelLeaf(length: number, width: number, material: THREE.Material) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(width, -length * 0.45, 0, -length);
  s.quadraticCurveTo(-width, -length * 0.45, 0, 0);
  return mesh(extrude(s, 0.018, 0.005, 6), material);
}

function buildLaurelCrown(): THREE.Object3D {
  // Two branches of sunlit laurel rising from the clamp into a V, gold
  // leaves that give their own light.
  const metal = divineGold(0.45);
  const g = group();
  for (const side of [-1, 1]) {
    const stem: Array<[number, number, number]> = [];
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      stem.push([side * (0.08 + t * 0.32), 0.02 + t * 0.5 - t * t * 0.12, 0]);
    }
    g.add(rod(stem, 0.016, metal));
    for (let i = 1; i <= 6; i += 1) {
      const [x, y] = stem[Math.min(10, Math.round((i / 6) * 10))];
      for (const out of [-1, 1]) {
        const l = laurelLeaf(0.16, 0.07, metal);
        l.position.set(x, y, out * 0.02);
        l.rotation.set(0, 0, side * (0.9 + out * 0.5) - Math.PI);
        l.scale.setScalar(1 - i * 0.06);
        g.add(l);
      }
    }
  }
  const knot = mesh(new THREE.SphereGeometry(0.05, 16, 12), metal, 0, 0.02, 0);
  return group(g, knot, tubeClamp(gold(), 0.02));
}

function buildValkyrieWings(): THREE.Object3D {
  /* Moonlit steel-blue feathers with a frost sheen: white would vanish on her studio. */
  const feather = phys(0x5f7fb8, {
    metalness: 0.6, roughness: 0.25, clearcoat: 0.8, sheen: 1, sheenColor: 0xbfe6ff,
    iridescence: 0.6, emissive: 0x2a4f9f, emissiveIntensity: 0.35,
  });
  const metal = silver();
  const g = group();
  // A wing either side of the head, swept back along the tube.
  for (const side of [-1, 1]) {
    const wing = group();
    for (let i = 0; i < 5; i += 1) {
      const s = new THREE.Shape();
      const length = 0.62 - i * 0.08;
      s.moveTo(0, 0);
      s.quadraticCurveTo(0.06, length * 0.5, 0.02, length);
      s.quadraticCurveTo(-0.05, length * 0.5, -0.03, 0);
      s.closePath();
      const f = mesh(extrude(s, 0.02, 0.006, 10), feather, 0, 0, 0);
      f.rotation.z = -0.4 - i * 0.22;
      f.position.set(i * 0.02, i * 0.01, 0);
      wing.add(f);
    }
    wing.rotation.y = side > 0 ? 0 : Math.PI;
    wing.position.set(0, 0.06, side * 0.42);
    wing.rotation.x = side * 0.25;
    g.add(wing);
  }
  const gem = mesh(new THREE.OctahedronGeometry(0.07, 0), enamel(0x7fd3ff, 0.5, 0.15), 0, 0.12, 0);
  const crest = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.08, 16), metal, 0, 0.04, 0);
  return group(g, crest, gem, tubeClamp(metal, 0.024));
}

function buildPhoenixCrown(): THREE.Object3D {
  const vermilion = enamel(0xd6452f, 0.25, 0.3);
  const metal = divineGold(0.35);
  // A low gold crown with a crest, and three long tail plumes sweeping back.
  const band: Array<[number, number]> = [[0.0001, 0.12], [0.26, 0.12], [0.3, 0.02], [0.3, 0], [0.26, 0], [0.0001, 0.02]];
  const base = mesh(lathe(band, 48), metal);
  const underside = (r: number) => (r < 0.28 ? 0 : 0.02);
  base.position.y = -restingDrop(underside);
  const crest = group();
  for (let i = -2; i <= 2; i += 1) {
    const s = new THREE.Shape();
    s.moveTo(-0.035, 0);
    s.quadraticCurveTo(0, 0.25 - Math.abs(i) * 0.05, 0.035, 0);
    s.closePath();
    const plume = mesh(extrude(s, 0.02, 0.006, 10), i === 0 ? metal : vermilion, i * 0.07, 0.1, 0);
    plume.rotation.z = -i * 0.18;
    crest.add(plume);
  }
  const tails = group();
  for (const [z, hue] of [[-0.06, 0xd6452f], [0, 0xf0a03a], [0.06, 0x8f3fbf]] as const) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i += 1) {
      const t = i / 20;
      pts.push(new THREE.Vector3(-t * 0.85, 0.15 + Math.sin(t * Math.PI) * 0.35 - t * 0.3, z + Math.sin(t * 4) * 0.03));
    }
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.CatmullRomCurve3(pts));
    tails.add(mesh(taperedTube(path, t => 0.03 * (1 - t) + 0.006 + 0.025 * Math.sin(t * Math.PI), 60, 10), enamel(hue, 0.35, 0.3)));
    const eye = mesh(new THREE.SphereGeometry(0.035, 12, 10), metal, pts[20].x, pts[20].y, pts[20].z);
    tails.add(eye);
  }
  const jewel = mesh(new THREE.SphereGeometry(0.05, 16, 12), jade(0x3fbf8f), 0, 0.14, 0.24);
  return group(base, crest, tails, jewel, tubeClamp(gold(), 0.02));
}

export const MYTHIC_HEAD: Record<string, () => THREE.Object3D> = {
  "myth-laurel-crown": buildLaurelCrown,
  "myth-valkyrie-wings": buildValkyrieWings,
  "myth-phoenix-crown": buildPhoenixCrown,
};

// -------------------------------------------------------------------- neck

const fleece = () => std(0xffffff, 0.55, 0.45, {
  emissive: 0x3a2604, emissiveIntensity: 0.3,
  map: paint(256, 128, 7121, (ctx, rand, w, h) => {
    ctx.fillStyle = "#c9932f";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 240; i += 1) {
      const x = rand() * w;
      const y = rand() * h;
      ctx.strokeStyle = rand() > 0.5 ? "#f7d27a" : "#a8701c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 3 + rand() * 4, rand() * 6, rand() * 6 + 4);
      ctx.stroke();
    }
  }),
});

function buildGoldenFleece(): NeckPiece {
  const wool = fleece();
  const band = clothBand(wool, 0.3, 0.07);
  const left = tail(0.36, 0.18, wool);
  left.position.x = -0.07;
  left.rotation.z = 0.12;
  const right = tail(0.3, 0.16, wool);
  right.position.x = 0.08;
  right.rotation.z = -0.1;
  // A ram's-head clasp: a disc with two curled horns.
  const metal = divineGold(0.3);
  const disc = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 24), metal, 0, 0, 0.05);
  disc.rotation.x = Math.PI / 2;
  const horns = [-1, 1].map(side => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i <= 14; i += 1) {
      const a = (i / 14) * Math.PI * 1.5;
      const r = 0.06 * (1 - i / 22);
      pts.push([side * (0.06 + Math.cos(a) * r), 0.02 - Math.sin(a) * r, 0.06]);
    }
    return rod(pts, 0.014, metal);
  });
  return { band, front: group(left, right, disc, ...horns) };
}

function buildSelkieShawl(): NeckPiece {
  const sealskin = phys(0x8d9aa6, { roughness: 0.4, sheen: 1, sheenColor: 0xd7f0ff, sheenRoughness: 0.25, metalness: 0.2, iridescence: 0.4 });
  const band = clothBand(sealskin, 0.3, 0.06);
  const drape = tail(0.42, 0.22, sealskin);
  drape.rotation.set(-0.1, 0, 0.08);
  const pearls = [-0.06, 0, 0.06].map((x, i) => mesh(new THREE.SphereGeometry(0.04 + (i === 1 ? 0.01 : 0), 18, 14), pearl(), x, -0.42 - (i === 1 ? 0.05 : 0), 0.03));
  const clasp = mesh(new THREE.TorusGeometry(0.05, 0.015, 10, 28), silver(), 0, 0, 0.05);
  return { band, front: group(drape, ...pearls, clasp) };
}

const fiveStones = () => paint(256, 64, 7122, (ctx, _rand, w, h) => {
  const colours = ["#e84a5f", "#ffb347", "#ffe066", "#4fd1a5", "#5b8def"];
  colours.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect((i / 5) * w, 0, w / 5 + 1, h);
  });
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffffff";
  for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 2, h);
});

function buildNuwaRibbon(): NeckPiece {
  const silk = phys(0xffffff, { roughness: 0.4, sheen: 0.8, sheenColor: 0xffffff, map: fiveStones(), side: THREE.DoubleSide, emissive: 0x2a0a18, emissiveIntensity: 0.2 });
  const band = clothBand(silk, 0.24, 0.05);
  const left = tail(0.44, 0.12, silk);
  left.position.x = -0.06;
  left.rotation.z = 0.2;
  const right = tail(0.38, 0.12, silk);
  right.position.x = 0.07;
  right.rotation.z = -0.18;
  // The five stones that mended the sky, set in an arc on the knot.
  const stones = [0xe84a5f, 0xffb347, 0xffe066, 0x4fd1a5, 0x5b8def].map((c, i) => {
    const a = Math.PI * (0.15 + (i / 4) * 0.7);
    return mesh(new THREE.OctahedronGeometry(0.035, 1), enamel(c, 0.45, 0.15), Math.cos(a) * 0.1, Math.sin(a) * 0.05 - 0.02, 0.06);
  });
  return { band, front: group(left, right, ...stones) };
}

export const MYTHIC_NECK: Record<string, () => NeckPiece> = {
  "myth-golden-fleece": buildGoldenFleece,
  "myth-selkie-shawl": buildSelkieShawl,
  "myth-nuwa-ribbon": buildNuwaRibbon,
};

// --------------------------------------------------------------------- pins

function buildScarabPin(): THREE.Object3D {
  const metal = divineGold(0.3);
  // A lapis beetle with gold wings opened wide, holding a sun.
  const body = mesh(new THREE.SphereGeometry(0.11, 24, 18), lapis(), 0, -0.02, 0.06);
  body.scale.set(0.85, 1.15, 0.55);
  const head = mesh(new THREE.SphereGeometry(0.05, 16, 12), lapis(), 0, 0.12, 0.06);
  head.scale.z = 0.6;
  const sun = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24), divineGold(0.6), 0, 0.2, 0.05);
  sun.rotation.x = Math.PI / 2;
  const wings = [-1, 1].map(side => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.05);
    s.bezierCurveTo(side * 0.15, 0.12, side * 0.3, 0.06, side * 0.32, -0.04);
    s.bezierCurveTo(side * 0.22, -0.02, side * 0.1, -0.04, 0, -0.06);
    s.closePath();
    const wing = mesh(extrude(s, 0.02, 0.006, 16), metal, side * 0.05, 0, 0.03);
    return wing;
  });
  const feathers = [-1, 1].flatMap(side => [0.1, 0.18, 0.26].map(x =>
    rod([[side * x, 0.04, 0.06], [side * (x + 0.03), -0.04, 0.06]], 0.006, enamel(0x2e5bb8, 0.2))));
  return group(body, head, sun, ...wings, ...feathers, backPins());
}

function buildTriskelePin(): THREE.Object3D {
  const metal = gold();
  const greenEnamel = enamel(0x3f9a6e, 0.25, 0.25);
  const disc = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 48), greenEnamel, 0, 0, 0.02);
  disc.rotation.x = Math.PI / 2;
  const rim = mesh(new THREE.TorusGeometry(0.2, 0.018, 10, 56), metal, 0, 0, 0.04);
  // Three arms spiralling out from the middle, in raised gold.
  const arms = [0, 1, 2].map(k => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i <= 30; i += 1) {
      const t = i / 30;
      const a = (k / 3) * Math.PI * 2 + t * Math.PI * 2.2;
      const r = 0.02 + t * 0.15;
      pts.push([Math.cos(a) * r, Math.sin(a) * r, 0.05]);
    }
    return rod(pts, 0.014, metal);
  });
  return group(disc, rim, ...arms, backPins());
}

function buildQilinPin(): THREE.Object3D {
  const stone = jade(0x5fb39a);
  const metal = divineGold(0.3);
  const disc = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 48), stone, 0, 0, 0.025);
  disc.rotation.x = Math.PI / 2;
  const hole = mesh(new THREE.TorusGeometry(0.06, 0.018, 10, 32), metal, 0, 0, 0.055);
  // Cloud scrolls round the bi disc, and the qilin's single horn above.
  const scrolls = [0, 1, 2, 3].map(k => {
    const pts: Array<[number, number, number]> = [];
    const a0 = (k / 4) * Math.PI * 2 + Math.PI / 4;
    for (let i = 0; i <= 16; i += 1) {
      const t = i / 16;
      const a = a0 + t * Math.PI * 1.2;
      const r = 0.15 - t * 0.04;
      pts.push([Math.cos(a0) * 0.12 + Math.cos(a) * 0.04 * (1 - t), Math.sin(a0) * 0.12 + Math.sin(a) * 0.04 * (1 - t) + (r - 0.15) * 0, 0.058]);
    }
    return rod(pts, 0.01, metal);
  });
  const horn = rod([[0, 0.2, 0.04], [0.02, 0.28, 0.04], [0.06, 0.33, 0.04]], 0.016, metal);
  return group(disc, hole, ...scrolls, horn, backPins());
}

export const MYTHIC_PIN: Record<string, () => THREE.Object3D> = {
  "myth-scarab-pin": buildScarabPin,
  "myth-triskele-pin": buildTriskelePin,
  "myth-qilin-pin": buildQilinPin,
};

// ------------------------------------------------------------------- mouth

function buildAmbrosiaCup(): THREE.Object3D {
  const metal = divineGold(0.3);
  const top = jumpRing(0.045, 0.012, metal);
  const stem = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 10), metal, 0, -0.1, 0);
  // A wide kylix, its foot, and the ambrosia giving its own light.
  const cup = mesh(lathe([
    [0.0001, -0.42], [0.09, -0.42], [0.1, -0.4], [0.03, -0.36], [0.03, -0.3], [0.2, -0.24], [0.24, -0.16],
    [0.225, -0.16], [0.19, -0.225], [0.0001, -0.25],
  ], 48), metal);
  const nectar = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 40), std(0xffe9a8, 0.1, 0.15, { emissive: 0xffc94a, emissiveIntensity: 1.2 }), 0, -0.19, 0);
  const handles = [-1, 1].map(side => rod([[side * 0.2, -0.2, 0], [side * 0.29, -0.2, 0], [side * 0.27, -0.25, 0], [side * 0.2, -0.24, 0]], 0.012, metal));
  return group(top, stem, cup, nectar, ...handles);
}

function buildImmortalPeach(): THREE.Object3D {
  const top = jumpRing(0.045, 0.012, gold());
  const stem = mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.12, 10), std(0x6b4a2a, 0, 0.7), 0, -0.1, 0);
  const skin = std(0xffffff, 0, 0.45, {
    emissive: 0xff8fa3, emissiveIntensity: 0.15,
    map: paint(128, 128, 7131, (ctx, _rand, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#ff7f95");
      g.addColorStop(0.55, "#ffc4b0");
      g.addColorStop(1, "#ffe7c4");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }),
  });
  // The peach of the Queen Mother's garden, its cleft and its tip.
  const fruit = mesh(new THREE.SphereGeometry(0.18, 32, 24), skin, 0, -0.36, 0);
  fruit.scale.set(1, 1.05, 0.95);
  const cleft = mesh(new THREE.TorusGeometry(0.18, 0.01, 8, 40, Math.PI), std(0xd9536b, 0, 0.5), 0, -0.36, 0);
  cleft.rotation.y = Math.PI / 2;
  const tip = mesh(new THREE.ConeGeometry(0.05, 0.08, 16), skin, 0, -0.56, 0);
  tip.rotation.z = Math.PI;
  const leafMat = phys(0x5fae6b, { roughness: 0.3, clearcoat: 0.5 });
  const leaves = [-1, 1].map(side => {
    const l = leaf(0.18, 0.08, leafMat);
    l.position.set(side * 0.03, -0.17, 0.02);
    l.rotation.z = side * 1.1;
    return l;
  });
  return group(top, stem, fruit, cleft, tip, ...leaves);
}

export const MYTHIC_MOUTH: Record<string, () => THREE.Object3D> = {
  "myth-ambrosia-cup": buildAmbrosiaCup,
  "myth-immortal-peach": buildImmortalPeach,
};

// ------------------------------------------------------------------ charms

const runes = (colour: string) => paint(256, 128, 7141, (ctx, rand, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i += 1) {
    const x = 24 + i * 38;
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, 98);
    const kind = Math.floor(rand() * 3);
    if (kind === 0) { ctx.moveTo(x, 40); ctx.lineTo(x + 16, 56); }
    if (kind === 1) { ctx.moveTo(x, 60); ctx.lineTo(x + 16, 44); ctx.moveTo(x, 70); ctx.lineTo(x + 16, 86); }
    if (kind === 2) { ctx.moveTo(x - 12, 46); ctx.lineTo(x + 12, 70); }
    ctx.stroke();
  }
});

function buildMjolnir(): THREE.Object3D {
  const steel = std(0x8fa6c2, 0.9, 0.28, { envMapIntensity: 1.2 });
  const top = jumpRing(0.045, 0.012, silver());
  const loop = mesh(new THREE.TorusGeometry(0.03, 0.01, 8, 20), std(0x3a2c22, 0, 0.7), 0, -0.1, 0);
  const handle = mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.26, 16), std(0x5a3d28, 0, 0.6), 0, -0.25, 0);
  const wraps = [0, 1, 2, 3].map(i => {
    const w = mesh(new THREE.TorusGeometry(0.036, 0.008, 6, 20), std(0x3a2c22, 0, 0.7), 0, -0.16 - i * 0.05, 0);
    w.rotation.x = Math.PI / 2;
    return w;
  });
  const head = mesh(extrude(roundedRect(0.36, 0.18, 0.03), 0.18, 0.02, 8), steel, 0, -0.47, -0.09);
  // The runes on the face glow storm blue.
  const face = mesh(new THREE.PlaneGeometry(0.3, 0.13), std(0xffffff, 0, 0.5, {
    map: runes("#7fd3ff"), transparent: true, emissive: 0x4fb3ff, emissiveIntensity: 0.9,
    emissiveMap: runes("#ffffff"),
  }), 0, -0.47, 0.101);
  return group(top, loop, handle, ...wraps, head, face);
}

function buildPandoraJar(): THREE.Object3D {
  const clay = std(0xc98a5b, 0, 0.6);
  const metal = gold();
  const top = jumpRing(0.045, 0.012, metal);
  const jar = mesh(lathe([
    [0.0001, -0.7], [0.08, -0.7], [0.17, -0.6], [0.2, -0.46], [0.17, -0.32], [0.09, -0.24], [0.08, -0.2],
    [0.1, -0.18], [0.07, -0.18], [0.06, -0.22], [0.0001, -0.24],
  ], 40), clay);
  const bands = [-0.52, -0.38].map(y => {
    const b = mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 40), metal, 0, y, 0);
    b.rotation.x = Math.PI / 2;
    return b;
  });
  // What escaped, and what stayed: a column of light, and one bright hope.
  const light = mesh(new THREE.CylinderGeometry(0.01, 0.06, 0.12, 20, 1, true), std(0xfff3c4, 0, 0.3, {
    emissive: 0xffd36b, emissiveIntensity: 1.4, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
  }), 0, -0.13, 0);
  const hope = mesh(new THREE.SphereGeometry(0.03, 14, 10), std(0xffffff, 0, 0.2, { emissive: 0xfff3c4, emissiveIntensity: 1.6 }), 0, -0.07, 0.05);
  const bail = rod([[-0.08, -0.19, 0], [0, -0.09, 0], [0.08, -0.19, 0]], 0.01, metal);
  return group(top, jar, ...bands, light, hope, bail);
}

const cuneiform = (colour: string) => paint(256, 320, 7142, (ctx, rand, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = colour;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      if (rand() < 0.25) continue;
      const x = 24 + col * 30;
      const y = 26 + row * 32;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 12, y + 4);
      ctx.lineTo(x, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x + 10, y + 3, 10, 2);
    }
  }
});

function buildDestinyTablet(): THREE.Object3D {
  const metal = gold();
  const top = jumpRing(0.045, 0.012, metal);
  const tablet = mesh(extrude(roundedRect(0.3, 0.38, 0.06), 0.06, 0.02, 10), std(0xb88a5a, 0, 0.75), 0, -0.36, -0.03);
  const script = mesh(new THREE.PlaneGeometry(0.26, 0.33), std(0xffffff, 0, 0.6, {
    map: cuneiform("#ffd77a"), transparent: true, emissive: 0xffc04a, emissiveIntensity: 1, emissiveMap: cuneiform("#ffffff"),
  }), 0, -0.36, 0.051);
  const bail = rod([[0, -0.09, 0], [0, -0.17, 0]], 0.012, metal);
  return group(top, bail, tablet, script);
}

export const MYTHIC_CHARM: Record<string, () => THREE.Object3D> = {
  "myth-mjolnir": buildMjolnir,
  "myth-pandora-jar": buildPandoraJar,
  "myth-destiny-tablet": buildDestinyTablet,
};

// ---------------------------------------------------------------- earrings

function buildPegasusFeather(): THREE.Object3D {
  const metal = divineGold(0.3);
  const vane = std(0xffffff, 0.2, 0.35, {
    emissive: 0xfff6e0, emissiveIntensity: 0.2,
    map: paint(128, 256, 7151, (ctx, _rand, w, h) => {
      ctx.fillStyle = "#f8f5ee";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(210,190,140,0.6)";
      ctx.lineWidth = 2;
      for (let y = 10; y < h; y += 8) {
        ctx.beginPath();
        ctx.moveTo(w / 2, y);
        ctx.lineTo(4, y + 14);
        ctx.moveTo(w / 2, y);
        ctx.lineTo(w - 4, y + 14);
        ctx.stroke();
      }
    }),
  });
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.1, -0.08, 0.12, -0.36, 0.02, -0.56);
  s.bezierCurveTo(-0.06, -0.4, -0.1, -0.12, 0, 0);
  const blade = mesh(extrude(s, 0.02, 0.006, 24), vane, 0, -0.1, 0);
  const shaft = rod([[0, -0.08, 0.016], [0.01, -0.36, 0.018], [0.02, -0.66, 0.016]], 0.008, metal);
  const top = jumpRing(0.05, 0.012, metal);
  const link = jumpRing(0.022, 0.008, metal, -0.1);
  return group(top, link, blade, shaft);
}

function buildDragonPearl(): THREE.Object3D {
  const metal = gold();
  const orb = mesh(new THREE.SphereGeometry(0.13, 32, 24), phys(0xfff1e0, {
    roughness: 0.15, clearcoat: 1, iridescence: 1, sheen: 1, sheenColor: 0xffd0a0, emissive: 0xff8a3d, emissiveIntensity: 0.3,
  }), 0, -0.4, 0);
  // The flames that always ring a dragon's pearl.
  const flames = [0, 1, 2, 3, 4].map(k => {
    const a = (k / 5) * Math.PI * 2;
    const flame = mesh(lathe([[0.0001, 0], [0.035, 0.03], [0.03, 0.09], [0.0001, 0.16]], 16), std(0xff8a3d, 0, 0.4, {
      emissive: 0xff5a1f, emissiveIntensity: 1.1,
    }), Math.cos(a) * 0.13, -0.4 + Math.sin(a) * 0.13, 0);
    flame.rotation.z = a - Math.PI / 2;
    return flame;
  });
  const cap = mesh(new THREE.ConeGeometry(0.04, 0.06, 16, 1, true), metal, 0, -0.25, 0);
  cap.rotation.z = Math.PI;
  const top = jumpRing(0.05, 0.012, metal);
  const link = jumpRing(0.022, 0.008, metal, -0.1);
  const pin = rod([[0, -0.12, 0], [0, -0.24, 0]], 0.009, metal);
  return group(top, link, pin, cap, orb, ...flames);
}

function buildSeleneTear(): THREE.Object3D {
  const metal = silver();
  const moon = new THREE.Shape();
  moon.absarc(0, 0, 0.12, 0.6, Math.PI * 2 - 0.6, false);
  moon.absarc(0.06, 0, 0.09, Math.PI * 2 - 1, 1, true);
  const crescent = mesh(extrude(moon, 0.03, 0.008, 24), std(0xdfe6ff, 0.8, 0.2, { emissive: 0x8fa8ff, emissiveIntensity: 0.4 }), 0, -0.22, 0);
  crescent.rotation.z = Math.PI / 2;
  const profile: Array<[number, number]> = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    profile.push([i === 0 ? 0.0001 : 0.08 * Math.sin(Math.PI * Math.min(1, t * 1.2)) ** 0.8 * (1 - t * 0.6) + 0.01, -0.62 + t * 0.26]);
  }
  const tear = mesh(lathe(profile, 32), phys(0xc7d6ff, {
    roughness: 0.1, clearcoat: 1, sheen: 1, sheenColor: 0x9fc0ff, iridescence: 0.7, emissive: 0x4a6aff, emissiveIntensity: 0.25,
  }));
  const top = jumpRing(0.05, 0.012, metal);
  const link = jumpRing(0.022, 0.008, metal, -0.1);
  const pin = rod([[0, -0.12, 0], [0, -0.36, 0]], 0.008, metal);
  return group(top, link, pin, crescent, tear);
}

export const MYTHIC_EARRINGS: Record<string, () => THREE.Object3D> = {
  "myth-pegasus-feather": buildPegasusFeather,
  "myth-dragon-pearl": buildDragonPearl,
  "myth-selene-tear": buildSeleneTear,
};

// -------------------------------------------------------------------- brow

function buildHermesWing(): THREE.Object3D {
  const metal = divineGold(0.35);
  const feather = pearl(0xf7f3ea);
  // A small wing on the brow, its feathers laid back along the tube.
  const g = group();
  for (let i = 0; i < 5; i += 1) {
    const s = new THREE.Shape();
    const length = 0.32 - i * 0.04;
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.04, length * 0.5, 0.012, length);
    s.quadraticCurveTo(-0.03, length * 0.5, -0.02, 0);
    s.closePath();
    const f = mesh(extrude(s, 0.016, 0.005, 8), i === 0 ? metal : feather);
    f.rotation.x = -Math.PI / 2;
    f.rotation.z = -0.5 - i * 0.18;
    f.position.set(0.02, TUBE_FRONT + 0.08 + i * 0.008, -0.05 + i * 0.04);
    g.add(f);
  }
  const knot = mesh(new THREE.SphereGeometry(0.045, 14, 10), metal, ...onBrow(0, 0.08));
  return group(g, knot, browPost(metal, 0.06));
}

function buildGungnirCuff(): THREE.Object3D {
  const steel = std(0x9fb4c8, 0.9, 0.25, { envMapIntensity: 1.2 });
  const glow = std(0x7fd3ff, 0.2, 0.3, { emissive: 0x4fb3ff, emissiveIntensity: 1 });
  // The spear laid along the brow: shaft, rune bands that glow, the head.
  const shaft = rod([onBrow(-0.28, 0.07), onBrow(0.18, 0.07)], 0.018, std(0x5a3d28, 0, 0.6));
  const bands = [-0.18, -0.06].map(z => {
    const b = mesh(new THREE.TorusGeometry(0.024, 0.008, 8, 20), glow, ...onBrow(z, 0.07));
    return b;
  });
  const blade = new THREE.Shape();
  blade.moveTo(0, 0);
  blade.lineTo(0.05, 0.06);
  blade.lineTo(0, 0.2);
  blade.lineTo(-0.05, 0.06);
  blade.closePath();
  const head = mesh(extrude(blade, 0.02, 0.006, 8), steel);
  head.rotation.x = Math.PI / 2;
  head.position.set(...onBrow(0.16, 0.07));
  return group(shaft, ...bands, head, browPost(steel, 0.05));
}

export const MYTHIC_BROW: Record<string, () => THREE.Object3D> = {
  "myth-hermes-wing": buildHermesWing,
  "myth-gungnir-cuff": buildGungnirCuff,
};

// ---------------------------------------------------------------- necklaces

function buildBrisingamen(): THREE.Object3D {
  const metal = divineGold(0.3);
  const g = group(necklaceChain(metal, -0.1));
  // Flames of amber along the chain, the largest in the middle.
  const amber = (size: number) => mesh(lathe([[0.0001, 0], [size * 0.6, size * 0.4], [size * 0.45, size * 1.1], [0.0001, size * 1.7]], 20),
    phys(0xe39a2d, { roughness: 0.15, clearcoat: 1, emissive: 0xff7a1a, emissiveIntensity: 0.5 }));
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.65, 0.25, -0.05), new THREE.Vector3(-0.45, 0.02, 0.02),
    new THREE.Vector3(0, -0.1, 0.07), new THREE.Vector3(0.45, 0.02, 0.02), new THREE.Vector3(0.65, 0.25, -0.05),
  ]);
  for (const [t, size] of [[0.3, 0.06], [0.4, 0.075], [0.5, 0.11], [0.6, 0.075], [0.7, 0.06]] as const) {
    const p = curve.getPointAt(t);
    const flame = amber(size);
    flame.rotation.z = Math.PI;
    flame.position.set(p.x, p.y - 0.02, p.z + 0.02);
    g.add(flame);
  }
  return g;
}

function buildLamassuPendant(): THREE.Object3D {
  const metal = divineGold(0.3);
  const g = group(necklaceChain(metal, -0.1));
  const plaque = mesh(extrude(roundedRect(0.3, 0.24, 0.03), 0.04, 0.01, 8), metal, 0, -0.3, 0.06);
  const inlay = mesh(extrude(roundedRect(0.24, 0.18, 0.02), 0.02, 0.004, 8), lapis(), 0, -0.3, 0.1);
  // The guardian's great wing, feather on feather, raised over the lapis.
  const wing = group();
  for (let i = 0; i < 6; i += 1) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.16 - i * 0.02, 0.02);
    s.lineTo(0.15 - i * 0.02, -0.012);
    s.lineTo(0, -0.012);
    s.closePath();
    wing.add(mesh(extrude(s, 0.01, 0.003, 4), metal, -0.08, -0.24 - i * 0.022, 0.12));
  }
  const bail = jumpRing(0.03, 0.01, metal, -0.1);
  bail.position.z = 0.075;
  return group(g, bail, plaque, inlay, wing);
}

function buildNinetailPendant(): THREE.Object3D {
  const metal = silver();
  const g = group(necklaceChain(metal, -0.1));
  const fire = (hue: number) => std(hue, 0.2, 0.3, { emissive: hue, emissiveIntensity: 0.45 });
  // A crescent of moon-white with nine tails of violet fire fanning out.
  const moon = new THREE.Shape();
  moon.absarc(0, 0, 0.11, 0.5, Math.PI * 2 - 0.5, false);
  moon.absarc(0.05, 0, 0.085, Math.PI * 2 - 0.9, 0.9, true);
  const crescent = mesh(extrude(moon, 0.03, 0.008, 24), std(0xf6f2ff, 0.5, 0.2, { emissive: 0xb9a3ff, emissiveIntensity: 0.4 }), 0, -0.3, 0.07);
  crescent.rotation.z = -Math.PI / 2;
  const tails = Array.from({ length: 9 }, (_, i) => {
    const a = -Math.PI / 2 + (i - 4) * 0.16;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 12; k += 1) {
      const t = k / 12;
      const r = 0.06 + t * 0.28;
      pts.push(new THREE.Vector3(Math.cos(a + Math.sin(t * 3) * 0.15) * r, -0.36 + Math.sin(a) * r * 0.6, 0.06));
    }
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.CatmullRomCurve3(pts));
    return mesh(taperedTube(path, t => 0.034 * (1 - t) + 0.008, 24, 8), fire(i % 2 ? 0x6a3cff : 0xa33cff));
  });
  const bail = jumpRing(0.03, 0.01, metal, -0.1);
  bail.position.z = 0.075;
  return group(g, bail, crescent, ...tails);
}

export const MYTHIC_NECKLACE: Record<string, () => THREE.Object3D> = {
  "myth-brisingamen": buildBrisingamen,
  "myth-lamassu-pendant": buildLamassuPendant,
  "myth-ninetail-pendant": buildNinetailPendant,
};

/** Every id this collection can build, for the catalogue test. */
export const MYTHIC_BUILDABLE: readonly string[] = [
  MYTHIC_FINISHES, MYTHIC_PUPILS, MYTHIC_IRISES, MYTHIC_EYEWEAR, MYTHIC_HEAD, MYTHIC_NECK,
  MYTHIC_PIN, MYTHIC_MOUTH, MYTHIC_CHARM, MYTHIC_EARRINGS, MYTHIC_BROW, MYTHIC_NECKLACE,
].flatMap(record => Object.keys(record));

