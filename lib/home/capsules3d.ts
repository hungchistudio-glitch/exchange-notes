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

   The letter is a flat card that always faces the screen, so it can never
   be seen edge on: it leans with the capsule, but never further than a
   reader can still read it.
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
  /** When it was fed to her: it clicks open and its letter flies to her. */
  eatenAt?: number;
  /** Where her eye is, CSS px, for the letter's flight. */
  feedTo?: { x: number; y: number } | null;
  /** Its word is due for review: it glows from inside, slowly. */
  due?: boolean;
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
const FLOAT_HEIGHT = 0.34;
/** Fed: the halves part and the letter flies, this long. */
const OPEN_MS = 560;

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

/* =========================================================
   One draw for each part of every capsule (Chi, 2026-11-22: 合併膠囊繪製)

   Each capsule was eight objects of its own (four glass shells, the lip, its
   letter, its shadow, its glow) with its own materials: about ninety draws
   a frame for twelve capsules, 2,600 a second measured. Now each part is
   one InstancedMesh for all of them, drawn in the order one capsule was:
   every shadow, every glow, the far glass, the near glass, the lips, the
   letters. What differs between capsules rides on each instance: its
   matrix, its tint (instanceColor), and `instanceLook` (the part's own
   opacity, the capsule's fade, its warm glow). The letters share one
   texture, an atlas of 128 px cells.

   The capsule a finger holds, and the tour's, is drawn in a second set on
   top, so another capsule's letter never shows over its glass.

   A fade now thins the whole capsule, its glass edges and gleam included.
   They used to stay, so a capsule faded out by a search answer (alpha 0)
   left its outline behind.
   ========================================================= */

/** Most capsules a layer draws; the field shows about twelve. */
const CAPACITY = 48;

type LookOptions = {
  /** Thicker toward the silhouette: what makes thin glass read as glass. */
  rim?: number;
  /** Takes the capsule's warm glow (the due words, the tour's capsule). */
  glow?: boolean;
  /** Reads its map from one cell of the letter atlas, this wide in uv. */
  cell?: number;
};

/** Teaches a material to read `instanceLook` (and the atlas cell), per instance. */
function perInstance<T extends THREE.Material>(material: T, { rim, glow = false, cell }: LookOptions): T {
  material.onBeforeCompile = shader => {
    if (rim !== undefined) shader.uniforms.uRim = { value: rim };
    if (cell !== undefined) shader.uniforms.uCell = { value: cell };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 instanceLook;
        varying vec3 vLook;
        ${cell !== undefined ? "attribute vec2 instanceCell;\nuniform float uCell;" : ""}`,
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLook = instanceLook;");
    if (cell !== undefined) {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <uv_vertex>",
        "#include <uv_vertex>\nvMapUv = vMapUv * uCell + instanceCell;",
      );
    }
    let fragment = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vLook;
        ${rim !== undefined ? "uniform float uRim;" : ""}`,
      )
      /* The part's own opacity, where the material's used to be. */
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.a *= vLook.x;");
    if (glow) {
      fragment = fragment.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.34, 0.28, 0.08) * vLook.z;",
      );
    }
    fragment = fragment.replace(
      "#include <opaque_fragment>",
      `${rim !== undefined ? `float facing = abs(normalize(normal).z);
        diffuseColor.a = clamp(diffuseColor.a + pow(1.0 - facing, 2.2) * uRim, 0.0, 1.0);
        /* A highlight on thin glass is as bright as on anything: it must
           not be thinned with the glass, or the capsule has no gleam. */
        diffuseColor.a = clamp(diffuseColor.a + dot(totalSpecular, vec3(0.3333)) * 1.6, 0.0, 1.0);` : ""}
        /* The capsule's fade, over everything it is. */
        diffuseColor.a *= vLook.y;
        #include <opaque_fragment>`,
    );
    shader.fragmentShader = fragment;
  };
  material.customProgramCacheKey = () => `capsule-${rim ?? "-"}-${glow ? "g" : "-"}-${cell ?? "-"}`;
  return material;
}

function glass(color: THREE.ColorRepresentation, rim: number, side: THREE.Side) {
  return perInstance(new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.05,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.6,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side,
  }), { rim, glow: true });
}

/** The letters, 8 × 8 cells of 128 px in one texture; a cell no capsule shows is reused. */
function letterAtlas() {
  const CELLS = 8;
  const CELL = 128;
  const paper = document.createElement("canvas");
  paper.width = paper.height = CELLS * CELL;
  const ctx = paper.getContext("2d")!;
  const texture = new THREE.CanvasTexture(paper);
  texture.colorSpace = THREE.SRGBColorSpace;
  const slots = new Map<string, { cell: number; used: number }>();
  const free = Array.from({ length: CELLS * CELLS }, (_, i) => CELLS * CELLS - 1 - i);

  function draw(cell: number, glyph: string, ink: string) {
    const x0 = (cell % CELLS) * CELL;
    const y0 = Math.floor(cell / CELLS) * CELL;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, CELL, CELL);
    ctx.clip();
    ctx.clearRect(x0, y0, CELL, CELL);
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const size = Array.from(glyph).length > 1 ? 66 : 88;
    ctx.font = `600 ${size}px Georgia, ${cjkSerifFor(glyph)}, serif`;
    /* A faint light edge under the ink, as the beads' letters had. */
    ctx.shadowColor = "rgba(255,255,255,0.65)";
    ctx.shadowOffsetY = 2;
    ctx.fillText(glyph, x0 + 64, y0 + 68);
    ctx.restore();
    texture.needsUpdate = true;
  }

  return {
    texture,
    cellWidth: 1 / CELLS,
    /** The uv corner of this letter's cell, drawing it first if it is new. */
    cellFor(key: string, glyph: string, ink: string, frame: number): [number, number] {
      let slot = slots.get(key);
      if (!slot) {
        let cell = free.pop();
        if (cell === undefined) {
          let oldest: [string, { cell: number; used: number }] | null = null;
          for (const entry of slots) if (entry[1].used < frame && (!oldest || entry[1].used < oldest[1].used)) oldest = entry;
          if (oldest) slots.delete(oldest[0]);
          cell = oldest?.[1].cell ?? 0;
        }
        draw(cell, glyph, ink);
        slot = { cell, used: frame };
        slots.set(key, slot);
      }
      slot.used = frame;
      /* CanvasTexture flips y: a cell's top row in the canvas is high in uv. */
      return [(slot.cell % CELLS) / CELLS, 1 - (Math.floor(slot.cell / CELLS) + 1) / CELLS];
    },
    dispose() {
      texture.dispose();
    },
  };
}

/** One part of every capsule: its geometry (its own copy, for the per-instance data) and how it looks. */
function instancedPart(geometry: THREE.BufferGeometry, material: THREE.Material, order: number, { colored = false, cells = false } = {}) {
  const own = geometry.clone();
  own.setAttribute("instanceLook", new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3).setUsage(THREE.DynamicDrawUsage));
  if (cells) own.setAttribute("instanceCell", new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 2), 2).setUsage(THREE.DynamicDrawUsage));
  const mesh = new THREE.InstancedMesh(own, material, CAPACITY);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (colored) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3).setUsage(THREE.DynamicDrawUsage);
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  mesh.count = 0;
  const look = own.getAttribute("instanceLook") as THREE.InstancedBufferAttribute;
  const cell = cells ? (own.getAttribute("instanceCell") as THREE.InstancedBufferAttribute) : null;
  return {
    mesh,
    /** Adds an instance; false once the part is full. */
    push(matrix: THREE.Matrix4, base: number, fade: number, glow = 0, color?: THREE.Color, uv?: [number, number]) {
      const i = mesh.count;
      if (i >= CAPACITY) return false;
      mesh.setMatrixAt(i, matrix);
      look.setXYZ(i, base, fade, glow);
      if (color) mesh.setColorAt(i, color);
      if (uv && cell) cell.setXY(i, uv[0], uv[1]);
      mesh.count = i + 1;
      return true;
    },
    begin() {
      mesh.count = 0;
    },
    end() {
      mesh.visible = mesh.count > 0;
      if (!mesh.count) return;
      mesh.instanceMatrix.needsUpdate = true;
      look.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (cell) cell.needsUpdate = true;
    },
    dispose() {
      own.dispose();
      mesh.dispose();
    },
  };
}

function shadowTexture() {
  const paper = document.createElement("canvas");
  paper.width = paper.height = 64;
  const ctx = paper.getContext("2d")!;
  /* A firm core and a short falloff: a shadow on paper, not a smudge. */
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.5, "rgba(255,255,255,0.85)");
  glow.addColorStop(0.78, "rgba(255,255,255,0.25)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(paper);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The due glow: warm light from inside, brightest at its middle. */
function haloTexture() {
  const paper = document.createElement("canvas");
  paper.width = paper.height = 64;
  const ctx = paper.getContext("2d")!;
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  /* Amber, and laid on rather than added: added light vanishes on the
     Standard paper, which is nearly white already. */
  glow.addColorStop(0, "rgba(246,190,84,0.85)");
  glow.addColorStop(0.35, "rgba(240,176,70,0.5)");
  glow.addColorStop(0.7, "rgba(236,168,64,0.16)");
  glow.addColorStop(1, "rgba(236,168,64,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(paper);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** What a capsule keeps between frames: how it is turned and where it was drawn. */
type Capsule = {
  /* The last view it was given, so a fed capsule can finish opening after
     the field has let it go. */
  last: CapsuleView;
  quaternion: THREE.Quaternion;
  spin: THREE.Vector3;
  cruise: THREE.Vector3;
  roll: number;
  shown: { x: number; y: number };
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
  const haloMap = haloTexture();
  const atlas = letterAtlas();
  const capsules = new Map<string, Capsule>();
  const light = { offsetX: SHADOW_OFFSET.x, offsetY: SHADOW_OFFSET.y, stretch: 1, strength: 1 };
  let width = 0;
  let height = 0;

  /* The tinted halves and the lip are white here; each instance brings its
     tone's colour. The clear halves are one glass for every tone. */
  const materials = {
    tintedBack: glass(0xffffff, 0.25, THREE.BackSide),
    clearBack: glass(0xe9f1f6, 0.35, THREE.BackSide),
    tintedFront: glass(0xffffff, 0.55, THREE.FrontSide),
    clearFront: glass(0xeef5fa, 0.95, THREE.FrontSide),
    lip: perInstance(new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.2, metalness: 0, transparent: true, depthTest: false, depthWrite: false,
    }), { glow: true }),
    letters: perInstance(new THREE.MeshBasicMaterial({
      map: atlas.texture, transparent: true, depthTest: false, depthWrite: false,
    }), { cell: atlas.cellWidth }),
    halo: perInstance(new THREE.MeshBasicMaterial({
      map: haloMap, transparent: true, depthTest: false, depthWrite: false,
    }), {}),
    shadow: perInstance(new THREE.MeshBasicMaterial({
      map: blob, color: 0x2e2418, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    }), {}),
  };
  const toneColors = TONES.map(tone => ({ tint: new THREE.Color(tone.tint), sheen: new THREE.Color(tone.sheen) }));

  /*
   * Drawn in the order one capsule was: its glow behind it, the inside of
   * its far half then its near half, the outside of its far half, the lip,
   * the outside of its near half, and its letter over all of it. Which half
   * is far changes as it tumbles (three.js used to sort them, a capsule's
   * own meshes by depth), so each half has a far pass and a near pass and a
   * capsule's halves go to whichever they are this frame. The lip between
   * the outsides is what keeps the seam a soft line under the near glass.
   */
  function layer(from: number) {
    return {
      halo: instancedPart(plane, materials.halo, from + 1),
      farTintedBack: instancedPart(tinted, materials.tintedBack, from + 2, { colored: true }),
      farClearBack: instancedPart(clear, materials.clearBack, from + 3),
      nearTintedBack: instancedPart(tinted, materials.tintedBack, from + 4, { colored: true }),
      nearClearBack: instancedPart(clear, materials.clearBack, from + 5),
      farTintedFront: instancedPart(tinted, materials.tintedFront, from + 6, { colored: true }),
      farClearFront: instancedPart(clear, materials.clearFront, from + 7),
      lip: instancedPart(lip, materials.lip, from + 8, { colored: true }),
      nearTintedFront: instancedPart(tinted, materials.tintedFront, from + 9, { colored: true }),
      nearClearFront: instancedPart(clear, materials.clearFront, from + 10),
      letters: instancedPart(plane, materials.letters, from + 11, { cells: true }),
    };
  }
  /* Every shadow before any capsule: they lie on the paper. */
  const shadows = instancedPart(plane, materials.shadow, -1000);
  const floating = layer(0);
  const lifted = layer(100);
  const parts = [shadows, ...Object.values(floating), ...Object.values(lifted)];
  for (const part of parts) scene.add(part.mesh);

  function build(view: CapsuleView): Capsule {
    const random = seeded(view.id);
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
    return { last: view, quaternion, spin: cruise.clone(), cruise, roll: 0, shown: { x: view.x, y: view.y }, seen: false };
  }

  /* Read only when the canvas changes size, never in the frame: the field
     has just moved twelve buttons when it draws, and a read there forced
     the whole page's style to be worked out again, every frame. */
  function resize() {
    const box = { width: canvas.clientWidth, height: canvas.clientHeight };
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
  const sizeWatch = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => resize());
  sizeWatch?.observe(canvas);

  const step = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const longAxis = new THREE.Vector3();
  const rolling = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const apart = new THREE.Vector3();
  const size = new THREE.Vector3();
  const flat = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 0, 1);
  const NONE = new THREE.Quaternion();
  let frameNumber = 0;

  return {
    frame(views, dt, now, { tumble, snap }) {
      frameNumber += 1;
      const present = new Set<string>();
      /* A capsule fed to her finishes opening after the field lets it go. */
      const all = [...views];
      for (const v of views) present.add(v.id);
      for (const [id, capsule] of capsules) {
        const fedAt = capsule.last.eatenAt;
        if (!present.has(id) && fedAt !== undefined && now - fedAt < OPEN_MS) all.push(capsule.last);
      }
      for (const part of parts) part.begin();
      all.forEach(view => {
        present.add(view.id);
        let capsule = capsules.get(view.id);
        if (!capsule) {
          capsule = build(view);
          capsules.set(view.id, capsule);
        }
        capsule.last = view;
        const tone = TONES[view.tone] ?? TONES[0];
        const colors = toneColors[view.tone] ?? toneColors[0];

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

        /* Fed (Chi, 2026-11-22: 餵食時膠囊打開): it clicks open, its halves
           part along it and fade, and its letter flies into her eye. */
        const scale = view.size * (view.held ? 1.06 : 1);
        let alpha = view.alpha;
        let open = 0;
        let flight = 0;
        if (view.eatenAt !== undefined) {
          const t = Math.min(1, (now - view.eatenAt) / OPEN_MS);
          open = 1 - (1 - t) ** 3;
          flight = t < 0.15 ? 0 : (t - 0.15) / 0.85;
          alpha *= t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
        }
        const drawn = view.hint || view.held ? lifted : floating;

        /* Due for review (Chi, 2026-11-22: 快忘的字膠囊會發光): a warm light
           breathes inside it, slowly, so the home shows which words want
           practice. Behind the capsule, as light it sits in. */
        if (view.due && view.eatenAt === undefined) {
          const breath = reducedMotion ? 0.7 : 0.55 + 0.45 * Math.sin(now / 900 + capsule.cruise.x * 10);
          position.set(x, -y, 0);
          size.setScalar(view.size * (1.7 + 0.12 * breath));
          drawn.halo.push(matrix.compose(position, NONE, size), 1, 0.85 * breath * alpha);
          glow = Math.max(glow, 0.6 * breath);
        }

        /* The glass: the tinted half and its lip one way along it, the
           clear half the other, apart by as much as it has opened. The
           tinted half is the near one while it points at the screen. */
        longAxis.set(0, 1, 0).applyQuaternion(capsule.quaternion);
        if (alpha > 0.002) {
          const tintedNear = longAxis.z > 0;
          size.setScalar(scale);
          apart.set(0, open * 0.42 * scale, 0).applyQuaternion(capsule.quaternion);
          position.set(x, -y, 0).add(apart);
          matrix.compose(position, capsule.quaternion, size);
          (tintedNear ? drawn.nearTintedBack : drawn.farTintedBack).push(matrix, tone.opacity * 0.55, alpha, glow, colors.tint);
          (tintedNear ? drawn.nearTintedFront : drawn.farTintedFront).push(matrix, tone.opacity, alpha, glow, colors.tint);
          drawn.lip.push(matrix, 0.75, alpha, glow, colors.sheen);
          position.set(x, -y, 0).sub(apart);
          matrix.compose(position, capsule.quaternion, size);
          (tintedNear ? drawn.farClearBack : drawn.nearClearBack).push(matrix, 0.14, alpha, glow);
          (tintedNear ? drawn.farClearFront : drawn.nearClearFront).push(matrix, 0.18, alpha, glow);
        }

        /* The letter: inside, upright enough to read, leaning with it. */
        let lie = Math.atan2(longAxis.y, longAxis.x);
        if (lie > Math.PI / 2) lie -= Math.PI;
        if (lie < -Math.PI / 2) lie += Math.PI;
        const wanted = THREE.MathUtils.clamp(lie * 0.3, -0.42, 0.42);
        capsule.roll += (wanted - capsule.roll) * (1 - Math.exp(-dt * 5));
        let glyphX = x, glyphY = y, glyphScale = scale * 0.56, glyphAlpha = alpha;
        if (view.eatenAt !== undefined) {
          const to = view.feedTo ?? { x, y };
          const ease = flight < 0.5 ? 2 * flight * flight : 1 - (-2 * flight + 2) ** 2 / 2;
          glyphX = x + (to.x - x) * ease;
          /* A little arc up on its way, as something tossed. */
          glyphY = y + (to.y - y) * ease - Math.sin(Math.PI * ease) * view.size * 0.6;
          glyphScale = scale * 0.56 * (1 - 0.6 * ease);
          glyphAlpha = view.alpha * (flight < 0.85 ? 1 : 1 - (flight - 0.85) / 0.15);
        }
        if (glyphAlpha > 0.002) {
          /* Drawn over the near glass too: sealed in, but always legible. */
          const cell = atlas.cellFor(`${view.tone}:${view.glyph}`, view.glyph, tone.ink, frameNumber);
          position.set(glyphX, -glyphY, 0);
          size.setScalar(glyphScale);
          flat.setFromAxisAngle(UP, capsule.roll * (1 - flight));
          drawn.letters.push(matrix.compose(position, flat, size), 1, glyphAlpha, 0, undefined, cell);
        }

        /* Its shadow on the paper, as long as the capsule looks. */
        const shade = 0.16 * light.strength * alpha * (1 - open) * (view.held ? 0.7 : 1);
        if (shade > 0.002) {
          const reach = Math.hypot(longAxis.x, longAxis.y);
          position.set(x + view.size * light.offsetX, -(y + view.size * light.offsetY), 0);
          flat.setFromAxisAngle(UP, Math.atan2(longAxis.y, longAxis.x));
          size.set(scale * (BODY * reach + RADIUS * 2) * 1.08 * light.stretch, scale * RADIUS * 2 * 0.95, 1);
          shadows.push(matrix.compose(position, flat, size), 1, shade);
        }
      });
      for (const part of parts) part.end();
      for (const id of capsules.keys()) if (!present.has(id)) capsules.delete(id);
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
      light.stretch = 1 + Math.min(0.3, Math.hypot(x, z) * 0.12);
      light.strength = strength;
      materials.shadow.color.setHex(ink);
      /* Its glass catches the light from the other side of its shadow. */
      lamp.position.set(-x * 0.6, 0.75, 0.9);
    },

    resize,

    dispose() {
      sizeWatch?.disconnect();
      capsules.clear();
      for (const part of parts) part.dispose();
      for (const material of Object.values(materials)) material.dispose();
      atlas.dispose();
      haloMap.dispose();
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
