import * as THREE from "three";

import { EYE_RADIUS } from "./anatomy";
import { ball, block, brow, collar, disc, hanging, hat, necklace, pin, polygon, ring, wire } from "./collection03Outfit";
import { brass, chrome, ellipseRing, extrude, glaze, group, irisCap, lathe, mesh, paint, phys, std, taperedTube, tintedLens, type NeckPiece } from "./outfitKit";

/* =========================================================
   Station 33 · Collection 04 — the 333 expansion's 89 accessories

   58 Orbital Atelier pieces (world crafts, nature, everyday tools) and
   55 Deep Space Treasures (solar-system bodies and nine original worlds);
   the 24 shell finishes are in ./collection04Finishes.ts. Every piece is
   its own closed solid built from the shop's kit, in the same attachment
   frames Collection 03 uses — so outfit.ts mounts them with no new code —
   and none owns a timer, a canvas or a render loop.

   Colour (Chi, 2026-10-20: "以鮮明色彩"): saturated, clear hues rather
   than the muted earth tones of the proposal sketches, from the PALETTE
   below, against brass, chrome or a dark titanium so they read at the
   shop's thumbnail size and on both the Standard and the Cosmic stand.

   Hanging pieces (earrings, mouth, charms) are lowered by their own
   measured height so the bail's top is always exactly the attachment
   point (tests/yumiCollection04.test.ts holds it).
   ========================================================= */

type Builder = () => THREE.Object3D;
type Point = [number, number, number];

/** Vivid, named, used everywhere below so the collection reads as one. */
const PALETTE = {
  turquoise: 0x0fb8a9,
  cobalt: 0x1f4fd8,
  saffron: 0xf6b400,
  vermilion: 0xe5381e,
  emerald: 0x0d9b57,
  magenta: 0xd62f7c,
  coral: 0xff6a55,
  violet: 0x7a3fe0,
  sky: 0x22b2f0,
  lime: 0x86cf17,
  tangerine: 0xff8a12,
  rose: 0xff8fb1,
  ice: 0xbfefff,
  cream: 0xfff1d6,
  snow: 0xf8fbff,
  ink: 0x15203b,
  night: 0x0d0f17,
  amber: 0xffa51f,
  teal: 0x00897b,
  ruby: 0xc8102e,
  indigo: 0x2c2f9e,
  honey: 0xf3a83b,
  mint: 0x5ee0b8,
  plum: 0x8a1f7a,
} as const;

const titanium = () => std(0x2a3140, 0.82, 0.28);
const enamel = (color: number) => glaze(color, 0.22);
const matte = (color: number, roughness = 0.62) => std(color, 0.02, roughness);
const lit = (color: number, intensity = 0.35) => std(color, 0.1, 0.3, { emissive: color, emissiveIntensity: intensity });
const crystal = (color: number, opacity = 0.72) =>
  phys(color, { roughness: 0.08, clearcoat: 1, transparent: true, opacity, depthWrite: false, iridescence: 0.25 });

/** A hanging body lowered so its top meets the bail, whatever its size. */
function dangle(body: THREE.Object3D, bail: THREE.Material = brass()) {
  const top = new THREE.Box3().setFromObject(body).max.y;
  return hanging(body, top + 0.085, bail);
}

/** Food or a drink carried from the mouth's clip by a short loop behind it. */
function carried(food: THREE.Object3D) {
  const gold = brass();
  const top = new THREE.Box3().setFromObject(food).max.y;
  food.position.y -= top + 0.1;
  const loop = wire([[0, -0.08, -0.06], [-0.11, -0.16, -0.08], [0, food.position.y + top - 0.02, -0.08]], 0.012, gold);
  return group(ring(0.035, 0.009, gold, 0, -0.044), loop, food);
}

/** A plain tube along points, without the end caps wire() adds — for ribs
 *  whose ends meet something else, where the caps would only cost triangles. */
function rib(points: Point[], radius: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return mesh(new THREE.TubeGeometry(curve, 16, radius, 6, false), material);
}

/** A plain box, for small marks where a rounded block's bevel would be wasted. */
function tick(width: number, height: number, depth: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(new THREE.BoxGeometry(width, height, depth), material, x, y, z);
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, x = 0, y = 0, z = 0, segments = 28) {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, x, y, z);
}

function arc(radius: number, tube: number, angle: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(new THREE.TorusGeometry(radius, tube, 8, 32, angle), material, x, y, z);
}

function petal(width: number, height: number, depth: number, material: THREE.Material) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width, height * 0.25, width * 0.7, height, 0, height);
  shape.bezierCurveTo(-width * 0.7, height, -width, height * 0.25, 0, 0);
  return mesh(extrude(shape, depth, 0.008, 12), material);
}

/* ── Single earrings ───────────────────────────────────────────────── */

export const COLLECTION04_EARRINGS: Record<string, Builder> = {
  /* An octagonal brass plate set with four glazed tiles, beaded behind. */
  "s33v4-orbital-zellige": () => {
    const gold = brass();
    const plate = cylinder(0.2, 0.2, 0.045, gold, 0, 0, 0, 8);
    plate.rotation.x = Math.PI / 2;
    const body = group(plate, ring(0.2, 0.012, gold, 0, 0, 0.012), ball(0.021, gold, 0, 0, 0.06));
    const tiles: [number, number, number][] = [
      [-0.072, 0.072, PALETTE.turquoise], [0.072, 0.072, PALETTE.saffron],
      [-0.072, -0.072, PALETTE.cobalt], [0.072, -0.072, PALETTE.snow],
    ];
    for (const [x, y, color] of tiles) {
      const tile = block(0.125, 0.125, 0.04, enamel(color), x, y, 0.036);
      tile.rotation.z = 0.1;
      body.add(tile);
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = (index * Math.PI) / 4;
      body.add(ball(0.012, gold, Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, -0.027));
    }
    return dangle(body);
  },

  /* Two unequal folded wings in thin red metal; the fold ridge shows side-on. */
  "s33v4-orbital-origami": () => {
    const red = std(PALETTE.vermilion, 0.55, 0.32);
    const left = polygon([[0, 0], [-0.24, 0.12], [-0.06, -0.2]], 0.016, red);
    const right = polygon([[0, 0], [0.17, 0.16], [0.06, -0.15]], 0.016, red);
    left.rotation.y = 0.45;
    right.rotation.y = -0.6;
    const ridge = wire([[0, 0.02, 0.012], [0, -0.17, 0.012]], 0.009, brass());
    const head = polygon([[0, 0], [0.05, 0.14], [0.02, 0.15]], 0.016, red);
    head.position.set(0.04, 0.02, 0);
    return dangle(group(left, right, ridge, head));
  },

  /* A long baobab pod: grained shell and an enamel cut face of seeds. */
  "s33v4-orbital-baobab": () => {
    const shell = ball(0.13, std(0x8a5a2b, 0.05, 0.55));
    shell.scale.set(0.85, 1.6, 0.8);
    const face = disc(0.1, 0.03, enamel(PALETTE.cream), 0, 0, 0.1);
    face.scale.set(0.85, 1.6, 1);
    const body = group(shell, face);
    for (let index = 0; index < 7; index += 1) body.add(ball(0.016, enamel(PALETTE.tangerine), Math.sin(index * 2.1) * 0.05, -0.12 + index * 0.04, 0.12));
    for (const y of [-0.12, 0, 0.12]) {
      const band = ellipseRing(0.112 * Math.sqrt(1 - (y / 0.21) ** 2), 0.105 * Math.sqrt(1 - (y / 0.21) ** 2), 0.007, brass());
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      body.add(band);
    }
    return dangle(body);
  },

  /* A brass hoop holding cut-out red leaves on a branch, in real depth. */
  "s33v4-orbital-papercut": () => {
    const red = enamel(PALETTE.ruby);
    const body = group(ring(0.19, 0.016, brass()));
    body.add(wire([[-0.15, -0.1, 0], [-0.02, 0, 0], [0.13, 0.08, 0]], 0.014, red));
    for (let index = 0; index < 6; index += 1) {
      const leaf = petal(0.045, 0.1, 0.012, red);
      leaf.position.set(-0.12 + index * 0.05, -0.07 + index * 0.03, 0);
      leaf.rotation.z = index % 2 ? 0.9 : -2.1;
      body.add(leaf);
    }
    return dangle(body);
  },

  /* A segmented spiral shell on a stone back. */
  "s33v4-orbital-ammonite": () => {
    const stone = matte(0xd8d2c4, 0.7);
    const body = group(disc(0.18, 0.05, stone));
    const turns: Point[] = [];
    for (let index = 0; index <= 60; index += 1) {
      const t = index / 60;
      const angle = t * Math.PI * 4.2;
      const radius = 0.02 + 0.15 * t;
      turns.push([Math.cos(angle) * radius, Math.sin(angle) * radius, 0.035]);
    }
    body.add(wire(turns, 0.016, enamel(PALETTE.tangerine)));
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      body.add(block(0.008, 0.05, 0.02, brass(), Math.cos(angle) * 0.13, Math.sin(angle) * 0.13, 0.04));
    }
    return dangle(body);
  },

  /* Three clay beads, small to large, glazed burnt orange to cream. */
  "s33v4-orbital-kiln": () => {
    const body = group(wire([[0, 0.02, 0], [0, -0.38, 0]], 0.008, brass()));
    const beads: [number, number, number][] = [[0.055, -0.03, PALETTE.vermilion], [0.075, -0.16, PALETTE.tangerine], [0.095, -0.32, PALETTE.cream]];
    for (const [radius, y, color] of beads) {
      const bead = ball(radius, enamel(color), 0, y);
      bead.scale.y = 0.85;
      body.add(bead);
    }
    return dangle(body);
  },

  /* Abstract coral branches in coral-pink ceramic, not real coral. */
  "s33v4-orbital-coral": () => {
    const pink = enamel(PALETTE.coral);
    const body = group(
      wire([[0, 0, 0], [0, -0.16, 0], [-0.08, -0.3, 0.02]], 0.026, pink),
      wire([[0, -0.1, 0], [0.1, -0.2, 0], [0.12, -0.32, -0.02]], 0.022, pink),
      wire([[0, -0.18, 0], [-0.12, -0.2, 0.03]], 0.018, pink),
    );
    for (const [x, y] of [[-0.08, -0.3], [0.12, -0.32], [-0.12, -0.2]]) body.add(ball(0.03, pink, x, y));
    return dangle(body);
  },

  /* A black lacquer stroke that swells as it turns, tipped with gold. */
  "s33v4-orbital-calligraphy": () => {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index <= 12; index += 1) {
      const t = index / 12;
      points.push(new THREE.Vector3(Math.sin(t * Math.PI * 1.6) * 0.14, -t * 0.34, 0));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    /* One tube, fine at the start and full at the turn, like a brush pressed down. */
    const stroke = mesh(taperedTube(curve, (t) => 0.008 + 0.03 * Math.sin(t * Math.PI * 0.85), 48, 10), std(PALETTE.night, 0.1, 0.15));
    return dangle(group(stroke, ball(0.035, brass(), points[12].x, points[12].y, points[12].z)));
  },

  /* Three bars of different lengths hung from a rail, with their axle. */
  "s33v4-orbital-marimba": () => {
    const body = group(block(0.34, 0.03, 0.04, brass(), 0, 0), wire([[-0.16, 0, -0.03], [0.16, 0, -0.03]], 0.007, brass()));
    const bars: [number, number, number][] = [[-0.11, 0.26, PALETTE.saffron], [0, 0.2, PALETTE.tangerine], [0.11, 0.15, PALETTE.vermilion]];
    for (const [x, length, color] of bars) {
      body.add(wire([[x, -0.01, 0], [x, -0.05, 0]], 0.006, brass()));
      body.add(block(0.07, length, 0.03, enamel(color), x, -0.05 - length / 2));
    }
    return dangle(body);
  },

  /* A honey planet through two tilted rings; the rings close behind it. */
  "s33v4-space-saturn": () => {
    const body = group(ball(0.14, enamel(PALETTE.honey)));
    const inner = ring(0.225, 0.016, brass());
    inner.rotation.set(0.65, 0.22, 0);
    const outer = ring(0.27, 0.01, chrome());
    outer.rotation.copy(inner.rotation);
    body.add(inner, outer);
    for (const y of [-0.05, 0.02, 0.07]) {
      const band = ring(Math.sqrt(0.14 * 0.14 - y * y), 0.006, enamel(PALETTE.tangerine), 0, y);
      band.rotation.x = Math.PI / 2;
      body.add(band);
    }
    return dangle(body);
  },

  /* A silver half sphere and a black curved shade: day and night. */
  "s33v4-space-mercury": () => {
    const day = mesh(new THREE.SphereGeometry(0.14, 24, 16, 0, Math.PI), chrome());
    day.rotation.y = -Math.PI / 2;
    const night = mesh(new THREE.SphereGeometry(0.145, 24, 16, 0, Math.PI), std(PALETTE.night, 0.4, 0.4));
    night.rotation.y = Math.PI / 2;
    return dangle(group(day, night, ring(0.15, 0.008, brass())));
  },

  /* A red-brown dust spiral round a small sand core. */
  "s33v4-space-mars-dust": () => {
    const turns: Point[] = [];
    for (let index = 0; index <= 48; index += 1) {
      const t = index / 48;
      const angle = t * Math.PI * 5;
      turns.push([Math.cos(angle) * 0.14, -0.15 + t * 0.3, Math.sin(angle) * 0.14]);
    }
    return dangle(group(ball(0.08, matte(0xf0b36a)), wire(turns, 0.014, enamel(0xc2401c))));
  },

  /* An ice-blue planet with an almost upright ring and visible bearings. */
  "s33v4-space-uranus": () => {
    const halo = ring(0.21, 0.01, chrome());
    halo.rotation.y = Math.PI / 2;
    halo.rotation.z = 0.12;
    return dangle(group(ball(0.13, enamel(PALETTE.ice)), halo, ball(0.022, brass(), 0, 0.21), ball(0.022, brass(), 0, -0.21)));
  },

  /* A black shell around an amber drop, warm light through one seam. */
  "s33v4-space-io": () => {
    /* The shell is open at the front (a sphere missing a wedge), so the
       amber drop inside shows through the seam as warm light. */
    const shell = mesh(new THREE.SphereGeometry(0.13, 28, 18, Math.PI * 0.35, Math.PI * 1.3), std(PALETTE.night, 0.3, 0.35));
    shell.scale.set(1, 1.3, 1);
    shell.rotation.y = Math.PI;
    const core = ball(0.1, lit(PALETTE.amber, 0.55), 0, -0.01, 0.0);
    core.scale.set(0.82, 1.2, 0.82);
    return dangle(group(shell, core));
  },

  /* Luma: three silver petal shells cupping a milk-white light seed. */
  "s33v4-space-luma": () => {
    const body = group(ball(0.075, lit(PALETTE.cream, 0.4)));
    for (let index = 0; index < 3; index += 1) {
      const shell = petal(0.09, 0.2, 0.012, chrome());
      shell.rotation.z = (index * Math.PI * 2) / 3;
      shell.position.z = 0.02;
      body.add(shell);
    }
    return dangle(body);
  },

  /* Vesper: forked violet crystal pillars in a smoky black socket. */
  "s33v4-space-vesper": () => {
    const violet = crystal(PALETTE.violet, 0.85);
    const body = group(cylinder(0.08, 0.06, 0.07, std(PALETTE.night, 0.5, 0.3), 0, 0, 0, 6));
    const pillars: [number, number, number][] = [[0, -0.18, 0], [-0.05, -0.14, -0.35], [0.05, -0.13, 0.4]];
    for (const [x, y, tilt] of pillars) {
      const pillar = cylinder(0.025, 0.035, 0.22, violet, x, y, 0, 6);
      pillar.rotation.z = tilt;
      body.add(pillar);
    }
    return dangle(body);
  },

  /* Thalassa: three blues, clear to opaque, along an arched rib. */
  "s33v4-space-thalassa": () => {
    const body = group(arc(0.16, 0.012, Math.PI, chrome(), 0, -0.02));
    body.children[0].rotation.z = Math.PI;
    const beads: [number, number, THREE.Material][] = [
      [-0.16, -0.02, crystal(PALETTE.sky, 0.55)],
      [0, -0.18, crystal(PALETTE.cobalt, 0.8)],
      [0.16, -0.02, enamel(PALETTE.teal)],
    ];
    for (const [x, y, material] of beads) body.add(ball(0.055, material, x, y));
    return dangle(body);
  },
};

/* ── Brow cuffs (authored front-on, turned onto the upper arm) ─────── */

export const COLLECTION04_BROW: Record<string, Builder> = {
  /* Two towers, a curved main cable and six hangers to the deck. */
  "s33v4-orbital-bridge": () => {
    const red = std(PALETTE.vermilion, 0.6, 0.3);
    const body = group(block(0.46, 0.035, 0.07, red, 0, -0.045));
    for (const x of [-0.16, 0.16]) body.add(block(0.03, 0.2, 0.055, red, x, 0.035));
    body.add(wire([[-0.23, 0.08, 0.035], [-0.16, 0.13, 0.035], [0, 0.04, 0.035], [0.16, 0.13, 0.035], [0.23, 0.08, 0.035]], 0.011, chrome()));
    for (const x of [-0.11, -0.065, -0.02, 0.02, 0.065, 0.11]) {
      body.add(wire([[x, -0.03, 0.03], [x, 0.042 + Math.abs(x) * 0.6, 0.03]], 0.006, chrome()));
    }
    return brow(body);
  },

  /* Three short bamboo sections with their node rings, brass inside. */
  "s33v4-orbital-bamboo": () => {
    const green = enamel(PALETTE.lime);
    const body = group();
    for (const x of [-0.15, 0, 0.15]) {
      const stem = cylinder(0.05, 0.05, 0.13, green, x);
      stem.rotation.z = Math.PI / 2;
      const node = ring(0.052, 0.012, enamel(PALETTE.emerald), x + 0.065);
      node.rotation.y = Math.PI / 2;
      body.add(stem, node);
    }
    body.add(wire([[-0.23, 0, -0.04], [0.23, 0, -0.04]], 0.01, brass()));
    return brow(body);
  },

  /* Three arches, large to small, on a metal beam behind. */
  "s33v4-orbital-aqueduct": () => {
    const stone = enamel(0xf0c27b);
    const body = group(block(0.5, 0.04, 0.06, brass(), 0, 0.1, -0.02));
    const arches: [number, number][] = [[-0.15, 0.085], [0.02, 0.07], [0.16, 0.055]];
    for (const [x, radius] of arches) {
      body.add(arc(radius, 0.022, Math.PI, stone, x, 0.02));
      body.add(block(0.03, 0.1, 0.05, stone, x - radius, -0.02), block(0.03, 0.1, 0.05, stone, x + radius, -0.02));
    }
    return brow(body);
  },

  /* Three raised type sorts: circle, triangle, square — no letters. */
  "s33v4-orbital-letterpress": () => {
    const lead = std(0x5c6370, 0.75, 0.35);
    const body = group();
    const glyphs: [number, THREE.Object3D][] = [
      [-0.15, disc(0.04, 0.03, enamel(PALETTE.ruby))],
      [0, polygon([[-0.045, -0.04], [0.045, -0.04], [0, 0.05]], 0.03, enamel(PALETTE.saffron))],
      [0.15, block(0.08, 0.08, 0.03, enamel(PALETTE.cobalt))],
    ];
    for (const [x, glyph] of glyphs) {
      body.add(block(0.12, 0.13, 0.08, lead, x, 0, -0.03));
      glyph.position.set(x, 0, 0.03);
      body.add(glyph);
    }
    return brow(body);
  },

  /* Three silver-blue crest lines of different heights, set in at both ends. */
  "s33v4-orbital-wavecrest": () => {
    const body = group(block(0.04, 0.12, 0.06, brass(), -0.24), block(0.04, 0.12, 0.06, brass(), 0.24));
    const crests: [number, number][] = [[0.05, PALETTE.sky], [0.0, PALETTE.cobalt], [-0.05, PALETTE.turquoise]];
    crests.forEach(([y, color], index) => {
      body.add(wire([[-0.22, y, 0.01], [-0.1, y + 0.06 - index * 0.015, 0.02], [0.02, y - 0.02, 0.02], [0.14, y + 0.05, 0.02], [0.22, y, 0.01]], 0.014, enamel(color)));
    });
    return brow(body);
  },

  /* A true over-under weave of coloured metal strips. */
  "s33v4-orbital-weft": () => {
    const body = group();
    const colors = [PALETTE.magenta, PALETTE.saffron, PALETTE.teal];
    colors.forEach((color, row) => {
      const y = -0.07 + row * 0.07;
      const points: Point[] = [];
      for (let index = 0; index <= 8; index += 1) points.push([-0.22 + index * 0.055, y, (index + row) % 2 ? 0.02 : -0.02]);
      body.add(wire(points, 0.014, std(color, 0.6, 0.3)));
    });
    for (let column = 0; column < 5; column += 1) {
      const x = -0.18 + column * 0.09;
      body.add(wire([[x, -0.11, column % 2 ? -0.02 : 0.02], [x, 0, column % 2 ? 0.02 : -0.02], [x, 0.11, column % 2 ? -0.02 : 0.02]], 0.011, brass()));
    }
    return brow(body);
  },

  /* Two suns, gold and ice blue, on one elliptical orbit. */
  "s33v4-space-binary": () => {
    const body = group(ellipseRing(0.24, 0.1, 0.014, chrome()), block(0.3, 0.025, 0.05, titanium(), 0, -0.07, -0.025));
    body.add(ball(0.075, lit(PALETTE.saffron, 0.25), -0.13, 0, 0.04), ball(0.055, lit(PALETTE.sky, 0.25), 0.15, 0.015, 0.04));
    return brow(body);
  },

  /* Two red canyon walls bridged by a fine silver beam, a gap between. */
  "s33v4-space-mars-bridge": () => {
    const rock = matte(0xc4401f, 0.7);
    const left = polygon([[-0.25, -0.07], [-0.04, -0.07], [-0.06, 0.03], [-0.14, 0.09], [-0.25, 0.05]], 0.07, rock);
    const right = polygon([[0.04, -0.07], [0.25, -0.07], [0.25, 0.07], [0.15, 0.1], [0.06, 0.04]], 0.07, rock);
    return brow(group(left, right, wire([[-0.08, 0.05, 0.08], [0.08, 0.05, 0.08]], 0.01, chrome())));
  },

  /* A white ice arc split by one irregular cyan seam. */
  "s33v4-space-europa-seam": () => {
    const ice = enamel(PALETTE.snow);
    const body = group(block(0.5, 0.12, 0.06, ice));
    body.add(wire([[-0.24, 0.02, 0.035], [-0.12, -0.02, 0.04], [-0.04, 0.03, 0.04], [0.06, -0.025, 0.04], [0.15, 0.02, 0.04], [0.24, -0.01, 0.035]], 0.011, lit(PALETTE.turquoise, 0.3)));
    return brow(body);
  },

  /* Two small opposed poles on a black titanium clip, a short arc between. */
  "s33v4-space-magnetar": () => {
    const body = group(block(0.42, 0.07, 0.07, titanium(), 0, -0.05));
    body.add(cylinder(0.035, 0.035, 0.09, enamel(PALETTE.ruby), -0.12, 0.03), cylinder(0.035, 0.035, 0.09, enamel(PALETTE.cobalt), 0.12, 0.03));
    body.add(arc(0.12, 0.009, Math.PI, lit(PALETTE.violet, 0.4), 0, 0.075));
    return brow(body);
  },

  /* Aurelia: segmented cream-gold arcs and one peach glass leaf. */
  "s33v4-space-aurelia": () => {
    const body = group();
    for (let index = 0; index < 4; index += 1) {
      const segment = arc(0.22, 0.02, 0.32, brass(), 0, -0.13);
      segment.rotation.z = 0.55 + index * 0.37;
      body.add(segment);
    }
    const glass = petal(0.06, 0.13, 0.014, crystal(PALETTE.rose, 0.75));
    glass.position.set(0, 0.03, 0.04);
    body.add(glass);
    return brow(body);
  },
};

/* ── Necklaces (pendant on the shared chain between the two studs) ─── */

export const COLLECTION04_NECKLACE: Record<string, Builder> = {
  /* An open atlas: two covers, layered pages, gilt lines and the spine. */
  "s33v4-orbital-atlas": () => {
    const cover = enamel(PALETTE.teal);
    const paper = matte(PALETTE.cream, 0.75);
    const gold = brass();
    const body = group(block(0.025, 0.25, 0.06, gold, 0, 0, 0.01));
    for (const side of [-1, 1]) {
      const half = group(block(0.17, 0.24, 0.025, cover), block(0.145, 0.215, 0.035, paper, 0, 0, 0.025));
      for (const y of [-0.07, -0.035, 0, 0.035, 0.07]) half.add(block(0.12, 0.004, 0.004, gold, 0, y, 0.045));
      half.position.x = side * 0.082;
      half.rotation.y = side * 0.25;
      body.add(half);
    }
    return necklace(body, -0.32);
  },

  /* Concentric rings with real thickness and a crossing pointer. */
  "s33v4-orbital-astrolabe": () => {
    const gold = brass();
    const body = group(disc(0.18, 0.03, enamel(PALETTE.cobalt)), ring(0.18, 0.014, gold), ring(0.12, 0.01, gold, 0, 0, 0.02));
    for (let index = 0; index < 12; index += 1) {
      const angle = (index * Math.PI) / 6;
      const mark = tick(0.006, 0.025, 0.01, gold, Math.sin(angle) * 0.155, Math.cos(angle) * 0.155, 0.02);
      mark.rotation.z = -angle;
      body.add(mark);
    }
    const pointer = block(0.32, 0.018, 0.02, chrome(), 0, 0, 0.035);
    pointer.rotation.z = 0.5;
    return necklace(group(body, pointer, ball(0.022, gold, 0, 0, 0.045)), -0.32);
  },

  /* Five green contour terraces stepping up round a medallion. */
  "s33v4-orbital-terrace": () => {
    const body = group();
    const greens = [0x0b6e3c, 0x0d9b57, 0x2fbf61, 0x6fd64a, 0xb7ea3c];
    greens.forEach((color, index) => body.add(disc(0.18 - index * 0.03, 0.02, enamel(color), 0, 0, index * 0.018)));
    return necklace(group(body, ring(0.18, 0.01, brass())), -0.32);
  },

  /* A cacao pod in ridged halves; the seam and a small hinge show. */
  "s33v4-orbital-cacao": () => {
    const pod = ball(0.12, enamel(PALETTE.tangerine));
    pod.scale.set(0.85, 1.4, 0.8);
    const body = group(pod);
    for (let index = 0; index < 6; index += 1) {
      const ridge = ellipseRing(0.1, 0.165, 0.008, enamel(0xd8641a));
      ridge.rotation.y = (index * Math.PI) / 6;
      body.add(ridge);
    }
    body.add(cylinder(0.018, 0.018, 0.06, brass(), 0.095, 0));
    return necklace(body, -0.33);
  },

  /* A small brass frame on three rods, each strung with beads. */
  "s33v4-orbital-abacus": () => {
    const gold = brass();
    const body = group(block(0.3, 0.025, 0.04, gold, 0, 0.12), block(0.3, 0.025, 0.04, gold, 0, -0.12), block(0.025, 0.26, 0.04, gold, -0.14), block(0.025, 0.26, 0.04, gold, 0.14));
    const colors = [PALETTE.ruby, PALETTE.saffron, PALETTE.emerald];
    colors.forEach((color, row) => {
      const y = -0.07 + row * 0.07;
      body.add(wire([[-0.13, y, 0], [0.13, y, 0]], 0.005, gold));
      for (let index = 0; index < 4; index += 1) {
        const bead = ball(0.026, enamel(color), -0.09 + index * 0.05 + (row === 1 ? 0.03 : 0), y);
        bead.scale.x = 0.7;
        body.add(bead);
      }
    });
    return necklace(body, -0.32);
  },

  /* A sandstone well ring with a blue glazed water surface inside. */
  "s33v4-orbital-desertwell": () => {
    const sand = matte(0xf0a35a, 0.7);
    const rim = ring(0.13, 0.05, sand);
    const water = disc(0.1, 0.02, lit(PALETTE.sky, 0.15), 0, 0, -0.01);
    return necklace(group(rim, water, ring(0.185, 0.008, brass())), -0.32);
  },

  /* Europa: an ice-white shell opening on blue wave layers. */
  "s33v4-space-europa": () => {
    const body = group(disc(0.19, 0.055, enamel(PALETTE.snow)), ring(0.195, 0.014, brass()));
    const blues = [PALETTE.sky, PALETTE.cobalt, PALETTE.turquoise, PALETTE.ice];
    blues.forEach((color, index) => {
      const y = -0.1 + index * 0.06;
      body.add(wire([[-0.14, y, 0.04], [-0.04, y + 0.025, 0.06], [0.06, y - 0.012, 0.06], [0.14, y + 0.012, 0.04]], 0.013, enamel(color)));
    });
    return necklace(body, -0.32);
  },

  /* Jupiter: a red-copper storm set in cream and caramel bands. */
  "s33v4-space-jupiter": () => {
    const body = group(disc(0.18, 0.04, enamel(PALETTE.cream)), ring(0.18, 0.012, brass()));
    for (const [y, color] of [[-0.1, 0xd2691e], [-0.03, PALETTE.honey], [0.05, 0xb5452b], [0.11, PALETTE.honey]] as const) {
      body.add(block(0.32 - Math.abs(y) * 1.2, 0.03, 0.01, enamel(color), 0, y, 0.025));
    }
    const storm = ball(0.05, enamel(PALETTE.vermilion), 0.06, -0.06, 0.03);
    storm.scale.set(1.5, 0.9, 0.4);
    return necklace(group(body, storm), -0.32);
  },

  /* The far side of the moon: grey with stepped craters. */
  "s33v4-space-lunar": () => {
    const body = group(disc(0.18, 0.04, std(0xc9ced6, 0.55, 0.45)), ring(0.18, 0.012, chrome()));
    const craters: [number, number, number][] = [[-0.07, 0.06, 0.045], [0.06, -0.05, 0.06], [0.08, 0.08, 0.025], [-0.06, -0.09, 0.03]];
    for (const [x, y, radius] of craters) body.add(ring(radius, radius * 0.25, std(0x8a929e, 0.4, 0.5), x, y, 0.022));
    return necklace(body, -0.32);
  },

  /* Titan: a hazy orange glass case with dark wave slivers inside. */
  "s33v4-space-titan": () => {
    const body = group(block(0.26, 0.2, 0.08, crystal(PALETTE.tangerine, 0.6)), ellipseRing(0.14, 0.11, 0.012, brass()));
    for (const y of [-0.04, 0.01, 0.06]) body.add(wire([[-0.09, y, 0], [-0.03, y + 0.02, 0], [0.03, y - 0.015, 0], [0.09, y, 0]], 0.008, std(PALETTE.night, 0.3, 0.4)));
    return necklace(body, -0.32);
  },

  /* Nyx: a black faceted core in a three-petal silver cage. */
  "s33v4-space-nyx": () => {
    const core = mesh(new THREE.OctahedronGeometry(0.09), std(PALETTE.night, 0.7, 0.18));
    const body = group(core);
    for (let index = 0; index < 3; index += 1) {
      const rib = ellipseRing(0.11, 0.15, 0.009, chrome());
      rib.rotation.y = (index * Math.PI) / 3;
      body.add(rib);
    }
    body.add(ball(0.02, lit(PALETTE.violet, 0.6), 0, 0, 0.09));
    return necklace(body, -0.34);
  },

  /* Two materials fused off-centre: Mars red sand and Luma milk crystal. */
  "s33v4-space-confluence": () => {
    const red = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 40, 1, false, 0, Math.PI), matte(0xc4401f, 0.6));
    red.rotation.set(Math.PI / 2, 0, 0.3);
    const milk = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 40, 1, false, Math.PI, Math.PI), crystal(PALETTE.cream, 0.85));
    milk.rotation.set(Math.PI / 2, 0, 0.3);
    return necklace(group(red, milk, ring(0.175, 0.012, brass())), -0.32);
  },
};

/* ── Hats (on the clamp round the upper arm) ───────────────────────── */

export const COLLECTION04_HEAD: Record<string, Builder> = {
  /* A domed canopy of crossing ribs and woven hoops, truly open between. */
  "s33v4-orbital-woven-canopy": () => {
    const cane = std(0xe0a64a, 0.04, 0.5);
    const body = group(ball(0.045, enamel(PALETTE.vermilion), 0, 0.36, 0));
    const brim = ellipseRing(0.62, 0.38, 0.025, cane);
    brim.rotation.x = Math.PI / 2;
    body.add(brim);
    for (let index = 0; index < 16; index += 1) {
      const angle = (index * Math.PI) / 8;
      body.add(rib([[Math.cos(angle) * 0.62, 0, Math.sin(angle) * 0.38], [Math.cos(angle) * 0.39, 0.23, Math.sin(angle) * 0.25], [0, 0.36, 0]], 0.014, cane));
    }
    for (const [scale, y, color] of [[0.85, 0.09, PALETTE.vermilion], [0.64, 0.2, cane], [0.39, 0.29, PALETTE.vermilion]] as const) {
      const hoop = ellipseRing(0.62 * scale, 0.38 * scale, 0.013, typeof color === "number" ? enamel(color) : color);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = y;
      body.add(hoop);
    }
    return hat(body);
  },

  /* A copper observatory dome with a narrow slit and two sliding shutters. */
  "s33v4-orbital-observatory": () => {
    const copper = std(0xd2722e, 0.85, 0.3);
    const dome = mesh(new THREE.SphereGeometry(0.42, 32, 16, 0.25, Math.PI * 2 - 0.5, 0, Math.PI / 2), copper, 0, 0.04);
    dome.rotation.y = Math.PI / 2;
    const slit = block(0.09, 0.38, 0.02, lit(PALETTE.sky, 0.3), 0, 0.27, 0.32);
    slit.rotation.x = -0.75;
    const base = cylinder(0.44, 0.46, 0.08, std(PALETTE.ink, 0.6, 0.35), 0, 0.03);
    const shutters = [-1, 1].map((side) => {
      const shutter = block(0.05, 0.3, 0.03, chrome(), side * 0.07, 0.27, 0.33);
      shutter.rotation.x = -0.75;
      return shutter;
    });
    return hat(group(base, dome, slit, ...shutters));
  },

  /* Five thick-to-thin petals closing into a soft tulip crown. */
  "s33v4-orbital-tulip": () => {
    const body = group(cylinder(0.3, 0.32, 0.06, enamel(PALETTE.emerald), 0, 0.03));
    for (let index = 0; index < 5; index += 1) {
      const leaf = petal(0.24, 0.5, 0.03, enamel(index % 2 ? PALETTE.magenta : PALETTE.rose));
      leaf.rotation.y = (index * Math.PI * 2) / 5;
      leaf.rotation.x = -0.28;
      leaf.position.set(Math.sin((index * Math.PI * 2) / 5) * 0.16, 0.05, Math.cos((index * Math.PI * 2) / 5) * 0.16);
      body.add(leaf);
    }
    return hat(body);
  },

  /* A round scalloped awning brim over a fine-striped crown. */
  "s33v4-orbital-market-awning": () => {
    const body = group(cylinder(0.3, 0.32, 0.28, enamel(PALETTE.snow), 0, 0.17));
    for (let index = 0; index < 12; index += 1) {
      const angle = (index * Math.PI) / 6;
      body.add(block(0.04, 0.27, 0.01, enamel(PALETTE.cobalt), Math.sin(angle) * 0.305, 0.17, Math.cos(angle) * 0.305));
      const scallop = ball(0.09, enamel(index % 2 ? PALETTE.cobalt : PALETTE.snow), Math.sin(angle) * 0.5, 0.02, Math.cos(angle) * 0.5);
      scallop.scale.set(1, 0.35, 1);
      body.add(scallop);
    }
    const brim = cylinder(0.52, 0.52, 0.03, enamel(PALETTE.snow), 0, 0.04, 0, 36);
    return hat(group(body, brim, cylinder(0.3, 0.3, 0.02, enamel(PALETTE.cobalt), 0, 0.31)));
  },

  /* A crooked mountain-ridge crown over a double soft brim, in felt. */
  "s33v4-orbital-felt-ridge": () => {
    const felt = matte(PALETTE.teal, 0.92);
    const crown = mesh(lathe([[0, 0], [0.32, 0], [0.3, 0.14], [0.22, 0.3], [0.08, 0.36], [0, 0.34]], 7), felt, 0, 0.05);
    crown.rotation.y = 0.3;
    crown.scale.set(1.1, 1, 0.9);
    const brim = cylinder(0.55, 0.55, 0.03, felt, 0, 0.04, 0, 36);
    const under = cylinder(0.5, 0.5, 0.025, matte(PALETTE.tangerine, 0.9), 0, 0.015, 0, 36);
    const band = cylinder(0.33, 0.33, 0.05, enamel(PALETTE.saffron), 0, 0.09);
    return hat(group(under, brim, crown, band));
  },

  /* Venus: champagne cloud bands spiralling up on a dark inner ring. */
  "s33v4-space-venus": () => {
    const cloud = std(0xffd27a, 0.6, 0.3);
    const body = group(mesh(lathe([[0, 0], [0.35, 0], [0.38, 0.035], [0.33, 0.07], [0, 0.07]], 40), std(PALETTE.ink, 0.5, 0.35)));
    for (let index = 0; index < 4; index += 1) {
      const radius = 0.47 - index * 0.085;
      const band = ellipseRing(radius, radius * 0.65, 0.038, index % 2 ? cloud : enamel(PALETTE.tangerine));
      band.rotation.x = Math.PI / 2 - 0.12;
      band.rotation.z = index * 0.25;
      band.position.set(Math.sin(index) * 0.045, 0.07 + index * 0.08, 0);
      body.add(band);
    }
    body.add(ball(0.06, lit(PALETTE.cream, 0.3), -0.04, 0.4, 0));
    return hat(body);
  },

  /* Neptune: two slanted deep-blue sails on thin silver masts. */
  "s33v4-space-neptune-sail": () => {
    const body = group(cylinder(0.3, 0.33, 0.07, titanium(), 0, 0.035));
    for (const side of [-1, 1]) {
      const sail = polygon([[0, 0], [0.32, 0.05], [0.05, 0.6]], 0.02, enamel(side < 0 ? PALETTE.cobalt : PALETTE.sky));
      sail.position.set(side * 0.06, 0.07, side * 0.05);
      sail.rotation.y = side < 0 ? Math.PI : 0;
      sail.rotation.z = side * 0.12;
      body.add(sail, wire([[side * 0.06, 0.07, side * 0.05], [side * 0.08, 0.68, side * 0.05]], 0.011, chrome()));
    }
    return hat(body);
  },

  /* Ceres: a small mineral-grey cap with three white sample boxes. */
  "s33v4-space-ceres": () => {
    const cap = ball(0.38, std(0x7d8794, 0.35, 0.55), 0, 0.05);
    cap.scale.set(1, 0.55, 1);
    const body = group(cap, cylinder(0.4, 0.4, 0.04, enamel(PALETTE.tangerine), 0, 0.05));
    for (let index = 0; index < 3; index += 1) {
      const angle = -0.9 + index * 0.9;
      const box = block(0.1, 0.08, 0.08, enamel(PALETTE.snow), Math.sin(angle) * 0.3, 0.2, Math.cos(angle) * 0.18);
      box.rotation.y = angle;
      body.add(box, ball(0.015, lit(PALETTE.lime, 0.5), Math.sin(angle) * 0.3, 0.255, Math.cos(angle) * 0.18));
    }
    return hat(body);
  },

  /* Elysian: short crystal shoots growing along one side, kept light. */
  "s33v4-space-elysian": () => {
    const body = group(ellipseRing(0.36, 0.3, 0.035, brass()));
    body.children[0].rotation.x = Math.PI / 2;
    body.children[0].position.y = 0.04;
    const shoots: [number, number, number, number][] = [[-0.25, 0.22, 0.2, -0.3], [-0.12, 0.3, 0.12, -0.12], [0.02, 0.2, 0.25, 0.05], [-0.3, 0.14, -0.02, -0.5]];
    shoots.forEach(([x, height, z, tilt], index) => {
      const shoot = cylinder(0.025, 0.045, height, crystal(index % 2 ? PALETTE.mint : PALETTE.lime, 0.85), x, 0.04 + height / 2, z, 6);
      shoot.rotation.z = tilt;
      body.add(shoot);
    });
    return hat(body);
  },
};

/* ── Scarves and shawls (band round the lower-left arm, a front piece) ─ */

export const COLLECTION04_NECK: Record<string, () => NeckPiece> = {
  /* An indigo collar with resist-dyed white rings and a thick tail. */
  "s33v4-orbital-shibori": () => {
    const indigo = matte(PALETTE.indigo, 0.85);
    const front = group(block(0.6, 0.28, 0.07, indigo));
    for (const [x, y] of [[-0.18, 0.05], [0.02, -0.04], [0.2, 0.06]]) front.add(ring(0.055, 0.012, matte(PALETTE.snow, 0.8), x, y, 0.04));
    front.add(block(0.14, 0.32, 0.06, indigo, 0.18, -0.26, 0.02));
    return collar(front, indigo);
  },

  /* Warm original stripes stepping like mountain bands — no tribal motifs. */
  "s33v4-orbital-andes": () => {
    const front = group();
    const bands = [PALETTE.ruby, PALETTE.tangerine, PALETTE.saffron, PALETTE.magenta, PALETTE.teal];
    bands.forEach((color, index) => front.add(block(0.62 - index * 0.04, 0.07, 0.06, matte(color, 0.85), 0, 0.12 - index * 0.07)));
    return collar(front, matte(PALETTE.ruby, 0.85));
  },

  /* A cream linen neckerchief, blue running stitch and a small wooden toggle. */
  "s33v4-orbital-linen": () => {
    const linen = matte(PALETTE.cream, 0.88);
    const tri = polygon([[-0.3, 0.14], [0.3, 0.14], [0, -0.26]], 0.05, linen);
    const stitch = wire([[-0.26, 0.11, 0.04], [0, -0.21, 0.04], [0.26, 0.11, 0.04]], 0.006, enamel(PALETTE.cobalt));
    const toggle = cylinder(0.02, 0.02, 0.1, std(0x9c5b2b, 0.05, 0.5), 0, 0.1, 0.05);
    toggle.rotation.z = Math.PI / 2;
    return collar(group(tri, stitch, toggle), linen);
  },

  /* Paper folds fanning downward from a continuous inner collar. */
  "s33v4-orbital-pleated-paper": () => {
    const front = group();
    for (let index = 0; index < 7; index += 1) {
      const fold = polygon([[-0.045, 0.14], [0.045, 0.14], [0.07, -0.18], [-0.07, -0.18]], 0.02, enamel(index % 2 ? PALETTE.snow : PALETTE.sky));
      fold.position.set(-0.27 + index * 0.09, 0, index % 2 ? 0.02 : -0.01);
      fold.rotation.y = index % 2 ? 0.35 : -0.35;
      front.add(fold);
    }
    return collar(front, enamel(PALETTE.sky));
  },

  /* Three thick ring bands wrapping the arm and opening out in steps. */
  "s33v4-space-saturn-ribbon": () => {
    const front = group();
    const tones = [PALETTE.honey, PALETTE.cream, PALETTE.tangerine];
    tones.forEach((color, index) => {
      const band = ellipseRing(0.3 + index * 0.06, 0.12 + index * 0.03, 0.022, enamel(color));
      band.rotation.x = 1.1;
      band.position.y = -index * 0.05;
      front.add(band);
    });
    return collar(front, enamel(PALETTE.honey));
  },

  /* Teal-to-violet pleats falling from the collar, iridescent not glowing. */
  "s33v4-space-aurora": () => {
    const front = group();
    const colors = [PALETTE.mint, PALETTE.turquoise, PALETTE.sky, PALETTE.violet, PALETTE.magenta];
    colors.forEach((color, index) => {
      const pleat = block(0.11, 0.34 - Math.abs(index - 2) * 0.05, 0.03, phys(color, { roughness: 0.3, iridescence: 0.8, metalness: 0.3 }), -0.24 + index * 0.12, -0.04);
      pleat.rotation.z = (index - 2) * 0.08;
      front.add(pleat);
    });
    return collar(front, phys(PALETTE.turquoise, { roughness: 0.3, iridescence: 0.8, metalness: 0.3 }));
  },

  /* A deep-blue collar ending in three icy silver trails. */
  "s33v4-space-comet": () => {
    const blue = matte(PALETTE.cobalt, 0.8);
    const front = group(block(0.5, 0.16, 0.07, blue));
    for (const [x, length] of [[-0.1, 0.36], [0, 0.44], [0.1, 0.3]] as const) {
      front.add(wire([[x, -0.05, 0.02], [x + 0.08, -0.05 - length * 0.5, 0.03], [x + 0.18, -0.05 - length, 0.01]], 0.016, std(PALETTE.ice, 0.9, 0.2)));
    }
    return collar(front, blue);
  },
};

/* ── Pins (on a backing plate with a stem into the shell) ──────────── */

export const COLLECTION04_PIN: Record<string, Builder> = {
  /* A clear three-cell case, each cell with its own seed shape. */
  "s33v4-orbital-seedbank": () => {
    const body = group(block(0.42, 0.18, 0.08, crystal(PALETTE.ice, 0.5)));
    for (const x of [-0.07, 0.07]) body.add(block(0.012, 0.16, 0.08, brass(), x));
    body.add(ball(0.035, enamel(PALETTE.tangerine), -0.14, 0, 0.01));
    const lentil = ball(0.04, enamel(PALETTE.emerald), 0, 0, 0.01);
    lentil.scale.set(1, 0.45, 1);
    const grain = ball(0.03, enamel(PALETTE.saffron), 0.14, 0, 0.01);
    grain.scale.set(0.6, 1.4, 0.6);
    return pin(group(body, lentil, grain));
  },

  /* A city tram side-on: window panes, axles and a roof pole, all with depth. */
  "s33v4-orbital-tram": () => {
    const red = enamel(PALETTE.ruby);
    const body = group(block(0.5, 0.2, 0.07, red), block(0.5, 0.04, 0.075, enamel(PALETTE.cream), 0, -0.06));
    for (let index = 0; index < 4; index += 1) body.add(block(0.08, 0.07, 0.02, crystal(PALETTE.sky, 0.8), -0.18 + index * 0.12, 0.04, 0.04));
    for (const x of [-0.15, 0.15]) body.add(disc(0.04, 0.05, titanium(), x, -0.11, 0.02));
    body.add(wire([[0, 0.1, 0], [0.1, 0.22, 0], [0.18, 0.24, 0]], 0.008, chrome()));
    return pin(body);
  },

  /* An irregular rock-pool frame with pebbles and two small shells. */
  "s33v4-orbital-tidepool": () => {
    const body = group(polygon([[-0.22, -0.08], [-0.1, -0.15], [0.12, -0.13], [0.23, 0], [0.12, 0.13], [-0.14, 0.12]], 0.04, enamel(PALETTE.turquoise)));
    body.add(ellipseRing(0.22, 0.14, 0.018, matte(0xb9a27c, 0.7)));
    for (const [x, y, color] of [[-0.1, -0.03, PALETTE.coral], [0.04, 0.05, PALETTE.snow], [0.12, -0.05, PALETTE.saffron]] as const) body.add(ball(0.03, enamel(color), x, y, 0.035));
    const shell = petal(0.04, 0.07, 0.02, enamel(PALETTE.rose));
    shell.position.set(-0.03, -0.09, 0.03);
    return pin(group(body, shell));
  },

  /* A perforated stamp frame round a globe of meridians and an ocean arc. */
  "s33v4-orbital-postal-globe": () => {
    const body = group(block(0.36, 0.36, 0.04, enamel(PALETTE.cream)));
    for (let index = 0; index < 7; index += 1) {
      for (const side of [-1, 1]) {
        body.add(ball(0.012, matte(0xd9c49b), -0.15 + index * 0.05, side * 0.18, 0.01));
        body.add(ball(0.012, matte(0xd9c49b), side * 0.18, -0.15 + index * 0.05, 0.01));
      }
    }
    const globe = mesh(new THREE.SphereGeometry(0.12, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), enamel(PALETTE.cobalt), 0, 0, 0.02);
    globe.rotation.x = Math.PI / 2;
    body.add(globe, ring(0.12, 0.007, brass(), 0, 0, 0.03), arc(0.15, 0.008, Math.PI * 0.8, enamel(PALETTE.vermilion), 0, -0.02, 0.09));
    return pin(body);
  },

  /* Pluto: a pale heart-shaped plain set into a grey-brown sphere medallion. */
  "s33v4-space-pluto": () => {
    const sphere = disc(0.2, 0.06, matte(0x9a6b52, 0.6));
    const dome = ball(0.19, matte(0xb07a5c, 0.55), 0, 0, 0.02);
    dome.scale.z = 0.3;
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.12);
    heart.bezierCurveTo(0.17, 0, 0.14, 0.13, 0.06, 0.13);
    heart.bezierCurveTo(0.02, 0.13, 0, 0.09, 0, 0.07);
    heart.bezierCurveTo(0, 0.09, -0.02, 0.13, -0.06, 0.13);
    heart.bezierCurveTo(-0.14, 0.13, -0.17, 0, 0, -0.12);
    const plain = mesh(extrude(heart, 0.02, 0.006, 12), enamel(PALETTE.rose), 0.02, -0.01, 0.07);
    return pin(group(sphere, dome, plain, ring(0.2, 0.014, brass(), 0, 0, 0.02)));
  },

  /* Enceladus: a small ice dome firing three fine silver arcs. */
  "s33v4-space-enceladus": () => {
    const dome = mesh(new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), enamel(PALETTE.snow), 0, -0.06);
    const body = group(dome, disc(0.18, 0.03, enamel(PALETTE.cobalt), 0, -0.06, -0.02));
    for (const [dx, height] of [[-0.06, 0.18], [0, 0.24], [0.06, 0.16]] as const) body.add(wire([[dx * 0.5, 0.05, 0.02], [dx, 0.05 + height * 0.6, 0.03], [dx * 2, 0.05 + height, 0.02]], 0.007, lit(PALETTE.ice, 0.4)));
    return pin(body);
  },

  /* A square instrument window: an off-centre gold sun on dark blue. */
  "s33v4-space-kepler-window": () => {
    const body = group(block(0.36, 0.36, 0.05, titanium()), block(0.28, 0.28, 0.02, enamel(PALETTE.ink), 0, 0, 0.03));
    body.add(disc(0.07, 0.02, lit(PALETTE.saffron, 0.4), 0.05, 0.05, 0.045), ring(0.11, 0.006, brass(), 0.05, 0.05, 0.045));
    for (const [x, y] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) body.add(ball(0.015, chrome(), x, y, 0.03));
    return pin(body);
  },

  /* Umbra: a black disc slipped off-centre over a warm gold ring. */
  "s33v4-space-umbra": () => pin(group(ring(0.16, 0.035, lit(PALETTE.amber, 0.35)), disc(0.15, 0.04, std(PALETTE.night, 0.4, 0.3), 0.05, 0.03, 0.04))),
};

/* ── Mouth pieces (carried on a loop from the mouth's clip) ────────── */

export const COLLECTION04_MOUTH: Record<string, Builder> = {
  /* A tea bowl, a bright green surface and a fine bamboo whisk. */
  "s33v4-orbital-matcha": () => {
    const bowl = mesh(lathe([[0, -0.1], [0.12, -0.1], [0.2, 0.04], [0.19, 0.08], [0.17, 0.06], [0.1, -0.07], [0, -0.07]], 32), enamel(PALETTE.ink));
    const tea = disc(0.165, 0.01, enamel(PALETTE.lime), 0, 0.05);
    tea.rotation.x = 0;
    const whisk = group(cylinder(0.02, 0.02, 0.16, matte(0xe8c27a), 0.12, 0.16));
    for (let index = 0; index < 8; index += 1) {
      const angle = (index * Math.PI) / 4;
      whisk.add(wire([[0.12, 0.08, 0], [0.12 + Math.cos(angle) * 0.04, 0.02, Math.sin(angle) * 0.04]], 0.004, matte(0xe8c27a)));
    }
    return carried(group(bowl, tea, whisk));
  },

  /* One continuous twisted tube, flecked with white salt. */
  "s33v4-orbital-pretzel": () => {
    const dough = enamel(0xb5651d);
    const loop: Point[] = [[-0.16, -0.05, 0], [-0.17, 0.08, 0], [-0.06, 0.12, 0], [0.04, 0.02, 0.02], [0.12, -0.08, 0], [0.16, 0.06, 0], [0.06, 0.12, 0], [-0.04, 0.02, -0.02], [-0.12, -0.08, 0], [-0.02, -0.1, 0], [0.08, -0.1, 0]];
    const body = group(wire(loop, 0.035, dough));
    for (let index = 0; index < 10; index += 1) body.add(block(0.016, 0.016, 0.016, enamel(PALETTE.snow), loop[index][0], loop[index][1] + 0.03, 0.03));
    return carried(body);
  },

  /* A golden mango lassi: tall cup, silver rim, thin straw. */
  "s33v4-orbital-mango-lassi": () => {
    const cup = mesh(lathe([[0, -0.2], [0.09, -0.2], [0.12, 0.14], [0, 0.14]], 28), crystal(PALETTE.ice, 0.45));
    const drink = mesh(lathe([[0, -0.19], [0.085, -0.19], [0.11, 0.1], [0, 0.1]], 28), enamel(PALETTE.saffron));
    const rim = ring(0.12, 0.012, chrome(), 0, 0.14);
    rim.rotation.x = Math.PI / 2;
    return carried(group(cup, drink, rim, wire([[0.03, 0, 0], [0.05, 0.28, 0], [0.1, 0.32, 0]], 0.01, enamel(PALETTE.magenta))));
  },

  /* Station food: three red berries on a folded titanium tray. */
  "s33v4-space-mars-ration": () => {
    const tray = polygon([[-0.18, 0], [0.18, 0], [0.14, -0.06], [-0.14, -0.06]], 0.16, titanium());
    tray.rotation.x = Math.PI / 2;
    const body = group(tray);
    for (const x of [-0.09, 0, 0.09]) body.add(ball(0.05, enamel(PALETTE.ruby), x, 0.04, 0));
    return carried(body);
  },

  /* Luma nectar: a milk-white bottle with a petal cap and a bent straw. */
  "s33v4-space-luma-nectar": () => {
    const bottle = mesh(lathe([[0, -0.18], [0.08, -0.18], [0.1, -0.05], [0.05, 0.08], [0.04, 0.12], [0, 0.12]], 28), crystal(PALETTE.cream, 0.88));
    const body = group(bottle);
    for (let index = 0; index < 5; index += 1) {
      const leaf = petal(0.035, 0.06, 0.01, enamel(PALETTE.rose));
      leaf.rotation.set(-1.2, (index * Math.PI * 2) / 5, 0);
      leaf.position.y = 0.12;
      body.add(leaf);
    }
    body.add(wire([[0, 0.12, 0], [0.02, 0.26, 0], [0.09, 0.3, 0]], 0.009, chrome()));
    return carried(body);
  },

  /* Titan cocoa: an amber insulated cup with a silver ring handle. */
  "s33v4-space-titan-cocoa": () => {
    const cup = cylinder(0.11, 0.09, 0.22, enamel(PALETTE.amber));
    const cocoa = disc(0.1, 0.01, enamel(0x5a2d12), 0, 0.105);
    cocoa.rotation.x = 0;
    const handle = ring(0.06, 0.014, chrome(), 0.13, 0);
    handle.rotation.y = Math.PI / 2;
    const sleeve = cylinder(0.106, 0.098, 0.08, titanium(), 0, -0.02);
    return carried(group(cup, sleeve, cocoa, handle));
  },
};

/* ── Charms (hanging under the shell) ──────────────────────────────── */

export const COLLECTION04_CHARM: Record<string, Builder> = {
  /* A round case held open at a fixed angle, the needle standing inside. */
  "s33v4-orbital-compass-case": () => {
    const gold = brass();
    const base = disc(0.15, 0.05, gold);
    const lid = disc(0.15, 0.03, gold, 0, 0.13, -0.08);
    lid.rotation.x = Math.PI / 2 - 1.1;
    const needle = polygon([[0, 0.11], [0.025, 0], [0, -0.11], [-0.025, 0]], 0.02, enamel(PALETTE.vermilion));
    needle.position.z = 0.04;
    return dangle(group(base, disc(0.12, 0.02, enamel(PALETTE.cream), 0, 0, 0.02), needle, lid));
  },

  /* A cast-iron teapot: round body, separate handle and a short spout. */
  "s33v4-orbital-teapot": () => {
    const iron = std(PALETTE.teal, 0.5, 0.45);
    const pot = ball(0.15, iron);
    pot.scale.y = 0.8;
    const spout = wire([[0.12, -0.02, 0], [0.2, 0.03, 0], [0.24, 0.08, 0]], 0.025, iron);
    const handle = arc(0.12, 0.014, Math.PI, titanium(), 0, 0.1);
    const lid = cylinder(0.06, 0.08, 0.03, iron, 0, 0.13);
    return dangle(group(pot, spout, handle, lid, ball(0.02, brass(), 0, 0.16)));
  },

  /* A wind tower: a slotted block on a heavy base. */
  "s33v4-orbital-windtower": () => {
    const clay = enamel(0xf0a35a);
    const body = group(block(0.2, 0.06, 0.2, clay, 0, -0.18), block(0.14, 0.32, 0.14, clay, 0, 0));
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const slot = block(0.03, 0.08, 0.02, enamel(PALETTE.cobalt), Math.sin(angle) * 0.075, 0.1, Math.cos(angle) * 0.075);
      slot.rotation.y = angle;
      body.add(slot);
    }
    return dangle(body);
  },

  /* An oval seed capsule with ribs, one green sprout visible inside. */
  "s33v4-space-voyager-seed": () => {
    const pod = ball(0.13, crystal(PALETTE.ice, 0.45));
    pod.scale.set(0.85, 1.25, 0.85);
    const body = group(pod, ball(0.035, matte(0x8a5a2b), 0, -0.07), wire([[0, -0.05, 0], [0.01, 0.03, 0], [0.04, 0.08, 0]], 0.012, enamel(PALETTE.lime)));
    const leaf = petal(0.03, 0.06, 0.008, enamel(PALETTE.lime));
    leaf.position.set(0.04, 0.08, 0);
    leaf.rotation.z = -0.8;
    body.add(leaf);
    for (let index = 0; index < 4; index += 1) {
      const rib = ellipseRing(0.112, 0.164, 0.008, chrome());
      rib.rotation.y = (index * Math.PI) / 4;
      body.add(rib);
    }
    return dangle(body);
  },

  /* Phobos: a lumpy rock in a three-claw metal sampling cradle. */
  "s33v4-space-phobos": () => {
    const rock = mesh(new THREE.DodecahedronGeometry(0.12), matte(0x7a5c4b, 0.75));
    rock.scale.set(1.3, 0.9, 1);
    const body = group(rock);
    for (let index = 0; index < 3; index += 1) {
      const angle = (index * Math.PI * 2) / 3;
      body.add(wire([[0, 0.12, 0], [Math.cos(angle) * 0.16, 0.02, Math.sin(angle) * 0.12], [Math.cos(angle) * 0.1, -0.12, Math.sin(angle) * 0.08]], 0.01, titanium()));
    }
    return dangle(group(body, ball(0.025, lit(PALETTE.coral, 0.5), 0, 0.13)));
  },

  /* Triton: a long pale-blue hexagonal crystal with a short silver cap. */
  "s33v4-space-triton": () => dangle(group(cylinder(0.05, 0.05, 0.32, crystal(PALETTE.ice, 0.8), 0, 0, 0, 6), cylinder(0.055, 0.055, 0.05, chrome(), 0, 0.17, 0, 6), cylinder(0.0, 0.05, 0.07, crystal(PALETTE.ice, 0.8), 0, -0.195, 0, 6))),

  /* Aether: three hollow chimes of unequal length and a hanging striker. */
  "s33v4-space-aether": () => {
    const body = group(disc(0.13, 0.025, brass(), 0, 0, 0));
    body.children[0].rotation.x = 0;
    const tones = [PALETTE.violet, PALETTE.sky, PALETTE.magenta];
    tones.forEach((color, index) => {
      const angle = (index * Math.PI * 2) / 3;
      const length = 0.22 + index * 0.06;
      const tube = mesh(new THREE.CylinderGeometry(0.022, 0.022, length, 16, 1, true), std(color, 0.85, 0.25), Math.cos(angle) * 0.08, -length / 2 - 0.02, Math.sin(angle) * 0.08);
      body.add(tube);
    });
    body.add(wire([[0, 0, 0], [0, -0.16, 0]], 0.004, chrome()), ball(0.03, chrome(), 0, -0.17));
    return dangle(body);
  },
};

/* ── Eyewear (in front of the eye, never over the pupil's centre) ──── */

export const COLLECTION04_EYEWEAR: Record<string, Builder> = {
  /* Two offset jeweller's lenses on a visible hinged arm. */
  "s33v4-orbital-loupe": () => {
    const gold = brass();
    const big = group(ring(0.3, 0.025, gold), disc(0.29, 0.015, tintedLens(PALETTE.ice, 0.15)));
    big.position.set(-0.18, 0.08, 0.72);
    const small = group(ring(0.16, 0.02, enamel(PALETTE.vermilion)), disc(0.15, 0.012, tintedLens(PALETTE.ice, 0.15)));
    small.position.set(0.22, -0.12, 0.8);
    const arm = wire([[-0.48, 0.08, 0.66], [-0.6, 0.2, 0.45], [0.06, -0.06, 0.74], [0.22, -0.12, 0.8]], 0.014, gold);
    return group(big, small, arm, ball(0.03, gold, -0.6, 0.2, 0.45));
  },

  /* A stained-glass lens: coloured panes, lead seams, the centre left clear. */
  "s33v4-orbital-stainedglass": () => {
    const lead = std(0x4a4f57, 0.7, 0.35);
    const body = group(ring(0.56, 0.03, lead, 0, 0, 0.7));
    const panes = [PALETTE.ruby, PALETTE.saffron, PALETTE.emerald, PALETTE.cobalt, PALETTE.magenta, PALETTE.sky];
    panes.forEach((color, index) => {
      const pane = mesh(new THREE.RingGeometry(0.3, 0.55, 12, 1, (index * Math.PI) / 3, Math.PI / 3), tintedLens(color, 0.42), 0, 0, 0.71);
      const seam = block(0.012, 0.25, 0.012, lead, Math.cos((index * Math.PI) / 3) * 0.425, Math.sin((index * Math.PI) / 3) * 0.425, 0.715);
      seam.rotation.z = (index * Math.PI) / 3 - Math.PI / 2;
      body.add(pane, seam);
    });
    body.add(ring(0.3, 0.015, lead, 0, 0, 0.71));
    return body;
  },

  /* A wooden snow goggle with a narrow slit and an inner metal ring. */
  "s33v4-orbital-snowgoggle": () => {
    const wood = std(0xc77b3a, 0.05, 0.5);
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.62, 0.42, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path();
    hole.absellipse(0, 0, 0.36, 0.06, 0, Math.PI * 2, true, 0);
    shape.holes.push(hole);
    const mask = mesh(extrude(shape, 0.05, 0.012, 32), wood, 0, 0, 0.7);
    const inner = ellipseRing(0.4, 0.09, 0.012, chrome());
    inner.position.z = 0.76;
    const strap = wire([[-0.62, 0, 0.72], [-0.68, 0, 0.4]], 0.02, enamel(PALETTE.vermilion));
    return group(mask, inner, strap, wire([[0.62, 0, 0.72], [0.68, 0, 0.4]], 0.02, enamel(PALETTE.vermilion)));
  },

  /* Mercury: one smoky lens under a small sun visor; the eye stays visible. */
  "s33v4-space-mercury-shield": () => {
    const lens = disc(0.52, 0.02, tintedLens(0x5c6470, 0.32), 0, 0, 0.72);
    lens.name = "collection04-mercury-lens";
    const visor = block(0.9, 0.08, 0.3, titanium(), 0, 0.5, 0.66);
    visor.rotation.x = 0.35;
    return group(ring(0.53, 0.022, chrome(), 0, 0, 0.72), lens, visor, ball(0.03, lit(PALETTE.saffron, 0.5), 0.36, 0.52, 0.8));
  },

  /* Neptune: deep-blue double frame, a scale ring and a side sensor. */
  "s33v4-space-neptune-depth": () => {
    const blue = enamel(PALETTE.cobalt);
    const body = group(ring(0.58, 0.03, blue, 0, 0, 0.7), ring(0.5, 0.018, std(PALETTE.ink, 0.6, 0.3), 0, 0, 0.73));
    for (let index = 0; index < 24; index += 1) {
      const angle = (index * Math.PI) / 12;
      const mark = tick(0.008, index % 6 ? 0.025 : 0.05, 0.01, chrome(), Math.sin(angle) * 0.54, Math.cos(angle) * 0.54, 0.74);
      mark.rotation.z = -angle;
      body.add(mark);
    }
    body.add(cylinder(0.05, 0.05, 0.14, titanium(), 0.62, 0.1, 0.62), ball(0.03, lit(PALETTE.sky, 0.6), 0.62, 0.18, 0.62));
    return body;
  },

  /* Prism world: a clear hexagonal lens with three coloured refracting edges. */
  "s33v4-space-prism-world": () => {
    const hexagon = new THREE.Shape();
    for (let index = 0; index < 6; index += 1) {
      const angle = (index * Math.PI) / 3;
      if (index) hexagon.lineTo(Math.cos(angle) * 0.56, Math.sin(angle) * 0.56);
      else hexagon.moveTo(0.56, 0);
    }
    hexagon.closePath();
    const lens = mesh(new THREE.ShapeGeometry(hexagon), tintedLens(PALETTE.ice, 0.14), 0, 0, 0.72);
    const body = group(lens);
    const edges = [PALETTE.ruby, PALETTE.saffron, PALETTE.cobalt];
    for (let index = 0; index < 6; index += 1) {
      const a = (index * Math.PI) / 3;
      const b = ((index + 1) * Math.PI) / 3;
      const color = index % 2 ? chrome() : enamel(edges[index / 2]);
      body.add(wire([[Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0.72], [Math.cos(b) * 0.56, Math.sin(b) * 0.56, 0.72]], 0.022, color));
    }
    return body;
  },
};

/* ── Eyes ──────────────────────────────────────────────────────────── */

/** A painted iris with a dark centre, so the pupil always reads. */
function irisPainting(seed: number, draw: (ctx: CanvasRenderingContext2D, rand: () => number, size: number) => void) {
  return paint(256, 256, seed, (ctx, rand, w) => {
    draw(ctx, rand, w);
    ctx.fillStyle = "#0b0d14";
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w * 0.17, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const COLLECTION04_IRISES: Record<string, Builder> = {
  /* Off-centre amber growth rings. */
  "s33v4-orbital-tree-rings": () => irisCap(irisPainting(33401, (ctx, rand, size) => {
    ctx.fillStyle = "#c9761a";
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 14; index += 1) {
      ctx.strokeStyle = index % 2 ? "#f5b443" : "#8a4a10";
      ctx.lineWidth = 2 + rand() * 3;
      ctx.beginPath();
      ctx.ellipse(size * 0.52, size * 0.48, 40 + index * 7, 36 + index * 7.5, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  })),

  /* Teal mineral patches parted by fine gold. */
  "s33v4-orbital-mineral-cut": () => irisCap(irisPainting(33402, (ctx, rand, size) => {
    ctx.fillStyle = "#c9a55a";
    ctx.fillRect(0, 0, size, size);
    const greens = ["#0fb8a9", "#0d9b57", "#22b2f0", "#5ee0b8"];
    for (let index = 0; index < 22; index += 1) {
      ctx.fillStyle = greens[index % greens.length];
      ctx.beginPath();
      const cx = rand() * size;
      const cy = rand() * size;
      ctx.moveTo(cx, cy);
      for (let corner = 0; corner < 5; corner += 1) ctx.lineTo(cx + (rand() - 0.5) * 70, cy + (rand() - 0.5) * 70);
      ctx.closePath();
      ctx.fill();
    }
  })),

  /* Cream and rust bands sweeping round the pupil. */
  "s33v4-space-jovian-bands": () => irisCap(irisPainting(33403, (ctx, _rand, size) => {
    const colors = ["#fff1d6", "#d2691e", "#f3a83b", "#b5452b", "#fff1d6", "#e5381e"];
    colors.forEach((color, index) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 46 + index * 14, -0.2 - index * 0.1, Math.PI * 1.6 - index * 0.1);
      ctx.stroke();
    });
  })),

  /* Aurora ocean: teal to violet, fine radial strands. */
  "s33v4-space-aurora-ocean": () => irisCap(irisPainting(33404, (ctx, rand, size) => {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.15, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "#5ee0b8");
    gradient.addColorStop(0.55, "#0fb8a9");
    gradient.addColorStop(1, "#7a3fe0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 160; index += 1) {
      const angle = rand() * Math.PI * 2;
      ctx.strokeStyle = rand() > 0.5 ? "rgba(255,255,255,.35)" : "rgba(214,47,124,.35)";
      ctx.lineWidth = 1 + rand() * 1.5;
      ctx.beginPath();
      ctx.moveTo(size / 2 + Math.cos(angle) * size * 0.2, size / 2 + Math.sin(angle) * size * 0.2);
      ctx.lineTo(size / 2 + Math.cos(angle) * size * 0.48, size / 2 + Math.sin(angle) * size * 0.48);
      ctx.stroke();
    }
  })),
};

export const COLLECTION04_PUPILS: Record<string, Builder> = {
  /* A quill's silhouette, dark so the gaze still reads. */
  "s33v4-orbital-quill": () => {
    const feather = new THREE.Shape();
    feather.moveTo(0, 0.26);
    feather.bezierCurveTo(0.14, 0.12, 0.1, -0.12, 0.01, -0.24);
    feather.lineTo(-0.01, -0.24);
    feather.bezierCurveTo(-0.1, -0.12, -0.12, 0.12, 0, 0.26);
    const quill = mesh(extrude(feather, 0.03, 0.006, 16), std(0x101422, 0.1, 0.3), 0, 0, EYE_RADIUS + 0.01);
    quill.rotation.z = -0.5;
    const shaft = block(0.012, 0.42, 0.012, brass(), 0, 0, EYE_RADIUS + 0.045);
    shaft.rotation.z = -0.5;
    return group(quill, shaft);
  },

  /* A dark round pupil with a thin crescent bitten from one side. */
  "s33v4-space-eclipse": () => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.24, 0, Math.PI * 2, false);
    const bite = new THREE.Path();
    bite.absarc(0.17, 0.08, 0.13, 0, Math.PI * 2, true);
    shape.holes.push(bite);
    return group(
      mesh(extrude(shape, 0.035, 0.006, 32), std(0x0b0d14, 0.1, 0.3), 0, 0, EYE_RADIUS + 0.012),
      arc(0.245, 0.01, Math.PI * 0.5, lit(PALETTE.saffron, 0.6), 0, 0, EYE_RADIUS + 0.04),
    );
  },
};
