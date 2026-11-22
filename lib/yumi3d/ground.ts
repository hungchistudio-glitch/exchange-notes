import * as THREE from "three";

/* =========================================================
   The ground under Yumi (Chi, 2026-11-21)

   Standard: a contact shadow under her that breathes as she floats, and her
   own silhouette cast by a lamp at the upper left, falling soft across the
   paper to the lower right (her hat and charms with it, turning as she
   turns). Cosmic: her mirror image in an obsidian floor, fading and
   blurring as it goes down, the way the reference's black hole sits on its
   horizon.

   Chi then chose the reflection for both modes (2026-11-21: 全部統一像
   cosmic 一樣倒影): the Standard paper reads as lacquer, with a warm gold
   tint. The shadow kind stays here, unused, should a screen want it.

   Both are drawn inside her own WebGL context: one small extra render of
   her into a texture, then one quad over the region the effect covers.
   Nothing is ever read back to the CPU — the plinth's old reflection did
   that (copying each frame into a 2D canvas), and on an iPhone it was the
   costliest thing the shop did (PR #165).

   The camera looks at her straight on, so a real floor would be seen edge
   on. The floor here is the page's: the radar pad and the plinth are
   ellipses pressed to about a quarter of their width, so the floor is
   drawn as if seen from about fifteen degrees above, by the same pressing
   (TILT). The shadow is therefore not a shadow map: it is her silhouette
   pushed along the lamp onto the floor plane and pressed the same way,
   which is a single affine matrix applied in the pass's camera.
   ========================================================= */

export type YumiGround = {
  kind: "shadow" | "reflection";
  /** The floor line under her, in CSS px from the canvas's top. */
  floorY: number;
  /** Only on a plinth's top face: an ellipse in canvas CSS px. */
  clip?: { x: number; y: number; rx: number; ry: number } | null;
  /** 1 is the default weight; 0 draws nothing. */
  strength?: number;
  /** The contact shadow under her (Standard). The shop's plinth paints its own. */
  contact?: boolean;
  /**
   * Where the light is, as how far her shadow falls per unit of her height:
   * `x` to the right (− to the left), `z` toward the reader. The Standard
   * home follows the reader's clock (lib/home/sunlight.ts); without it, the
   * lamp at the upper left.
   */
  lamp?: { x: number; z: number } | null;
  /** The shadow's colour, 0xRRGGBB. */
  ink?: number;
  /** A reflection's touch of the room's light, 0xRRGGBB: ice in Cosmic,
      warm gold on the Standard paper's lacquer. */
  tint?: number;
  /** How much darker than she is her reflection is: 0.82 on obsidian; on
      pale lacquer it wants to be deeper to read at all. */
  shade?: number;
};

/** How the floor is pressed on screen: the radar pad's scaleY(0.26). */
const TILT = 0.27;
/* The lamp: up and to the left, a little behind her, so her silhouette
   falls to the lower right (the sketch Chi chose). Per unit of height, the
   shadow moves LAMP_X to the right and LAMP_Z toward the reader. */
const LAMP_X = 0.62;
const LAMP_Z = 1.05;
/* Below the floor, how far the reflection reaches, in shell radii. */
const REFLECTION_REACH = 1.55;
/* The passes' resolution, as a share of the canvas's own pixels. */
const SHADOW_SCALE = 0.42;
const REFLECTION_SCALE = 0.6;

const vertexShader = /* glsl */ `
  uniform vec4 uRectNdc;
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(mix(uRectNdc.xy, uRectNdc.zw, vUv), 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform vec4 uRect;      // x, y, w, h in CSS px (y down)
  uniform vec2 uCanvasPx;  // device px of the drawing buffer
  uniform float uPixelRatio;
  uniform int uKind;       // 0 shadow, 1 reflection
  uniform float uFloorY;
  uniform vec3 uAnchor;    // x, y, r in CSS px
  uniform float uStrength;
  uniform float uLift;     // 0 on the floor .. 1 well above it
  uniform float uContact;
  uniform vec4 uClip;      // x, y, rx, ry; rx <= 0 for none
  uniform vec3 uShadowInk;
  uniform vec3 uTint;
  uniform vec2 uCastTip;   // where the shadow of her top lands, CSS px
  uniform float uShade;
  varying vec2 vUv;

  vec4 tap(vec2 uv) { return texture2D(uMap, clamp(uv, uTexel * 0.5, 1.0 - uTexel * 0.5)); }

  /* A soft 3x3 Gaussian whose reach grows with distance from her. */
  vec4 soft(vec2 uv, float reach) {
    vec2 d = uTexel * reach;
    vec4 sum = tap(uv) * 0.25;
    sum += (tap(uv + vec2(d.x, 0.0)) + tap(uv - vec2(d.x, 0.0)) + tap(uv + vec2(0.0, d.y)) + tap(uv - vec2(0.0, d.y))) * 0.125;
    sum += (tap(uv + d) + tap(uv - d) + tap(uv + vec2(d.x, -d.y)) + tap(uv + vec2(-d.x, d.y))) * 0.0625;
    return sum;
  }

  void main() {
    vec2 px = vec2(gl_FragCoord.x, uCanvasPx.y - gl_FragCoord.y) / uPixelRatio;
    float clipMask = 1.0;
    if (uClip.z > 0.0) {
      vec2 e = (px - uClip.xy) / uClip.zw;
      clipMask = 1.0 - smoothstep(0.93, 1.0, dot(e, e));
    }
    float r = max(uAnchor.z, 1.0);

    if (uKind == 0) {
      /* Her silhouette on the floor: sharpest where it leaves her, softer
         and lighter the further it falls. The pass shares this quad's
         region and orientation, so its texture is read as is. */
      vec2 uv = vUv;
      /* How far along the shadow, from her foot toward its tip. */
      vec2 foot = vec2(uAnchor.x, uFloorY);
      vec2 reach = uCastTip - foot;
      float along = clamp(dot(px - foot, reach) / max(dot(reach, reach), r * r), 0.0, 1.0);
      float silhouette = soft(uv, mix(1.2, 4.5, along)).a * (1.0 - 0.55 * along) * 0.34 * (1.0 - uLift);

      /* Where she meets the floor: tighter and darker as she comes down. */
      vec2 c = (px - vec2(uAnchor.x + 0.06 * r, uFloorY)) / (vec2(1.02, 1.02 * ${TILT.toFixed(2)} * 1.25) * r * (0.82 + 0.5 * uLift));
      float contact = pow(1.0 - smoothstep(0.0, 1.0, length(c)), 1.7) * 0.5 * (1.0 - 0.8 * uLift) * uContact;

      float alpha = (1.0 - (1.0 - silhouette) * (1.0 - contact)) * uStrength * clipMask;
      gl_FragColor = vec4(uShadowInk * alpha, alpha);
    } else {
      float below = px.y - uFloorY;
      if (below < 0.0) discard;
      float depth = clamp(below / (${REFLECTION_REACH.toFixed(2)} * r), 0.0, 1.0);
      /* The mirrored pass is upside down relative to this quad. */
      vec4 seen = soft(vec2(vUv.x, 1.0 - vUv.y), mix(0.6, 3.2, depth));
      float fade = pow(1.0 - depth, 1.6) * 0.62 * uStrength * clipMask;
      /* Obsidian: darker than she is, and a little of the room's ice in it. */
      vec3 colour = mix(seen.rgb * uShade, uTint * seen.a, 0.12);
      gl_FragColor = vec4(colour * fade, seen.a * fade);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type GroundFrame = {
  /** The canvas's layout size, CSS px. */
  width: number;
  height: number;
  /** Where she is drawn this frame. */
  anchor: { x: number; y: number; r: number };
  /** World units per CSS px on her plane. */
  unitsPerPixel: number;
};

export function createYumiGround(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  model: THREE.Object3D,
) {
  let ground: YumiGround | null = null;

  const target = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    depthBuffer: true,
  });
  target.texture.minFilter = THREE.LinearFilter;
  target.texture.magFilter = THREE.LinearFilter;
  target.texture.generateMipmaps = false;

  const passCamera = new THREE.PerspectiveCamera();
  passCamera.matrixWorldAutoUpdate = false;
  passCamera.matrixAutoUpdate = false;

  const uniforms = {
    uMap: { value: target.texture },
    uTexel: { value: new THREE.Vector2(0.25, 0.25) },
    uRect: { value: new THREE.Vector4() },
    uRectNdc: { value: new THREE.Vector4() },
    uCanvasPx: { value: new THREE.Vector2() },
    uPixelRatio: { value: 1 },
    uKind: { value: 0 },
    uFloorY: { value: 0 },
    uAnchor: { value: new THREE.Vector3() },
    uStrength: { value: 1 },
    uLift: { value: 0 },
    uContact: { value: 1 },
    uClip: { value: new THREE.Vector4(0, 0, 0, 0) },
    uShadowInk: { value: new THREE.Color(0x2e2418) },
    uCastTip: { value: new THREE.Vector2() },
    uShade: { value: 0.82 },
    uTint: { value: new THREE.Color(0xb8e8e5) },
  };
  /* Drawn first of everything (in the opaque list, so before her), with
     premultiplied blending of its own: a transparent material would be
     sorted after her and painted over her. */
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: false,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  quad.renderOrder = -100;
  quad.visible = false;
  scene.add(quad);

  const projection = new THREE.Matrix4();
  const hidden: THREE.Object3D[] = [];
  const clearColor = new THREE.Color();
  const bufferSize = new THREE.Vector2();

  /* A glow or a halo throws no shadow: anything added rather than laid on. */
  function hideGlows() {
    model.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.visible || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (materials.every(m => m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.2))) {
        mesh.visible = false;
        hidden.push(mesh);
      }
    });
  }

  function restore() {
    for (const object of hidden) object.visible = true;
    hidden.length = 0;
  }

  /** Bucketed, so a region easing in size does not reallocate every frame. */
  function sizeTarget(width: number, height: number) {
    const w = Math.max(8, Math.ceil(width / 32) * 32);
    const h = Math.max(8, Math.ceil(height / 32) * 32);
    if (target.width !== w || target.height !== h) target.setSize(w, h);
    uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  function renderPass(frame: GroundFrame, region: { x: number; y: number; w: number; h: number }, scale: number) {
    const ratio = renderer.getPixelRatio();
    sizeTarget(region.w * ratio * scale, region.h * ratio * scale);

    passCamera.fov = camera.fov;
    passCamera.aspect = camera.aspect;
    passCamera.near = camera.near;
    passCamera.far = camera.far;
    passCamera.setViewOffset(frame.width, frame.height, region.x, region.y, region.w, region.h);
    passCamera.updateProjectionMatrix();

    const previous = renderer.getRenderTarget();
    renderer.getClearColor(clearColor);
    const previousAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, passCamera);
    renderer.setRenderTarget(previous);
    renderer.setClearColor(clearColor, previousAlpha);
  }

  function clampRegion(frame: GroundFrame, x0: number, y0: number, x1: number, y1: number) {
    const x = Math.max(0, Math.floor(x0));
    const y = Math.max(0, Math.floor(y0));
    const w = Math.min(frame.width, Math.ceil(x1)) - x;
    const h = Math.min(frame.height, Math.ceil(y1)) - y;
    return w > 2 && h > 2 ? { x, y, w, h } : null;
  }

  return {
    set(next: YumiGround | null) {
      ground = next ? { ...next } : null;
      if (!ground) quad.visible = false;
    },

    /** Not this frame (the film, or YU and MI apart); kept for the next. */
    skip() {
      quad.visible = false;
    },

    /** Call after she is posed for the frame and before the main render. */
    render(frame: GroundFrame) {
      quad.visible = false;
      const g = ground;
      if (!g || !frame.width || !frame.height) return;
      const strength = g.strength ?? 1;
      if (strength <= 0) return;
      const { x, y, r } = frame.anchor;
      if (r < 2) return;
      const upp = frame.unitsPerPixel;
      /* World y of the floor, on her plane. */
      const floorWorld = -(g.floorY - frame.height / 2) * upp;
      /* How far her shell's foot is above the floor, in her own radii. */
      const lift = THREE.MathUtils.clamp((g.floorY - (y + r)) / r - 0.12, 0, 1.4) / 1.4;
      if (lift >= 1) return;

      let region: { x: number; y: number; w: number; h: number } | null;
      model.updateMatrixWorld();
      camera.updateMatrixWorld();

      if (g.kind === "shadow") {
        const a = g.lamp?.x ?? LAMP_X;
        const dz = g.lamp?.z ?? LAMP_Z;
        /* Her tallest (a hat, or the eye pulled up) is about three radii
           above the floor: the shadow's tip is that far along the lamp. */
        const tall = 3.1 * r;
        const tipX = x + a * tall;
        const tipY = g.floorY + TILT * dz * tall;
        region = clampRegion(
          frame,
          Math.min(x - 1.45 * r, tipX - 1.1 * r),
          g.floorY - 0.5 * r,
          Math.max(x + 1.45 * r, tipX + 1.1 * r),
          Math.max(g.floorY + 0.55 * r, tipY + 0.5 * r),
        );
        if (!region) return;
        uniforms.uCastTip.value.set(tipX, tipY);
        /*
         * Her silhouette pushed along the lamp onto the floor, then pressed:
         *   X = x + LAMP_X·(y − floor)
         *   Y = floor − TILT·(z + LAMP_Z·(y − floor))
         *   Z = −z            (kept invertible, and her winding kept)
         */
        const t = TILT, f = floorWorld;
        projection.set(
          1, a, 0, -a * f,
          0, -t * dz, -t, f + t * dz * f,
          0, 0, -1, 0,
          0, 0, 0, 1,
        );
        passCamera.matrixWorldInverse.multiplyMatrices(camera.matrixWorldInverse, projection);
        passCamera.matrixWorld.copy(passCamera.matrixWorldInverse).invert();
        hideGlows();
        renderPass(frame, region, SHADOW_SCALE);
        restore();
        uniforms.uKind.value = 0;
      } else {
        region = clampRegion(frame, x - 1.7 * r, g.floorY, x + 1.7 * r, g.floorY + REFLECTION_REACH * r);
        if (!region) return;
        /* The camera mirrored in the floor sees her as the floor shows her,
           upside down about the screen's middle row; the region it is asked
           for is the mirror of the one drawn. */
        passCamera.position.set(camera.position.x, 2 * floorWorld - camera.position.y, camera.position.z);
        passCamera.quaternion.copy(camera.quaternion);
        passCamera.scale.set(1, 1, 1);
        passCamera.updateMatrix();
        passCamera.matrixWorld.copy(passCamera.matrix);
        passCamera.matrixWorldInverse.copy(passCamera.matrixWorld).invert();
        const mirrored = { x: region.x, y: frame.height - (region.y + region.h), w: region.w, h: region.h };
        renderPass(frame, mirrored, REFLECTION_SCALE);
        uniforms.uKind.value = 1;
      }

      renderer.getDrawingBufferSize(bufferSize);
      uniforms.uCanvasPx.value.copy(bufferSize);
      uniforms.uPixelRatio.value = bufferSize.x / frame.width;
      uniforms.uRect.value.set(region.x, region.y, region.w, region.h);
      uniforms.uRectNdc.value.set(
        (region.x / frame.width) * 2 - 1,
        1 - ((region.y + region.h) / frame.height) * 2,
        ((region.x + region.w) / frame.width) * 2 - 1,
        1 - (region.y / frame.height) * 2,
      );
      uniforms.uFloorY.value = g.floorY;
      uniforms.uAnchor.value.set(x, y, r);
      uniforms.uStrength.value = strength;
      uniforms.uLift.value = g.kind === "shadow" ? lift : 0;
      uniforms.uContact.value = g.contact === false ? 0 : 1;
      uniforms.uShadowInk.value.setHex(g.ink ?? 0x2e2418);
      uniforms.uTint.value.setHex(g.tint ?? 0xb8e8e5);
      uniforms.uShade.value = g.shade ?? 0.82;
      const clip = g.clip;
      if (clip) uniforms.uClip.value.set(clip.x, clip.y, clip.rx, clip.ry);
      else uniforms.uClip.value.set(0, 0, 0, 0);
      quad.visible = true;
    },

    dispose() {
      scene.remove(quad);
      quad.geometry.dispose();
      material.dispose();
      target.dispose();
    },
  };
}
