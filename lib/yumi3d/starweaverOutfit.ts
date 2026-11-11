import * as THREE from "three";

import { TUBE_FRONT, TUBE_RADIUS } from "./anatomy";
import {
  SHELL_REPEAT, extrude, group, lathe, mesh, paint, phys, std,
  type ShellFinish,
} from "./outfitKit";
import { browPost, jumpRing, onBrow, rod, tubeClamp } from "./station33Outfit";

/* =========================================================
   Starwoven Relics｜織星遺物 — 17 limited pieces (lib/shop/starweaverCollection.ts)

   Brought back by Yumi Starweaver's seventh voyages (Chi, 2026-11-10), from
   the design book handoffs/yumi-starweaver/PRIZES.json. Instruments of a
   star chart rather than ornaments: orbits, gates, meridians, a compass,
   a weaver's knot. Satin titanium in champagne, silver and graphite; ice
   cyan only as a thin line or a low glow, never a lamp; one milky opal.

   Built the way Station 33 and the Mythic Vault are (station33Outfit.ts,
   whose helpers these reuse), in the same frames per slot: earrings hang
   from a ring at the origin and are worn singly on her left; brow pieces
   sit on the brow frame round her tube; necklaces hang from the two studs;
   head pieces rest on the tube with a clamp. Every part is a solid with a
   back. Sizes are the book's, in D = her shell's outer diameter (4 units),
   brought to the size the earlier collections are worn at.
   ========================================================= */

const D = 4;

// --------------------------------------------------------------- materials

const satinSilver = () => std(0xd9dde2, 0.88, 0.28, { envMapIntensity: 1.15 });
const coldSilver = () => std(0xd2d9df, 0.92, 0.2, { envMapIntensity: 1.2 });
const smokeSilver = () => std(0x9ba2a9, 0.85, 0.3, { envMapIntensity: 1.1 });
const champagne = () => std(0xd8cdb6, 0.86, 0.28, { envMapIntensity: 1.15 });
const graphite = () => std(0x3b3e45, 0.85, 0.32, { envMapIntensity: 1.1 });
const blackTitanium = () => std(0x26282d, 0.8, 0.34, { envMapIntensity: 1 });
const ice = (glow = 0.08) => phys(0x7cc4d1, { roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.06, emissive: 0x7cc4d1, emissiveIntensity: glow });
const frost = (glow = 0.06) => phys(0xf1f5f6, { roughness: 0.16, clearcoat: 1, emissive: 0xdff4f7, emissiveIntensity: glow });
const opal = () => phys(0xece9f1, { roughness: 0.18, clearcoat: 0.8, iridescence: 0.5, iridescenceIOR: 1.35, sheen: 0.4, sheenColor: 0xc8e6ff });
const blackCeramic = () => phys(0x1d1e22, { roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.12 });
const lavender = () => phys(0xc8bfdc, { roughness: 0.24, clearcoat: 0.85, emissive: 0x9f8fd6, emissiveIntensity: 0.05 });
const deepBlue = () => phys(0x1d2a48, { roughness: 0.36, clearcoat: 0.5 });
const whiteGlaze = () => phys(0xf1efe9, { roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.06 });

/* An ellipse round the tube, lighter than outfitKit's ellipseRing: these
   bands are fine, and six of them at its resolution would be 9,000 triangles. */
function fineEllipse(rx: number, ry: number, tube: number, material: THREE.Material) {
  const points = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0);
  });
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 48, tube, 6, true), material);
}

/* A short straight strut between two points: a few sides is enough for a claw. */
function strut(a: [number, number, number], b: [number, number, number], radius: number, material: THREE.Material) {
  const from = new THREE.Vector3(...a);
  const along = new THREE.Vector3(...b).sub(from);
  const piece = mesh(new THREE.CylinderGeometry(radius, radius, along.length(), 6), material);
  piece.position.copy(from).addScaledVector(along, 0.5);
  piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
  return piece;
}

/* A point on a circle in the XY plane. */
const around = (r: number, a: number, z = 0): [number, number, number] => [Math.cos(a) * r, Math.sin(a) * r, z];

/* A four-pointed star with rounded points, as a shape. */
function fourPointStar(outer: number, inner: number) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 8; i += 1) {
    const a = Math.PI / 2 + (i * Math.PI) / 4;
    const r = i % 2 ? inner : outer;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

// ---------------------------------------------------------------- shells

const surfaceColour = (roughness: number, metalness: number) =>
  `rgb(0,${Math.round(roughness * 255)},${Math.round(metalness * 255)})`;

export const STARWEAVER_FINISHES: Record<string, ShellFinish> = {
  /* 01 Warm white porcelain; fine deep-blue points gather along the C, and
     ice glaze only where it ends, at the opening. */
  "sw-eventide-ceramic": {
    color: 0xffffff, metalness: 0.05, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.1,
    map: () => paint(512, 256, 9101, (ctx, rand, w, h) => {
      ctx.fillStyle = "#f1ece2";
      ctx.fillRect(0, 0, w, h);
      // A faint glaze crackle, so it reads as porcelain and not plastic.
      ctx.strokeStyle = "rgba(196,188,172,0.18)";
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 70; i += 1) {
        let x = rand() * w;
        let y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k += 1) {
          x += (rand() - 0.5) * 30;
          y += (rand() - 0.5) * 30;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Stars, denser in a band along the middle of the tube, the C's arc.
      for (let i = 0; i < 1400; i += 1) {
        const x = rand() * w;
        const band = Math.exp(-(((rand() * h - h / 2) / (h * 0.24)) ** 2));
        if (rand() > band * 0.9 + 0.1) continue;
        const y = h / 2 + (rand() - 0.5) * h * 0.6;
        ctx.fillStyle = `rgba(28,44,92,${0.45 + rand() * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + rand() * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      // The ice glaze where the C opens: the ends of the torus' u.
      for (const [x0, x1] of [[0, w * 0.06], [w * 0.94, w]]) {
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        const fromEnd = x0 === 0;
        g.addColorStop(fromEnd ? 0 : 1, "rgba(124,196,209,0.75)");
        g.addColorStop(fromEnd ? 1 : 0, "rgba(124,196,209,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x0, 0, x1 - x0, h);
      }
    }, SHELL_REPEAT),
  },
  /* 02 Deep graphite titanium, brushed along the C; the hairlines are in
     the surface map, not in geometry. */
  "sw-eclipse-titanium": {
    color: 0xffffff, metalness: 0.85, roughness: 0.32, clearcoat: 0.15, envMapIntensity: 1.2,
    map: () => paint(512, 256, 9102, (ctx, rand, w, h) => {
      ctx.fillStyle = "#3a3d44";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 420; i += 1) {
        const y = rand() * h;
        ctx.strokeStyle = `rgba(${rand() > 0.5 ? "200,206,214" : "20,22,26"},${0.06 + rand() * 0.12})`;
        ctx.lineWidth = 0.6 + rand() * 0.8;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + (rand() - 0.5) * 2);
        ctx.stroke();
      }
      // The narrow cold-silver edge: a light line down each long side.
      ctx.fillStyle = "rgba(205,212,220,0.35)";
      ctx.fillRect(0, 0, w, 3);
      ctx.fillRect(0, h - 3, w, 3);
    }, SHELL_REPEAT),
    surface: () => paint(512, 256, 9103, (ctx, rand, w, h) => {
      ctx.fillStyle = surfaceColour(0.36, 1);
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i += 1) {
        const y = rand() * h;
        ctx.strokeStyle = surfaceColour(0.22 + rand() * 0.08, 1);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }, SHELL_REPEAT),
  },
  /* 03 Milky grey opal: blue-violet only at a glancing angle (iridescence),
     low, slow patches; never a liquid that moves. */
  "sw-nebula-opal": {
    color: 0xffffff, metalness: 0.1, roughness: 0.2, clearcoat: 0.65, clearcoatRoughness: 0.08,
    iridescence: 0.45, sheen: 0.3, sheenColor: 0xc8e6ff, sheenRoughness: 0.4,
    map: () => paint(512, 256, 9104, (ctx, rand, w, h) => {
      ctx.fillStyle = "#dcd9e2";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 36; i += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 30 + rand() * 90;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const hue = rand();
        g.addColorStop(0, hue > 0.66 ? "rgba(185,170,230,0.28)" : hue > 0.33 ? "rgba(160,212,226,0.26)" : "rgba(245,243,248,0.4)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Fine veins of the stone, so it reads as stone from behind too.
      ctx.strokeStyle = "rgba(170,166,182,0.25)";
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 14; i += 1) {
        let x = rand() * w;
        let y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 6; k += 1) {
          x += 20 + rand() * 30;
          y += (rand() - 0.5) * 24;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }, SHELL_REPEAT),
  },
};

// ---------------------------------------------------------------- earrings

/* Every earring starts from the same two rings: the hook's, at the origin, and a link. */
function earringTop(metal: THREE.Material) {
  return group(jumpRing(0.05, 0.012, metal), jumpRing(0.022, 0.008, metal, -0.1));
}

/* 04 A silver orbit round a single faceted drop, held from behind. */
function buildOrbitDrop(): THREE.Object3D {
  const metal = satinSilver();
  const height = 0.16 * D * 0.72;
  const width = 0.08 * D * 0.72;
  const orbit = mesh(new THREE.TorusGeometry(1, 0.018 / (width / 2), 10, 56), metal, 0, -0.14 - height / 2, 0);
  orbit.scale.set(width / 2, height / 2, width / 2);
  const dropProfile: Array<[number, number]> = [];
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    dropProfile.push([i === 0 || i === 8 ? 0.0001 : 0.075 * Math.sin(Math.PI * t) ** 0.9 * (0.55 + 0.45 * t), -t * 0.24]);
  }
  /* Few sides, flat-shaded: cut, not moulded. */
  const stoneMaterial = phys(0xbfe3ea, { roughness: 0.08, clearcoat: 1, flatShading: true, emissive: 0x7cc4d1, emissiveIntensity: 0.06 });
  const stone = mesh(lathe(dropProfile, 8), stoneMaterial, 0, -0.14 - height * 0.3, 0);
  const cup = mesh(new THREE.SphereGeometry(0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal, 0, -0.14 - height * 0.3 - 0.13, -0.03);
  cup.rotation.x = -Math.PI / 2;
  const pin = rod([[0, -0.11, 0], [0, -0.14 - height * 0.3, 0]], 0.008, metal);
  const claws = [-1, 1].map(side => strut(
    [side * 0.03, -0.14 - height * 0.3 - 0.06, -0.035], [side * 0.05, -0.14 - height * 0.3 - 0.12, 0.012], 0.007, metal));
  return group(earringTop(metal), orbit, pin, stone, cup, ...claws);
}

/* 05 Two fine silver threads, long and short, meeting at a small comet's core. */
function buildCometThread(): THREE.Object3D {
  const metal = coldSilver();
  const length = 0.2 * D * 0.72;
  const core = mesh(new THREE.SphereGeometry(0.05, 18, 12), champagne(), 0.03, -0.12 - length, 0.01);
  const glow = mesh(new THREE.SphereGeometry(0.03, 12, 8), frost(0.15), 0.03, -0.12 - length, 0.045);
  const long = rod([[0, -0.12, 0], [-0.015, -0.12 - length * 0.5, 0.01], [0.03, -0.12 - length, 0.01]], 0.007, metal);
  const short = rod([[0, -0.12, 0], [0.05, -0.12 - length * 0.42, -0.006], [0.03, -0.12 - length * 0.92, 0.01]], 0.007, metal);
  const bead = mesh(new THREE.SphereGeometry(0.014, 10, 8), metal, 0, -0.12, 0);
  return group(earringTop(metal), long, short, bead, core, glow);
}

/* 06 Two moons of unequal size on one drop: black ceramic and brushed
   silver, ice enamel round their rims, rings incised on their backs. */
function buildBinaryMoons(): THREE.Object3D {
  const metal = satinSilver();
  const thickness = 0.012 * D;
  const moon = (radius: number, face: THREE.Material, y: number, x: number) => {
    const disc = mesh(new THREE.CylinderGeometry(radius, radius, thickness, 40), face, x, y, 0);
    disc.rotation.x = Math.PI / 2;
    const rim = mesh(new THREE.TorusGeometry(radius, 0.008, 6, 40), ice(0.1), x, y, 0);
    const lines = [0.45, 0.7].map(k => mesh(new THREE.TorusGeometry(radius * k, 0.004, 4, 36), smokeSilver(), x, y, -thickness / 2));
    return group(disc, rim, ...lines);
  };
  const big = 0.06 * D * 0.72 * 1.25;
  const small = 0.04 * D * 0.72 * 1.25;
  const upper = moon(small, metal, -0.14 - small, 0.035);
  const lower = moon(big, blackCeramic(), -0.14 - small * 2 - big + 0.02, -0.02);
  const pin = rod([[0, -0.11, 0], [0.03, -0.14, 0]], 0.008, metal);
  return group(earringTop(metal), pin, upper, lower);
}

/* 07 A slender spindle-shaped frame, open, with a star core held in it. */
function buildStarSpindle(): THREE.Object3D {
  const metal = smokeSilver();
  const height = 0.18 * D * 0.72;
  const half = 0.07 * D * 0.72 / 2;
  const top = -0.13;
  const bottom = top - height;
  const side = (s: number) => rod(Array.from({ length: 7 }, (_, i): [number, number, number] => {
    const t = i / 6;
    return [s * half * Math.sin(Math.PI * t), top - height * t, 0];
  }), 0.012, metal);
  const core = mesh(extrude(fourPointStar(0.07, 0.025), 0.03, 0.008, 4), frost(0.08), 0, top - height / 2, -0.015);
  const holders = rod([[0, top, 0], [0, top - height / 2 + 0.07, 0]], 0.005, metal);
  const lowerHolder = rod([[0, top - height / 2 - 0.07, 0], [0, bottom, 0]], 0.005, metal);
  return group(earringTop(metal), side(1), side(-1), holders, lowerHolder, core);
}

/* 08 A short conical spiral, like a signal wound into a jewel; an ice bead at its end. */
function buildSignalSpiral(): THREE.Object3D {
  const metal = graphite();
  const height = 0.13 * D * 0.72;
  const widest = 0.075 * D * 0.72 / 2;
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= 30; i += 1) {
    const t = i / 30;
    const a = t * Math.PI * 3;
    const r = 0.012 + widest * t;
    points.push([Math.cos(a) * r, -0.12 - height * t, Math.sin(a) * r]);
  }
  const coil = rod(points, 0.013, metal);
  const end = points[points.length - 1];
  const bead = mesh(new THREE.SphereGeometry(0.035, 16, 12), ice(0.12), end[0], end[1] - 0.025, end[2]);
  return group(earringTop(metal), coil, bead);
}

/* 09 A small hexagonal gate, bevelled, a milky seed set in it on claws, a plate behind. */
function buildPortalSeed(): THREE.Object3D {
  const metal = champagne();
  const r = 0.08 * D * 0.72 / 2 * 1.15;
  const y = -0.14 - r;
  const hexagon = (radius: number, z: number) =>
    Array.from({ length: 6 }, (_, i): [number, number, number] => {
      const [x, yy] = around(radius, Math.PI / 6 + (i * Math.PI) / 3);
      return [x, yy + y, z];
    });
  /* Straight bars between the corners, a bead at each: sides stay straight
     and corners crisp, where a rod's curve through six points rounds them. */
  const bars = (corners: Array<[number, number, number]>, radius: number, material: THREE.Material) => group(
    ...corners.map((corner, i) => strut(corner, corners[(i + 1) % corners.length], radius, material)),
    ...corners.map(corner => mesh(new THREE.SphereGeometry(radius, 8, 6), material, ...corner)),
  );
  const outer = bars(hexagon(r, 0), 0.016, metal);
  const inner = bars(hexagon(r * 0.82, 0.008), 0.004, ice(0.15));
  const backShape = new THREE.Shape();
  hexagon(r * 0.92, 0).forEach(([x, yy], i) => (i ? backShape.lineTo(x, yy - y) : backShape.moveTo(x, yy - y)));
  backShape.closePath();
  const plate = mesh(extrude(backShape, 0.01, 0.003, 6), metal, 0, y, -0.03);
  const seed = mesh(new THREE.SphereGeometry(0.045, 20, 14), opal(), 0, y, 0.005);
  const claws = [0, 1, 2, 3].map(k => {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const [cx, cy] = around(0.05, a);
    return strut([cx * 1.6, y + cy * 1.6, -0.025], [cx, y + cy, 0.03], 0.006, metal);
  });
  const pin = rod([[0, -0.11, 0], [0, -0.14 + 0.004, 0]], 0.008, metal);
  return group(earringTop(metal), pin, outer, inner, plate, seed, ...claws);
}

export const STARWEAVER_EARRINGS: Record<string, () => THREE.Object3D> = {
  "sw-orbit-drop": buildOrbitDrop,
  "sw-comet-thread": buildCometThread,
  "sw-binary-moon": buildBinaryMoons,
  "sw-star-spindle": buildStarSpindle,
  "sw-signal-spiral": buildSignalSpiral,
  "sw-portal-seed": buildPortalSeed,
};

// -------------------------------------------------------------------- brow

/* 10 Two narrow open bands round the tube, like a planet's meridians:
   polished outside, dark inside, a thin ice line inlaid. */
function buildMeridianCuff(): THREE.Object3D {
  const metal = coldSilver();
  const dark = smokeSilver();
  const bands = [-0.075, 0.075].map(z => {
    const outer = fineEllipse(TUBE_RADIUS + 0.03, TUBE_FRONT + 0.03, 0.016, metal);
    const inner = fineEllipse(TUBE_RADIUS + 0.014, TUBE_FRONT + 0.014, 0.008, dark);
    const line = fineEllipse(TUBE_RADIUS + 0.046, TUBE_FRONT + 0.046, 0.004, ice(0.2));
    const band = group(outer, inner, line);
    band.position.z = z;
    return band;
  });
  /* The join at the back, so the two are one piece. */
  const join = rod([[0, -TUBE_FRONT - 0.03, -0.075], [0, -TUBE_FRONT - 0.03, 0.075]], 0.014, metal);
  return group(...bands, join);
}

/* 11 Three moons from full to crescent on a short curved black-titanium seat. */
function buildPhaseNotch(): THREE.Object3D {
  const seat = rod([onBrow(-0.16, 0.035), onBrow(0, 0.05), onBrow(0.16, 0.035)], 0.024, blackTitanium());
  const silver = coldSilver();
  const radius = 0.018 * D * 1.15;
  const moons = [-0.1, 0, 0.1].map((z, i) => {
    const sphere = new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * (2 - i * 0.5));
    const moon = mesh(sphere, silver, ...onBrow(z, 0.05 + radius));
    moon.rotation.x = -Math.PI / 2;
    return moon;
  });
  return group(seat, ...moons, browPost(blackTitanium(), 0.05));
}

/* 12 A short slanted pin, rounded at both ends, carrying a four-pointed star. */
function buildZenithPin(): THREE.Object3D {
  const metal = std(0xc9ced4, 0.8, 0.38, { envMapIntensity: 1 });
  const seat = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.03, 20), metal, ...onBrow(0, 0.045));
  const pin = rod([onBrow(-0.15, 0.06), onBrow(0.12, 0.1)], 0.012, metal);
  const star = mesh(extrude(fourPointStar(0.09, 0.035), 0.03, 0.01, 6), lavender());
  star.rotation.x = -Math.PI / 2;
  star.position.set(...onBrow(0.15, 0.115));
  return group(seat, pin, star, browPost(metal, 0.06));
}

export const STARWEAVER_BROW: Record<string, () => THREE.Object3D> = {
  "sw-meridian-cuff": buildMeridianCuff,
  "sw-phase-notch": buildPhaseNotch,
  "sw-zenith-pin": buildZenithPin,
};

// ---------------------------------------------------------------- necklaces

/* The front of the necklace's curve, as the chain hangs (necklaceChain). */
const NECK_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.65, 0.25, -0.05), new THREE.Vector3(-0.45, 0.02, 0.02),
  new THREE.Vector3(0, -0.1, 0.07), new THREE.Vector3(0.45, 0.02, 0.02), new THREE.Vector3(0.65, 0.25, -0.05),
]);

/*
 * A fine snake chain along the same line as necklaceChain, from stud to
 * stud: smooth, as a cable chain this fine reads at her size, and a tenth
 * of the triangles of a chain of links (the book's 5,000 for jewellery).
 */
function snakeChain(material: THREE.Material, low = -0.1) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.65, 0.25, -0.05), new THREE.Vector3(-0.45, 0.02, 0.02),
    new THREE.Vector3(0, low, 0.07), new THREE.Vector3(0.45, 0.02, 0.02), new THREE.Vector3(0.65, 0.25, -0.05),
  ]);
  const cable = mesh(new THREE.TubeGeometry(curve, 72, 0.012, 6, false), material);
  const ends = [curve.getPoint(0), curve.getPoint(1)].map(p => mesh(new THREE.SphereGeometry(0.02, 10, 8), material, p.x, p.y, p.z));
  return group(cable, ...ends);
}

/* 13 Seven small rings across the front, the middle one a gate of ice enamel. */
function buildSevenGates(): THREE.Object3D {
  const metal = champagne();
  const g = group(snakeChain(metal, -0.1));
  for (let i = 0; i < 7; i += 1) {
    const t = 0.32 + (i / 6) * 0.36;
    const p = NECK_CURVE.getPointAt(t);
    const ringMesh = mesh(new THREE.TorusGeometry(i === 3 ? 0.05 : 0.038, 0.011, 6, 20), i % 2 ? satinSilver() : metal, p.x, p.y - 0.01, p.z + 0.03);
    g.add(ringMesh);
  }
  /* The gate: an arch of metal, ice enamel within, hanging from the middle ring. */
  const arch = new THREE.Shape();
  const w = 0.11;
  const h = 0.075 * D * 0.72;
  arch.moveTo(-w / 2, 0);
  arch.lineTo(-w / 2, -h + w / 2);
  arch.absarc(0, -h + w / 2, w / 2, Math.PI, 0, true);
  arch.lineTo(w / 2, 0);
  arch.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-w / 2 + 0.022, -0.02);
  hole.lineTo(-w / 2 + 0.022, -h + w / 2);
  hole.absarc(0, -h + w / 2, w / 2 - 0.022, Math.PI, 0, true);
  hole.lineTo(w / 2 - 0.022, -0.02);
  hole.closePath();
  arch.holes.push(hole);
  const centre = NECK_CURVE.getPointAt(0.5);
  const gate = mesh(extrude(arch, 0.025, 0.006, 16), metal, centre.x, centre.y - 0.07, centre.z + 0.04);
  const glass = new THREE.Shape();
  glass.moveTo(-w / 2 + 0.022, -0.02);
  glass.lineTo(-w / 2 + 0.022, -h + w / 2);
  glass.absarc(0, -h + w / 2, w / 2 - 0.022, Math.PI, 0, true);
  glass.lineTo(w / 2 - 0.022, -0.02);
  glass.closePath();
  const inside = mesh(extrude(glass, 0.012, 0.002, 16), ice(0.12), centre.x, centre.y - 0.07, centre.z + 0.046);
  const clasp = mesh(new THREE.BoxGeometry(0.06, 0.03, 0.03), metal, 0.62, 0.22, -0.06);
  return group(g, gate, inside, clasp);
}

/* 14 A small titanium compass: a white needle that stands off its face,
   a knurled rim, seven courses engraved on the back. Never turning. */
function buildStellarCompass(): THREE.Object3D {
  const metal = graphite();
  const g = group(snakeChain(metal, -0.1));
  const r = 0.09 * D * 0.72 / 2 * 1.2;
  const depth = 0.014 * D;
  const y = -0.32;
  const body = mesh(new THREE.CylinderGeometry(r, r, depth, 48), std(0xb8bcc2, 0.88, 0.3), 0, y, 0.07);
  body.rotation.x = Math.PI / 2;
  const face = mesh(new THREE.CylinderGeometry(r * 0.84, r * 0.84, 0.01, 48), deepBlue(), 0, y, 0.07 + depth / 2);
  face.rotation.x = Math.PI / 2;
  const knurl = mesh(new THREE.TorusGeometry(r, 0.012, 6, 60), smokeSilver(), 0, y, 0.07);
  const needleShape = new THREE.Shape();
  needleShape.moveTo(0, r * 0.75);
  needleShape.lineTo(0.025, 0);
  needleShape.lineTo(0, -r * 0.75);
  needleShape.lineTo(-0.025, 0);
  needleShape.closePath();
  const needle = mesh(extrude(needleShape, 0.012, 0.004, 4), whiteGlaze(), 0, y, 0.07 + depth / 2 + 0.012);
  needle.rotation.z = 0.35;
  const pivot = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 12), metal, 0, y, 0.07 + depth / 2 + 0.02);
  pivot.rotation.x = Math.PI / 2;
  const courses = Array.from({ length: 7 }, (_, i) => {
    const line = mesh(new THREE.BoxGeometry(r * 1.4, 0.006, 0.004), smokeSilver(), 0, y, 0.07 - depth / 2 - 0.001);
    line.rotation.z = (i * Math.PI) / 7;
    return line;
  });
  const bail = jumpRing(0.03, 0.01, metal, -0.1);
  bail.position.z = 0.07;
  return group(g, bail, body, face, knurl, needle, pivot, ...courses);
}

/* 15 Two orbits truly passing through each other, never touching: one
   silver, one black titanium; a small milky star-seed at their heart. */
function buildWeaversKnot(): THREE.Object3D {
  const silver = satinSilver();
  const g = group(snakeChain(silver, -0.1));
  const y = -0.32;
  const a = mesh(new THREE.TorusGeometry(1, 0.2, 10, 48), silver, -0.035, y, 0.08);
  a.scale.set(0.085, 0.12, 0.085);
  a.rotation.y = 0.5;
  const b = mesh(new THREE.TorusGeometry(1, 0.2, 10, 48), blackTitanium(), 0.035, y - 0.02, 0.08);
  b.scale.set(0.085, 0.12, 0.085);
  b.rotation.y = -0.5;
  const seed = mesh(new THREE.SphereGeometry(0.028, 16, 12), opal(), 0, y - 0.01, 0.08);
  const bail = jumpRing(0.03, 0.01, silver, -0.1);
  bail.position.z = 0.075;
  const link = jumpRing(0.02, 0.007, silver, -0.17);
  link.position.z = 0.08;
  return group(g, bail, link, a, b, seed);
}

export const STARWEAVER_NECKLACE: Record<string, () => THREE.Object3D> = {
  "sw-seven-gates": buildSevenGates,
  "sw-stellar-compass": buildStellarCompass,
  "sw-weavers-knot": buildWeaversKnot,
};

// -------------------------------------------------------------------- head

/*
 * Her top is a tube lying across, its section an ellipse (TUBE_FRONT deep,
 * TUBE_RADIUS high, its centre at -0.82 TUBE_RADIUS in the head frame). A
 * ring round the vertical sank into it; these head pieces follow the
 * section instead, front to back over the top, `lift` clear of it.
 * θ = 0 is the top, positive towards her front.
 */
const TUBE_CENTRE_Y = -TUBE_RADIUS * 0.82;
const overTube = (theta: number, lift: number, x = 0): [number, number, number] =>
  [x, TUBE_CENTRE_Y + (TUBE_RADIUS + lift) * Math.cos(theta), (TUBE_FRONT + lift) * Math.sin(theta)];

/* A sheet over the tube between two angles, with thickness, `length` along it. */
function tubeSheet(from: number, to: number, lift: number, thickness: number, length: number, material: THREE.Material) {
  const shape = new THREE.Shape();
  const steps = 16;
  for (let k = 0; k <= steps; k += 1) {
    const [, y, z] = overTube(from + ((to - from) * k) / steps, lift + thickness);
    if (k === 0) shape.moveTo(z, y);
    else shape.lineTo(z, y);
  }
  for (let k = steps; k >= 0; k -= 1) {
    const [, y, z] = overTube(from + ((to - from) * k) / steps, lift);
    shape.lineTo(z, y);
  }
  shape.closePath();
  const sheet = mesh(new THREE.ExtrudeGeometry(shape, {
    depth: length, bevelEnabled: true, bevelThickness: thickness * 0.45, bevelSize: thickness * 0.4, bevelSegments: 2, curveSegments: 4,
  }), material);
  /* The shape was drawn in (z, y); turn it so its depth runs along the tube. */
  sheet.rotation.y = -Math.PI / 2;
  sheet.position.x = length / 2;
  return sheet;
}

/* 16 A low diadem along the top of her tube, from side to side, so it reads
   as a crown from the front: two fine rails that follow the C's curve down
   a little at each end, three star-chart nodes standing on them facing
   out, joined by fine ice lines; a clamp beneath. Width .28 D. */
const C_OUTER = TUBE_RADIUS + 1.6;
const alongTop = (x: number, z: number, lift: number): [number, number, number] => {
  const [, y] = overTube(Math.asin(Math.max(-1, Math.min(1, z / (TUBE_FRONT + lift)))), lift);
  return [x, y - (x * x) / (2 * C_OUTER), z];
};

function buildCartographerDiadem(): THREE.Object3D {
  const metal = std(0x8e959d, 0.88, 0.3, { envMapIntensity: 1.1 });
  const half = (0.28 * D) / 2;
  const xs = Array.from({ length: 13 }, (_, i) => -half + (i * 2 * half) / 12);
  const rails = [0.07, 0.17].map(z => rod(xs.map(x => alongTop(x, z, 0.03)), 0.015, metal));
  const rungs = xs.filter((_, i) => i % 2 === 0).map(x => strut(alongTop(x, 0.07, 0.03), alongTop(x, 0.17, 0.03), 0.009, metal));
  const nodes: Array<[number, number, number]> = [];
  const parts: THREE.Object3D[] = [];
  for (const [x, rise] of [[-half * 0.62, 0.12], [0, 0.17], [half * 0.62, 0.12]] as const) {
    const foot = alongTop(x, 0.12, 0.03);
    const top: [number, number, number] = [foot[0], foot[1] + rise, foot[2] + 0.04];
    nodes.push([top[0], top[1], top[2] + 0.012]);
    parts.push(strut(foot, top, 0.011, metal));
    /* A small hexagonal plate facing her front, a cold gem at its heart. */
    const plate = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.016, 6), metal, ...top);
    plate.rotation.x = Math.PI / 2;
    const gem = mesh(new THREE.SphereGeometry(0.028, 14, 10), ice(0.14), top[0], top[1], top[2] + 0.02);
    parts.push(plate, gem);
  }
  const lines = rod(nodes, 0.005, ice(0.2));
  return group(...rails, ...rungs, ...parts, lines, tubeClamp(metal, 0.022));
}

/* 17 A short cap of three layered arcs over her top, like an aurora held
   still: satin white outside, ice and lavender beneath, each a little
   longer, so the colours show at its edges. Clear of her eye. */
function buildAuroraCap(): THREE.Object3D {
  const layers = [
    /* Beneath first: the longest, lavender. */
    { from: -0.95, to: 1.22, lift: 0.012, length: 0.86, material: phys(0xb7aae8, { roughness: 0.28, clearcoat: 0.55, emissive: 0x8f7fd6, emissiveIntensity: 0.1 }) },
    { from: -0.85, to: 1.04, lift: 0.04, length: 0.96, material: phys(0x9fd8e2, { roughness: 0.28, clearcoat: 0.55, emissive: 0x5fb3c2, emissiveIntensity: 0.1 }) },
    /* Outside: the shortest, satin white. */
    { from: -0.75, to: 0.84, lift: 0.068, length: 1.06, material: phys(0xf3f1ee, { roughness: 0.32, clearcoat: 0.4, sheen: 0.4, sheenColor: 0xe6f4f7 }) },
  ];
  const sheets = layers.map(layer => tubeSheet(layer.from, layer.to, layer.lift, 0.02, layer.length, layer.material));
  return group(...sheets, tubeClamp(std(0xc9ced4, 0.8, 0.32), 0.02));
}

export const STARWEAVER_HEAD: Record<string, () => THREE.Object3D> = {
  "sw-cartographer-diadem": buildCartographerDiadem,
  "sw-aurora-visor": buildAuroraCap,
};

/** Every id this collection can build, for the catalogue test. */
export const STARWEAVER_BUILDABLE: readonly string[] = [
  STARWEAVER_FINISHES, STARWEAVER_EARRINGS, STARWEAVER_BROW, STARWEAVER_NECKLACE, STARWEAVER_HEAD,
].flatMap(record => Object.keys(record));
