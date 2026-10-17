import * as THREE from "three";

import { EYE_RADIUS, TUBE_FRONT, TUBE_RADIUS } from "./anatomy";
import {
  SHELL_REPEAT, bendToEye, brass, chain, clothBand, ellipseRing, extrude, glaze, group, irisCap, lathe,
  mesh, paint, phys, radialShape, roundedRect, std, stripes, tail, taperedTube, tintedLens,
  type NeckPiece, type ShellFinish,
} from "./outfitKit";

/* =========================================================
   Station 33 — the second collection

   Thirty-six pieces, three for each slot, from Chi's design book
   (station33-design, "Station-33-New-Collection.pdf" and its item specs,
   2026-10-17). Built the way every other piece is: from primitives and
   painted canvases, so there are no model files and a piece looks the same
   on the stand, in its picture and on the home screen.

   Rules the book set, kept here:
   - Every piece is attached. Hats rest on the tube (worked out from the
     tube's own section, below), brow pieces clamp round it, earrings and
     charms hang from a cuff and a chain, pins have back pins that go into
     the shell. Nothing floats beside her.
   - One earring, never a pair.
   - Every part has thickness and a back: extruded or lathed solids, not
     planes, wherever a reader could turn her to see behind.
   - Materials are static. Textures are painted once from a fixed seed; no
     glass that needs a second render pass (no transmission) on a phone.

   Each builder returns its piece in the frame outfit.ts puts it in:
     pupil, iris   the look frame: +Z out of the eye, surface at EYE_RADIUS
     eyewear       the eye frame, which follows the gaze but not the blink
     head          headAnchor: +Y out from the top of the tube, the tube
                   running along X, its centre 0.82 tube radii below
     neck          a band (in the tube's ring frame) and a front
     pin           pinAnchor: on the front of the tube, +Z out
     mouth, charm  hanging: the origin is where the chain ends
     earrings      hanging the same way, from the cuff's chain
     brow          the tube's ring frame: X outward, Y forward, Z along it
     necklace      the necklace centre, studs at x = ±0.65, y = +0.25
   ========================================================= */

// --------------------------------------------------------------- materials

const enamel = (color: THREE.ColorRepresentation, roughness = 0.28, clearcoat = 0.7) =>
  phys(color, { roughness, clearcoat, clearcoatRoughness: 0.1 });
const gold = () => brass();
const darkMetal = () => std(0x2b3036, 0.7, 0.35);

/** A ring to hang from, its top at the origin, in the X-Y plane. */
function jumpRing(radius: number, tube: number, material: THREE.Material, y = 0) {
  return mesh(new THREE.TorusGeometry(radius, tube, 10, 32), material, 0, y - radius);
}

/** A rod along points, round in section, closed at both ends. */
function rod(points: Array<[number, number, number]>, radius: number, material: THREE.Material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
  const g = group(mesh(new THREE.TubeGeometry(curve, Math.min(160, Math.max(16, points.length * 6)), radius, 8, closed), material));
  if (!closed) {
    const cap = new THREE.SphereGeometry(radius, 10, 8);
    g.add(mesh(cap, material, ...points[0]), mesh(cap, material, ...points[points.length - 1]));
  }
  return g;
}

/** Where the top of the tube is, in the head frame, at a depth z. */
function tubeTopAt(z: number) {
  const c = -TUBE_RADIUS * 0.82;
  const s = Math.max(0, 1 - (z / TUBE_FRONT) ** 2);
  return c + TUBE_RADIUS * Math.sqrt(s);
}

/**
 * How far down a hat can sit on the tube: the hat's underside is given as
 * a height at each distance from its axis, and the answer is the drop that
 * makes it touch the tube's section and go no lower. Hats then rest on
 * her instead of hovering over or sinking into her.
 */
function restingDrop(underside: (r: number) => number) {
  let gap = Infinity;
  for (let i = 0; i <= 120; i += 1) {
    const z = (i / 120) * TUBE_FRONT * 0.999;
    gap = Math.min(gap, underside(z) - tubeTopAt(z));
  }
  return gap;
}

// ---------------------------------------------------------------- shells

/* Roughness in green, metalness in blue (ShellFinish.surface). */
const surfaceColour = (roughness: number, metalness: number) =>
  `rgb(0,${Math.round(roughness * 255)},${Math.round(metalness * 255)})`;

/* Two thin tea-gold rings round the tube, twice per repeat: at most twelve
   on the whole C, so they read as bands, not as glitter. */
const BASALT_BANDS = [0.17, 0.2, 0.67, 0.7];

export const STATION33_FINISHES: Record<string, ShellFinish> = {
  "s33-basalt-tea": {
    color: 0xffffff, metalness: 1, roughness: 1, envMapIntensity: 0.95,
    map: () => paint(512, 256, 3301, (ctx, rand, w, h) => {
      ctx.fillStyle = "#374642";
      ctx.fillRect(0, 0, w, h);
      // Stone, in broad soft patches only: no fine noise to shimmer.
      for (let i = 0; i < 46; i += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 40 + rand() * 110;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rand() > 0.5 ? "rgba(84,101,95,0.32)" : "rgba(24,32,30,0.38)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.fillStyle = "#c9a45c";
      for (const u of BASALT_BANDS) ctx.fillRect(u * w, 0, 4, h);
    }, SHELL_REPEAT),
    surface: () => paint(512, 256, 3302, (ctx, _rand, w, h) => {
      ctx.fillStyle = surfaceColour(0.72, 0.15);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = surfaceColour(0.3, 0.9);
      for (const u of BASALT_BANDS) ctx.fillRect(u * w, 0, 4, h);
    }, SHELL_REPEAT),
  },
  "s33-opal-pearl": {
    color: 0xffffff, metalness: 0.08, roughness: 0.28, clearcoat: 0.65, clearcoatRoughness: 0.12,
    map: () => paint(512, 256, 3303, (ctx, rand, w, h) => {
      // Porcelain fired with a pearl glaze: warm white, and low bands of
      // lilac and peach round the tube, the way light moves on opal.
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#d8cbdb");
      g.addColorStop(0.22, "#efe7e6");
      g.addColorStop(0.45, "#cdbfd4");
      g.addColorStop(0.68, "#f1e6df");
      g.addColorStop(0.86, "#d3c4d8");
      g.addColorStop(1, "#d8cbdb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 60 + rand() * 120;
        const s = ctx.createRadialGradient(x, y, 0, x, y, r);
        s.addColorStop(0, rand() > 0.5 ? "rgba(190,176,220,0.18)" : "rgba(250,226,212,0.2)");
        s.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = s;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, SHELL_REPEAT),
  },
  "s33-oxidized-copper": {
    color: 0xffffff, metalness: 1, roughness: 1, envMapIntensity: 1,
    map: () => copperPatina("colour"),
    surface: () => copperPatina("surface"),
  },
};

/* Patina and the copper under it, from one seed, so the bare copper in the
   colour map is exactly where the metal is in the surface map. */
function copperPatina(kind: "colour" | "surface") {
  return paint(512, 256, 3304, (ctx, rand, w, h) => {
    const colour = kind === "colour";
    ctx.fillStyle = colour ? "#407c76" : surfaceColour(0.58, 0.55);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i += 1) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 24 + rand() * 80;
      const light = rand() > 0.45;
      if (!colour) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, light ? "rgba(122,182,166,0.4)" : "rgba(34,78,74,0.42)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Worn edges: the copper shows along the rim of the tube's section and
    // in a few rubbed places, as on an old vessel's handles.
    ctx.fillStyle = colour ? "#b8754b" : surfaceColour(0.25, 0.9);
    for (const v of [0.02, 0.97]) ctx.fillRect(0, v * h, w, h * 0.035);
    for (let i = 0; i < 9; i += 1) {
      const x = rand() * w;
      const y = rand() * h;
      ctx.beginPath();
      ctx.ellipse(x, y, 10 + rand() * 22, 4 + rand() * 7, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, SHELL_REPEAT);
}

// ----------------------------------------------------------------- pupils

/**
 * A polygon with every corner rounded off in the outline itself. A bevel
 * cannot do this: on an acute corner its offset outline crosses itself and
 * the face loses triangles (the arrow's wing tips came out as thin lines).
 */
function roundedPolygon(points: Array<[number, number]>, radius: number) {
  const s = new THREE.Shape();
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const [px, py] = points[(i + n - 1) % n];
    const [cx, cy] = points[i];
    const [nx, ny] = points[(i + 1) % n];
    const a = Math.hypot(px - cx, py - cy);
    const b = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, a / 2.2, b / 2.2);
    const inX = cx + ((px - cx) / a) * r;
    const inY = cy + ((py - cy) / a) * r;
    const outX = cx + ((nx - cx) / b) * r;
    const outY = cy + ((ny - cy) / b) * r;
    if (i === 0) s.moveTo(inX, inY);
    else s.lineTo(inX, inY);
    s.quadraticCurveTo(cx, cy, outX, outY);
  }
  s.closePath();
  return s;
}

/**
 * A pupil shape set into the front of the eye, where the other pupils sit.
 * Not bent to the eye's curve: an extruded face has vertices only round its
 * outline, so bending it sinks the middle of the face under the eyeball.
 */
function onEye(shape: THREE.Shape, material: THREE.Material, depth = 0.06, bevel = 0.016) {
  return mesh(extrude(shape, depth, bevel, 40), material, 0, 0, EYE_RADIUS * 0.97);
}

function buildCompassArrow(): THREE.Object3D {
  const s = roundedPolygon([[0, 0.31], [0.225, -0.25], [0, -0.12], [-0.225, -0.25]], 0.035);
  return group(onEye(s, std(0x26343d, 0.1, 0.3, { envMapIntensity: 0.6 }), 0.07, 0.008));
}

function buildSixBlade(): THREE.Object3D {
  const blade = std(0x303a38, 0.25, 0.32, { envMapIntensity: 0.7 });
  const g = group();
  // Six leaves of an aperture, each overlapping the next a little.
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
    const at = (r: number, da: number): [number, number] => [Math.cos(a + da) * r, Math.sin(a + da) * r];
    const s = roundedPolygon([at(0.11, -0.55), at(0.31, -0.06), at(0.17, 0.48)], 0.02);
    const leaf = onEye(s, blade, 0.04, 0.006);
    leaf.position.z += (i % 2) * 0.006;
    g.add(leaf);
  }
  const hole = new THREE.Shape();
  hole.absarc(0, 0, 0.125, 0, Math.PI * 2, false);
  const centre = onEye(hole, std(0x080a0a, 0.2, 0.25), 0.05, 0.012);
  centre.position.z += 0.012;
  return group(g, centre);
}

function buildEightPetal(): THREE.Object3D {
  const s = radialShape(256, (_i, a) => 0.2 + 0.09 * Math.pow(Math.abs(Math.cos(4 * (a - Math.PI / 2))), 0.75));
  return group(onEye(s, std(0x29354b, 0, 0.38, { envMapIntensity: 0.6 }), 0.06, 0.018));
}

export const STATION33_PUPILS: Record<string, () => THREE.Object3D> = {
  "s33-compass-arrow": buildCompassArrow,
  "s33-six-blade": buildSixBlade,
  "s33-eight-petal": buildEightPetal,
};

// ------------------------------------------------------------------ irises

function irisCanvas(seed: number, draw: (ctx: CanvasRenderingContext2D, rand: () => number, R: number) => void) {
  return paint(256, 256, seed, (ctx, rand, w) => {
    ctx.save();
    ctx.translate(w / 2, w / 2);
    draw(ctx, rand, w / 2);
    ctx.restore();
  });
}

function ring(ctx: CanvasRenderingContext2D, r: number, width: number, colour: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Tea held to the light: amber fibres, a pale gold inner ring, a dark rim. */
const teaIris = () => irisCanvas(3311, (ctx, rand, R) => {
  const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
  g.addColorStop(0, "#3e2a12");
  g.addColorStop(0.42, "#c99d57");
  g.addColorStop(0.72, "#9b763d");
  g.addColorStop(0.92, "#5d3f1d");
  g.addColorStop(1, "#2c1c0b");
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.lineCap = "round";
  for (let i = 0; i < 220; i += 1) {
    const a = rand() * Math.PI * 2;
    const bend = (rand() - 0.5) * 0.1;
    const r0 = R * (0.36 + rand() * 0.1);
    const r1 = R * (0.7 + rand() * 0.24);
    ctx.globalAlpha = 0.18 + rand() * 0.3;
    ctx.strokeStyle = rand() > 0.5 ? "#ecd096" : "#55361a";
    ctx.lineWidth = 0.8 + rand() * 1.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a + bend) * r1, Math.sin(a + bend) * r1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ring(ctx, R * 0.5, 3, "#f1d99b", 0.75);
  ring(ctx, R * 0.965, 5, "#2a1a0a");
});

/** A watch dial's sunray, in champagne: even, fine, and a clean black centre. */
const sunrayIris = () => irisCanvas(3312, (ctx, _rand, R) => {
  ctx.fillStyle = "#c4af76";
  ctx.fillRect(-R, -R, R * 2, R * 2);
  for (let r = R * 0.38; r < R * 0.95; r += 5) ring(ctx, r, 1, "#fff6d6", 0.07);
  for (let i = 0; i < 180; i += 1) {
    const a = (i / 180) * Math.PI * 2;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = i % 2 ? "#f2e6bd" : "#93804a";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.36, Math.sin(a) * R * 0.36);
    ctx.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ring(ctx, R * 0.37, 2, "#5e4f2a");
  ring(ctx, R * 0.965, 4.5, "#47391b");
});

/** Rings of sea green and amber, like water caught in glass. */
const lagoonIris = () => irisCanvas(3313, (ctx, _rand, R) => {
  ctx.fillStyle = "#478e98";
  ctx.fillRect(-R, -R, R * 2, R * 2);
  let k = 0;
  for (let r = R * 0.4; r < R * 0.93; r += 6.5, k += 1) {
    ring(ctx, r, k % 3 === 2 ? 2.2 : 1.6, k % 3 === 2 ? "#d6a55a" : "#7cc4c4", 0.75);
  }
  ring(ctx, R * 0.965, 6, "#18343a");
});

export const STATION33_IRISES: Record<string, () => THREE.Object3D> = {
  "s33-tea-radial": () => group(irisCap(teaIris(), 1.006, std(0xffffff, 0, 0.38, { envMapIntensity: 0.8 }))),
  "s33-champagne-sunray": () => group(irisCap(sunrayIris(), 1.006, std(0xffffff, 0.15, 0.3, { envMapIntensity: 0.9 }))),
  "s33-lagoon-rings": () => group(irisCap(lagoonIris(), 1.006,
    phys(0xffffff, { roughness: 0.23, clearcoat: 0.4, clearcoatRoughness: 0.1, envMapIntensity: 0.8 }))),
};

// ----------------------------------------------------------------- eyewear

function ovalRing(rx: number, ry: number, ix: number, iy: number) {
  const s = new THREE.Shape();
  s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, ix, iy, 0, Math.PI * 2, true, 0);
  s.holes.push(hole);
  return s;
}

function octagon(r: number, path: THREE.Shape | THREE.Path = new THREE.Shape(), clockwise = false) {
  for (let i = 0; i <= 8; i += 1) {
    const k = clockwise ? 8 - i : i;
    const a = Math.PI / 8 + (k / 8) * Math.PI * 2;
    if (i) path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else path.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return path;
}

function octagonRing(outer: number, inner: number) {
  const s = octagon(outer) as THREE.Shape;
  s.holes.push(octagon(inner, new THREE.Path(), true) as THREE.Path);
  return s;
}

/** Where the bent frame of a piece of eyewear is, at x, for a hinge. */
const frameZ = (z: number, k: number, x: number) => z - k * x * x;

function buildTitaniumVisor(): THREE.Object3D {
  const titanium = std(0x8ca2b1, 0.85, 0.3, { envMapIntensity: 1.15 });
  const k = 0.26;
  const frame = mesh(bendToEye(extrude(ovalRing(0.66, 0.44, 0.57, 0.36), 0.05, 0.016, 72), k, 0.12), titanium, 0, 0, 0.76);
  const visorShape = new THREE.Shape();
  visorShape.absellipse(0, 0, 0.58, 0.37, 0, Math.PI * 2, false, 0);
  // One wide, opaque deep-blue visor: a single lens, not two human eyeholes.
  const visor = mesh(bendToEye(new THREE.ShapeGeometry(visorShape, 64), k, 0.12),
    phys(0x1d2c44, { metalness: 0.35, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 }),
    0, 0, 0.762);
  const g = group(frame, visor);
  for (const side of [-1, 1]) {
    const x = side * 0.66;
    const z = frameZ(0.76, k, x);
    const hinge = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.12, 14), titanium, x, 0, z);
    // The sides fold back along her, short, the way a visor's do.
    const arm = rod([[x, 0, z - 0.02], [x * 1.04, 0, z - 0.16], [x * 1.0, -0.02, z - 0.3]], 0.02, titanium);
    g.add(hinge, arm);
  }
  return g;
}

function buildDecoLens(): THREE.Object3D {
  const metal = std(0xbc9d62, 0.85, 0.26, { envMapIntensity: 1.15 });
  const k = 0.24;
  // Three stepped octagons, each a little higher than the one outside it:
  // the setbacks of a Paris façade.
  const steps = [[0.54, 0.47, 0.035, 0.74], [0.49, 0.44, 0.05, 0.755], [0.45, 0.415, 0.065, 0.77]] as const;
  const g = group();
  for (const [outer, inner, depth, z] of steps) {
    g.add(mesh(bendToEye(extrude(octagonRing(outer, inner), depth, 0.008, 8), k, 0.1), metal, 0, 0, z));
  }
  const lens = mesh(bendToEye(new THREE.ShapeGeometry(octagon(0.425) as THREE.Shape, 8), k, 0.1), tintedLens(0xc9ccd0, 0.2), 0, 0, 0.785);
  // A clasp on one side, the way a monocle's cord is held; a stud on the other.
  const xl = -0.55;
  const clasp = mesh(extrude(roundedRect(0.1, 0.13, 0.025), 0.06, 0.01), metal, xl, 0, frameZ(0.74, k, xl));
  const pin = rod([[xl - 0.04, 0, frameZ(0.74, k, xl)], [xl - 0.13, 0, frameZ(0.74, k, xl) - 0.04]], 0.015, metal);
  const stud = mesh(new THREE.SphereGeometry(0.035, 14, 10), metal, 0.55, 0, frameZ(0.74, k, 0.55));
  g.add(lens, clasp, pin, stud);
  return g;
}

function buildRacingLens(): THREE.Object3D {
  const lacquer = phys(0xa44735, { metalness: 0.2, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.08 });
  const cream = phys(0xefe6d2, { roughness: 0.32, clearcoat: 0.5 });
  const k = 0.24;
  const frame = mesh(bendToEye(extrude(ovalRing(0.62, 0.33, 0.5, 0.23), 0.09, 0.025, 72), k, 0.1), lacquer, 0, 0, 0.77);
  const lensShape = new THREE.Shape();
  lensShape.absellipse(0, 0, 0.51, 0.24, 0, Math.PI * 2, false, 0);
  const lens = mesh(bendToEye(new THREE.ShapeGeometry(lensShape, 48), k, 0.1), tintedLens(0x1a222b, 0.72), 0, 0, 0.775);
  const g = group(frame, lens);
  for (const side of [-1, 1]) {
    const x = side * 0.62;
    const z = frameZ(0.77, k, x);
    const clip = mesh(extrude(roundedRect(0.1, 0.17, 0.035), 0.08, 0.012), cream, x, 0, z);
    const strap = mesh(new THREE.BoxGeometry(0.035, 0.1, side < 0 ? 0.26 : 0.14), cream, x * 1.02, 0, z - (side < 0 ? 0.16 : 0.1));
    g.add(clip, strap);
  }
  return g;
}

export const STATION33_EYEWEAR: Record<string, () => THREE.Object3D> = {
  "s33-titanium-visor": buildTitaniumVisor,
  "s33-deco-lens": buildDecoLens,
  "s33-racing-lens": buildRacingLens,
};

// -------------------------------------------------------------------- head

/** The clamp under a hat: a band all the way round the tube. */
function tubeClamp(material: THREE.Material = darkMetal(), tube = 0.028) {
  const band = ellipseRing(TUBE_FRONT + 0.028, TUBE_RADIUS + 0.028, tube, material);
  band.rotation.y = Math.PI / 2;
  band.position.y = -TUBE_RADIUS * 0.82;
  return band;
}

function weave() {
  return paint(512, 256, 3321, (ctx, rand, w, h) => {
    ctx.fillStyle = "#c7aa71";
    ctx.fillRect(0, 0, w, h);
    // Bamboo strips round the cone and down it, light and dark by turns.
    for (let y = 0; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        const over = ((x + y) / 16) % 2 === 0;
        ctx.fillStyle = over ? "rgba(236,214,160,0.45)" : "rgba(122,90,42,0.28)";
        ctx.fillRect(x + 1, y + 1, 14, 14);
      }
    }
    ctx.strokeStyle = "rgba(110,80,36,0.5)";
    ctx.lineWidth = 1.2;
    for (let x = 0; x < w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let i = 0; i < 300; i += 1) {
      ctx.fillStyle = `rgba(90,62,26,${rand() * 0.12})`;
      ctx.fillRect(rand() * w, rand() * h, 2, 1);
    }
  }, [3, 1]);
}

function buildTeaCone(): THREE.Object3D {
  const straw = std(0xffffff, 0, 0.82, { map: weave(), side: THREE.DoubleSide });
  // A solid cone with a thickness: outer slope, a rolled brim, the inside.
  const outer: Array<[number, number]> = [[0.0, 0.56], [0.06, 0.53], [0.8, 0.1], [0.82, 0.08]];
  const inner: Array<[number, number]> = [[0.8, 0.06], [0.72, 0.085], [0.05, 0.49], [0.0, 0.5]];
  const cone = mesh(lathe([...outer, ...inner], 64), straw);
  const slope = (0.49 - 0.085) / (0.72 - 0.05);
  const underside = (r: number) => 0.49 - slope * Math.max(0, r - 0.05);
  const drop = restingDrop(underside);
  const metal = std(0xc9a55a, 0.8, 0.3);
  const finial = group(
    mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.06, 16), metal, 0, 0.575, 0),
    mesh(new THREE.SphereGeometry(0.045, 16, 12), metal, 0, 0.62, 0),
  );
  // The inner ring sits where the cone meets the tube: it is what holds it on.
  const contact = 0.29;
  const band = mesh(new THREE.TorusGeometry(contact, 0.026, 10, 48), std(0x8a6a36, 0, 0.7), 0, underside(contact) - 0.02, 0);
  band.rotation.x = Math.PI / 2;
  const hat = group(cone, finial, band);
  hat.position.y = -drop;
  return group(hat);
}

function buildFlightCap(): THREE.Object3D {
  const cloth = std(0x607487, 0, 0.8);
  // A soft dome with a thickness: outside, rim, inside.
  const profile: Array<[number, number]> = [];
  for (let i = 0; i <= 16; i += 1) {
    const a = (i / 16) * (Math.PI / 2);
    profile.push([Math.sin(a) * 0.5, Math.cos(a) * 0.43]);
  }
  for (let i = 16; i >= 0; i -= 1) {
    const a = (i / 16) * (Math.PI / 2);
    profile.push([Math.sin(a) * 0.46, Math.cos(a) * 0.39]);
  }
  const dome = mesh(lathe(profile, 56), cloth);
  const seam = mesh(new THREE.TorusGeometry(0.5, 0.022, 8, 56), std(0x4c5d6d, 0, 0.75));
  seam.rotation.x = Math.PI / 2;
  const top = mesh(new THREE.SphereGeometry(0.05, 14, 10), std(0x4c5d6d, 0, 0.75), 0, 0.43, 0);
  const cap = group(dome, seam, top);
  cap.position.y = -0.1;

  // The comms box on the side, and a short antenna up and away from her.
  const metal = std(0x9aa3ab, 0.7, 0.32);
  const box = mesh(extrude(roundedRect(0.16, 0.18, 0.03), 0.12, 0.012), metal, 0.47, 0.04, 0.05);
  box.rotation.y = Math.PI / 2;
  const antenna = rod([[0.5, 0.12, 0.05], [0.58, 0.42, 0.05], [0.62, 0.6, 0.05]], 0.013, metal);
  const tip = mesh(new THREE.SphereGeometry(0.035, 14, 10), std(0x26303a, 0.4, 0.3), 0.62, 0.62, 0.05);

  // Chin straps from the rim down to the clamp under the tube.
  const strapMat = std(0x2f3a45, 0.1, 0.6);
  const straps = group();
  const clampY = (z: number) => -TUBE_RADIUS * 0.82 + (TUBE_RADIUS + 0.028) * Math.sqrt(Math.max(0, 1 - (z / (TUBE_FRONT + 0.028)) ** 2));
  for (const side of [-1, 1]) {
    const z = side * 0.49;
    straps.add(rod([[0, -0.1, z], [0, (clampY(z * 0.98) - 0.1) / 2, z * 1.01], [0, clampY(z * 0.98), z * 0.98]], 0.022, strapMat));
    straps.add(mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), metal, 0, -0.1, z));
  }
  return group(cap, box, antenna, tip, straps, tubeClamp());
}

function buildFanCrown(): THREE.Object3D {
  const silk = phys(0xa3443d, { roughness: 0.66, sheen: 0.6, sheenColor: 0xffc2b8, side: THREE.DoubleSide });
  const metal = gold();
  const R = 0.7;
  const pivotY = 0.12;
  const folds = 8;
  const fan = group();
  for (let i = 0; i < folds; i += 1) {
    const a0 = (i / folds) * Math.PI;
    const a1 = ((i + 1) / folds) * Math.PI;
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * 0.12, Math.sin(a0) * 0.12);
    s.lineTo(Math.cos(a0) * R, Math.sin(a0) * R);
    s.absarc(0, 0, R, a0, a1, false);
    s.lineTo(Math.cos(a1) * 0.12, Math.sin(a1) * 0.12);
    s.absarc(0, 0, 0.12, a1, a0, true);
    const panel = mesh(extrude(s, 0.018, 0.004, 12), silk);
    // Each panel turns about its own middle line, the other way from its
    // neighbours, so the shared edges meet in folds: pleats, not a disc.
    const mid = (a0 + a1) / 2;
    panel.setRotationFromAxisAngle(new THREE.Vector3(Math.cos(mid), Math.sin(mid), 0), i % 2 ? 0.2 : -0.2);
    fan.add(panel);
  }
  for (let i = 0; i <= folds; i += 1) {
    if (i === 0 || i === folds) continue;
    const a = (i / folds) * Math.PI;
    fan.add(rod([[Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.02], [Math.cos(a) * (R + 0.02), Math.sin(a) * (R + 0.02), 0.02]], 0.011, metal));
  }
  const edgePoints: Array<[number, number, number]> = [];
  for (let i = 0; i <= 32; i += 1) {
    const a = (i / 32) * Math.PI;
    edgePoints.push([Math.cos(a) * R, Math.sin(a) * R, 0.0]);
  }
  fan.add(rod(edgePoints, 0.012, metal));
  fan.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 20), metal, 0, 0, 0).rotateX(Math.PI / 2));
  fan.position.y = pivotY;
  fan.rotation.x = -0.12;

  // A low socket under the pivot, standing on the clamp.
  const socket = mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.12, 20), metal, 0, 0.06, 0);
  // A slim bronze band: dark enough to sit on a black shell, soft enough
  // not to read as a stripe across a light one.
  return group(fan, socket, tubeClamp(std(0x6b5531, 0.8, 0.35), 0.018));
}

export const STATION33_HEAD: Record<string, () => THREE.Object3D> = {
  "s33-tea-cone": buildTeaCone,
  "s33-flight-cap": buildFlightCap,
  "s33-fan-crown": buildFanCrown,
};

// -------------------------------------------------------------------- neck

/** A strip folded in pleats across its width, with a real thickness. */
function pleatedStrip(width: number, length: number, folds: number, depth: number, material: THREE.Material) {
  const s = new THREE.Shape();
  const t = 0.014;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= folds * 2; i += 1) {
    pts.push([-width / 2 + (i / (folds * 2)) * width, i % 2 ? depth : 0]);
  }
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [x, z] of pts.slice(1)) s.lineTo(x, z);
  for (const [x, z] of [...pts].reverse()) s.lineTo(x, z - t);
  s.closePath();
  const geometry = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  // The extrusion runs along +Z; turn it to hang down from the origin.
  geometry.rotateX(Math.PI / 2);
  return mesh(geometry, material);
}

function brassClasp(radius: number) {
  const metal = gold();
  const disc = mesh(new THREE.CylinderGeometry(radius, radius, 0.04, 28), metal);
  disc.rotation.x = Math.PI / 2;
  const rim = mesh(new THREE.TorusGeometry(radius, 0.014, 8, 28), metal, 0, 0, 0.02);
  return group(disc, rim);
}

function buildPleatedRibbon(): NeckPiece {
  const cloth = phys(0xb3a9bd, { roughness: 0.75, sheen: 0.5, sheenColor: 0xffffff, side: THREE.DoubleSide });
  const band = clothBand(cloth, 0.26, 0.05);
  const left = pleatedStrip(0.18, 0.4, 3, 0.03, cloth);
  left.position.set(-0.08, -0.02, -0.01);
  left.rotation.z = 0.18;
  const right = pleatedStrip(0.16, 0.32, 3, 0.03, cloth);
  right.position.set(0.09, -0.02, -0.02);
  right.rotation.z = -0.14;
  const clasp = brassClasp(0.06);
  clasp.position.z = 0.04;
  return { band, front: group(left, right, clasp) };
}

function buildRibbedLoop(): NeckPiece {
  const knit = std(0xffffff, 0, 0.9, { map: stripes(3331, "#b1ba91", "#97a175", 10, 4, 0) });
  const band = clothBand(knit, 0.32, 0.065);
  const drop = tail(0.36, 0.2, std(0xffffff, 0, 0.9, { map: stripes(3332, "#b1ba91", "#97a175", 12, 4, 0.0) }));
  drop.rotation.set(-0.15, 0, 0.12);
  const button = mesh(new THREE.SphereGeometry(0.055, 16, 12), gold(), 0, 0, 0.04);
  button.scale.z = 0.6;
  return { band, front: group(drop, button) };
}

function buildFringedBand(): NeckPiece {
  const clay = std(0xb36b4b, 0, 0.85);
  const cream = std(0xe9dcc0, 0, 0.8);
  const band = group(clothBand(clay, 0.28, 0.05));
  // The cream woven stripe round the middle of the band.
  band.add(ellipseRing(TUBE_RADIUS + 0.06, TUBE_FRONT + 0.06, 0.016, cream));
  const flapL = tail(0.32, 0.16, clay);
  flapL.position.x = -0.06;
  flapL.rotation.z = 0.08;
  const flapR = tail(0.28, 0.15, clay);
  flapR.position.x = 0.07;
  flapR.rotation.z = -0.1;
  const fringe = group();
  for (const [x, length] of [[-0.09, 0.2], [0, 0.22], [0.09, 0.18]] as const) {
    fringe.add(rod([[x, -0.24, 0.012], [x * 1.05, -0.24 - length, 0.012]], 0.022, cream));
  }
  const clasp = mesh(extrude(roundedRect(0.14, 0.1, 0.03), 0.04, 0.01), std(0xb08a4c, 0.7, 0.35), 0, 0.01, 0.035);
  return { band, front: group(flapL, flapR, fringe, clasp) };
}

export const STATION33_NECK: Record<string, () => NeckPiece> = {
  "s33-pleated-ribbon": buildPleatedRibbon,
  "s33-ribbed-loop": buildRibbedLoop,
  "s33-fringed-band": buildFringedBand,
};

// --------------------------------------------------------------------- pins

/* Pins are worn on the front of the tube: the plate stands just clear of
   it, and two short pins go back into the shell. */

function backPins(y = 0) {
  const metal = gold();
  return group(...[-0.1, 0.1].map(x => {
    const p = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), metal, x, y, -0.07);
    p.rotation.x = Math.PI / 2;
    return p;
  }));
}

/** A stamp's plate with a bead at every perforation. */
function perforatedPlate(w: number, h: number, colour: THREE.ColorRepresentation, edge: THREE.Material) {
  const plate = mesh(extrude(roundedRect(w, h, 0.012), 0.035, 0.008), enamel(colour, 0.26, 0.5), 0, 0, 0.02);
  const beads = group();
  const bead = new THREE.SphereGeometry(0.019, 10, 8);
  const step = 0.056;
  for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) {
    beads.add(mesh(bead, edge, x, h / 2, 0.02), mesh(bead, edge, x, -h / 2, 0.02));
  }
  for (let y = -h / 2 + step; y < h / 2 - 1e-6; y += step) {
    beads.add(mesh(bead, edge, w / 2, y, 0.02), mesh(bead, edge, -w / 2, y, 0.02));
  }
  return group(plate, beads);
}

function buildMountainStamp(): THREE.Object3D {
  const edge = std(0xc9a55a, 0.8, 0.3);
  const base = perforatedPlate(0.46, 0.58, 0x609783, edge);
  const ridge = new THREE.Shape();
  ridge.moveTo(-0.17, -0.18);
  ridge.lineTo(-0.06, 0.02);
  ridge.lineTo(0.0, -0.05);
  ridge.lineTo(0.08, 0.07);
  ridge.lineTo(0.18, -0.18);
  ridge.closePath();
  const mountain = mesh(extrude(ridge, 0.025, 0.006, 8), enamel(0xe7e1d2, 0.4, 0.3), 0, 0, 0.05);
  const sun = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 24), edge, 0.11, 0.17, 0.05);
  sun.rotation.x = Math.PI / 2;
  return group(base, mountain, sun, backPins());
}

function buildBoardingTag(): THREE.Object3D {
  const outline = new THREE.Shape();
  const w = 0.44;
  const h = 0.58;
  const c = 0.07;
  outline.moveTo(-w / 2 + c, h / 2);
  outline.lineTo(w / 2 - c, h / 2);
  outline.lineTo(w / 2, h / 2 - c);
  outline.lineTo(w / 2, -h / 2);
  outline.lineTo(-w / 2, -h / 2);
  outline.lineTo(-w / 2, h / 2 - c);
  outline.closePath();
  const plate = mesh(extrude(outline, 0.03, 0.008, 8), std(0x667e9d, 0.6, 0.4), 0, 0, 0.02);
  // The print: three rules and a code, white on the plate. No airline's
  // marks: a ticket from Station 33.
  const print = paint(256, 320, 3341, (ctx, _rand, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#f4f2ec";
    for (const y of [150, 182, 214]) ctx.fillRect(48, y, 160, 9);
    ctx.font = "600 30px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("S33 · ORBIT", cw / 2, 268);
  });
  const face = mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.9), std(0xffffff, 0, 0.6, { map: print, transparent: true }), 0, -0.01, 0.047);
  const eyelet = mesh(new THREE.TorusGeometry(0.045, 0.014, 10, 28), gold(), 0, h / 2 - 0.1, 0.045);
  return group(plate, face, eyelet, backPins());
}

function buildRosetteStamp(): THREE.Object3D {
  const edge = std(0xd2b77a, 0.75, 0.3);
  const base = perforatedPlate(0.46, 0.56, 0xb492a3, edge);
  const wine = enamel(0x7a2338, 0.3, 0.6);
  const rosette = group();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const petal = mesh(new THREE.SphereGeometry(0.05, 16, 12), wine, Math.cos(a) * 0.085, Math.sin(a) * 0.085, 0.05);
    petal.scale.z = 0.45;
    rosette.add(petal);
  }
  const heart = mesh(new THREE.SphereGeometry(0.035, 14, 10), enamel(0xd9c8b8, 0.3, 0.6), 0, 0, 0.06);
  heart.scale.z = 0.5;
  const frame = mesh(new THREE.TorusGeometry(0.155, 0.014, 8, 48), edge, 0, 0, 0.045);
  return group(base, rosette, heart, frame, backPins());
}

export const STATION33_PIN: Record<string, () => THREE.Object3D> = {
  "s33-mountain-stamp": buildMountainStamp,
  "s33-boarding-tag": buildBoardingTag,
  "s33-rosette-stamp": buildRosetteStamp,
};

// ------------------------------------------------------------------- mouth

/* Held from the end of the jaw's chain: a ring at the origin, the piece
   below it, and the hidden parts that make it hang rather than hover. */

function buildHawSkewer(): THREE.Object3D {
  const metal = gold();
  const bamboo = std(0xd8c08a, 0, 0.6);
  const sugar = phys(0xb43e32, { roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.05 });
  const top = jumpRing(0.05, 0.013, metal);
  const ferrule = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.07, 14), metal, 0, -0.125, 0);
  const stick = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.74, 10), bamboo, 0, -0.5, 0);
  const g = group(top, ferrule, stick);
  // Three fruit, each touching the next, threaded on the stick.
  for (const y of [-0.27, -0.48, -0.69]) {
    const fruit = mesh(new THREE.SphereGeometry(0.12, 28, 20), sugar, 0, y, 0);
    fruit.scale.set(1, 0.9, 1);
    g.add(fruit);
  }
  return g;
}

function crust() {
  return paint(256, 128, 3351, (ctx, rand, w, h) => {
    ctx.fillStyle = "#c99759";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i += 1) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 3 + rand() * 7;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(120,70,24,0.45)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

function buildCannoli(): THREE.Object3D {
  const metal = gold();
  const shell = std(0xffffff, 0, 0.82, { map: crust(), side: THREE.DoubleSide });
  const cream = std(0xf6f1e6, 0, 0.55);
  const pistachio = std(0x7c9a3c, 0, 0.6);
  // A short hollow tube: outside, rim, inside — open at both ends.
  const body = mesh(lathe([[0.165, -0.21], [0.175, 0.0], [0.165, 0.21], [0.13, 0.21], [0.125, 0.0], [0.13, -0.21]], 40), shell);
  body.rotation.x = Math.PI / 2;
  const roll = group(body);
  const puff = new THREE.SphereGeometry(0.055, 14, 10);
  const crumb = new THREE.IcosahedronGeometry(0.018, 0);
  for (const end of [-1, 1]) {
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const r = i === 6 ? 0 : 0.07;
      roll.add(mesh(puff, cream, Math.cos(a) * r, Math.sin(a) * r, end * (0.22 + (i === 6 ? 0.05 : 0.02))));
    }
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      roll.add(mesh(crumb, pistachio, Math.cos(a) * 0.06, Math.sin(a) * 0.06, end * 0.29));
    }
  }
  roll.position.y = -0.42;
  roll.rotation.y = 0.5;
  // Held by a brass hook from the ring down to the top of the shell.
  const top = jumpRing(0.05, 0.013, metal);
  const hook = rod([[0, -0.1, 0], [0, -0.2, 0], [0, -0.25, 0]], 0.014, metal);
  return group(top, hook, roll);
}

function buildTurron(): THREE.Object3D {
  const metal = gold();
  const nougat = std(0xe1cda2, 0, 0.75);
  const almond = std(0xa8794a, 0, 0.68);
  const block = mesh(extrude(roundedRect(0.36, 0.3, 0.035), 0.2, 0.02), nougat, 0, -0.44, 0);
  const g = group(block);
  for (const [x, y, z, a] of [[-0.1, -0.36, 0.11, 0.6], [0.08, -0.48, 0.11, -0.4], [0.11, -0.36, 0.11, 0.2], [-0.07, -0.5, -0.11, 0.9], [0.06, -0.38, -0.11, -0.7]] as const) {
    const nut = mesh(new THREE.SphereGeometry(0.045, 14, 10), almond, x, y, z);
    nut.scale.set(0.7, 1.15, 0.4);
    nut.rotation.z = a;
    g.add(nut);
  }
  // A brass cradle under it, and the rod up the back to the ring.
  const tray = mesh(new THREE.BoxGeometry(0.3, 0.02, 0.16), metal, 0, -0.6, 0);
  const lips = [-1, 1].map(side => mesh(new THREE.BoxGeometry(0.02, 0.06, 0.16), metal, side * 0.15, -0.58, 0));
  const spine = rod([[0, -0.1, -0.12], [0, -0.35, -0.13], [0, -0.6, -0.12]], 0.013, metal);
  const top = jumpRing(0.05, 0.013, metal);
  const arm = rod([[0, -0.1, 0], [0, -0.1, -0.12]], 0.013, metal);
  return group(g, tray, ...lips, spine, top, arm);
}

export const STATION33_MOUTH: Record<string, () => THREE.Object3D> = {
  "s33-haw-skewer": buildHawSkewer,
  "s33-cannoli": buildCannoli,
  "s33-turron": buildTurron,
};

// ------------------------------------------------------------------ charms

function buildShuttlePod(): THREE.Object3D {
  const hull = std(0xe8e5dc, 0.65, 0.35, { envMapIntensity: 1.1 });
  const wingMat = std(0x9baab7, 0.65, 0.35);
  const metal = gold();
  const profile: Array<[number, number]> = [[0.0001, -0.68]];
  for (let i = 0; i <= 18; i += 1) {
    const t = i / 18;
    const y = -0.68 + t * 0.52;
    // A capsule with a rounder nose than tail.
    const r = 0.15 * Math.sin(Math.PI * (0.06 + t * 0.94)) ** (t > 0.5 ? 0.7 : 0.45);
    profile.push([Math.max(0.0001, r), y]);
  }
  const body = mesh(lathe(profile, 40), hull);
  const window = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 24), glaze(0x10161c, 0.08), 0, -0.3, 0.135);
  window.rotation.x = Math.PI / 2;
  const frame = mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 28), std(0xbfc6cc, 0.9, 0.2), 0, -0.3, 0.15);
  const wings = group();
  for (const side of [-1, 1]) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.17, -0.12);
    s.lineTo(0.17, -0.2);
    s.lineTo(0, -0.14);
    s.closePath();
    const wing = mesh(extrude(s, 0.025, 0.006, 6), wingMat, side * 0.13, -0.44, 0);
    wing.scale.x = side;
    wings.add(wing);
  }
  const nozzle = mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.07, 20), metal, 0, -0.7, 0);
  const top = jumpRing(0.045, 0.012, metal);
  const stem = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 8), metal, 0, -0.12, 0);
  return group(body, window, frame, wings, nozzle, top, stem);
}

function buildScooterToken(): THREE.Object3D {
  const mint = phys(0x80a99f, { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const tyre = std(0x22262a, 0, 0.9);
  const metal = gold();
  const g = group();
  for (const x of [-0.19, 0.19]) {
    const wheel = mesh(new THREE.TorusGeometry(0.085, 0.034, 12, 28), tyre, x, -0.6, 0);
    const hub = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), std(0xc5cacf, 0.9, 0.2), x, -0.6, 0);
    hub.rotation.x = Math.PI / 2;
    g.add(wheel, hub);
  }
  const deck = mesh(extrude(roundedRect(0.34, 0.06, 0.025), 0.08, 0.012), mint, -0.01, -0.53, 0);
  const column = rod([[0.18, -0.53, 0], [0.13, -0.3, 0]], 0.024, mint);
  const cowl = mesh(new THREE.SphereGeometry(0.075, 20, 14), mint, 0.15, -0.36, 0);
  cowl.scale.set(0.8, 1.3, 0.9);
  const bar = rod([[0.13, -0.3, -0.09], [0.13, -0.3, 0.09]], 0.016, std(0x3a3f44, 0.6, 0.4));
  const lamp = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 20), glaze(0xf7f1d0, 0.1), 0.21, -0.33, 0);
  lamp.rotation.z = Math.PI / 2;
  const seat = mesh(extrude(roundedRect(0.16, 0.05, 0.02), 0.09, 0.01), std(0x23272b, 0, 0.7), -0.12, -0.45, 0);
  const post = rod([[-0.12, -0.5, 0], [-0.12, -0.47, 0]], 0.02, mint);
  // The ring at the top, joined to the handlebar by a short stem.
  const top = jumpRing(0.045, 0.012, metal);
  const stem = rod([[0, -0.09, 0], [0.13, -0.29, 0]], 0.012, metal);
  return group(g, deck, column, cowl, bar, lamp, seat, post, top, stem);
}

function buildAmphora(): THREE.Object3D {
  const clay = std(0xb47755, 0, 0.62);
  const blue = glaze(0x2f4f9a, 0.3);
  const metal = gold();
  // Closed at the foot, open at the mouth with a real inside wall.
  const body = mesh(lathe([
    [0.0001, -0.74], [0.06, -0.74], [0.1, -0.68], [0.19, -0.55], [0.205, -0.45], [0.17, -0.32],
    [0.08, -0.24], [0.065, -0.17], [0.085, -0.14], [0.06, -0.14], [0.05, -0.2], [0.0001, -0.22],
  ], 40), clay);
  const band = mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 48), blue, 0, -0.46, 0);
  band.rotation.x = Math.PI / 2;
  const handles = group();
  for (const side of [-1, 1]) {
    handles.add(rod([[side * 0.07, -0.18, 0], [side * 0.2, -0.2, 0], [side * 0.22, -0.3, 0], [side * 0.17, -0.38, 0]], 0.02, clay));
  }
  // A bail from handle to handle, and the ring above it.
  const bail = rod([[-0.1, -0.19, 0], [-0.06, -0.1, 0], [0, -0.09, 0], [0.06, -0.1, 0], [0.1, -0.19, 0]], 0.012, metal);
  const top = jumpRing(0.045, 0.012, metal);
  return group(body, band, handles, bail, top);
}

export const STATION33_CHARM: Record<string, () => THREE.Object3D> = {
  "s33-shuttle-pod": buildShuttlePod,
  "s33-scooter-token": buildScooterToken,
  "s33-amphora": buildAmphora,
};

// ---------------------------------------------------------------- earrings

/** A leaf, thick, with its rib along the back. */
function leaf(length: number, width: number, material: THREE.Material) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width * 0.6, -length * 0.2, width * 0.55, -length * 0.7, 0, -length);
  s.bezierCurveTo(-width * 0.55, -length * 0.7, -width * 0.6, -length * 0.2, 0, 0);
  const blade = mesh(extrude(s, 0.03, 0.01, 24), material);
  const rib = rod([[0, -length * 0.05, -0.02], [0, -length * 0.5, -0.024], [0, -length * 0.92, -0.02]], 0.009, material);
  return group(blade, rib);
}

function buildTeaLeafDrop(): THREE.Object3D {
  const metal = std(0xc9a55a, 0.85, 0.3);
  const leafMat = phys(0x6e9978, { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const top = jumpRing(0.05, 0.012, metal);
  const big = leaf(0.32, 0.13, leafMat);
  big.position.y = -0.11;
  const link = jumpRing(0.025, 0.009, metal, -0.43);
  const small = leaf(0.24, 0.1, leafMat);
  small.position.y = -0.48;
  const tip = mesh(new THREE.SphereGeometry(0.014, 8, 6), metal, 0, -0.105, 0);
  return group(top, tip, big, link, small);
}

function buildCrescentPastry(): THREE.Object3D {
  const metal = std(0xc79d60, 0.75, 0.32, { envMapIntensity: 1.1 });
  // A croissant bent into a crescent, its three layers as grooves round it.
  const R = 0.19;
  const curve = new THREE.EllipseCurve(0, 0, R, R, THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(320), false, 0);
  const path = new THREE.CurvePath<THREE.Vector3>();
  const pts = curve.getPoints(48).map(p => new THREE.Vector3(p.x, p.y, 0));
  path.add(new THREE.CatmullRomCurve3(pts));
  const crescent = mesh(taperedTube(path, t => {
    const swell = 0.03 + 0.05 * Math.sin(Math.PI * t);
    const grooves = 1 - 0.16 * Math.max(0, Math.cos(t * Math.PI * 2 * 3.5)) ** 8;
    return swell * grooves;
  }, 96, 20), metal);
  const tips = [pts[0], pts[pts.length - 1]].map(t => mesh(new THREE.SphereGeometry(0.031, 12, 10), metal, t.x, t.y, 0));
  const crescentGroup = group(crescent, ...tips);
  crescentGroup.position.y = -0.33;
  const top = jumpRing(0.055, 0.012, metal);
  const link = jumpRing(0.025, 0.009, metal, -0.11);
  return group(top, link, crescentGroup);
}

function buildGlassDrop(): THREE.Object3D {
  const metal = std(0xc9a55a, 0.85, 0.28);
  // The drop: a lathed solid, round below and drawn to a point above.
  const profile: Array<[number, number]> = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    const y = -0.56 + t * 0.4;
    const r = 0.13 * Math.sin(Math.PI * Math.min(1, t * 1.25)) ** 0.8 * (1 - t * 0.55) + 0.012;
    profile.push([i === 0 ? 0.0001 : r, y]);
  }
  const glass = phys(0x5c9aab, {
    roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.4, sheenColor: 0xbfeff4,
    emissive: 0x0e3540, emissiveIntensity: 0.25,
  });
  const drop = mesh(lathe(profile, 40), glass);
  const cap = mesh(new THREE.ConeGeometry(0.035, 0.06, 18, 1, true), metal, 0, -0.14, 0);
  cap.rotation.z = Math.PI;
  const bead = mesh(new THREE.SphereGeometry(0.03, 14, 10), glaze(0xd9a24b, 0.12), 0, -0.585, 0);
  const top = jumpRing(0.05, 0.012, metal);
  const link = jumpRing(0.022, 0.008, metal, -0.1);
  return group(top, link, cap, drop, bead);
}

export const STATION33_EARRINGS: Record<string, () => THREE.Object3D> = {
  "s33-tea-leaf-drop": buildTeaLeafDrop,
  "s33-crescent-pastry": buildCrescentPastry,
  "s33-glass-drop": buildGlassDrop,
};

// -------------------------------------------------------------------- brow

/* In the tube's ring frame: X outward from the C, Y toward the reader, Z
   along the tube. The upper right of the tube is Yumi's brow, so a brow
   piece lies along it, on its front, over the eye the way a brow bar sits
   over one; the cuff (outfit.ts) goes all the way round the tube under the
   piece's middle and a short post joins the two. Nothing hangs in front of
   the eye. */

/** On the front of the tube, `lift` clear of it, at `z` along it. */
const onBrow = (z: number, lift: number): [number, number, number] => [0, TUBE_FRONT + lift, z];

/** The post from the cuff up to the piece, so it is held, not resting. */
function browPost(material: THREE.Material, top: number) {
  return rod([onBrow(0, 0.03), onBrow(0, top)], 0.014, material);
}

function buildJadeHinge(): THREE.Object3D {
  const metal = std(0xc9a55a, 0.8, 0.3);
  const jade = phys(0x8aac91, { roughness: 0.28, clearcoat: 0.4, clearcoatRoughness: 0.12 });
  // A metal spine with a gentle rise in the middle — a hinge, not a staple —
  // and a jade bead closing each end.
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    points.push(onBrow(-0.25 + 0.5 * t, 0.06 + 0.03 * Math.sin(Math.PI * t)));
  }
  const spine = rod(points, 0.017, metal);
  const beads = [points[0], points[points.length - 1]].map(p => mesh(new THREE.SphereGeometry(0.068, 20, 16), jade, ...p));
  return group(spine, ...beads, browPost(metal, 0.09));
}

function buildMachinedLock(): THREE.Object3D {
  const steel = std(0xffffff, 0.85, 0.38, {
    map: paint(128, 32, 3361, (ctx, rand, w, h) => {
      ctx.fillStyle = "#8c9baa";
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 1) {
        ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,255,255" : "40,48,56"},${rand() * 0.14})`;
        ctx.fillRect(x, 0, 1, h);
      }
    }),
  });
  // A short brushed lock along the brow, its groove dark, a nut at each end.
  const box = mesh(extrude(roundedRect(0.1, 0.46, 0.03), 0.06, 0.01), steel);
  box.rotation.x = Math.PI / 2;
  box.position.set(...onBrow(0, 0.07));
  const groove = mesh(new THREE.BoxGeometry(0.022, 0.012, 0.32), std(0x2c3238, 0.5, 0.5), ...onBrow(0, 0.104));
  const nuts = [-1, 1].map(side => {
    const nut = mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.08, 6), std(0xaab4be, 0.9, 0.3), ...onBrow(side * 0.24, 0.09));
    return nut;
  });
  return group(box, groove, ...nuts, browPost(steel, 0.05));
}

function buildPearlArch(): THREE.Object3D {
  const metal = std(0xc9a55a, 0.85, 0.28);
  const pearl = phys(0xd9cbb5, { metalness: 0.05, roughness: 0.27, clearcoat: 0.6, sheen: 0.6, sheenColor: 0xffffff });
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    points.push(onBrow(-0.26 + 0.52 * t, 0.045 + 0.06 * Math.sin(Math.PI * t)));
  }
  const arch = rod(points, 0.014, metal);
  // Three pearls sitting on the arch, each touching it.
  const pearls = [3, 6, 9].map(i => {
    const [x, y, z] = points[i];
    return mesh(new THREE.SphereGeometry(0.068, 20, 16), pearl, x, y + 0.074, z);
  });
  return group(arch, ...pearls, browPost(metal, 0.1));
}

export const STATION33_BROW: Record<string, () => THREE.Object3D> = {
  "s33-jade-hinge": buildJadeHinge,
  "s33-machined-lock": buildMachinedLock,
  "s33-pearl-arch": buildPearlArch,
};

// ---------------------------------------------------------------- necklaces

/* At the necklace centre on the front of the lower tube. The chain runs
   from the stud at (−0.65, 0.25) down and back up to (0.65, 0.25); the
   pendant hangs from its lowest point. */

function necklaceChain(material: THREE.Material, low = -0.12) {
  return chain([
    new THREE.Vector3(-0.65, 0.25, -0.05),
    new THREE.Vector3(-0.45, 0.02, 0.02),
    new THREE.Vector3(0, low, 0.07),
    new THREE.Vector3(0.45, 0.02, 0.02),
    new THREE.Vector3(0.65, 0.25, -0.05),
  ], material, 0.022);
}

function buildRiceChain(): THREE.Object3D {
  const metal = std(0xc9a55a, 0.85, 0.3);
  const porcelain = phys(0xd5cbb0, { roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.65, 0.25, -0.05),
    new THREE.Vector3(-0.45, 0.02, 0.02),
    new THREE.Vector3(0, -0.12, 0.07),
    new THREE.Vector3(0.45, 0.02, 0.02),
    new THREE.Vector3(0.65, 0.25, -0.05),
  ]);
  const g = group(necklaceChain(metal));
  // Three grains of rice threaded on it, hanging from it.
  for (const t of [0.38, 0.5, 0.62]) {
    const p = curve.getPointAt(t);
    const grain = mesh(new THREE.SphereGeometry(0.05, 18, 14), porcelain, p.x, p.y - 0.085, p.z + 0.01);
    grain.scale.set(0.8, 1.7, 0.8);
    g.add(grain, jumpRing(0.016, 0.006, metal, p.y));
    g.children[g.children.length - 1].position.x = p.x;
    g.children[g.children.length - 1].position.z = p.z;
  }
  return g;
}

function buildMosaicMedal(): THREE.Object3D {
  const metal = std(0xc9a55a, 0.85, 0.3);
  const g = group(necklaceChain(metal, -0.1));
  const medal = group();
  const back = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 40), metal);
  back.rotation.x = Math.PI / 2;
  const rim = mesh(new THREE.TorusGeometry(0.17, 0.022, 10, 48), metal, 0, 0, 0.012);
  medal.add(back, rim);
  const tiles = [0x589298, 0xefe6d2, 0xefe6d2, 0x2f6f78];
  tiles.forEach((colour, i) => {
    const x = (i % 2 ? 1 : -1) * 0.058;
    const y = (i < 2 ? 1 : -1) * 0.058;
    medal.add(mesh(extrude(roundedRect(0.1, 0.1, 0.012), 0.025, 0.006), enamel(colour, 0.3, 0.6), x, y, 0.028));
  });
  medal.position.set(0, -0.32, 0.08);
  const bail = jumpRing(0.03, 0.01, metal, -0.1);
  bail.position.z = 0.075;
  return group(g, bail, medal);
}

function buildFanPendant(): THREE.Object3D {
  const metal = std(0xc9a55a, 0.85, 0.3);
  const lacquer = phys(0xa64c4c, { roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const g = group(necklaceChain(metal, -0.1));
  const R = 0.22;
  const s = new THREE.Shape();
  s.moveTo(R, 0);
  s.absarc(0, 0, R, 0, Math.PI, false);
  s.lineTo(R, 0);
  const fan = mesh(extrude(s, 0.035, 0.008, 32), lacquer);
  const ribs = group();
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 6) * Math.PI;
    ribs.add(rod([[0, 0.01, 0.022], [Math.cos(a) * (R - 0.01), Math.sin(a) * (R - 0.01), 0.022]], 0.008, metal));
  }
  const edge = rod([[R, 0, 0.022], [-R, 0, 0.022]], 0.01, metal);
  const rivet = mesh(new THREE.SphereGeometry(0.022, 12, 10), metal, 0, 0, 0.03);
  const pendant = group(fan, ribs, edge, rivet);
  // Open, arc up, hung from a ring at the top of the arc.
  pendant.position.set(0, -0.15 - R, 0.08);
  const bail = jumpRing(0.025, 0.009, metal, -0.1);
  bail.position.z = 0.075;
  return group(g, bail, pendant);
}

export const STATION33_NECKLACE: Record<string, () => THREE.Object3D> = {
  "s33-rice-chain": buildRiceChain,
  "s33-mosaic-medal": buildMosaicMedal,
  "s33-fan-pendant": buildFanPendant,
};

/** Every id this collection can build, for the catalogue test. */
export const STATION33_BUILDABLE: readonly string[] = [
  STATION33_FINISHES, STATION33_PUPILS, STATION33_IRISES, STATION33_EYEWEAR, STATION33_HEAD, STATION33_NECK,
  STATION33_PIN, STATION33_MOUTH, STATION33_CHARM, STATION33_EARRINGS, STATION33_BROW, STATION33_NECKLACE,
].flatMap(record => Object.keys(record));
