import * as THREE from "three";

/* =========================================================
   Hangyumi's particles: the sand she becomes, the glints she leaves

   One fixed pool of soft round points, drawn in a single call. Each grain
   is given where it starts, when it lets go, how it is carried and how
   long it lasts; every frame works out where that puts it, how bright it
   still is and what colour it has drifted to. A few thousand grains cost
   less on the CPU than the shader compile a GPU simulation would.

   Used by lib/hangyumi/studio.ts for the two ways out of a finished
   round: the sand on the wind after a loss, the glints after a win.
   ========================================================= */

export type Grain = {
  at: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  /** Seconds after the start when it lets go. */
  release: number;
  /** Seconds it lasts once released. */
  life: number;
  size: number;
  from: THREE.Color;
  to: THREE.Color;
  /** How much it wanders off its path. */
  drift: number;
};

const VERTEX = /* glsl */ `
  attribute float alpha;
  attribute float size;
  uniform float scale;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale / -view.z;
    gl_Position = projectionMatrix * view;
    vAlpha = alpha;
    vColor = color;
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5 || vAlpha <= 0.0) discard;
    gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.12, d));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const smoothstep = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

export function createGrains(capacity: number) {
  const positions = new Float32Array(capacity * 3);
  const colors = new Float32Array(capacity * 3);
  const alphas = new Float32Array(capacity);
  const sizes = new Float32Array(capacity);
  const geometry = new THREE.BufferGeometry();
  const attribute = (array: Float32Array, size: number) =>
    new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute(positions, 3));
  geometry.setAttribute("color", attribute(colors, 3));
  geometry.setAttribute("alpha", attribute(alphas, 1));
  geometry.setAttribute("size", attribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { scale: { value: 600 } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  points.renderOrder = 2;

  let grains: Grain[] = [];
  const colour = new THREE.Color();

  return {
    points,
    /** Replaces whatever was in the pool. */
    load(next: Grain[]) {
      grains = next.slice(0, capacity);
      geometry.setDrawRange(0, grains.length);
      points.visible = grains.length > 0;
    },
    /** Sets the pool to time t (seconds); false once every grain is gone. */
    update(t: number, pixelScale: number) {
      material.uniforms.scale.value = pixelScale;
      let alive = false;
      grains.forEach((grain, i) => {
        const age = t - grain.release;
        const o = i * 3;
        if (age <= 0) {
          positions[o] = grain.at.x;
          positions[o + 1] = grain.at.y;
          positions[o + 2] = grain.at.z;
          alphas[i] = 0;
          sizes[i] = 0;
          alive = true;
          return;
        }
        if (age >= grain.life) {
          alphas[i] = 0;
          sizes[i] = 0;
          return;
        }
        alive = true;
        const seed = i * 12.9898;
        const wander = grain.drift * age;
        positions[o] = grain.at.x + grain.velocity.x * age + 0.5 * grain.acceleration.x * age * age
          + Math.sin(age * 2.3 + seed) * wander;
        positions[o + 1] = grain.at.y + grain.velocity.y * age + 0.5 * grain.acceleration.y * age * age
          + Math.sin(age * 1.7 + seed * 1.7) * wander * 0.7;
        positions[o + 2] = grain.at.z + grain.velocity.z * age + 0.5 * grain.acceleration.z * age * age
          + Math.cos(age * 2.1 + seed * 0.6) * wander;
        const through = age / grain.life;
        colour.copy(grain.from).lerp(grain.to, smoothstep(0, 0.85, through));
        colors[o] = colour.r;
        colors[o + 1] = colour.g;
        colors[o + 2] = colour.b;
        alphas[i] = smoothstep(0, 0.06, age) * (1 - smoothstep(0.4, 1, through));
        sizes[i] = grain.size * (1 - 0.55 * through);
      });
      for (const name of ["position", "color", "alpha", "size"]) geometry.getAttribute(name).needsUpdate = true;
      if (!alive) points.visible = false;
      return alive;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
