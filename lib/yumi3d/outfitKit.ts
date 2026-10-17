import * as THREE from "three";

import { EYE_RADIUS, TUBE_FRONT, TUBE_RADIUS, tubeCentre } from "./anatomy";

/* =========================================================
   The workbench every piece of Yumi's wardrobe is built on

   Moved out of outfit.ts (2026-10-17) when the Station 33 collection
   arrived, so its builders (station33Outfit.ts) and the original ones share
   the same materials, shapes and frames instead of each carrying a copy.
   Nothing here builds a piece; it is what pieces are made from.
   ========================================================= */

export type Rand = () => number;

/** Stable noise for textures: the same piece looks the same every time. */
export function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function paint(
  width: number,
  height: number,
  seed: number,
  draw: (ctx: CanvasRenderingContext2D, rand: Rand, w: number, h: number) => void,
  repeat: [number, number] = [1, 1],
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, seeded(seed), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 4;
  return texture;
}

export type StdOptions = THREE.MeshStandardMaterialParameters;
export type PhysOptions = THREE.MeshPhysicalMaterialParameters;

export const std = (color: THREE.ColorRepresentation, metalness = 0, roughness = 0.5, extra: StdOptions = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

export const phys = (color: THREE.ColorRepresentation, extra: PhysOptions = {}) =>
  new THREE.MeshPhysicalMaterial({ color, ...extra });

export const brass = () => std(0xc9a55a, 0.92, 0.27, { envMapIntensity: 1.1 });
export const chrome = () => std(0xc5cacf, 0.95, 0.18, { envMapIntensity: 1.1 });
export const glaze = (color: THREE.ColorRepresentation, roughness = 0.18) =>
  phys(color, { roughness, clearcoat: 1, clearcoatRoughness: 0.08 });

export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  x = 0, y = 0, z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}

/** An ellipse of wire, for collars and rims that must keep a round section. */
export function ellipseRing(rx: number, ry: number, tube: number, material: THREE.Material) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 48; i += 1) {
    const a = (i / 48) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points, true);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 96, tube, 8, true), material);
}

/** A chain of small links along a path, for monocles and charms. */
export function chain(points: THREE.Vector3[], material: THREE.Material, link = 0.035) {
  const curve = new THREE.CatmullRomCurve3(points);
  const length = curve.getLength();
  const count = Math.max(2, Math.round(length / (link * 1.7)));
  const g = new THREE.Group();
  const geometry = new THREE.TorusGeometry(link, link * 0.28, 6, 12);
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(curve.getPointAt(t));
    const tangent = curve.getTangentAt(t);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
    ring.rotateX(i % 2 ? Math.PI / 2 : 0);
    ring.scale.set(1.35, 1, 1);
    g.add(ring);
  }
  return g;
}

export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function extrude(shape: THREE.Shape, depth: number, bevel = 0.01, curveSegments = 24) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** A bowl, cup or dish: a lathe of (radius, height) pairs, base to rim. */
export function lathe(profile: Array<[number, number]>, segments = 48) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

/** A tube whose thickness changes along its path: croissants, churros. */
export function taperedTube(
  curve: THREE.Curve<THREE.Vector3>,
  radius: (t: number, angle: number) => number,
  segments = 64,
  radial = 24,
) {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j <= radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      const r = radius(t, a);
      const c = Math.cos(a) * r;
      const s = Math.sin(a) * r;
      positions.push(p.x + c * n.x + s * b.x, p.y + c * n.y + s * b.y, p.z + c * n.z + s * b.z);
      uvs.push(t, j / radial);
    }
  }
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** A frame whose local Z runs along the tube at `angle`, X outward, Y forward. */
export function ringFrame(angle: number, along = 0) {
  const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  const depth = new THREE.Vector3(0, 0, 1);
  const axis = new THREE.Vector3().crossVectors(radial, depth);
  const frame = new THREE.Group();
  frame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(radial, depth, axis));
  frame.position.copy(tubeCentre(angle)).addScaledVector(axis, along);
  return frame;
}

export function heartPath(s: THREE.Shape | THREE.Path, k = 1, ox = 0, oy = 0) {
  const p = (x: number, y: number): [number, number] => [ox + x * k, oy + y * k];
  s.moveTo(...p(0, -0.27));
  s.bezierCurveTo(...p(-0.16, -0.14), ...p(-0.33, -0.02), ...p(-0.29, 0.13));
  s.bezierCurveTo(...p(-0.25, 0.28), ...p(-0.06, 0.29), ...p(0, 0.15));
  s.bezierCurveTo(...p(0.06, 0.29), ...p(0.25, 0.28), ...p(0.29, 0.13));
  s.bezierCurveTo(...p(0.33, -0.02), ...p(0.16, -0.14), ...p(0, -0.27));
  return s;
}

export function radialShape(points: number, radius: (i: number, a: number) => number) {
  const s = new THREE.Shape();
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2 + Math.PI / 2;
    const r = radius(i, a);
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

export const IRIS_RADIUS = 0.39;

/** A cap of colour on the eyeball inside the bezel, painted flat. A piece
 *  may bring its own finish (metal, clearcoat); the map is set on it here. */
export function irisCap(texture: THREE.Texture, lift = 1.006, finish?: THREE.MeshStandardMaterial) {
  const theta = Math.asin(IRIS_RADIUS / EYE_RADIUS);
  const geometry = new THREE.SphereGeometry(EYE_RADIUS * lift, 56, 12, 0, Math.PI * 2, 0, theta);
  geometry.rotateX(Math.PI / 2);
  const p = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i += 1) {
    uv.setXY(i, 0.5 + p.getX(i) / (2 * IRIS_RADIUS), 0.5 + p.getY(i) / (2 * IRIS_RADIUS));
  }
  if (finish) {
    finish.map = texture;
    return mesh(geometry, finish);
  }
  return mesh(geometry, std(0xffffff, 0.05, 0.22, { map: texture, envMapIntensity: 0.8 }));
}

export function irisTexture(seed: number, base: string, deep: string, light: string) {
  return paint(256, 256, seed, (ctx, rand, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = w / 2;
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
    g.addColorStop(0, deep);
    g.addColorStop(0.42, base);
    g.addColorStop(0.84, base);
    g.addColorStop(1, deep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Fibres from the pupil out to the rim, light and dark.
    ctx.lineCap = "round";
    for (let i = 0; i < 180; i += 1) {
      const a = rand() * Math.PI * 2;
      const r0 = R * (0.34 + rand() * 0.12);
      const r1 = R * (0.68 + rand() * 0.26);
      const bend = (rand() - 0.5) * 0.12;
      ctx.strokeStyle = rand() > 0.5 ? light : deep;
      ctx.globalAlpha = 0.2 + rand() * 0.35;
      ctx.lineWidth = 1 + rand() * 2.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a + bend) * r1, cy + Math.sin(a + bend) * r1);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = light;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

/** A flat shape bent round the eye, so frames sit on it rather than float. */
export function bendToEye(geometry: THREE.BufferGeometry, k = 0.32, ky = 0.12) {
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    position.setZ(i, position.getZ(i) - k * x * x - ky * y * y);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function tintedLens(colour: THREE.ColorRepresentation, opacity: number) {
  return phys(colour, { roughness: 0.03, clearcoat: 1, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
}

export function feltTexture(seed: number, base: string, fleck: string) {
  return paint(256, 256, seed, (ctx, rand, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i += 1) {
      ctx.fillStyle = fleck;
      ctx.globalAlpha = rand() * 0.25;
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1);
    }
    ctx.globalAlpha = 1;
  }, [2, 2]);
}

export type NeckPiece = { band: THREE.Object3D; front: THREE.Object3D };

export function stripes(seed: number, base: string, stripe: string, every = 32, width = 9, angle = 1) {
  return paint(256, 256, seed, (ctx, _rand, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = stripe;
    ctx.lineWidth = width;
    for (let i = -h; i < w + h; i += every) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h * angle, h);
      ctx.stroke();
    }
  });
}

/** A band of cloth around the tube, flattened to the tube's oval section. */
export function clothBand(material: THREE.Material, width: number, thickness: number) {
  const torus = new THREE.TorusGeometry(1, width / 2, 16, 72);
  const band = mesh(torus, material);
  const rx = TUBE_RADIUS + thickness;
  const ry = TUBE_FRONT + thickness;
  // Squashed to the tube's oval; the cloth keeps its full width along it.
  band.scale.set(rx, ry, 1);
  return band;
}

export function tail(length: number, width: number, material: THREE.Material) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width * 0.62, -length * 0.88);
  s.lineTo(0, -length);
  s.lineTo(-width * 0.55, -length * 0.85);
  s.closePath();
  return mesh(extrude(s, 0.022, 0.008), material);
}

/** What a shop material does to the shell (outfit.ts, applyShellFinish). */
export type ShellFinish = {
  color: THREE.ColorRepresentation;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  envMapIntensity?: number;
  opacity?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  map?: () => THREE.Texture;
  /**
   * Roughness in green and metalness in blue, the way three.js reads them,
   * for a finish that is part metal and part not: gold bands on stone,
   * copper showing through patina. metalness and roughness then scale it.
   */
  surface?: () => THREE.Texture;
};

/* The torus' u runs along the C (about 8 units), v around the tube (about
   2.8), so a 2:1 canvas repeated 1.5 times keeps patterns square. */
export const SHELL_REPEAT: [number, number] = [1.5, 1];
