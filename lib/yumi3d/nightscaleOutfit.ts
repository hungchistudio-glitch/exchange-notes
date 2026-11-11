import * as THREE from "three";

import { TUBE_FRONT, TUBE_RADIUS } from "./anatomy";
import {
  SHELL_REPEAT, bendToEye, clothBand, ellipseRing, extrude, group, irisCap, lathe, mesh, paint, phys,
  roundedRect, std, tail, taperedTube, tintedLens,
  type NeckPiece, type ShellFinish,
} from "./outfitKit";
import {
  backPins, browPost, frameZ, irisCanvas, jumpRing, necklaceChain, onBrow, onEye, ovalRing, ring, rod, tubeClamp, tubeTopAt,
} from "./station33Outfit";

/* =========================================================
   Nightscale｜夜鱗典藏 — 24 limited pieces (lib/shop/nightscaleCollection.ts)

   Unlocked by Hangyumi, every third word won (Chi, 2026-11-11). A tribute
   told only in symbols, never a name, a mark, a likeness or a uniform:
   black-mamba scales in lacquer with an olive sheen; 8 and 24; four in the
   morning; five rings, each apart from the others (never interlocked);
   twenty notches; 81; the fadeaway's arc; the empty gym before dawn.

   The palette is ink black and olive grey, warmed by gold, with purple
   only as a line or a band: an accent, never a jersey.

   Built the way the Mythic Vault and the Starwoven Relics are (their
   helpers come from station33Outfit.ts), in the same frames per slot,
   two pieces in every slot, with every part a solid with a back.
   ========================================================= */

// --------------------------------------------------------------- materials

const gold = () => std(0xd4ad52, 0.95, 0.24, { envMapIntensity: 1.2 });
const paleGold = () => std(0xe8cf8a, 0.9, 0.22, { envMapIntensity: 1.2 });
const ink = () => phys(0x151617, { roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.08 });
const matteInk = () => std(0x1c1d20, 0.15, 0.62);
const purple = () => phys(0x4b2a72, { roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1 });

/* Roughness in green, metalness in blue (ShellFinish.surface). */
const surfaceColour = (roughness: number, metalness: number) =>
  `rgb(0,${Math.round(roughness * 255)},${Math.round(metalness * 255)})`;

/**
 * Overlapping scales, row on row, each a little arch darker at its root
 * and lit along its free edge: a snake's back, not a fish's. `edge` is the
 * olive-grey that shows only where the light turns.
 */
function drawScales(
  ctx: CanvasRenderingContext2D, rand: () => number, w: number, h: number,
  { base, deep, edge, size }: { base: string; deep: string; edge: string; size: number },
) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const rows = Math.ceil(h / (size * 0.62)) + 1;
  const cols = Math.ceil(w / size) + 1;
  for (let row = 0; row < rows; row += 1) {
    const y = row * size * 0.62;
    const offset = row % 2 ? size / 2 : 0;
    for (let col = -1; col < cols; col += 1) {
      const x = col * size + offset;
      const g = ctx.createLinearGradient(x, y - size * 0.5, x, y + size * 0.3);
      g.addColorStop(0, deep);
      g.addColorStop(1, base);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - size / 2, y - size * 0.45);
      ctx.quadraticCurveTo(x - size / 2, y + size * 0.32, x, y + size * 0.36);
      ctx.quadraticCurveTo(x + size / 2, y + size * 0.32, x + size / 2, y - size * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.globalAlpha = 0.35 + rand() * 0.35;
      ctx.lineWidth = Math.max(1, size * 0.07);
      ctx.beginPath();
      ctx.moveTo(x - size * 0.46, y + size * 0.05);
      ctx.quadraticCurveTo(x - size * 0.42, y + size * 0.32, x, y + size * 0.35);
      ctx.quadraticCurveTo(x + size * 0.42, y + size * 0.32, x + size * 0.46, y + size * 0.05);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

const scaleTexture = (seed: number, size: number, repeat: [number, number] = [1, 1]) =>
  paint(256, 256, seed, (ctx, rand, w, h) => drawScales(ctx, rand, w, h, { base: "#1a1c18", deep: "#0b0c0b", edge: "#7d866a", size }), repeat);

/** Scale-patterned lacquer for small parts: black, with the olive at the edges. */
const scaleLacquer = (seed: number, size = 32) =>
  phys(0xffffff, { roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, map: scaleTexture(seed, size), sheen: 0.4, sheenColor: 0x8f9a70 });

/** A number in gold on clear ground, for a face plate: 81, 8, 24. */
const numeral = (text: string, colour: string, seed: number) => paint(256, 256, seed, (ctx, _rand, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = colour;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${text.length > 1 ? 150 : 190}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText(text, w / 2, h / 2 + 8);
});

/** A plane carrying a numeral, lit a little from within so it reads small. */
function numeralFace(text: string, width: number, height: number, seed: number) {
  return mesh(new THREE.PlaneGeometry(width, height), std(0xffffff, 0.6, 0.3, {
    map: numeral(text, "#e3c36e", seed), transparent: true, emissive: 0xc79a3c, emissiveIntensity: 0.35,
    emissiveMap: numeral(text, "#ffffff", seed), depthWrite: false,
  }));
}

// ---------------------------------------------------------------- shells

export const NIGHTSCALE_FINISHES: Record<string, ShellFinish> = {
  /* Black lacquer over fine scales, an olive-grey sheen only where it turns. */
  "ns-nightscale-lacquer": {
    color: 0xffffff, metalness: 0.25, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.08,
    sheen: 0.7, sheenColor: 0x8f9a70, sheenRoughness: 0.35,
    map: () => paint(512, 256, 8101, (ctx, rand, w, h) => drawScales(ctx, rand, w, h, {
      base: "#1d1f1b", deep: "#0a0b0a", edge: "#6f775d", size: 22,
    }), SHELL_REPEAT),
    surface: () => paint(512, 256, 8102, (ctx, _rand, w, h) => {
      ctx.fillStyle = surfaceColour(0.55, 0.2);
      ctx.fillRect(0, 0, w, h);
    }, SHELL_REPEAT),
  },
  /* Deep purple enamel, faint boards along the C, and one gold line. */
  "ns-dusk-court-enamel": {
    color: 0xffffff, metalness: 1, roughness: 1, clearcoat: 0.9, clearcoatRoughness: 0.1,
    map: () => paint(512, 256, 8103, (ctx, rand, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#2c1940");
      g.addColorStop(0.5, "#45275f");
      g.addColorStop(1, "#2c1940");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // The boards of a court, end to end along the C.
      for (let y = 0; y < h; y += 21) {
        ctx.fillStyle = "rgba(14,6,22,0.35)";
        ctx.fillRect(0, y, w, 1.5);
        for (let x = rand() * 120; x < w; x += 90 + rand() * 120) ctx.fillRect(x, y, 1.5, 21);
      }
      ctx.fillStyle = "#d9b45e";
      ctx.fillRect(0, h * 0.3, w, 3);
    }, SHELL_REPEAT),
    surface: () => paint(512, 256, 8104, (ctx, _rand, w, h) => {
      ctx.fillStyle = surfaceColour(0.3, 0.05);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = surfaceColour(0.22, 1);
      ctx.fillRect(0, h * 0.3, w, 3);
    }, SHELL_REPEAT),
  },
};

// ------------------------------------------------------------------ pupils

function buildFocusSlit(): THREE.Object3D {
  // A narrow upright slit in black, held in a thin gold rim.
  const slit = new THREE.Shape();
  slit.absellipse(0, 0, 0.065, 0.27, 0, Math.PI * 2, false, 0);
  const black = onEye(slit, std(0x060606, 0.2, 0.28), 0.07, 0.01);
  const rim = onEye(ovalRing(0.1, 0.305, 0.068, 0.272), std(0xe0b85a, 0.9, 0.22, { emissive: 0x8a6418, emissiveIntensity: 0.25 }), 0.05, 0.006);
  rim.position.z += 0.004;
  return group(black, rim);
}

function buildFigureEightPupil(): THREE.Object3D {
  // Two rings stacked into an 8, each with a gold eye at its middle.
  const dark = std(0x141217, 0.25, 0.3, { envMapIntensity: 0.6 });
  const metal = std(0xe0b85a, 0.9, 0.22, { emissive: 0x8a6418, emissiveIntensity: 0.3 });
  const loops = [0.118, -0.118].map(y => {
    const loop = onEye(ovalRing(0.13, 0.13, 0.062, 0.062), dark, 0.06, 0.012);
    loop.position.y = y;
    return loop;
  });
  const eyes = [0.118, -0.118].map(y => {
    const dot = new THREE.Shape();
    dot.absarc(0, 0, 0.05, 0, Math.PI * 2, false);
    const eye = onEye(dot, metal, 0.05, 0.01);
    eye.position.y = y;
    eye.position.z += 0.006;
    return eye;
  });
  return group(...loops, ...eyes);
}

export const NIGHTSCALE_PUPILS: Record<string, () => THREE.Object3D> = {
  "ns-focus-slit": buildFocusSlit,
  "ns-figure-eight-pupil": buildFigureEightPupil,
};

// ------------------------------------------------------------------ irises

/** Gold rayed with olive black, a bright ring round the pupil. */
const venomGold = () => irisCanvas(8111, (ctx, rand, R) => {
  const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
  g.addColorStop(0, "#5a3f0e");
  g.addColorStop(0.42, "#c9952c");
  g.addColorStop(0.78, "#e2b54e");
  g.addColorStop(1, "#6b4d14");
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.lineCap = "round";
  for (let i = 0; i < 120; i += 1) {
    const a = rand() * Math.PI * 2;
    const r0 = R * (0.4 + rand() * 0.1);
    const r1 = R * (0.7 + rand() * 0.25);
    ctx.strokeStyle = rand() > 0.35 ? "#2a2d1e" : "#f3d47e";
    ctx.globalAlpha = 0.25 + rand() * 0.4;
    ctx.lineWidth = 1 + rand() * 2.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a + (rand() - 0.5) * 0.1) * r1, Math.sin(a + (rand() - 0.5) * 0.1) * r1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ring(ctx, R * 0.42, 3, "#f6dc8c", 0.9);
  ring(ctx, R * 0.965, 6, "#1b1c12");
});

/** Night blue turning violet, a few late stars, and a hair of gold at the rim. */
const fourAm = () => irisCanvas(8112, (ctx, rand, R) => {
  const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
  g.addColorStop(0, "#090c24");
  g.addColorStop(0.5, "#1e2a5c");
  g.addColorStop(0.85, "#3c2a6e");
  g.addColorStop(1, "#140f2a");
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  for (let i = 0; i < 46; i += 1) {
    ctx.fillStyle = `rgba(214,222,255,${0.25 + rand() * 0.5})`;
    const a = rand() * Math.PI * 2;
    const r = R * (0.46 + rand() * 0.42);
    ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1.6, 1.6);
  }
  ring(ctx, R * 0.9, 2.2, "#e8c066", 0.95);
  ring(ctx, R * 0.965, 5, "#0b0a1a");
});

export const NIGHTSCALE_IRISES: Record<string, () => THREE.Object3D> = {
  "ns-venom-gold-iris": () => group(irisCap(venomGold(), 1.006, std(0xffffff, 0.35, 0.3, { emissive: 0x2a1a05, emissiveIntensity: 0.25 }))),
  "ns-four-am-iris": () => group(irisCap(fourAm(), 1.006, phys(0xffffff, { roughness: 0.2, clearcoat: 1, emissive: 0x141a3a, emissiveIntensity: 0.3 }))),
};

// ----------------------------------------------------------------- eyewear

function buildNightPracticeGoggles(): THREE.Object3D {
  const frameMat = phys(0x16171a, { roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const k = 0.27;
  // One wraparound frame and one smoked lens, as sports goggles are made.
  const frame = mesh(bendToEye(extrude(ovalRing(0.69, 0.4, 0.58, 0.3), 0.09, 0.024, 72), k, 0.1), frameMat, 0, 0, 0.765);
  const lensShape = new THREE.Shape();
  lensShape.absellipse(0, 0, 0.59, 0.31, 0, Math.PI * 2, false, 0);
  const lens = mesh(bendToEye(new THREE.ShapeGeometry(lensShape, 64), k, 0.1), tintedLens(0x2b2e36, 0.62), 0, 0, 0.77);
  const g = group(frame, lens);
  for (const side of [-1, 1]) {
    const x = side * 0.68;
    const z = frameZ(0.765, k, x);
    // The strap's clip, and on it one purple and one gold line.
    const clip = mesh(extrude(roundedRect(0.1, 0.22, 0.035), 0.08, 0.012), frameMat, x, 0, z);
    const lines = [[0.035, purple()], [-0.035, gold()]] as const;
    for (const [y, material] of lines) {
      g.add(mesh(new THREE.BoxGeometry(0.016, 0.022, 0.2), material, x * 1.02, y, z - 0.08));
    }
    const strap = mesh(new THREE.BoxGeometry(0.03, 0.15, 0.3), matteInk(), x * 1.02, 0, z - 0.2);
    g.add(clip, strap);
  }
  return g;
}

function buildFadeawayMonocle(): THREE.Object3D {
  const metal = gold();
  const k = 0.26;
  const frame = mesh(bendToEye(extrude(ovalRing(0.57, 0.57, 0.49, 0.49), 0.06, 0.016, 72), k, 0.12), metal, 0, 0, 0.76);
  const lensShape = new THREE.Shape();
  lensShape.absarc(0, 0, 0.495, 0, Math.PI * 2, false);
  const lens = mesh(bendToEye(new THREE.ShapeGeometry(lensShape, 64), k, 0.12), tintedLens(0xe7c873, 0.16), 0, 0, 0.762);
  // From the top of the rim, an arc that leans back and climbs: the shot's
  // flight from a body falling away, and the ball at its height.
  const arc: Array<[number, number, number]> = [];
  for (let i = 0; i <= 14; i += 1) {
    const t = i / 14;
    const x = 0.35 + t * 0.55;
    arc.push([x, 0.46 + Math.sin(t * Math.PI * 0.85) * 0.42, frameZ(0.77, k, Math.min(x, 0.6)) - t * 0.18]);
  }
  const flight = rod(arc, 0.014, metal);
  const end = arc[arc.length - 1];
  const ball = mesh(new THREE.SphereGeometry(0.07, 20, 14), std(0x17181a, 0.3, 0.5), end[0], end[1] + 0.03, end[2]);
  const seam = mesh(new THREE.TorusGeometry(0.071, 0.006, 6, 28), metal, end[0], end[1] + 0.03, end[2]);
  seam.rotation.y = Math.PI / 2;
  const seam2 = mesh(new THREE.TorusGeometry(0.071, 0.006, 6, 28), metal, end[0], end[1] + 0.03, end[2]);
  seam2.rotation.x = Math.PI / 2;
  const cord = rod([[-0.57, -0.1, frameZ(0.76, k, -0.57)], [-0.62, -0.45, 0.6], [-0.56, -0.8, 0.52]], 0.012, metal);
  return group(frame, lens, flight, ball, seam, seam2, cord);
}

export const NIGHTSCALE_EYEWEAR: Record<string, () => THREE.Object3D> = {
  "ns-night-practice-goggles": buildNightPracticeGoggles,
  "ns-fadeaway-monocle": buildFadeawayMonocle,
};

// -------------------------------------------------------------------- head

/** A band round the tube, as wide as `width` along it. */
function tubeBand(material: THREE.Material, width: number, thickness: number) {
  const band = mesh(new THREE.TorusGeometry(1, width / 2, 12, 64), material);
  // Squashed to the tube's oval; then turned to stand round it.
  band.scale.set(TUBE_FRONT + thickness, TUBE_RADIUS + thickness, 1);
  band.rotation.y = Math.PI / 2;
  band.position.y = -TUBE_RADIUS * 0.82;
  return band;
}

function buildFourAmHeadband(): THREE.Object3D {
  const terry = std(0xffffff, 0, 0.9, {
    map: paint(256, 128, 8121, (ctx, rand, w, h) => {
      ctx.fillStyle = "#1a1b1e";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i += 1) {
        ctx.fillStyle = rand() > 0.5 ? "rgba(70,72,78,0.5)" : "rgba(0,0,0,0.5)";
        ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
      }
    }),
  });
  const band = tubeBand(terry, 0.2, 0.05);
  // One purple stripe and one gold, round it.
  const stripes = [[0.055, purple()], [-0.055, gold()]].map(([x, material]) => {
    const s = ellipseRing(TUBE_FRONT + 0.1, TUBE_RADIUS + 0.1, 0.014, material as THREE.Material);
    s.rotation.y = Math.PI / 2;
    s.position.set(x as number, -TUBE_RADIUS * 0.82, 0);
    return s;
  });
  return group(band, ...stripes);
}

function buildFiveRingCirclet(): THREE.Object3D {
  const metal = gold();
  // Five rings in a row on a low black bar, each standing apart from the
  // next: won one at a time, never linked.
  const top = tubeTopAt(0) + 0.05;
  const at = [-0.34, -0.17, 0, 0.17, 0.34];
  const bar = rod([[-0.42, top, 0], [0.42, top, 0]], 0.026, ink());
  const rings = at.map(x => mesh(new THREE.TorusGeometry(0.07, 0.018, 10, 36), metal, x, top + 0.098, 0));
  const posts = at.map(x => mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.036, 8), metal, x, top + 0.022, 0));
  return group(bar, ...rings, ...posts, tubeClamp(ink(), 0.022));
}

export const NIGHTSCALE_HEAD: Record<string, () => THREE.Object3D> = {
  "ns-four-am-headband": buildFourAmHeadband,
  "ns-five-ring-circlet": buildFiveRingCirclet,
};

// -------------------------------------------------------------------- neck

function buildWarmupCollar(): NeckPiece {
  const nylon = phys(0x2c2d32, { roughness: 0.42, sheen: 0.8, sheenColor: 0x8a8e9a, clearcoat: 0.25 });
  // A tall stand collar, piped purple along one edge and gold along the other.
  const collar = clothBand(nylon, 0.3, 0.08);
  const pipeTop = clothBand(purple(), 0.036, 0.1);
  pipeTop.position.z = 0.15;
  const pipeLow = clothBand(gold(), 0.036, 0.1);
  pipeLow.position.z = -0.15;
  const band = group(collar, pipeTop, pipeLow);
  // Its zip, done up to the top, and the pull hanging from it.
  const metal = gold();
  const teeth = Array.from({ length: 9 }, (_, i) => mesh(new THREE.BoxGeometry(0.05, 0.014, 0.02), metal, 0, 0.13 - i * 0.032, 0.02));
  const slider = mesh(extrude(roundedRect(0.06, 0.05, 0.012), 0.03, 0.006), metal, 0, 0.15, 0.04);
  const pull = mesh(extrude(roundedRect(0.04, 0.11, 0.015), 0.018, 0.005), metal, 0, 0.08, 0.06);
  return { band, front: group(...teeth, slider, pull) };
}

function buildCoiledScaleScarf(): NeckPiece {
  const knit = phys(0xffffff, { roughness: 0.75, sheen: 0.8, sheenColor: 0x9aa47a, sheenRoughness: 0.5, map: scaleTexture(8131, 18, [2, 1]) });
  // Wound twice, the second turn a little looser than the first.
  const first = clothBand(knit, 0.26, 0.08);
  first.position.z = 0.05;
  const second = clothBand(knit, 0.22, 0.13);
  second.position.z = -0.07;
  const band = group(first, second);
  const left = tail(0.42, 0.17, knit);
  left.position.x = -0.06;
  left.rotation.z = 0.14;
  const right = tail(0.34, 0.15, knit);
  right.position.x = 0.08;
  right.rotation.z = -0.12;
  // A gold tip on the longer end, like the last scale of a tail.
  const tip = mesh(new THREE.ConeGeometry(0.03, 0.07, 14), gold(), -0.06 - Math.sin(0.14) * 0.42, -0.44, 0.02);
  tip.rotation.z = Math.PI + 0.14;
  return { band, front: group(left, right, tip) };
}

export const NIGHTSCALE_NECK: Record<string, () => NeckPiece> = {
  "ns-warmup-collar": buildWarmupCollar,
  "ns-coiled-scale-scarf": buildCoiledScaleScarf,
};

// --------------------------------------------------------------------- pins

/** A basketball's eight panels: the equator, one great circle, two curves. */
const ballSeams = () => paint(512, 256, 8141, (ctx, rand, w, h) => {
  ctx.fillStyle = "#18191b";
  ctx.fillRect(0, 0, w, h);
  // The pebbled leather.
  for (let i = 0; i < 5000; i += 1) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.25)";
    ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }
  ctx.strokeStyle = "#e0b85a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  for (const u of [0, 0.5, 1]) {
    ctx.moveTo(u * w, 0);
    ctx.lineTo(u * w, h);
  }
  for (const u of [0.25, 0.75]) {
    for (let i = 0; i <= 40; i += 1) {
      const v = i / 40;
      const x = (u + 0.1 * Math.sin(Math.PI * v) * (u < 0.5 ? 1 : -1)) * w;
      if (i) ctx.lineTo(x, v * h);
      else ctx.moveTo(x, v * h);
    }
  }
  ctx.stroke();
});

function buildSeamPin(): THREE.Object3D {
  // The seams are turned, not the ball: from the front it stays round.
  const geometry = new THREE.SphereGeometry(0.17, 40, 28);
  geometry.rotateY(-0.55);
  geometry.rotateX(0.4);
  const ball = mesh(geometry, std(0xffffff, 0.35, 0.5, { map: ballSeams(), envMapIntensity: 1 }), 0, 0, 0.07);
  ball.scale.z = 0.7;
  return group(ball, backPins());
}

function buildEightyOneMedal(): THREE.Object3D {
  const metal = gold();
  // A ribbon of purple with a gold stripe, and the medal hung from it.
  const ribbon = mesh(extrude(roundedRect(0.16, 0.13, 0.01), 0.02, 0.004), purple(), 0, 0.17, 0.02);
  const stripe = mesh(new THREE.BoxGeometry(0.03, 0.13, 0.03), metal, 0, 0.17, 0.025);
  const loop = mesh(new THREE.TorusGeometry(0.025, 0.008, 8, 20), metal, 0, 0.09, 0.03);
  const disc = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 48), metal, 0, -0.08, 0.03);
  disc.rotation.x = Math.PI / 2;
  const enamelFace = mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.045, 48), std(0x141416, 0.3, 0.35), 0, -0.08, 0.033);
  enamelFace.rotation.x = Math.PI / 2;
  const face = numeralFace("81", 0.2, 0.2, 8142);
  face.position.set(0, -0.08, 0.058);
  return group(ribbon, stripe, loop, disc, enamelFace, face, backPins(0.05));
}

export const NIGHTSCALE_PIN: Record<string, () => THREE.Object3D> = {
  "ns-seam-pin": buildSeamPin,
  "ns-eighty-one-medal": buildEightyOneMedal,
};

// ------------------------------------------------------------------- mouth

function buildDawnEspresso(): THREE.Object3D {
  const metal = gold();
  const glaze = phys(0x141415, { roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 });
  const top = jumpRing(0.045, 0.012, metal);
  const stem = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 10), metal, 0, -0.1, 0);
  // A small cup on its saucer, its rim gold, the crema catching the light.
  const cup = mesh(lathe([
    [0.0001, -0.36], [0.07, -0.36], [0.1, -0.33], [0.12, -0.26], [0.125, -0.2], [0.112, -0.2], [0.106, -0.25], [0.0001, -0.27],
  ], 40), glaze);
  const rim = mesh(new THREE.TorusGeometry(0.119, 0.008, 8, 40), metal, 0, -0.2, 0);
  rim.rotation.x = Math.PI / 2;
  const crema = mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.01, 36), std(0x8a5a2c, 0, 0.35), 0, -0.215, 0);
  const handle = rod([[0.12, -0.23, 0], [0.18, -0.24, 0], [0.18, -0.3, 0], [0.11, -0.31, 0]], 0.014, glaze);
  const saucer = mesh(lathe([[0.0001, -0.385], [0.2, -0.385], [0.22, -0.36], [0.2, -0.37], [0.0001, -0.372]], 40), glaze);
  const saucerRim = mesh(new THREE.TorusGeometry(0.215, 0.006, 6, 44), metal, 0, -0.362, 0);
  saucerRim.rotation.x = Math.PI / 2;
  const hanger = rod([[0, -0.14, 0], [0, -0.2, 0]], 0.01, metal);
  return group(top, stem, hanger, cup, rim, crema, handle, saucer, saucerRim);
}

function buildFourthQuarterFlask(): THREE.Object3D {
  const metal = gold();
  const body = std(0x202124, 0.2, 0.75);
  const top = jumpRing(0.045, 0.012, metal);
  // A gold cap at the top, a matte black bottle, one purple band.
  const cap = mesh(lathe([[0.0001, -0.2], [0.06, -0.2], [0.065, -0.15], [0.05, -0.1], [0.0001, -0.1]], 32), metal);
  const bail = rod([[-0.03, -0.1, 0], [0, -0.075, 0], [0.03, -0.1, 0]], 0.01, metal);
  const link = jumpRing(0.02, 0.008, metal, -0.08);
  const bottle = mesh(lathe([
    [0.0001, -0.66], [0.11, -0.66], [0.125, -0.63], [0.125, -0.3], [0.08, -0.23], [0.065, -0.2], [0.0001, -0.2],
  ], 40), body);
  const band = mesh(new THREE.CylinderGeometry(0.128, 0.128, 0.06, 40, 1, true), purple(), 0, -0.47, 0);
  return group(top, link, bail, cap, bottle, band);
}

export const NIGHTSCALE_MOUTH: Record<string, () => THREE.Object3D> = {
  "ns-dawn-espresso": buildDawnEspresso,
  "ns-fourth-quarter-flask": buildFourthQuarterFlask,
};

// ------------------------------------------------------------------ charms

function buildFourOclockHourglass(): THREE.Object3D {
  const metal = gold();
  const top = jumpRing(0.045, 0.012, metal);
  const bail = rod([[0, -0.09, 0], [0, -0.14, 0]], 0.012, metal);
  // Two gold ends held apart by three posts; violet glass; black sand
  // mostly fallen.
  const ends = [-0.16, -0.58].map(y => mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 32), metal, 0, y, 0));
  const posts = [0, 1, 2].map(i => {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    return mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), metal, Math.cos(a) * 0.12, -0.37, Math.sin(a) * 0.12);
  });
  const glass = mesh(lathe([
    [0.0001, -0.565], [0.08, -0.555], [0.095, -0.5], [0.07, -0.42], [0.016, -0.37], [0.07, -0.32], [0.095, -0.24], [0.08, -0.185], [0.0001, -0.175],
  ], 36), phys(0x7a5fb0, { roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.42, depthWrite: false, emissive: 0x2a1a4a, emissiveIntensity: 0.3 }));
  const sand = std(0x0d0d0e, 0, 0.9);
  const below = mesh(lathe([[0.0001, -0.55], [0.08, -0.55], [0.07, -0.5], [0.0001, -0.45]], 28), sand);
  const above = mesh(lathe([[0.0001, -0.38], [0.04, -0.33], [0.05, -0.3], [0.0001, -0.3]], 24), sand);
  const stream = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), sand, 0, -0.41, 0);
  return group(top, bail, ...ends, ...posts, glass, below, above, stream);
}

function buildEmptyGymKey(): THREE.Object3D {
  const metal = paleGold();
  const top = jumpRing(0.045, 0.012, metal);
  // An old key: a round bow with scales cut into its face, a long shank,
  // and plain teeth.
  const bow = mesh(new THREE.TorusGeometry(0.1, 0.022, 12, 40), metal, 0, -0.2, 0);
  const face = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 36), std(0xffffff, 0.5, 0.45, {
    map: paint(256, 256, 8151, (ctx, rand, w, h) => drawScales(ctx, rand, w, h, { base: "#2a2418", deep: "#120f09", edge: "#e0bd6a", size: 44 })),
  }), 0, -0.2, 0);
  face.rotation.x = Math.PI / 2;
  const shank = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 12), metal, 0, -0.51, 0);
  const collar = mesh(new THREE.TorusGeometry(0.026, 0.01, 8, 20), metal, 0, -0.33, 0);
  collar.rotation.x = Math.PI / 2;
  const teeth = [
    mesh(new THREE.BoxGeometry(0.09, 0.04, 0.025), metal, 0.055, -0.66, 0),
    mesh(new THREE.BoxGeometry(0.06, 0.03, 0.025), metal, 0.04, -0.6, 0),
  ];
  return group(top, bow, face, shank, collar, ...teeth);
}

export const NIGHTSCALE_CHARM: Record<string, () => THREE.Object3D> = {
  "ns-four-oclock-hourglass": buildFourOclockHourglass,
  "ns-empty-gym-key": buildEmptyGymKey,
};

// ---------------------------------------------------------------- earrings

function buildFangDrop(): THREE.Object3D {
  const metal = gold();
  const top = jumpRing(0.05, 0.012, metal);
  const link = jumpRing(0.022, 0.008, metal, -0.1);
  const cap = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.05, 20), metal, 0, -0.17, 0);
  // One fang, curving forward as it falls, black enamel to a gold point.
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    pts.push(new THREE.Vector3(Math.sin(t * 1.3) * 0.12, -0.19 - t * 0.42, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const whole = new THREE.CurvePath<THREE.Vector3>();
  whole.add(curve);
  const fang = mesh(taperedTube(whole, t => 0.048 * (1 - t) ** 0.8 + 0.004, 40, 14), phys(0x111213, { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const tipAt = curve.getPointAt(0.86);
  const tipTo = curve.getPointAt(1);
  const tip = mesh(new THREE.ConeGeometry(0.012, tipTo.distanceTo(tipAt) + 0.01, 12), metal, (tipAt.x + tipTo.x) / 2, (tipAt.y + tipTo.y) / 2, 0);
  tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tipTo.clone().sub(tipAt).normalize());
  return group(top, link, cap, fang, tip);
}

function buildSwishNet(): THREE.Object3D {
  const metal = gold();
  const cord = std(0xf1ead8, 0, 0.7);
  const top = jumpRing(0.05, 0.012, metal);
  const link = jumpRing(0.022, 0.008, metal, -0.1);
  const hanger = rod([[0, -0.14, 0], [0, -0.2, -0.12]], 0.009, metal);
  // A little rim, and its net in diamonds, narrowing as it falls.
  const rim = mesh(new THREE.TorusGeometry(0.12, 0.013, 8, 40), metal, 0, -0.2, 0);
  rim.rotation.x = Math.PI / 2;
  const strands = group();
  const at = (a: number, t: number): [number, number, number] => {
    const r = 0.115 - t * 0.05;
    return [Math.cos(a) * r, -0.21 - t * 0.24, Math.sin(a) * r];
  };
  // Sixteen fine strands, two ways round, crossing into diamonds: thin
  // tubes of four sides with no end caps, so the net stays light.
  for (let k = 0; k < 8; k += 1) {
    for (const turn of [-1, 1]) {
      const a0 = (k / 8) * Math.PI * 2;
      const pts = Array.from({ length: 6 }, (_, i) => new THREE.Vector3(...at(a0 + turn * i * 0.16, i / 5)));
      strands.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.0045, 4, false), cord));
    }
  }
  const hem = mesh(new THREE.TorusGeometry(0.065, 0.005, 6, 32), cord, 0, -0.45, 0);
  hem.rotation.x = Math.PI / 2;
  return group(top, link, hanger, rim, strands, hem);
}

export const NIGHTSCALE_EARRINGS: Record<string, () => THREE.Object3D> = {
  "ns-fang-drop": buildFangDrop,
  "ns-swish-net": buildSwishNet,
};

// -------------------------------------------------------------------- brow

function buildScaleCuff(): THREE.Object3D {
  const metal = gold();
  // One plate laid along the brow, its face scaled like a snake's back,
  // held in a gold rim with a ridge down its middle.
  const texture = scaleTexture(8181, 30);
  texture.repeat.set(3, 3);
  const skin = phys(0xffffff, { map: texture, roughness: 0.5, metalness: 0.2, clearcoat: 0.25, clearcoatRoughness: 0.3 });
  const plate = mesh(extrude(roundedRect(0.12, 0.56, 0.05), 0.022, 0.008, 12), skin);
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(...onBrow(0, 0.075));
  const rim: Array<[number, number, number]> = [];
  for (let i = 0; i <= 32; i += 1) {
    const a = (i / 32) * Math.PI * 2;
    rim.push(onBrow(Math.sin(a) * 0.285, 0.088));
    rim[i][0] = Math.cos(a) * 0.066;
  }
  const edge = rod(rim, 0.009, metal, true);
  const ridge = rod([onBrow(-0.25, 0.092), onBrow(0.25, 0.092)], 0.007, metal);
  return group(plate, edge, ridge, browPost(metal, 0.07));
}

function buildTwentyNotches(): THREE.Object3D {
  const metal = gold();
  // A black bar along the brow, with twenty gold notches round it.
  const bar = rod([onBrow(-0.27, 0.07), onBrow(0.27, 0.07)], 0.028, ink());
  const notches = Array.from({ length: 20 }, (_, i) =>
    mesh(new THREE.TorusGeometry(0.031, 0.006, 6, 20), metal, ...onBrow(-0.24 + i * (0.48 / 19), 0.07)));
  const ends = [-0.28, 0.28].map(z => mesh(new THREE.SphereGeometry(0.034, 14, 10), metal, ...onBrow(z, 0.07)));
  return group(bar, ...notches, ...ends, browPost(metal, 0.06));
}

export const NIGHTSCALE_BROW: Record<string, () => THREE.Object3D> = {
  "ns-scale-cuff": buildScaleCuff,
  "ns-twenty-notches": buildTwentyNotches,
};

// ---------------------------------------------------------------- necklaces

function buildCoiledSerpentChain(): THREE.Object3D {
  const metal = std(0x202220, 0.85, 0.35, { envMapIntensity: 1.1 });
  const g = group(necklaceChain(metal, -0.1));
  // One coil at the front, flat, and its head raised a little out of it.
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i += 1) {
    const t = i / 40;
    const a = Math.PI / 2 + t * Math.PI * 3.2;
    const r = 0.04 + t * 0.1;
    pts.push(new THREE.Vector3(Math.cos(a) * r, -0.3 + Math.sin(a) * r, 0.07 + t * 0.01));
  }
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(new THREE.CatmullRomCurve3(pts));
  const body = mesh(taperedTube(path, t => 0.012 + 0.022 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5), 90, 10), scaleLacquer(8161, 20));
  const head = mesh(new THREE.SphereGeometry(0.05, 20, 14), ink(), 0, -0.26, 0.12);
  head.scale.set(0.85, 1.25, 0.6);
  const eyes = [-1, 1].map(side => mesh(new THREE.SphereGeometry(0.011, 10, 8), gold(), side * 0.026, -0.24, 0.145));
  const bail = jumpRing(0.03, 0.01, metal, -0.1);
  bail.position.z = 0.075;
  g.add(body, head, ...eyes, bail);
  return g;
}

function buildTwoBanners(): THREE.Object3D {
  const metal = gold();
  const g = group(necklaceChain(metal, -0.1));
  const bail = jumpRing(0.03, 0.01, metal, -0.1);
  bail.position.z = 0.075;
  // A thin gold bar, and from it two small banners, 8 and 24.
  const bar = rod([[-0.16, -0.17, 0.08], [0.16, -0.17, 0.08]], 0.012, metal);
  const drop = rod([[0, -0.11, 0.075], [0, -0.17, 0.08]], 0.01, metal);
  const banner = new THREE.Shape();
  banner.moveTo(-0.055, 0);
  banner.lineTo(0.055, 0);
  banner.lineTo(0.055, -0.17);
  banner.lineTo(0, -0.14);
  banner.lineTo(-0.055, -0.17);
  banner.closePath();
  const cloth = purple();
  for (const [x, text, seed] of [[-0.075, "8", 8171], [0.075, "24", 8172]] as const) {
    const flag = mesh(extrude(banner, 0.012, 0.004, 6), cloth, x, -0.18, 0.08);
    const edge = rod([[x - 0.055, -0.18, 0.088], [x + 0.055, -0.18, 0.088]], 0.006, metal);
    const face = numeralFace(text, 0.1, 0.1, seed);
    face.position.set(x, -0.245, 0.0885);
    g.add(flag, edge, face);
  }
  g.add(bail, bar, drop);
  return g;
}

export const NIGHTSCALE_NECKLACE: Record<string, () => THREE.Object3D> = {
  "ns-coiled-serpent-chain": buildCoiledSerpentChain,
  "ns-two-banners": buildTwoBanners,
};

/** Every id this collection can build, for the catalogue test. */
export const NIGHTSCALE_BUILDABLE: readonly string[] = [
  NIGHTSCALE_FINISHES, NIGHTSCALE_PUPILS, NIGHTSCALE_IRISES, NIGHTSCALE_EYEWEAR, NIGHTSCALE_HEAD, NIGHTSCALE_NECK,
  NIGHTSCALE_PIN, NIGHTSCALE_MOUTH, NIGHTSCALE_CHARM, NIGHTSCALE_EARRINGS, NIGHTSCALE_BROW, NIGHTSCALE_NECKLACE,
].flatMap(record => Object.keys(record));
