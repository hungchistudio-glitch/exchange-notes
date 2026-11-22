import * as THREE from "three";

import { cjkSerifFor } from "@/lib/fonts/cjkFaces";
import { makeStudioEnvironment } from "@/lib/yumi3d/scene";

/* =========================================================
   Letter capsules (Chi, 2026-11-21: 能量字母膠囊)

   The word cookies on the Standard home become glass time capsules: one
   half tinted in the bead's old material (jade, clear glass, pearl, smoke),
   the other clear, a lip where the halves meet, and the word's first
   letter sealed inside. They tumble freely about every axis ("720 度零死
   角"), roll the way they drift, and spin up when the phone is shaken.

   This file only draws. Where each capsule is, and how it moves across the
   screen, stays with FloatingCookieField and lib/home/floatingPhysics.ts;
   the buttons there are still what a finger presses and what a screen
   reader reads. What lives here is how each one is turned: its
   orientation and its spin.

   One canvas over the whole field, transparent, drawn in CSS pixels by an
   orthographic camera. The glass is faked rather than refracted (no
   transmission pass): a thin see-through shell whose edges thicken toward
   the silhouette, studio reflections from Yumi's own environment, and a
   clearcoat. About a thousand triangles a capsule.

   The letter is a sprite, so it can never be seen edge on: it leans with
   the capsule, but never further than a reader can still read it.
   ========================================================= */

export type CapsuleView = {
  id: string;
  /** Centre, CSS px. */
  x: number;
  y: number;
  /** The bead's old diameter; the capsule is a little longer than it. */
  size: number;
  /** 0 jade, 1 clear glass, 2 pearl, 3 smoke glass. */
  tone: number;
  glyph: string;
  /** 0..1, for the field's own fades. */
  alpha: number;
  /** Its drift, px/s, for the roll. */
  vx: number;
  vy: number;
  /** When it was fed to her, for the bite. */
  eatenAt?: number;
  /** The tour's demonstrating capsule leans toward her by this much. */
  hint?: { x: number; y: number } | null;
  held?: boolean;
};

export type CapsuleField = {
  frame(views: CapsuleView[], dt: number, now: number, options: { tumble: boolean; snap: boolean }): void;
  /** A shake: spin each capsule up by about this much, rad/s. */
  spin(amount: number): void;
  /** The home's light (lib/home/sunlight.ts): where shadows fall, and their ink. */
  setLight(light: { x: number; z: number; ink: number; strength: number }): void;
  resize(): void;
  dispose(): void;
};

/** The capsule's proportions, for a bead of size 1. */
const RADIUS = 0.3;
const BODY = 0.62;
/** Under the field's lamp (upper left), each shadow falls this far right and down, per size. */
const SHADOW_OFFSET = { x: 0.2, y: 0.44 };
/** The capsules float about this far above the paper, in sizes. */
const FLOAT_HEIGHT = 0.55;

const TONES = [
  { tint: 0x7a9f5c, ink: "#2c3d22", opacity: 0.74, sheen: 0xeafbc9 },
  { tint: 0x9cb9cc, ink: "#36424e", opacity: 0.5, sheen: 0xffffff },
  { tint: 0xe6cfa0, ink: "#54401f", opacity: 0.86, sheen: 0xfff7e3 },
  { tint: 0x988a7c, ink: "#403b35", opacity: 0.6, sheen: 0xfffaf0 },
] as const;

/** A half capsule along +y, from a little past the seam to its tip. */
function halfShell(radius: number, from: number) {
  const points: THREE.Vector2[] = [];
  points.push(new THREE.Vector2(radius, from));
  points.push(new THREE.Vector2(radius, BODY / 2));
  for (let i = 1; i <= 10; i += 1) {
    const a = (i / 10) * (Math.PI / 2);
    points.push(new THREE.Vector2(Math.cos(a) * radius, BODY / 2 + Math.sin(a) * radius));
  }
  points[points.length - 1].x = 0;
  return new THREE.LatheGeometry(points, 28);
}

/** Thicker toward the silhouette: what makes thin glass read as glass. */
function withRim(material: THREE.MeshPhysicalMaterial, rim: number) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uRim = { value: rim };
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform float uRim;\nvoid main() {")
      .replace(
        "#include <opaque_fragment>",
        `float facing = abs(normalize(normal).z);
        diffuseColor.a = clamp(diffuseColor.a + pow(1.0 - facing, 2.2) * uRim, 0.0, 1.0);
        /* A highlight on thin glass is as bright as on anything: it must
           not be thinned with the glass, or the capsule has no gleam. */
        diffuseColor.a = clamp(diffuseColor.a + dot(totalSpecular, vec3(0.3333)) * 1.6, 0.0, 1.0);
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `capsule-rim-${rim}`;
  return material;
}

function glass(color: THREE.ColorRepresentation, opacity: number, rim: number, side: THREE.Side) {
  return withRim(new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.05,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.6,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    side,
  }), rim);
}

function glyphTexture(glyph: string, ink: string) {
  const paper = document.createElement("canvas");
  paper.width = paper.height = 128;
  const ctx = paper.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const length = Array.from(glyph).length;
  const size = length > 1 ? 66 : 88;
  ctx.font = `600 ${size}px Georgia, ${cjkSerifFor(glyph)}, serif`;
  /* A faint light edge under the ink, as the beads' letters had. */
  ctx.shadowColor = "rgba(255,255,255,0.65)";
  ctx.shadowOffsetY = 2;
  ctx.fillText(glyph, 64, 68);
  const texture = new THREE.CanvasTexture(paper);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function shadowTexture() {
  const paper = document.createElement("canvas");
  paper.width = paper.height = 64;
  const ctx = paper.getContext("2d")!;
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.45, "rgba(255,255,255,0.55)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(paper);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Capsule = {
  group: THREE.Group;
  materials: { mesh: THREE.Material; base: number }[];
  glyphMaterial: THREE.SpriteMaterial;
  glyph: THREE.Sprite;
  glyphText: string;
  shadow: THREE.Mesh;
  shadowMaterial: THREE.MeshBasicMaterial;
  quaternion: THREE.Quaternion;
  spin: THREE.Vector3;
  cruise: THREE.Vector3;
  roll: number;
  shown: { x: number; y: number };
  tone: number;
  seen: boolean;
};

/* A stable, well-spread starting turn for each capsule, from its id. */
function seeded(id: string) {
  let h = 2166136261;
  for (const char of id) h = Math.imul(h ^ char.charCodeAt(0), 16777619) >>> 0;
  return (n: number) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909 + n) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

export function createCapsuleField(
  canvas: HTMLCanvasElement,
  { reducedMotion }: { reducedMotion: boolean },
): CapsuleField | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";

  const scene = new THREE.Scene();
  scene.environment = makeStudioEnvironment(renderer);
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);
  camera.position.z = 1000;
  /* The field's lamp: up and to the left, as Yumi's shadow has it. */
  const lamp = new THREE.DirectionalLight(0xfff6e8, 2.1);
  lamp.position.set(-0.55, 0.75, 0.9);
  const fill = new THREE.HemisphereLight(0xffffff, 0x8a7f6a, 0.65);
  scene.add(lamp, fill);

  const tinted = halfShell(RADIUS * 1.035, -0.05);
  const clear = halfShell(RADIUS, 0);
  clear.rotateX(Math.PI);
  const lip = new THREE.TorusGeometry(RADIUS * 1.04, RADIUS * 0.045, 6, 32);
  lip.rotateX(Math.PI / 2);
  lip.translate(0, -0.05, 0);
  const plane = new THREE.PlaneGeometry(1, 1);
  const blob = shadowTexture();
  const glyphs = new Map<string, THREE.CanvasTexture>();
  const capsules = new Map<string, Capsule>();
  const light = { offsetX: SHADOW_OFFSET.x, offsetY: SHADOW_OFFSET.y, stretch: 1, strength: 1 };
  let shadowInk = 0x2e2418;
  let width = 0;
  let height = 0;

  function glyphFor(text: string, tone: number) {
    const key = `${tone}:${text}`;
    let texture = glyphs.get(key);
    if (!texture) {
      texture = glyphTexture(text, TONES[tone].ink);
      glyphs.set(key, texture);
    }
    return texture;
  }

  function build(view: CapsuleView): Capsule {
    const tone = TONES[view.tone] ?? TONES[0];
    const random = seeded(view.id);
    const group = new THREE.Group();
    const materials: Capsule["materials"] = [];
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, order: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = order;
      mesh.frustumCulled = false;
      group.add(mesh);
      materials.push({ mesh: material, base: material.opacity });
    };
    /* Inside first, then the letter, then the near side of the glass. */
    add(tinted, glass(tone.tint, tone.opacity * 0.55, 0.25, THREE.BackSide), 1);
    add(clear, glass(0xe9f1f6, 0.14, 0.35, THREE.BackSide), 1);
    const glyphMaterial = new THREE.SpriteMaterial({
      map: glyphFor(view.glyph, view.tone),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const glyph = new THREE.Sprite(glyphMaterial);
    glyph.renderOrder = 2;
    glyph.frustumCulled = false;
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: blob,
      color: shadowInk,
      transparent: true,
      opacity: 0.2,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const shadow = new THREE.Mesh(plane, shadowMaterial);
    shadow.renderOrder = 0;
    shadow.frustumCulled = false;
    add(tinted, glass(tone.tint, tone.opacity, 0.55, THREE.FrontSide), 3);
    add(clear, glass(0xeef5fa, 0.18, 0.95, THREE.FrontSide), 3);
    add(lip, new THREE.MeshStandardMaterial({
      color: tone.sheen, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.75, depthTest: false, depthWrite: false,
    }), 3);
    scene.add(group, glyph, shadow);

    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      random(1) * Math.PI * 2, random(2) * Math.PI * 2, random(3) * Math.PI * 2,
    ));
    /* Each one tumbles about an axis and at a pace of its own, slowly. */
    const cruise = new THREE.Vector3(random(4) - 0.5, random(5) - 0.5, random(6) - 0.5)
      .normalize()
      .multiplyScalar(0.32 + random(7) * 0.4);
    if (reducedMotion) {
      /* Still, and three-quarters on, so it reads as a capsule at once. */
      quaternion.setFromEuler(new THREE.Euler(0.35, 0.5, Math.PI / 2 - 0.5 + (random(8) - 0.5) * 0.6));
    }
    return {
      group, materials, glyphMaterial, glyph, glyphText: `${view.tone}:${view.glyph}`, shadow, shadowMaterial,
      quaternion, spin: cruise.clone(), cruise, roll: 0, shown: { x: view.x, y: view.y }, tone: view.tone, seen: false,
    };
  }

  function remove(id: string, capsule: Capsule) {
    scene.remove(capsule.group, capsule.glyph, capsule.shadow);
    for (const { mesh } of capsule.materials) mesh.dispose();
    capsule.glyphMaterial.dispose();
    capsule.shadowMaterial.dispose();
    capsules.delete(id);
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    if (box.width === width && box.height === height) return;
    width = box.width;
    height = box.height;
    renderer.setSize(width, height, false);
    camera.left = 0;
    camera.right = width;
    camera.top = 0;
    camera.bottom = -height;
    camera.updateProjectionMatrix();
  }
  resize();

  const step = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const longAxis = new THREE.Vector3();
  const rolling = new THREE.Vector3();

  return {
    frame(views, dt, now, { tumble, snap }) {
      resize();
      const present = new Set<string>();
      views.forEach((view, order) => {
        present.add(view.id);
        let capsule = capsules.get(view.id);
        if (!capsule) {
          capsule = build(view);
          capsules.set(view.id, capsule);
        }
        const key = `${view.tone}:${view.glyph}`;
        if (capsule.glyphText !== key) {
          capsule.glyphText = key;
          capsule.glyphMaterial.map = glyphFor(view.glyph, view.tone);
          capsule.glyphMaterial.needsUpdate = true;
        }

        /* Where it is: exactly where the physics says while it floats or is
           held; eased while the field glides it to or from its parking. */
        if (snap || !capsule.seen) {
          capsule.shown.x = view.x;
          capsule.shown.y = view.y;
        } else {
          const k = 1 - Math.exp(-dt * 9);
          capsule.shown.x += (view.x - capsule.shown.x) * k;
          capsule.shown.y += (view.y - capsule.shown.y) * k;
        }
        capsule.seen = true;
        let x = capsule.shown.x;
        let y = capsule.shown.y;
        let glow = 0;
        if (view.hint) {
          /* The tour's lean toward her, on the same 1.8s beat the bead had. */
          const phase = (now % 1800) / 1800;
          const lean = phase < 0.45 ? Math.sin((phase / 0.45) * Math.PI / 2) : phase < 0.6 ? 1 : Math.cos(((phase - 0.6) / 0.4) * Math.PI / 2);
          x += view.hint.x * lean;
          y += view.hint.y * lean;
          glow = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
        }

        /* How it turns: its own slow tumble, a roll the way it drifts, and
           whatever a shake gave it, settling back to the tumble. */
        if (!reducedMotion) {
          if (tumble) {
            const r = Math.max(8, view.size * RADIUS);
            rolling.set(view.vy, view.vx, 0).multiplyScalar(0.35 / r);
            const target = axis.copy(capsule.cruise).add(rolling);
            capsule.spin.lerp(target, 1 - Math.exp(-dt * (view.held ? 3 : 0.9)));
          } else {
            capsule.spin.multiplyScalar(Math.exp(-dt * 4));
          }
          const angle = capsule.spin.length() * dt;
          if (angle > 1e-5) {
            step.setFromAxisAngle(axis.copy(capsule.spin).normalize(), angle);
            capsule.quaternion.premultiply(step);
          }
        }

        /* The bite: down to a point and gone, as the bead did, in 260ms. */
        let scale = view.size;
        let alpha = view.alpha;
        if (view.eatenAt !== undefined) {
          const t = Math.min(1, (now - view.eatenAt) / 260);
          scale *= 1 - 0.85 * t;
          alpha *= 1 - t;
        }
        if (view.held) scale *= 1.06;

        capsule.group.position.set(x, -y, 0);
        capsule.group.quaternion.copy(capsule.quaternion);
        capsule.group.scale.setScalar(scale);
        const base = 10 * (order + 1) + (view.hint || view.held ? 1000 : 0);
        for (const child of capsule.group.children) child.renderOrder = base + (child as THREE.Mesh).renderOrder % 10;
        for (const { mesh, base: opacity } of capsule.materials) mesh.opacity = opacity * alpha;
        capsule.group.children.forEach(child => {
          const material = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
          if (material.emissive) material.emissive.setRGB(0.34 * glow, 0.4 * glow, 0.2 * glow);
        });

        /* The letter: inside, upright enough to read, leaning with it. */
        longAxis.set(0, 1, 0).applyQuaternion(capsule.quaternion);
        let lie = Math.atan2(longAxis.y, longAxis.x);
        if (lie > Math.PI / 2) lie -= Math.PI;
        if (lie < -Math.PI / 2) lie += Math.PI;
        const wanted = THREE.MathUtils.clamp(lie * 0.3, -0.42, 0.42);
        capsule.roll += (wanted - capsule.roll) * (1 - Math.exp(-dt * 5));
        capsule.glyph.position.set(x, -y, 0);
        capsule.glyph.scale.setScalar(scale * 0.56);
        /* Drawn over the near glass too: sealed in, but always legible. */
        capsule.glyph.renderOrder = base + 4;
        capsule.glyphMaterial.rotation = capsule.roll;
        capsule.glyphMaterial.opacity = alpha;

        /* Its shadow on the paper, as long as the capsule looks. */
        const reach = Math.hypot(longAxis.x, longAxis.y);
        capsule.shadow.position.set(x + view.size * light.offsetX, -(y + view.size * light.offsetY), 0);
        capsule.shadow.rotation.z = Math.atan2(longAxis.y, longAxis.x);
        capsule.shadow.scale.set(scale * (BODY * reach + RADIUS * 2) * 1.35 * light.stretch, scale * RADIUS * 2 * 1.25, 1);
        /* Every shadow before any capsule: they lie on the paper. */
        capsule.shadow.renderOrder = -1000 + order;
        capsule.shadowMaterial.opacity = 0.2 * light.strength * alpha * (view.held ? 0.7 : 1);
        capsule.tone = view.tone;
      });
      for (const [id, capsule] of capsules) if (!present.has(id)) remove(id, capsule);
      renderer.render(scene, camera);
    },

    spin(amount) {
      if (reducedMotion) return;
      for (const capsule of capsules.values()) {
        axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        capsule.spin.addScaledVector(axis, amount * (0.6 + Math.random() * 0.8));
        if (capsule.spin.length() > 14) capsule.spin.setLength(14);
      }
    },

    setLight({ x, z, ink, strength }) {
      /* A capsule floats above the paper: its shadow lands where the light
         carries it from that height, as Yumi's does (lib/yumi3d/ground.ts,
         whose floor is pressed to about a quarter). */
      light.offsetX = x * FLOAT_HEIGHT;
      light.offsetY = 0.16 + z * FLOAT_HEIGHT * 0.6;
      light.stretch = 1 + Math.min(0.5, Math.hypot(x, z) * 0.18);
      light.strength = strength;
      for (const capsule of capsules.values()) capsule.shadowMaterial.color.setHex(ink);
      shadowInk = ink;
      /* Its glass catches the light from the other side of its shadow. */
      lamp.position.set(-x * 0.6, 0.75, 0.9);
    },

    resize,

    dispose() {
      for (const [id, capsule] of capsules) remove(id, capsule);
      for (const texture of glyphs.values()) texture.dispose();
      tinted.dispose();
      clear.dispose();
      lip.dispose();
      plane.dispose();
      blob.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    },
  };
}
