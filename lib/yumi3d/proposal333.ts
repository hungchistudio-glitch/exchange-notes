import * as THREE from "three";

import { PROPOSALS_333 } from "@/lib/shop/proposals/catalog333";

import { TUBE_FRONT, TUBE_RADIUS } from "./anatomy";
import type { OutfitPreviewCollection } from "./outfit";
import { brass, chrome, ellipseRing, extrude, glaze, group, lathe, mesh, paint, roundedRect, SHELL_REPEAT, std } from "./outfitKit";

/* =========================================================
   Station 33 · 333 — the ten wearable samples

   The design review (app/yumi-333-review) shows ten of the 113 proposed
   pieces on the real Yumi, built here as real geometry with the shop's
   own kit and fitted through the rig's existing mounts
   (buildPreviewPiece in ./outfit.ts). They exist only for that page:
   the catalogue, the wallet and every saved outfit stay unaware of them,
   and the rig accepts their ids only when a page passes PREVIEW_333 in.

   Each builder returns the piece in its own frame; the helpers below put
   it where its slot hangs:

     hang      single earring: a jump ring at the origin, the piece below
     neck      necklace: a chain between the two lower studs, the pendant
               clear of the eye
     brow      brow cuff: turned to lie along the upper arm, on its front
     hat       head: a clamp hugging the upper arm under the brim

   Units are the rig's: the shell tube's radius is TUBE_RADIUS (0.4).
   ========================================================= */

/* ── Small parts ────────────────────────────────────────────────────── */

function ring(radius: number, thickness: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(new THREE.TorusGeometry(radius, thickness, 8, 40), material, x, y, z);
}

function ball(radius: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(new THREE.SphereGeometry(radius, 24, 16), material, x, y, z);
}

/** A rounded slab: tiles, plates, book covers. */
function slab(width: number, height: number, depth: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(extrude(roundedRect(width, height, 0.015), depth, 0.004, 4), material, x, y, z);
}

/** A smooth wire through the given points. */
function wire(points: number[][], radius: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return mesh(new THREE.TubeGeometry(curve, 40, radius, 6, false), material);
}

/* ── Mounts ─────────────────────────────────────────────────────────── */

/** A single earring: the jump ring sits at the hang point, the piece `drop` below it. */
function hang(piece: THREE.Object3D, drop: number) {
  piece.position.y = -drop;
  return group(ring(0.035, 0.009, brass(), 0, -0.044), piece);
}

/** A pendant on a chain between the lower studs, low enough to clear the eye. */
function neck(pendant: THREE.Object3D) {
  pendant.position.set(0, -0.32, 0.075);
  const chain = wire(
    [[-0.65, 0.25, -0.05], [-0.38, -0.01, 0.035], [0, -0.13, 0.07], [0.38, -0.01, 0.035], [0.65, 0.25, -0.05]],
    0.018,
    brass(),
  );
  return group(chain, ring(0.04, 0.01, brass(), 0, -0.16, 0.075), pendant);
}

/** A brow cuff, turned (x→y, y→z, z→x) to lie along the upper arm's front. */
function brow(piece: THREE.Object3D) {
  const root = group(piece);
  root.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  root.position.y = TUBE_FRONT + 0.055;
  return root;
}

/** A hat on a clamp that hugs the upper arm, so it is held, not balanced. */
function hat(piece: THREE.Object3D) {
  const clamp = ellipseRing(TUBE_FRONT + 0.025, TUBE_RADIUS + 0.015, 0.024, brass());
  clamp.rotation.y = Math.PI / 2;
  clamp.position.y = -TUBE_RADIUS * 0.82;
  return group(clamp, piece);
}

/* ── The eight accessories ──────────────────────────────────────────── */

const builders: OutfitPreviewCollection["builders"] = {
  earrings: {
    /* Orbital Atelier: an octagonal brass plate set with four glazed tiles,
       beaded on the back so it reads from behind too. */
    "p333-orbital-zellige": () => {
      const gold = brass();
      const body = group();
      const plate = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.045, 8), gold);
      plate.rotation.x = Math.PI / 2;
      body.add(plate);
      const tiles: [number, number, number][] = [
        [-0.072, 0.072, 0x4c9d91],
        [0.072, 0.072, 0xf0deba],
        [-0.072, -0.072, 0x244c62],
        [0.072, -0.072, 0x86b7aa],
      ];
      for (const [x, y, color] of tiles) {
        const tile = slab(0.125, 0.125, 0.04, glaze(color), x, y, 0.036);
        tile.rotation.z = 0.1;
        body.add(tile);
      }
      body.add(ring(0.2, 0.012, gold, 0, 0, 0.012), ball(0.021, gold, 0, 0, 0.06));
      for (let index = 0; index < 8; index += 1) {
        const angle = (index * Math.PI) / 4;
        body.add(ball(0.012, gold, Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, -0.027));
      }
      return hang(body, 0.28);
    },

    /* Deep Space: a banded planet inside two tilted rings, brass and chrome. */
    "p333-space-saturn": () => {
      const body = group(ball(0.14, glaze(0xcbb28c, 0.35)));
      const inner = ring(0.225, 0.016, brass());
      inner.rotation.x = 0.65;
      inner.rotation.y = 0.22;
      const outer = ring(0.27, 0.01, chrome());
      outer.rotation.copy(inner.rotation);
      body.add(inner, outer);
      for (const y of [-0.05, 0.02, 0.07]) {
        const band = ring(Math.sqrt(0.14 * 0.14 - y * y), 0.005, std(0x998363, 0.2, 0.5), 0, y);
        band.rotation.x = Math.PI / 2;
        body.add(band);
      }
      return hang(body, 0.33);
    },
  },

  brow: {
    /* Orbital Atelier: a suspension bridge — deck, two towers, the main
       cable and its hangers. */
    "p333-orbital-bridge": () => {
      const metal = brass();
      const body = group(slab(0.43, 0.035, 0.07, metal, 0, -0.045));
      for (const x of [-0.16, 0.16]) body.add(slab(0.025, 0.2, 0.055, metal, x, 0.035));
      body.add(wire([[-0.22, 0.085, 0.035], [-0.16, 0.13, 0.035], [0, 0.045, 0.035], [0.16, 0.13, 0.035], [0.22, 0.085, 0.035]], 0.012, metal));
      for (const x of [-0.12, -0.06, 0, 0.06, 0.12]) {
        body.add(wire([[x, -0.03, 0.03], [x, 0.045 + Math.abs(x) * 0.4, 0.03]], 0.007, metal));
      }
      return brow(body);
    },

    /* Deep Space: two suns, gold and ice blue, in one elliptical orbit. */
    "p333-space-binary": () => {
      const metal = chrome();
      const body = group(ellipseRing(0.24, 0.1, 0.014, metal), slab(0.3, 0.025, 0.05, metal, 0, -0.07, -0.025));
      body.add(ball(0.075, glaze(0xe3c475), -0.13, 0, 0.04), ball(0.055, glaze(0x9bd3dd), 0.15, 0.015, 0.04));
      return brow(body);
    },
  },

  necklace: {
    /* Orbital Atelier: an open atlas — two covers, their pages, gilt lines
       and the spine. */
    "p333-orbital-atlas": () => {
      const cover = glaze(0x416f7b, 0.4);
      const paper = std(0xeee3cb, 0, 0.75);
      const gold = brass();
      const body = group();
      for (const side of [-1, 1]) {
        const half = group(slab(0.17, 0.24, 0.025, cover), slab(0.145, 0.215, 0.035, paper, 0, 0, 0.025));
        for (const y of [-0.07, -0.035, 0, 0.035, 0.07]) half.add(slab(0.12, 0.003, 0.003, gold, 0, y, 0.045));
        half.position.x = side * 0.082;
        half.rotation.y = side * 0.25;
        body.add(half);
      }
      body.add(slab(0.025, 0.25, 0.06, gold, 0, 0, 0.01));
      return neck(body);
    },

    /* Deep Space: Europa's ice disc, its crossing fractures and one brass
       fault line. */
    "p333-space-europa": () => {
      const body = group();
      const disc = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.055, 40), glaze(0xe0ece7));
      disc.rotation.x = Math.PI / 2;
      body.add(disc, ring(0.195, 0.014, brass()));
      for (let index = 0; index < 4; index += 1) {
        const y = -0.1 + index * 0.06;
        const fracture = [[-0.14, y, 0.04], [-0.04, y + 0.025, 0.06], [0.06, y - 0.012, 0.06], [0.14, y + 0.012, 0.04]];
        body.add(wire(fracture, 0.012, glaze(index % 2 ? 0x5598aa : 0x8fc9ce)));
      }
      body.add(wire([[-0.1, 0.15, 0.034], [-0.06, 0.08, 0.042], [0.01, 0.065, 0.046], [0.045, -0.02, 0.045]], 0.007, brass()));
      return neck(body);
    },
  },

  head: {
    /* Orbital Atelier: a woven bamboo canopy — brim, sixteen ribs, three
       hoops and a brass finial. */
    "p333-orbital-woven-canopy": () => {
      const bamboo = std(0xc9aa72, 0.04, 0.55);
      const body = group();
      const brim = ellipseRing(0.62, 0.38, 0.025, bamboo);
      brim.rotation.x = Math.PI / 2;
      body.add(brim);
      for (let index = 0; index < 16; index += 1) {
        const angle = (index * Math.PI) / 8;
        const rib = [
          [Math.cos(angle) * 0.62, 0, Math.sin(angle) * 0.38],
          [Math.cos(angle) * 0.39, 0.23, Math.sin(angle) * 0.25],
          [0, 0.36, 0],
        ];
        body.add(wire(rib, 0.016, bamboo));
      }
      for (const [scale, y] of [[0.85, 0.09], [0.64, 0.2], [0.39, 0.29]]) {
        const hoop = ellipseRing(0.62 * scale, 0.38 * scale, 0.012, bamboo);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = y;
        body.add(hoop);
      }
      body.add(ball(0.045, brass(), 0, 0.36, 0));
      return hat(body);
    },

    /* Deep Space: Venus's cloud crown — a turned base and four drifting
       cloud bands under a pale moon. */
    "p333-space-venus": () => {
      const cloud = std(0xd7bf8b, 0.65, 0.3);
      const body = group(mesh(lathe([[0, 0], [0.35, 0], [0.38, 0.035], [0.33, 0.07], [0, 0.07]], 40), cloud));
      for (let index = 0; index < 4; index += 1) {
        const radius = 0.47 - index * 0.085;
        const band = ellipseRing(radius, radius * 0.65, 0.038, cloud);
        band.rotation.x = Math.PI / 2 - 0.12;
        band.rotation.z = index * 0.25;
        band.position.set(Math.sin(index) * 0.045, 0.07 + index * 0.08, 0);
        body.add(band);
      }
      body.add(ball(0.06, glaze(0xf2e7c9), -0.04, 0.4, 0));
      return hat(body);
    },
  },
};

/* ── The two finishes ───────────────────────────────────────────────── */

/** Indigo cloth with white sashiko stitching in a diamond lattice; sheen, no gloss. */
function sashiko() {
  return paint(512, 256, 333, (ctx, _rand, width, height) => {
    ctx.fillStyle = "#304d73";
    ctx.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y += 3) {
      ctx.strokeStyle = y % 2 ? "#3a567a" : "#2a4467";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#d9dbce";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    for (let x = -height; x < width + height; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - height, height);
      ctx.stroke();
    }
  }, SHELL_REPEAT);
}

/** Neptune's ice: a blue gradient crossed by pale and deep currents, under clearcoat. */
function neptuneIce() {
  return paint(512, 256, 334, (ctx, rand, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#accfdc");
    gradient.addColorStop(0.35, "#497eac");
    gradient.addColorStop(0.7, "#9fc8d1");
    gradient.addColorStop(1, "#456c98");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    for (let index = 0; index < 24; index += 1) {
      const y = rand() * height;
      ctx.strokeStyle = index % 2 ? "rgba(225,248,250,.28)" : "rgba(27,67,108,.18)";
      ctx.lineWidth = 1 + rand() * 5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.3, y + 30, width * 0.7, y - 30, width, y);
      ctx.stroke();
    }
  }, SHELL_REPEAT);
}

export const PREVIEW_333: OutfitPreviewCollection = {
  items: PROPOSALS_333.filter((item) => item.prototype),
  builders,
  finishes: {
    "p333-orbital-sashiko": {
      color: 0xffffff,
      metalness: 0,
      roughness: 0.86,
      sheen: 0.55,
      sheenColor: 0x829bb8,
      sheenRoughness: 0.8,
      map: sashiko,
    },
    "p333-space-neptune-ice": {
      color: 0xffffff,
      metalness: 0.15,
      roughness: 0.19,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      iridescence: 0.35,
      envMapIntensity: 1.1,
      map: neptuneIce,
    },
  },
};
