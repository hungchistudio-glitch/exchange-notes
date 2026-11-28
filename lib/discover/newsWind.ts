/* =========================================================
   The news arriving on a wind of its own letters (Chi, 2026-11-28: 吹來一陣
   充滿各種小小細微的文字風並組成現在的ui)

   While today's stories are on their way, a wind of tiny letters blows
   across the screen: the letters of the headlines themselves once they are
   known, and the scripts of all seven languages before. When the stories
   are on the page, every letter flies to where it is drawn in a headline or
   a summary and the page condenses out of them. The wind is the loading
   state, not decoration over it: it blows for as long as the request takes.

   This file is the physics and the drawing, on one canvas, with no React:
   components/discover/NewsWind.tsx decides when, and reveals the page.
   ========================================================= */

export type WindTarget = {
  x: number;
  y: number;
  char: string;
  /** The CSS font the letter is drawn in on the page, at its own size. */
  font: string;
  size: number;
  color: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  size: number;
  rot: number;
  spin: number;
  alpha: number;
  tint: number;
  /* Assembly: a quadratic path from where it was to where its letter is. */
  target: WindTarget | null;
  fromX: number;
  fromY: number;
  ctrlX: number;
  ctrlY: number;
  fromSize: number;
  fromRot: number;
  delay: number;
  /** Leaving: a letter with no place on the page fades as it blows away. */
  leaving: boolean;
  /** Landed and now fading where it is, under the page's own letter. */
  settled: boolean;
};

/** Before the headlines are known: every script the app teaches. */
export const SEED_GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúñçàèùâêôœ" +
  "あいうえおかきくけこさしすせそアイウエオカキクケコ가나다라마바사아자차카한국어" +
  "新聞今日世界語言字學讀寫日本台灣故事0123456789";

/** The letters worth blowing: no spaces, no punctuation, at most a few thousand. */
export function glyphPool(text: string): string[] {
  const letters = Array.from(text).filter((char) => /[\p{L}\p{N}]/u.test(char));
  return letters.length >= 24 ? letters.slice(0, 4000) : Array.from(SEED_GLYPHS);
}

const TAU = Math.PI * 2;

/**
 * The wind at a point: a steady push from the right with two slow swirls in
 * it, so the letters tumble rather than slide. Pure, for the tests.
 */
export function windAt(x: number, y: number, t: number, width: number, height: number) {
  const nx = x / Math.max(1, width);
  const ny = y / Math.max(1, height);
  const swirl = Math.sin(ny * 7.3 + t * 1.25) + 0.6 * Math.sin((nx + ny) * 11 - t * 1.9);
  return {
    vx: -380 - 140 * Math.cos(ny * 5.1 - t * 0.8) + 60 * swirl,
    vy: 150 * Math.sin(nx * 6.4 - t * 1.6) + 70 * swirl,
  };
}

function easeOutCubic(p: number) {
  return 1 - (1 - p) ** 3;
}

export type NewsWindOptions = {
  cosmic: boolean;
  /** How many letters the wind may carry at once. */
  budget: number;
  /** Today's letters, updated as the stories arrive. */
  glyphs: () => string[];
  random?: () => number;
};

export type NewsWind = {
  /** Starts (or keeps) the wind blowing. */
  blow(): void;
  /** Every letter to its place; resolves when the last has landed. */
  assemble(targets: WindTarget[], durationMs: number): Promise<void>;
  /** Blows what is left off the screen, fading; resolves when it is clear. */
  clear(durationMs?: number): Promise<void>;
  /** A ring where something landed (the logo's bounce). */
  ripple(x: number, y: number): void;
  /** One frame; the caller's loop calls it (testable without rAF). */
  step(now: number): void;
  dispose(): void;
  /** For the tests: how many letters are in the air. */
  count(): number;
};

/**
 * The wind on one canvas the size of the screen. Draws only when stepped.
 */
export function createNewsWind(canvas: HTMLCanvasElement, options: NewsWindOptions): NewsWind {
  const random = options.random ?? Math.random;
  const context = canvas.getContext("2d");
  const particles: Particle[] = [];
  const ripples: Array<{ x: number; y: number; born: number }> = [];
  let width = 0;
  let height = 0;
  let ratio = 1;
  let last = 0;
  let clock = 0;
  let blowing = false;
  let spawnDebt = 0;
  let assembly: { start: number; duration: number; done: () => void } | null = null;
  let clearing: { start: number; duration: number; done: () => void } | null = null;

  const measure = () => {
    ratio = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
    width = canvas.clientWidth || (typeof window === "undefined" ? 0 : window.innerWidth);
    height = canvas.clientHeight || (typeof window === "undefined" ? 0 : window.innerHeight);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  };
  measure();

  const pick = () => {
    const pool = options.glyphs();
    return pool[Math.floor(random() * pool.length)] ?? "a";
  };

  const spawn = (atRightEdge = true): Particle => ({
    x: atRightEdge ? width + 10 + random() * 80 : random() * width,
    y: random() * height * 1.1 - height * 0.05,
    vx: -(260 + random() * 360),
    vy: (random() - 0.5) * 80,
    char: pick(),
    size: 6 + random() * 7,
    rot: random() * TAU,
    spin: (random() - 0.5) * 6,
    alpha: 0.22 + random() * 0.6,
    tint: random(),
    target: null,
    fromX: 0,
    fromY: 0,
    ctrlX: 0,
    ctrlY: 0,
    fromSize: 0,
    fromRot: 0,
    delay: 0,
    leaving: false,
    settled: false,
  });

  const ink = (tint: number, alpha: number) => {
    if (options.cosmic) return tint < 0.18 ? `rgba(126, 214, 255, ${alpha})` : `rgba(184, 232, 229, ${alpha})`;
    return tint < 0.16 ? `rgba(176, 120, 38, ${alpha})` : `rgba(28, 25, 20, ${alpha})`;
  };

  const draw = (now: number) => {
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    if (options.cosmic) context.globalCompositeOperation = "lighter";
    let font = "";
    for (const particle of particles) {
      if (particle.alpha <= 0.01) continue;
      const landedFont = particle.target && (!particle.leaving || particle.settled) ? particle.target.font : "";
      /* In the wind every letter is one face, scaled; on its way home it
         takes the page's face at the page's size. */
      const wanted = landedFont || `600 20px ui-sans-serif, system-ui, sans-serif`;
      if (wanted !== font) {
        context.font = wanted;
        font = wanted;
      }
      const base = landedFont ? particle.target!.size : 20;
      const scale = (particle.size / base) * ratio;
      const cos = Math.cos(particle.rot) * scale;
      const sin = Math.sin(particle.rot) * scale;
      context.setTransform(cos, sin, -sin, cos, particle.x * ratio, particle.y * ratio);
      context.fillStyle = particle.target && (!particle.leaving || particle.settled) && particle.char === particle.target.char
        ? particle.target.color
        : ink(particle.tint, 1);
      context.globalAlpha = particle.alpha;
      context.fillText(particle.char, 0, 0);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const age = (now - ripples[i].born) / 700;
      if (age >= 1) { ripples.splice(i, 1); continue; }
      // A ring on the floor it landed on: wide and flat, as a puddle's is.
      const radius = 12 + age * 44;
      context.beginPath();
      context.ellipse(ripples[i].x, ripples[i].y, radius, radius * 0.3, 0, 0, TAU);
      context.strokeStyle = ink(options.cosmic ? 0.1 : 0.1, 0.55 * (1 - age));
      context.lineWidth = 1.5 * (1 - age) + 0.5;
      context.stroke();
    }
  };

  const step = (now: number) => {
    const dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 1 / 60;
    last = now;
    clock += dt;

    if (blowing && !assembly && !clearing) {
      // Keep the air full: new letters come in at the right as old ones leave.
      spawnDebt += options.budget * 0.9 * dt;
      while (spawnDebt >= 1 && particles.length < options.budget) {
        particles.push(spawn());
        spawnDebt -= 1;
      }
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      if (particle.settled) {
        // The page's letter is under it now: it only fades.
        particle.alpha -= dt * 4.5;
        if (particle.alpha <= 0) particles.splice(i, 1);
        continue;
      }
      if (particle.target && !particle.leaving && assembly) {
        const p = Math.min(1, Math.max(0, (now - assembly.start - particle.delay) / (assembly.duration * 0.62)));
        const e = easeOutCubic(p);
        const a = (1 - e) * (1 - e);
        const b = 2 * (1 - e) * e;
        const c = e * e;
        particle.x = a * particle.fromX + b * particle.ctrlX + c * particle.target.x;
        particle.y = a * particle.fromY + b * particle.ctrlY + c * particle.target.y;
        particle.rot = particle.fromRot * (1 - e);
        particle.size = particle.fromSize + (particle.target.size - particle.fromSize) * e;
        particle.alpha = Math.min(1, particle.alpha + dt * 3);
        if (p > 0.55) particle.char = particle.target.char;
        continue;
      }
      const wind = windAt(particle.x, particle.y, clock, width, height);
      particle.vx += (wind.vx - particle.vx) * Math.min(1, dt * 2.2);
      particle.vy += (wind.vy - particle.vy) * Math.min(1, dt * 2.2);
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rot += particle.spin * dt;
      if (particle.leaving || clearing) particle.alpha -= dt * 2.4;
      const gone = particle.x < -60 || particle.alpha <= 0;
      if (gone) {
        if (blowing && !assembly && !clearing && !particle.leaving) {
          particles[i] = spawn();
        } else {
          particles.splice(i, 1);
        }
      }
    }

    draw(now);

    if (assembly && now - assembly.start >= assembly.duration) {
      const done = assembly.done;
      assembly = null;
      done();
    }
    if (clearing && (particles.length === 0 || now - clearing.start >= clearing.duration)) {
      particles.length = 0;
      const done = clearing.done;
      clearing = null;
      draw(now);
      done();
    }
  };

  return {
    blow() {
      if (!blowing) {
        blowing = true;
        // Not an empty sky to start with: the first breath is already in the air.
        const first = Math.floor(options.budget * 0.35);
        for (let i = 0; i < first && particles.length < options.budget; i += 1) {
          const particle = spawn(false);
          particle.x = width * (0.45 + random() * 0.7);
          particles.push(particle);
        }
      }
    },

    assemble(targets, durationMs) {
      blowing = false;
      const now = last || (typeof performance === "undefined" ? 0 : performance.now());
      // Short paths: letters high on the screen go to places high on the page.
      const free = particles.filter((particle) => !particle.leaving).sort((a, b) => a.y - b.y);
      const places = [...targets].sort((a, b) => a.y - b.y);
      places.forEach((target, index) => {
        let particle = free[Math.floor((index / places.length) * free.length)];
        if (!particle || particle.target) {
          particle = spawn();
          particles.push(particle);
        }
        particle.target = target;
        particle.fromX = particle.x;
        particle.fromY = particle.y;
        particle.fromSize = particle.size;
        particle.fromRot = particle.rot;
        // The curve swings through the wind before it settles: up and round.
        const midX = (particle.x + target.x) / 2;
        const midY = (particle.y + target.y) / 2;
        particle.ctrlX = midX + (random() - 0.2) * Math.min(220, width * 0.35);
        particle.ctrlY = midY - (60 + random() * 160);
        // Left to right, as a line is read, with a little scatter.
        particle.delay = (target.x / Math.max(1, width)) * durationMs * 0.28 + random() * durationMs * 0.08;
      });
      for (const particle of particles) if (!particle.target) particle.leaving = true;
      return new Promise<void>((resolve) => {
        assembly = { start: now, duration: durationMs, done: resolve };
      });
    },

    clear(durationMs = 420) {
      blowing = false;
      const now = last || (typeof performance === "undefined" ? 0 : performance.now());
      for (const particle of particles) {
        // A letter that has landed fades where it is; the rest blow away.
        if (particle.target && !particle.leaving) {
          particle.settled = true;
          particle.x = particle.target.x;
          particle.y = particle.target.y;
          particle.rot = 0;
          particle.size = particle.target.size;
          particle.char = particle.target.char;
        } else particle.leaving = true;
      }
      return new Promise<void>((resolve) => {
        clearing = { start: now, duration: durationMs, done: resolve };
      });
    },

    ripple(x, y) {
      ripples.push({ x, y, born: last || 0 });
    },

    step,

    dispose() {
      particles.length = 0;
      ripples.length = 0;
      assembly?.done();
      clearing?.done();
      assembly = null;
      clearing = null;
      context?.clearRect(0, 0, canvas.width, canvas.height);
    },

    count: () => particles.length,
  };
}

/* ---------------------------------------------------------------
   Where the letters go: every letter of the page's text in view
   --------------------------------------------------------------- */

/**
 * The places on screen of the letters in `elements`, one target each, at
 * most `budget` of them spread evenly through the text. Read while the page
 * is laid out but not yet shown (opacity does not change layout).
 */
export function letterTargets(elements: readonly HTMLElement[], budget: number, viewportHeight: number): WindTarget[] {
  type Found = { node: Text; index: number; char: string; element: HTMLElement };
  const found: Found[] = [];
  for (const element of elements) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const text = node.data;
      for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (/\s/.test(char)) continue;
        // A surrogate pair is one letter: take it whole.
        const code = text.codePointAt(index) ?? 0;
        const whole = code > 0xffff ? text.slice(index, index + 2) : char;
        found.push({ node, index, char: whole, element });
        if (code > 0xffff) index += 1;
      }
    }
  }
  if (found.length === 0) return [];
  const every = Math.max(1, found.length / Math.max(1, budget));
  const range = document.createRange();
  const styles = new Map<HTMLElement, { font: string; size: number; color: string }>();
  /* The box a letter can be seen in: the nearest block around it that
     clips (a line clamp, an ellipsis, overflow hidden). The text's own
     inline box runs on past the clamp, so it is not the one to ask. A
     letter past that box is not drawn, and gets no place. */
  const clips = new Map<HTMLElement, DOMRect>();
  const clipOf = (element: HTMLElement) => {
    let clip = clips.get(element);
    if (clip) return clip;
    let node: HTMLElement | null = element;
    for (let depth = 0; node && depth < 5 && !clip; depth += 1, node = node.parentElement) {
      const computed = getComputedStyle(node);
      const clamp = computed.getPropertyValue("-webkit-line-clamp");
      if (computed.overflowY !== "visible" || computed.overflowX !== "visible" || (clamp && clamp !== "none")) {
        clip = node.getBoundingClientRect();
      }
    }
    clip ??= element.getBoundingClientRect();
    clips.set(element, clip);
    return clip;
  };
  const targets: WindTarget[] = [];
  for (let i = 0; i < found.length && targets.length < budget; i += every) {
    const letter = found[Math.floor(i)];
    range.setStart(letter.node, letter.index);
    range.setEnd(letter.node, letter.index + letter.char.length);
    const rect = range.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.bottom < 0 || rect.top > viewportHeight) continue;
    const clip = clipOf(letter.element);
    const midY = rect.top + rect.height / 2;
    if (midY > clip.bottom || midY < clip.top || rect.left + rect.width / 2 > clip.right) continue;
    const parent = letter.node.parentElement ?? letter.element;
    let style = styles.get(parent);
    if (!style) {
      const computed = getComputedStyle(parent);
      const size = parseFloat(computed.fontSize) || 16;
      style = {
        font: `${computed.fontStyle === "italic" ? "italic " : ""}${computed.fontWeight} ${size}px ${computed.fontFamily}`,
        size,
        color: computed.color,
      };
      styles.set(parent, style);
    }
    // A letter's baseline is about four fifths of the way down its line box.
    targets.push({ x: rect.left, y: rect.top + rect.height * 0.8, char: letter.char, ...style });
  }
  return targets;
}
