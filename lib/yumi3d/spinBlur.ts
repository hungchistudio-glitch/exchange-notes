import * as THREE from "three";

/* =========================================================
   Motion blur on a fast turn (Chi, 2026-11-22: 快速旋轉的動態模糊)

   When a finger flicks her round faster than a few degrees a frame, the
   frame is drawn several times along the turn it has just made and the
   draws are averaged: a 180° shutter, as a film camera's, so a fast spin
   smears as a filmed one does instead of strobing. Slow, it is one ordinary
   draw and costs nothing; the number of samples follows the speed, two to
   five.

   The samples go into a half-float target (4× multisampled) in linear
   light with premultiplied alpha, are summed into a second one, and the sum
   is tone-mapped and written to the canvas once, premultiplied again,
   since the canvas is transparent over the page. Where the GPU cannot draw
   into half floats it uses 8-bit targets (a highlight clips a little, only
   while it spins).
   ========================================================= */

/** Radians a frame below which a turn is drawn once. */
const STILL = 0.035;
const MOST = 5;
/** More than this in one frame is a cut, not a flick. */
const JUMP = 1.2;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export function createSpinBlur(renderer: THREE.WebGLRenderer) {
  const floats = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
  const type = floats ? THREE.HalfFloatType : THREE.UnsignedByteType;
  let sample: THREE.WebGLRenderTarget | null = null;
  let sum: THREE.WebGLRenderTarget | null = null;
  const size = new THREE.Vector2();

  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const add = new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, weight: { value: 1 } },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float weight;
      varying vec2 vUv;
      void main() { gl_FragColor = texture2D(map, vUv) * weight; }
    `,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const out = new THREE.ShaderMaterial({
    uniforms: { map: { value: null } },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      varying vec2 vUv;
      void main() {
        vec4 lit = texture2D(map, vUv);
        float alpha = clamp(lit.a, 0.0, 1.0);
        gl_FragColor = vec4(alpha > 0.0001 ? lit.rgb / alpha : vec3(0.0), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb *= gl_FragColor.a;
      }
    `,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), add);
  quad.frustumCulled = false;
  quadScene.add(quad);

  function targets() {
    renderer.getDrawingBufferSize(size);
    if (sample && sample.width === size.x && sample.height === size.y) return;
    sample?.dispose();
    sum?.dispose();
    sample = new THREE.WebGLRenderTarget(size.x, size.y, { type, samples: 4, colorSpace: THREE.LinearSRGBColorSpace });
    sum = new THREE.WebGLRenderTarget(size.x, size.y, { type, colorSpace: THREE.LinearSRGBColorSpace });
  }

  const clear = new THREE.Color();
  const end = new THREE.Quaternion();
  const open = new THREE.Quaternion();

  return {
    /**
     * Draws `scene` with `turning` blurred along the rotation it made since
     * `from` (its orientation last frame), about whatever axis. False when
     * the turn is slow enough for one ordinary draw, which the caller then
     * makes.
     */
    render(scene: THREE.Scene, camera: THREE.Camera, turning: THREE.Object3D, from: THREE.Quaternion) {
      const speed = turning.quaternion.angleTo(from);
      /* Slow, or a jump (a pose set, a scene woken from parking): a cut,
         not a turn to smear. */
      if (speed < STILL || speed > JUMP || !Number.isFinite(speed)) return false;
      const count = Math.min(MOST, 1 + Math.ceil(speed / STILL));
      targets();
      if (!sample || !sum) return false;

      end.copy(turning.quaternion);
      /* The shutter opens halfway through the frame's turn. */
      open.copy(from).slerp(end, 0.5);
      const before = renderer.getRenderTarget();
      const autoClear = renderer.autoClear;
      renderer.getClearColor(clear);
      const clearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(0x000000, 0);

      renderer.setRenderTarget(sum);
      renderer.clear();
      quad.material = add;
      add.uniforms.weight.value = 1 / count;
      for (let i = 0; i < count; i++) {
        turning.quaternion.copy(open).slerp(end, i / (count - 1));
        renderer.autoClear = true;
        renderer.setRenderTarget(sample);
        renderer.render(scene, camera);
        renderer.autoClear = false;
        renderer.setRenderTarget(sum);
        add.uniforms.map.value = sample.texture;
        renderer.render(quadScene, quadCamera);
      }
      turning.quaternion.copy(end);

      renderer.autoClear = true;
      renderer.setRenderTarget(before);
      quad.material = out;
      out.uniforms.map.value = sum.texture;
      renderer.render(quadScene, quadCamera);

      renderer.autoClear = autoClear;
      renderer.setClearColor(clear, clearAlpha);
      return true;
    },

    dispose() {
      sample?.dispose();
      sum?.dispose();
      add.dispose();
      out.dispose();
      quad.geometry.dispose();
    },
  };
}
