import * as THREE from "three";

import { paint, seeded, SHELL_REPEAT, type Rand, type ShellFinish } from "./outfitKit";

/* =========================================================
   Station 33 · Collection 04 — the 24 shell finishes

   Twelve Orbital Atelier finishes from world crafts (sashiko, rammed earth,
   raku, mother-of-pearl, lacquer …) and twelve Deep Space finishes from
   the planets and the original worlds. Each differs in how it takes light
   — roughness, metal, clearcoat, sheen, iridescence — and in a painted
   texture, never in base colour alone. In vivid colour (Chi, 2026-10-20).

   Textures are painted once per finish change on a 512×256 canvas, seeded
   so a finish always looks the same. Where part of a finish is metal and
   part is not (gold leaf on lacquer, copper veins in glaze), `surface`
   paints roughness into green and metalness into blue, the way three.js
   reads them; applyShellFinish (outfit.ts) sets and resets every field.
   ========================================================= */

type Draw = (ctx: CanvasRenderingContext2D, rand: Rand, w: number, h: number) => void;

const texture = (seed: number, draw: Draw) => () => paint(512, 256, seed, draw, SHELL_REPEAT);

/**
 * A roughness/metalness map: green is roughness, blue is metalness. The
 * same size as the colour map, and its metal drawn from its own seeded
 * random (metalLayer) in both, so the two line up exactly.
 */
const surface = (seed: number, draw: Draw) => () => {
  const map = paint(512, 256, seed, draw, SHELL_REPEAT);
  map.colorSpace = THREE.NoColorSpace;
  return map;
};

function fill(ctx: CanvasRenderingContext2D, colour: string, w: number, h: number) {
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
}

function speckle(ctx: CanvasRenderingContext2D, rand: Rand, w: number, h: number, colours: string[], count: number, size: [number, number]) {
  for (let index = 0; index < count; index += 1) {
    ctx.fillStyle = colours[index % colours.length];
    ctx.globalAlpha = 0.35 + rand() * 0.5;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, size[0] + rand() * (size[1] - size[0]), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function bands(ctx: CanvasRenderingContext2D, rand: Rand, w: number, h: number, colours: string[], wobble: number) {
  const step = h / colours.length;
  colours.forEach((colour, index) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, index * step);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, index * step + Math.sin(x / 60 + index) * wobble + rand() * 3);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  });
}

/** Gold-leaf flakes from their own seed, so colour and metal maps agree. */
function flakes(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, colours: string[]) {
  const rand = seeded(seed);
  for (let index = 0; index < 90; index += 1) {
    ctx.fillStyle = colours[index % colours.length];
    ctx.beginPath();
    const x = rand() * w;
    const y = rand() * h;
    ctx.moveTo(x, y);
    for (let corner = 0; corner < 5; corner += 1) ctx.lineTo(x + (rand() - 0.5) * 22, y + (rand() - 0.5) * 22);
    ctx.closePath();
    ctx.fill();
  }
}

function veins(ctx: CanvasRenderingContext2D, rand: Rand, w: number, h: number, colour: string, count: number, width: number) {
  ctx.strokeStyle = colour;
  ctx.lineCap = "round";
  for (let index = 0; index < count; index += 1) {
    let x = rand() * w;
    let y = rand() * h;
    ctx.lineWidth = width * (0.5 + rand());
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let step = 0; step < 8; step += 1) {
      x += rand() * 60 - 20;
      y += rand() * 40 - 20;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export const COLLECTION04_FINISHES: Record<string, ShellFinish> = {
  /* ── Orbital Atelier ── */

  /** Deep indigo cloth, white running stitch in a diamond lattice; sheen, no gloss. */
  "s33v4-orbital-sashiko": {
    color: 0xffffff, metalness: 0, roughness: 0.86, sheen: 0.6, sheenColor: 0x6f8dff, sheenRoughness: 0.75,
    map: texture(34001, (ctx, _rand, w, h) => {
      fill(ctx, "#1f3fb0", w, h);
      ctx.strokeStyle = "#f8fbff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      for (let x = -h; x < w + h; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - h, h); ctx.stroke();
      }
    }),
  },

  /** Rammed earth: sand, ochre and terracotta strata, rough with soft edges. */
  "s33v4-orbital-rammed-earth": {
    color: 0xffffff, metalness: 0, roughness: 0.92,
    map: texture(34002, (ctx, rand, w, h) => {
      bands(ctx, rand, w, h, ["#f6c56b", "#e5752a", "#ffd9a0", "#c84b1c", "#f6b400", "#e5752a", "#ffe6b8"], 4);
      speckle(ctx, rand, w, h, ["#8a3a10", "#fff1d6"], 900, [0.6, 1.6]);
    }),
  },

  /** Cork: warm granules, low reflection. */
  "s33v4-orbital-cork": {
    color: 0xffffff, metalness: 0, roughness: 0.95,
    map: texture(34003, (ctx, rand, w, h) => {
      fill(ctx, "#d9893a", w, h);
      speckle(ctx, rand, w, h, ["#a3541c", "#f6b45a", "#7a3a12", "#ffcc80"], 2600, [0.8, 3.2]);
    }),
  },

  /** Raku: smoke black with copper flashes and fine crackle; iridescent. */
  "s33v4-orbital-raku": {
    color: 0xffffff, metalness: 0.25, roughness: 0.35, clearcoat: 0.6, iridescence: 0.7,
    map: texture(34004, (ctx, rand, w, h) => {
      fill(ctx, "#15161c", w, h);
      for (let index = 0; index < 14; index += 1) {
        const gradient = ctx.createRadialGradient(rand() * w, rand() * h, 2, rand() * w, rand() * h, 60 + rand() * 60);
        gradient.addColorStop(0, "rgba(255,120,40,.85)");
        gradient.addColorStop(0.5, "rgba(214,47,124,.45)");
        gradient.addColorStop(1, "rgba(31,79,216,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }
      veins(ctx, rand, w, h, "rgba(255,241,214,.35)", 40, 0.8);
    }),
  },

  /** Mother-of-pearl: moon-white shards set in dark seams, strongly iridescent. */
  "s33v4-orbital-motherpearl": {
    color: 0xffffff, metalness: 0.1, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1,
    map: texture(34005, (ctx, rand, w, h) => {
      fill(ctx, "#101320", w, h);
      const tints = ["#f8fbff", "#d6f3ff", "#ffe3f0", "#e8ffef", "#fff6d6"];
      for (let index = 0; index < 120; index += 1) {
        ctx.fillStyle = tints[index % tints.length];
        const x = rand() * w;
        const y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let corner = 0; corner < 4; corner += 1) ctx.lineTo(x + (rand() - 0.3) * 34, y + (rand() - 0.3) * 30);
        ctx.closePath();
        ctx.fill();
      }
    }),
  },

  /** Hand-hammered honey brass: facets in the surface, soft gold reflection. */
  "s33v4-orbital-hammered-brass": {
    color: 0xffc35a, metalness: 1, roughness: 1,
    map: texture(34006, (ctx, rand, w, h) => {
      fill(ctx, "#ffd27a", w, h);
      speckle(ctx, rand, w, h, ["#e09a2a", "#fff1c2"], 500, [5, 12]);
    }),
    surface: surface(34006, (ctx, rand, w, h) => {
      fill(ctx, "rgb(0,90,255)", w, h);
      for (let index = 0; index < 260; index += 1) {
        const v = Math.round(40 + rand() * 120);
        ctx.fillStyle = `rgb(0,${v},255)`;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, 3 + rand() * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }),
  },

  /** Glacier granite: ice grey with white, graphite and blue grains. */
  "s33v4-orbital-glacier-granite": {
    color: 0xffffff, metalness: 0.05, roughness: 0.45, clearcoat: 0.4,
    map: texture(34007, (ctx, rand, w, h) => {
      fill(ctx, "#b9dcf2", w, h);
      speckle(ctx, rand, w, h, ["#f8fbff", "#2a3140", "#22b2f0", "#7fa8c8"], 3000, [0.8, 2.6]);
    }),
  },

  /** Olive wood: honey grain sweeping along the C. */
  "s33v4-orbital-olivewood": {
    color: 0xffffff, metalness: 0, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2,
    map: texture(34008, (ctx, rand, w, h) => {
      fill(ctx, "#f2b45a", w, h);
      for (let index = 0; index < 40; index += 1) {
        ctx.strokeStyle = index % 3 ? "rgba(160,82,22,.55)" : "rgba(255,230,170,.6)";
        ctx.lineWidth = 1.5 + rand() * 3;
        const y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.3, y + rand() * 60 - 30, w * 0.6, y + rand() * 60 - 30, w, y + rand() * 20 - 10);
        ctx.stroke();
      }
    }),
  },

  /** Salt flat crystal: milky white, small square crystals, a pink sheen. */
  "s33v4-orbital-salt-crystal": {
    color: 0xffffff, metalness: 0, roughness: 0.3, clearcoat: 0.7, sheen: 0.5, sheenColor: 0xff8fb1, sheenRoughness: 0.4,
    map: texture(34009, (ctx, rand, w, h) => {
      fill(ctx, "#fff4f7", w, h);
      for (let index = 0; index < 400; index += 1) {
        ctx.fillStyle = rand() > 0.5 ? "rgba(255,143,177,.35)" : "rgba(214,243,255,.6)";
        const size = 3 + rand() * 7;
        ctx.fillRect(rand() * w, rand() * h, size, size);
      }
    }),
  },

  /** Moss felt: deep and bright green fibres, a soft matte sheen. */
  "s33v4-orbital-moss-felt": {
    color: 0xffffff, metalness: 0, roughness: 0.95, sheen: 0.8, sheenColor: 0xb7ea3c, sheenRoughness: 0.8,
    map: texture(34010, (ctx, rand, w, h) => {
      fill(ctx, "#0d9b57", w, h);
      for (let index = 0; index < 5000; index += 1) {
        ctx.fillStyle = ["#0b6e3c", "#86cf17", "#2fbf61"][index % 3];
        ctx.globalAlpha = 0.3 + rand() * 0.4;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1);
      }
      ctx.globalAlpha = 1;
    }),
  },

  /** Blueprint: deep blue ceramic with fine white construction lines and arcs. */
  "s33v4-orbital-blueprint": {
    color: 0xffffff, metalness: 0, roughness: 0.35, clearcoat: 0.6,
    map: texture(34011, (ctx, rand, w, h) => {
      fill(ctx, "#1f4fd8", w, h);
      ctx.strokeStyle = "rgba(248,251,255,.35)";
      ctx.lineWidth = 0.8;
      for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = "#f8fbff";
      ctx.lineWidth = 1.8;
      for (let index = 0; index < 10; index += 1) {
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, 14 + rand() * 40, 0, Math.PI * (0.5 + rand()));
        ctx.stroke();
      }
    }),
  },

  /** Lacquer with gold leaf: warm black gloss scattered with real metal flakes. */
  "s33v4-orbital-lacquer-leaf": {
    color: 0xffffff, metalness: 1, roughness: 1, clearcoat: 1, clearcoatRoughness: 0.04,
    map: texture(34012, (ctx, rand, w, h) => {
      fill(ctx, "#1a0f0c", w, h);
      flakes(ctx, w, h, 34112, ["#f6c34a", "#f6c34a", "#f6c34a", "#ff8a12"]);
    }),
    /* The same flakes are metal; the lacquer between them is not. */
    surface: surface(34012, (ctx, _rand, w, h) => {
      fill(ctx, "rgb(0,40,0)", w, h);
      flakes(ctx, w, h, 34112, ["rgb(0,70,255)"]);
    }),
  },

  /* ── Deep Space Treasures ── */

  /** Neptune ice: deep and pale blue currents under clearcoat, iridescent. */
  "s33v4-space-neptune-ice": {
    color: 0xffffff, metalness: 0.15, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 0.4, envMapIntensity: 1.1,
    map: texture(34013, (ctx, rand, w, h) => {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#7fe3ff");
      gradient.addColorStop(0.35, "#1f4fd8");
      gradient.addColorStop(0.7, "#22b2f0");
      gradient.addColorStop(1, "#2c2f9e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      for (let index = 0; index < 24; index += 1) {
        const y = rand() * h;
        ctx.strokeStyle = index % 2 ? "rgba(225,248,255,.35)" : "rgba(13,30,110,.25)";
        ctx.lineWidth = 1 + rand() * 5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.3, y + 30, w * 0.7, y - 30, w, y);
        ctx.stroke();
      }
    }),
  },

  /** Mercury: impact-ringed titanium with fine polishing marks. */
  "s33v4-space-mercury-metal": {
    color: 0xffffff, metalness: 0.95, roughness: 0.3, envMapIntensity: 1.2,
    map: texture(34014, (ctx, rand, w, h) => {
      fill(ctx, "#c9d1dc", w, h);
      for (let index = 0; index < 200; index += 1) {
        ctx.strokeStyle = index % 2 ? "rgba(255,255,255,.12)" : "rgba(40,50,70,.1)";
        const y = rand() * h;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      for (let index = 0; index < 30; index += 1) {
        ctx.strokeStyle = "rgba(60,70,90,.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, 4 + rand() * 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    }),
  },

  /** Venus: cream-yellow to champagne cloud flowing over glossy porcelain. */
  "s33v4-space-venus-opal": {
    color: 0xffffff, metalness: 0.05, roughness: 0.22, clearcoat: 1,
    map: texture(34015, (ctx, rand, w, h) => {
      bands(ctx, rand, w, h, ["#ffe38a", "#fff4d0", "#ffc94d", "#ffeab0", "#f6b400"], 18);
    }),
  },

  /** Mars: matte ochre-red terracotta with darker canyon veins. */
  "s33v4-space-mars-ceramic": {
    color: 0xffffff, metalness: 0, roughness: 0.88,
    map: texture(34016, (ctx, rand, w, h) => {
      fill(ctx, "#e05a24", w, h);
      speckle(ctx, rand, w, h, ["#ff8a4a", "#b83a12"], 800, [1, 3]);
      veins(ctx, rand, w, h, "rgba(110,25,8,.7)", 22, 2.5);
    }),
  },

  /** Jupiter: polished bands of cream, caramel and rust. */
  "s33v4-space-jupiter-marble": {
    color: 0xffffff, metalness: 0.02, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05,
    map: texture(34017, (ctx, rand, w, h) => {
      bands(ctx, rand, w, h, ["#fff1d6", "#f3a83b", "#c8461c", "#ffe0a8", "#d2691e", "#fff1d6", "#b5452b"], 10);
      ctx.fillStyle = "#e5381e";
      ctx.beginPath();
      ctx.ellipse(w * 0.62, h * 0.6, 26, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }),
  },

  /** Saturn satin: pale gold weave with fine ring fibres. */
  "s33v4-space-saturn-satin": {
    color: 0xffffff, metalness: 0.2, roughness: 0.5, sheen: 0.9, sheenColor: 0xffe08a, sheenRoughness: 0.35,
    map: texture(34018, (ctx, rand, w, h) => {
      fill(ctx, "#f5cf72", w, h);
      for (let y = 0; y < h; y += 3) {
        ctx.strokeStyle = (y / 3) % 2 ? "rgba(255,246,214,.5)" : "rgba(200,140,40,.35)";
        ctx.beginPath(); ctx.moveTo(0, y + rand()); ctx.lineTo(w, y + rand()); ctx.stroke();
      }
    }),
  },

  /** Uranus frost: cyan-white frosted glass with a fine grain. */
  "s33v4-space-uranus-frost": {
    color: 0xffffff, metalness: 0, roughness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.4,
    map: texture(34019, (ctx, rand, w, h) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "#c8fbff");
      gradient.addColorStop(0.5, "#5ee0f0");
      gradient.addColorStop(1, "#d8fffb");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, rand, w, h, ["#ffffff"], 2400, [0.5, 1.3]);
    }),
  },

  /** Europa ice cracked through with warm red metal. */
  "s33v4-space-europa-mars": {
    color: 0xffffff, metalness: 1, roughness: 1, clearcoat: 0.6,
    map: texture(34020, (ctx, rand, w, h) => {
      fill(ctx, "#f4fbff", w, h);
      veins(ctx, seeded(34120), w, h, "#e5381e", 60, 5);
    }),
    surface: surface(34020, (ctx, _rand, w, h) => {
      fill(ctx, "rgb(0,80,0)", w, h);
      veins(ctx, seeded(34120), w, h, "rgb(0,60,255)", 60, 5);
    }),
  },

  /** Titan amber in Nyx black: a deep black shell scattered with amber light. */
  "s33v4-space-titan-nyx": {
    color: 0xffffff, metalness: 0.4, roughness: 0.25, clearcoat: 1, emissive: 0xff8a12, emissiveIntensity: 0.06,
    map: texture(34021, (ctx, rand, w, h) => {
      fill(ctx, "#0b0c12", w, h);
      for (let index = 0; index < 140; index += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 3 + rand() * 9);
        gradient.addColorStop(0, "rgba(255,180,40,.95)");
        gradient.addColorStop(1, "rgba(255,120,20,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - 12, y - 12, 24, 24);
      }
    }),
  },

  /** Luma porcelain: milk white with faint petal-coloured blooms. */
  "s33v4-space-luma-porcelain": {
    color: 0xffffff, metalness: 0, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04,
    map: texture(34022, (ctx, rand, w, h) => {
      fill(ctx, "#fffaf2", w, h);
      for (let index = 0; index < 26; index += 1) {
        const x = rand() * w;
        const y = rand() * h;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20 + rand() * 30);
        gradient.addColorStop(0, ["rgba(255,143,177,.45)", "rgba(246,180,0,.35)", "rgba(122,63,224,.25)"][index % 3]);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - 60, y - 60, 120, 120);
      }
    }),
  },

  /** Vesper prism: smoky violet layers with a fine iridescence. */
  "s33v4-space-vesper-prism": {
    color: 0xffffff, metalness: 0.2, roughness: 0.12, clearcoat: 1, iridescence: 0.9,
    map: texture(34023, (ctx, rand, w, h) => {
      bands(ctx, rand, w, h, ["#3a1a6e", "#7a3fe0", "#2c2f9e", "#b06cff", "#5a2aa8", "#d62f7c"], 8);
    }),
  },

  /** Thalassa sea-blue glaze over warm copper threads. */
  "s33v4-space-thalassa-brass": {
    color: 0xffffff, metalness: 1, roughness: 1, clearcoat: 0.8,
    map: texture(34024, (ctx, rand, w, h) => {
      fill(ctx, "#0fb8a9", w, h);
      bands(ctx, rand, w, h, ["#0fb8a9", "#00897b", "#22b2f0", "#0fb8a9"], 12);
      veins(ctx, seeded(34124), w, h, "#ff9a3c", 26, 1.6);
    }),
    surface: surface(34024, (ctx, _rand, w, h) => {
      fill(ctx, "rgb(0,50,0)", w, h);
      veins(ctx, seeded(34124), w, h, "rgb(0,70,255)", 26, 1.6);
    }),
  },
};
