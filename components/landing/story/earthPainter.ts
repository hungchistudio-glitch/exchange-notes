/* =========================================================
   The one Earth, painted each frame at the screen's own resolution

   It used to be a stack of CSS layers: a disc 175% of the screen's width,
   two strips of continents and clouds twice as wide again sliding across
   it, a shade, an atmosphere ring with a blur a third of the screen wide,
   and the sunrise flare. The descent zooms all of that about four times
   over (and Station 33's dive behind it, 3.2 times more), so the browser
   had to rasterise layers far larger than the screen and could not keep
   up: on a Mac's Chrome and an iPhone the continents flickered and went
   missing mid-zoom, the edge stepped, and the dark gradients banded (Chi,
   2026-11-13).

   Drawn here instead, every frame, into a canvas the size of the screen,
   with the same clock: the planet's and the station's own Web Animations
   still run (on invisible layers that paint nothing), and the projector
   reads where they put the planet and hands it to `draw`. Nothing is ever
   a small picture blown up, so it is sharp at every size, and nothing is
   waiting to be rasterised, so nothing goes missing.

   Clearer than the CSS planet (Chi chose it with the fix): continents
   with coastlines, wrapped round the globe rather than sliding across a
   flat disc, clouds drifting faster than the land, and city lights coming
   up on the night side. As the descent nears the end, sunrise light runs
   along the rim and a pale blue air comes up over the frame.
   ========================================================= */

/** [x, y, half-width, half-height] in percent of one turn, a tone, and how soft. */
export type Blob = [x: number, y: number, rx: number, ry: number, tone: string, fade?: number];

export type EarthFrame = {
  /** The screen, in CSS pixels. */
  width: number;
  height: number;
  /** The planet's box: its side, in CSS pixels before any transform. */
  size: number;
  /** From the planet's own box to the screen, in CSS pixels. */
  matrix: DOMMatrix;
  /** The planet's and its window's opacity, multiplied. */
  opacity: number;
  /** The sunrise flare's opacity (its own track). */
  flare: number;
  /** The film's clock, for the turning of the land and the clouds. */
  time: number;
  /** 0..1: the sunrise along the rim and the air over the frame. */
  air: number;
};

const TAU = Math.PI * 2;
const LAND_TURN_MS = 90_000;
const CLOUD_TURN_MS = 54_000;

/** A small, fixed pseudo-random sequence, so every frame draws the same world. */
function seeded(seed: number) {
  let state = seed * 9301 + 49297;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

type Shape = {
  /** Outline points around the blob's centre, as fractions of its half-axes. */
  outline: Array<[number, number]>;
  /** City lights inside it, as fractions of its half-axes. */
  lights: Array<[number, number]>;
};

/** A coastline: an ellipse whose radius wanders, the same every time. */
function shapeFor(index: number, rough: number, lights: number): Shape {
  const random = seeded(index + 7);
  const phases = [random() * TAU, random() * TAU, random() * TAU];
  const outline: Array<[number, number]> = [];
  const points = 36;
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * TAU;
    const wander =
      1 +
      rough * (0.16 * Math.sin(3 * angle + phases[0]) + 0.09 * Math.sin(5 * angle + phases[1]) + 0.05 * Math.sin(9 * angle + phases[2]));
    outline.push([Math.cos(angle) * wander, Math.sin(angle) * wander]);
  }
  const glows: Array<[number, number]> = [];
  for (let i = 0; i < lights; i += 1) {
    const angle = random() * TAU;
    const distance = Math.sqrt(random()) * 0.72;
    glows.push([Math.cos(angle) * distance, Math.sin(angle) * distance]);
  }
  return { outline, lights: glows };
}

/** Shade's darkness (0..1) at a point of the planet's box, as the CSS shade drew it. */
function darknessAt(x: number, y: number, size: number) {
  const distance = Math.hypot(x - 0.28 * size, y - 0.24 * size) / (1.0469 * size);
  const stops: Array<[number, number]> = [[0, 0], [0.34, 0], [0.58, 0.42], [0.82, 0.9], [1, 0.96]];
  for (let i = 1; i < stops.length; i += 1) {
    const [at, value] = stops[i];
    if (distance <= at) {
      const [from, start] = stops[i - 1];
      return start + ((value - start) * (distance - from)) / (at - from);
    }
  }
  return 0.96;
}

export function createEarthPainter(canvas: HTMLCanvasElement, land: Blob[], clouds: Blob[]) {
  const context = canvas.getContext("2d", { alpha: true });
  const landShapes = land.map((_, index) => shapeFor(index, 1, 9));
  const cloudShapes = clouds.map((_, index) => shapeFor(index + 40, 0.6, 0));
  let pixelRatio = 1;
  let cleared = true;

  function resize(width: number, height: number, ratio: number) {
    pixelRatio = ratio;
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      cleared = true;
    }
  }

  function clear() {
    if (!context || cleared) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    cleared = true;
  }

  /**
   * A point of the flat map (u across one turn, v down it, in the box's
   * pixels) on the globe: the face shows half a turn, crowded toward the
   * limb as a sphere is, and narrower toward the poles.
   */
  function onGlobe(u: number, v: number, size: number): [number, number] {
    const radius = size / 2;
    const across = Math.min(1, Math.max(0, u / size));
    const halfWidth = Math.sqrt(Math.max(0, radius * radius - (v - radius) ** 2));
    return [radius - halfWidth * Math.cos(Math.PI * across), v];
  }

  /** Each copy of a blob that crosses the face, after the map has turned by `shift`. */
  function placements(x: number, rx: number, shift: number, size: number) {
    const centre = ((((x / 100) * size - shift) % size) + size) % size;
    const half = (rx / 100) * size;
    return [centre - size, centre, centre + size].filter(u => u + half > 0 && u - half < size);
  }

  function traceShape(shape: Shape, u: number, v: number, rx: number, ry: number, size: number) {
    if (!context) return;
    context.beginPath();
    shape.outline.forEach(([dx, dy], index) => {
      const [x, y] = onGlobe(u + dx * rx, v + dy * ry, size);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
  }

  function draw(frame: EarthFrame) {
    if (!context) return;
    const { width, height, size, matrix, time } = frame;
    const opacity = Math.max(0, Math.min(1, frame.opacity));
    if (opacity < 0.002 || size <= 0) {
      clear();
      return;
    }
    cleared = false;

    const radius = size / 2;
    const scale = Math.hypot(matrix.a, matrix.b) || 1;
    /* One device pixel, in the planet's own units: for hairlines and lights. */
    const pixel = 1 / (scale * pixelRatio);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(
      matrix.a * pixelRatio, matrix.b * pixelRatio,
      matrix.c * pixelRatio, matrix.d * pixelRatio,
      matrix.e * pixelRatio, matrix.f * pixelRatio,
    );
    context.globalAlpha = opacity;

    // ---- the air's glow round it (the CSS box-shadow: a third of the screen wide)
    const glowReach = 0.33 * width;
    const airRadius = 0.55 * size;
    /* Off screen once the globe fills the frame: every corner of the screen
       inside the disc. Skipped then, as the largest fill of the frame. */
    const inverse = matrix.inverse();
    const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) =>
      inverse.transformPoint(new DOMPoint(x, y)),
    );
    const covered = corners.every(point => Math.hypot(point.x - radius, point.y - radius) < radius * 0.98);
    if (!covered) {
    const glow = context.createRadialGradient(radius, radius, airRadius, radius, radius, airRadius + glowReach);
    glow.addColorStop(0, "rgba(79, 176, 255, 0.11)");
    glow.addColorStop(0.25, "rgba(79, 176, 255, 0.06)");
    glow.addColorStop(0.6, "rgba(79, 176, 255, 0.015)");
    glow.addColorStop(1, "rgba(79, 176, 255, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(radius, radius, airRadius + glowReach, 0, TAU);
    context.arc(radius, radius, airRadius, 0, TAU, true);
    context.fill();
    }

    // ---- the globe itself, clipped to its disc
    context.save();
    context.beginPath();
    context.arc(radius, radius, radius, 0, TAU);
    context.clip();

    const sea = context.createRadialGradient(0.34 * size, 0.3 * size, 0, 0.34 * size, 0.3 * size, 0.962 * size);
    sea.addColorStop(0, "#8fd0f2");
    sea.addColorStop(0.26, "#3b8fcc");
    sea.addColorStop(0.52, "#1c5d98");
    sea.addColorStop(0.76, "#0f3a66");
    sea.addColorStop(1, "#0a2747");
    context.fillStyle = sea;
    context.fillRect(0, 0, size, size);

    // Land, with its coasts.
    const landShift = (time / LAND_TURN_MS) * size;
    context.lineJoin = "round";
    land.forEach(([x, y, rx, ry, tone], index) => {
      const v = (y / 100) * size;
      const halfX = (rx / 100) * size;
      const halfY = (ry / 100) * size;
      for (const u of placements(x, rx, landShift, size)) {
        traceShape(landShapes[index], u, v, halfX, halfY, size);
        // Shallow water round the coast, then the land, lighter inland.
        context.globalAlpha = opacity * 0.22;
        context.lineWidth = Math.max(pixel * 3, size * 0.012);
        context.strokeStyle = "#9fe3f0";
        context.stroke();
        const [cx] = onGlobe(u, v, size);
        const inland = context.createRadialGradient(cx, v, 0, cx, v, Math.max(halfX, halfY) * 1.2);
        inland.addColorStop(0, tone === "#e9f1f4" ? "#ffffff" : "#a9c27c");
        inland.addColorStop(1, tone);
        context.globalAlpha = opacity * 0.74;
        context.fillStyle = inland;
        context.fill();
        context.globalAlpha = opacity * 0.28;
        context.lineWidth = Math.max(pixel * 1.1, size * 0.0014);
        context.strokeStyle = "rgba(18, 46, 32, 0.9)";
        context.stroke();
      }
    });

    // Clouds, turning faster than the land.
    const cloudShift = (time / CLOUD_TURN_MS) * size;
    clouds.forEach(([x, y, rx, ry, tone], index) => {
      const v = (y / 100) * size;
      const halfX = (rx / 100) * size;
      const halfY = (ry / 100) * size;
      for (const u of placements(x, rx, cloudShift, size)) {
        const [cx] = onGlobe(u, v, size);
        const soft = context.createRadialGradient(cx, v, 0, cx, v, Math.max(halfX, halfY) * 1.1);
        soft.addColorStop(0, tone);
        soft.addColorStop(0.55, tone);
        soft.addColorStop(1, "rgba(255, 255, 255, 0)");
        traceShape(cloudShapes[index], u, v, halfX, halfY, size);
        context.globalAlpha = opacity * 0.72;
        context.fillStyle = soft;
        context.fill();
      }
    });

    // The night side.
    context.globalAlpha = opacity;
    const shade = context.createRadialGradient(0.28 * size, 0.24 * size, 0, 0.28 * size, 0.24 * size, 1.0469 * size);
    shade.addColorStop(0, "rgba(3, 8, 20, 0)");
    shade.addColorStop(0.34, "rgba(3, 8, 20, 0)");
    shade.addColorStop(0.58, "rgba(3, 8, 20, 0.42)");
    shade.addColorStop(0.82, "rgba(2, 5, 12, 0.9)");
    shade.addColorStop(1, "rgba(2, 5, 12, 0.96)");
    context.fillStyle = shade;
    context.fillRect(0, 0, size, size);

    // City lights, where the land has gone into the night: one path per
    // step of brightness, rather than a draw for every light.
    context.globalCompositeOperation = "lighter";
    context.fillStyle = "#ffd58a";
    const lightRadius = Math.max(pixel * 0.9, size * 0.0028);
    const steps: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const used = [false, false, false, false];
    land.forEach(([x, y, rx, ry, tone], index) => {
      if (tone === "#e9f1f4") return; // no one lives on the ice
      const v = (y / 100) * size;
      const halfX = (rx / 100) * size;
      const halfY = (ry / 100) * size;
      for (const u of placements(x, rx, landShift, size)) {
        for (const [dx, dy] of landShapes[index].lights) {
          const [px, py] = onGlobe(u + dx * halfX, v + dy * halfY, size);
          const night = (darknessAt(px, py, size) - 0.5) / 0.4;
          if (night <= 0) continue;
          const step = Math.min(3, Math.floor(Math.min(1, night) * 4));
          steps[step].moveTo(px + lightRadius, py);
          steps[step].arc(px, py, lightRadius, 0, TAU);
          used[step] = true;
        }
      }
    });
    steps.forEach((path, step) => {
      if (!used[step]) return;
      context.globalAlpha = opacity * 0.85 * ((step + 1) / 4);
      context.fill(path);
    });
    context.globalCompositeOperation = "source-over";

    context.restore();

    // ---- its rim of air (the CSS ring: 89% to 100% of a circle 110% of the globe)
    context.globalAlpha = opacity;
    const ring = context.createRadialGradient(radius, radius, 0, radius, radius, airRadius);
    ring.addColorStop(0.89, "rgba(140, 210, 255, 0)");
    ring.addColorStop(0.93, "rgba(140, 210, 255, 0.55)");
    ring.addColorStop(0.97, "rgba(140, 210, 255, 0.14)");
    ring.addColorStop(1, "rgba(140, 210, 255, 0)");
    context.fillStyle = ring;
    context.beginPath();
    context.arc(radius, radius, airRadius, 0, TAU);
    context.fill();

    // ---- sunrise along the rim, as the descent nears its end
    if (frame.air > 0.001) {
      const towardSun = Math.atan2(0.24 - 0.5, 0.28 - 0.5);
      const sx = radius + Math.cos(towardSun) * radius;
      const sy = radius + Math.sin(towardSun) * radius;
      context.save();
      context.beginPath();
      context.arc(radius, radius, radius * 1.045, 0, TAU);
      context.arc(radius, radius, radius * 0.978, 0, TAU, true);
      context.clip("evenodd");
      context.globalCompositeOperation = "lighter";
      context.globalAlpha = opacity * frame.air * 0.8;
      const dawn = context.createRadialGradient(sx, sy, 0, sx, sy, radius * 0.95);
      dawn.addColorStop(0, "rgba(255, 236, 196, 0.7)");
      dawn.addColorStop(0.3, "rgba(255, 206, 150, 0.26)");
      dawn.addColorStop(1, "rgba(255, 206, 150, 0)");
      context.fillStyle = dawn;
      context.fillRect(-radius, -radius, size * 2, size * 2);
      context.restore();
    }

    // ---- the flare: a glint on the rim and the lens's long streak
    if (frame.flare > 0.001) {
      context.globalAlpha = opacity * frame.flare;
      const glint = context.createRadialGradient(0.17 * size, 0.19 * size, 0, 0.17 * size, 0.19 * size, 0.23 * size);
      glint.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      glint.addColorStop(0.06, "rgba(255, 255, 255, 0.95)");
      glint.addColorStop(0.18, "rgba(255, 228, 180, 0.6)");
      glint.addColorStop(0.48, "rgba(255, 201, 107, 0.18)");
      glint.addColorStop(1, "rgba(255, 201, 107, 0)");
      context.fillStyle = glint;
      context.beginPath();
      context.arc(0.17 * size, 0.19 * size, 0.23 * size, 0, TAU);
      context.fill();
      const streakTop = 0.184 * size;
      const streakHeight = Math.max(0.012 * size, 2 / scale);
      const streak = context.createLinearGradient(-1.43 * size, 0, 1.77 * size, 0);
      streak.addColorStop(0, "rgba(159, 220, 255, 0)");
      streak.addColorStop(0.28, "rgba(159, 220, 255, 0.12)");
      streak.addColorStop(0.5, "rgba(214, 238, 255, 0.75)");
      streak.addColorStop(0.72, "rgba(159, 220, 255, 0.12)");
      streak.addColorStop(1, "rgba(159, 220, 255, 0)");
      context.fillStyle = streak;
      context.fillRect(-1.43 * size, streakTop, 3.2 * size, streakHeight);
    }

    // ---- the air coming up over the whole frame
    if (frame.air > 0.001) {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.globalAlpha = frame.air * opacity;
      const veil = context.createLinearGradient(0, height, 0, height * 0.35);
      veil.addColorStop(0, "rgba(150, 214, 255, 0.2)");
      veil.addColorStop(1, "rgba(150, 214, 255, 0)");
      context.fillStyle = veil;
      context.fillRect(0, 0, width, height);
    }
    context.globalAlpha = 1;
  }

  return { resize, draw, clear };
}

export type EarthPainter = {
  resize(width: number, height: number, ratio: number): void;
  draw(frame: EarthFrame): void;
  clear(): void;
};
