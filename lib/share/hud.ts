/* =========================================================
   The instrument look of a shared card (Chi, 2026-11-15: 排版及字體可以
   更有科技感 → 儀表 HUD, following the reader's mode)

   The pieces both shared cards are drawn from, the weekly recap
   (lib/recap/shareCard.ts) and a word sent with Yumi
   (lib/hello/shareImage.ts), so the two read as one instrument:

   - a backdrop ruled in a fine grid, stars over it in Yumi Cosmic;
   - a frame of corner brackets and edge rulers, with a header strip: a
     status light, the brand, a code on the right;
   - a reticle around Yumi, its tick ring and two arcs that turn in the
     video;
   - panels cut at two corners, hairline edged, with accent corner ticks,
     as app/hud.css draws `.hud-panel`;
   - figures in the mono face, as `.hud-figure`: numbers and codes only,
     never a translated sentence, which a fixed pitch and wide tracking
     would spoil;
   - the QR code on a white plate inside accent brackets, crisp at any size.

   Paper and ink in Standard, obsidian and ice in Cosmic, as the app is.
   ========================================================= */

export type ShareFormat = "story" | "square";

export const SHARE_SIZES: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

export type HudColors = {
  page: string;
  grid: string;
  gridStrong: string;
  panel: string;
  ink: string;
  soft: string;
  faint: string;
  accent: string;
  accentSoft: string;
  line: string;
  alert: string;
  /** The small caps of a page's eyebrow: brass on paper, ice on obsidian. */
  eyebrow: string;
};

export function hudColors(cosmic: boolean): HudColors {
  return cosmic
    ? {
        page: "#070b10",
        grid: "rgba(134,216,210,0.05)",
        gridStrong: "rgba(134,216,210,0.1)",
        panel: "rgba(16,24,32,0.92)",
        ink: "#e4ecee",
        soft: "rgba(228,236,238,0.64)",
        faint: "rgba(228,236,238,0.4)",
        accent: "#86d8d2",
        accentSoft: "rgba(134,216,210,0.16)",
        line: "#34444e",
        alert: "#e9c57e",
        eyebrow: "#b8e8e5",
      }
    : {
        page: "#f4f0e7",
        grid: "rgba(29,27,23,0.045)",
        gridStrong: "rgba(29,27,23,0.085)",
        panel: "rgba(255,253,248,0.95)",
        ink: "#24211b",
        soft: "rgba(36,33,27,0.62)",
        faint: "rgba(36,33,27,0.42)",
        accent: "#2f8a67",
        accentSoft: "rgba(47,138,103,0.12)",
        line: "rgba(29,27,23,0.14)",
        alert: "#b5772a",
        eyebrow: "#94733a",
      };
}

/** `serif` is the app's title face (app/tactile.css --font-display): Georgia, Noto Serif TC for Chinese. */
export type HudFonts = { sans: string; mono: string; phonetic: string; serif: string };

const FALLBACK_FONTS: HudFonts = {
  sans: 'system-ui, -apple-system, "PingFang TC", "Noto Sans TC", "Hiragino Sans", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  phonetic: '"Noto Sans", "PingFang TC", sans-serif',
  serif: 'Georgia, "Noto Serif TC", "Songti TC", "Hiragino Mincho ProN", AppleMyungjo, "Noto Serif KR", serif',
};

/**
 * The app's own faces, as the page has them (app/globals.css): Geist, then
 * a CJK stack, for words; Geist Mono for figures. A canvas cannot read a
 * CSS variable, so the family lists are read off the document.
 */
export function readHudFonts(): HudFonts {
  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") return FALLBACK_FONTS;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  const latin = read("--font-latin");
  const cjk = read("--font-cjk");
  const mono = read("--font-mono");
  const phonetic = read("--font-phonetic");
  return {
    serif: FALLBACK_FONTS.serif,
    sans: latin && cjk ? `${latin}, ${cjk}` : latin || cjk || FALLBACK_FONTS.sans,
    mono: mono ? `${mono}, ${FALLBACK_FONTS.mono}` : FALLBACK_FONTS.mono,
    phonetic: phonetic || FALLBACK_FONTS.phonetic,
  };
}

/** Every face a card draws, loaded with the text it will draw, before it is drawn. */
export async function loadHudFonts(fonts: HudFonts, text: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  await Promise.all([
    document.fonts.load(`${WEIGHT.display} 64px ${fonts.serif}`, text),
    document.fonts.load(`600 24px ${fonts.sans}`, text.toLocaleUpperCase()),
    document.fonts.load(`${WEIGHT.text} 32px ${fonts.sans}`, text),
    document.fonts.load(`${WEIGHT.label} 32px ${fonts.sans}`, text),
    document.fonts.load(`${WEIGHT.figure} 64px ${fonts.mono}`, "0123456789/%—–:WK"),
    document.fonts.load(`${WEIGHT.code} 24px ${fonts.mono}`, "EXCHANGE NOTES @_0123456789"),
    document.fonts.load(`400 30px ${fonts.phonetic}`, text),
  ]).catch(() => undefined);
}

/**
 * The cards' type (Chi, 2026-11-15: 字體秀氣有設計感, then 使用這種字體,
 * pointing at the home's greeting and a page title): titles, greetings and
 * words in the app's serif at its regular weight; light mono figures;
 * regular sans text; small labels as a page's eyebrow, tracked small caps.
 */
export const WEIGHT = { display: 400, figure: 300, word: 400, text: 400, code: 400, label: 500, eyebrow: 600 } as const;

export const sans = (fonts: HudFonts, size: number, weight: number = WEIGHT.text) => `${weight} ${size}px ${fonts.sans}`;
export const mono = (fonts: HudFonts, size: number, weight: number = WEIGHT.code) => `${weight} ${size}px ${fonts.mono}`;
export const serif = (fonts: HudFonts, size: number, weight: number = WEIGHT.display) => `${weight} ${size}px ${fonts.serif}`;

/**
 * A label as a page's eyebrow draws it (PageTitle): small capitals, tracked
 * out, in brass on paper. Returns where it ends, for a rule after it.
 */
export function eyebrow(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  colors: HudColors,
  fonts: HudFonts,
  align: "left" | "right" = "left",
) {
  ctx.fillStyle = colors.eyebrow;
  ctx.font = sans(fonts, size, WEIGHT.eyebrow);
  const width = tracked(ctx, text.toLocaleUpperCase(), x, y, size * 0.2, align);
  return align === "left" ? x + width : x - width;
}

/** Text cut to fit a width, with an ellipsis. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** Lines that fit `width`, breaking at spaces, or anywhere in CJK text. */
export function wrapText(measure: (text: string) => number, text: string, width: number, maxLines: number): string[] {
  const cjk = /[　-鿿＀-￯]/.test(text);
  const units = cjk ? [...text] : text.split(/(\s+)/);
  const lines: string[] = [];
  let line = "";
  for (const unit of units) {
    const next = line + unit;
    if (measure(next.trimEnd()) <= width || !line.trim()) {
      line = next;
      continue;
    }
    lines.push(line.trim());
    line = unit.trimStart();
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line.trim()) lines.push(line.trim());
  if (lines.length === maxLines && lines.join(cjk ? "" : " ").length < text.trim().length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*\S?$/, "")}…`;
  }
  return lines;
}

/**
 * A code drawn with tracking, a letter at a time: canvas letter-spacing is
 * missing from older Safari. For figures and codes only.
 */
export function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "right" = "left",
) {
  const glyphs = [...text];
  const width = glyphs.reduce((sum, glyph) => sum + ctx.measureText(glyph).width, 0) + spacing * Math.max(0, glyphs.length - 1);
  let at = align === "right" ? x - width : x;
  const before = ctx.textAlign;
  ctx.textAlign = "left";
  for (const glyph of glyphs) {
    ctx.fillText(glyph, at, y);
    at += ctx.measureText(glyph).width + spacing;
  }
  ctx.textAlign = before;
  return width;
}

const SCRAMBLE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/";

/**
 * Text as it decodes into place over the opening, as a page title does in
 * the app (lib/motion/pageArrival.ts): settled letters from the left, the
 * rest cycling. `progress` 1 or more is the text itself.
 */
export function decodeText(text: string, progress: number, tick: number): string {
  if (progress >= 1) return text;
  const glyphs = [...text];
  const settled = Math.floor(Math.max(0, progress) * (glyphs.length + 1));
  return glyphs
    .map((glyph, index) => {
      if (index < settled || /\s/.test(glyph)) return glyph;
      return SCRAMBLE[(index * 7 + tick * 13) % SCRAMBLE.length];
    })
    .join("");
}

/** The page: a fine grid, a stronger rule every fifth line, stars in Cosmic. */
export function hudBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, colors: HudColors, cosmic: boolean) {
  ctx.fillStyle = colors.page;
  ctx.fillRect(0, 0, width, height);
  const step = 36;
  for (let x = 0, index = 0; x <= width; x += step, index++) {
    ctx.fillStyle = index % 5 === 0 ? colors.gridStrong : colors.grid;
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 0, index = 0; y <= height; y += step, index++) {
    ctx.fillStyle = index % 5 === 0 ? colors.gridStrong : colors.grid;
    ctx.fillRect(0, y, width, 1);
  }
  if (cosmic) {
    for (let star = 0; star < 180; star++) {
      const x = (star * 7919) % width;
      const y = (star * 104729) % height;
      ctx.fillStyle = `rgba(228,236,238,${0.1 + ((star * 37) % 50) / 100})`;
      ctx.beginPath();
      ctx.arc(x, y, (star % 3) * 0.7 + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const glow = ctx.createRadialGradient(width / 2, height * 0.38, 20, width / 2, height * 0.38, width * 0.8);
    glow.addColorStop(0, "rgba(134,216,210,0.1)");
    glow.addColorStop(1, "rgba(7,11,16,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  } else {
    const glow = ctx.createRadialGradient(width / 2, height * 0.36, 20, width / 2, height * 0.36, width * 0.8);
    glow.addColorStop(0, "rgba(255,246,222,0.75)");
    glow.addColorStop(1, "rgba(244,240,231,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }
}

export function led(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, cosmic: boolean) {
  ctx.save();
  if (cosmic) {
    ctx.shadowColor = color;
    ctx.shadowBlur = radius * 3;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Corner brackets, rulers down both edges, and the header strip: a status
 * light, the brand in tracked mono, and a code on the right.
 */
export function hudFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: HudColors,
  fonts: HudFonts,
  cosmic: boolean,
  header: { right?: string; top: number },
) {
  const inset = 40;
  const arm = 64;
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * arm);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * arm, y);
    ctx.stroke();
  };
  corner(inset, inset, 1, 1);
  corner(width - inset, inset, -1, 1);
  corner(inset, height - inset, 1, -1);
  corner(width - inset, height - inset, -1, -1);

  /* Rulers: a short tick every 24, a long one every 120. */
  ctx.fillStyle = colors.faint;
  for (let y = inset + arm + 48; y < height - inset - arm - 36; y += 24) {
    const long = Math.round((y - inset) / 24) % 5 === 0;
    ctx.fillRect(inset - 2, y, long ? 18 : 9, 2);
    ctx.fillRect(width - inset + 2 - (long ? 18 : 9), y, long ? 18 : 9, 2);
  }

  /* The header strip, as a page's eyebrow: a status light, the brand in
     small caps, and a hairline on to the code at the right. */
  const y = header.top;
  ctx.textBaseline = "alphabetic";
  led(ctx, 86, y - 8, 7, colors.accent, cosmic);
  const end = eyebrow(ctx, "Exchange Notes", 108, y, 22, colors, fonts);
  let ruleEnd = width - 84;
  if (header.right) {
    ctx.fillStyle = colors.soft;
    ctx.font = mono(fonts, 22);
    ruleEnd = width - 84 - tracked(ctx, header.right, width - 84, y, 3, "right") - 24;
  }
  if (ruleEnd > end + 24) {
    const rule = ctx.createLinearGradient(end + 20, 0, ruleEnd, 0);
    rule.addColorStop(0, colors.eyebrow);
    rule.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rule;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(end + 20, y - 9, ruleEnd - end - 20, 2);
    ctx.globalAlpha = 1;
  }
}

/**
 * The reticle Yumi stands in: a ring of ticks with its quarters marked in
 * figures, a broken ring inside, and two arcs that turn by `spin` (0 to 1,
 * one full turn) in the video.
 */
export function reticle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  colors: HudColors,
  fonts: HudFonts,
  spin = 0,
) {
  ctx.save();
  ctx.lineCap = "butt";

  /* The tick ring. */
  for (let degree = 0; degree < 360; degree += 6) {
    const quarter = degree % 90 === 0;
    const major = degree % 30 === 0;
    const angle = (degree - 90) * (Math.PI / 180);
    const inner = radius + 14;
    const outer = radius + (quarter ? 40 : major ? 30 : 22);
    ctx.strokeStyle = quarter ? colors.accent : major ? colors.soft : colors.faint;
    ctx.lineWidth = quarter ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }

  /* Quarter figures, outside the ring, where there is room for them: a
     post's small reticle sits against the header and the edge. */
  if (radius >= 200) quarterFigures(ctx, cx, cy, radius, colors, fonts);

  /* A broken ring, open at the quarters. */
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  for (let quarter = 0; quarter < 4; quarter++) {
    const start = quarter * (Math.PI / 2) + 0.16;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + Math.PI / 2 - 0.32);
    ctx.stroke();
  }

  /* Two arcs that turn. */
  const turn = spin * Math.PI * 2;
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 6;
  for (const offset of [0, Math.PI]) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 18, offset + turn - 0.5, offset + turn + 0.5);
    ctx.stroke();
  }

  /* A floor line under her. */
  const floor = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0);
  floor.addColorStop(0, "rgba(0,0,0,0)");
  floor.addColorStop(0.5, colors.accent);
  floor.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = floor;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(cx - radius * 0.8, cy + radius * 0.78, radius * 1.6, 2);
  ctx.restore();
}

function quarterFigures(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, colors: HudColors, fonts: HudFonts) {
  ctx.fillStyle = colors.faint;
  ctx.font = mono(fonts, 20);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = radius + 64;
  ctx.fillText("000", cx, cy - label);
  ctx.fillText("180", cx, cy + label);
  ctx.textAlign = "left";
  ctx.fillText("090", cx + label - 22, cy);
  ctx.textAlign = "right";
  ctx.fillText("270", cx - label + 22, cy);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/** A line at the largest size from `max` down to `min` that fits `width`, cut if it still does not. */
export function fittedLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  sizes: { max: number; min: number; weight?: number },
  fonts: HudFonts,
) {
  let size = sizes.max;
  ctx.font = sans(fonts, size, sizes.weight ?? WEIGHT.label);
  while (size > sizes.min && ctx.measureText(text).width > width) {
    size -= 1;
    ctx.font = sans(fonts, size, sizes.weight ?? WEIGHT.label);
  }
  ctx.fillText(fitText(ctx, text, width), x, y);
}

/**
 * Yumi, from the middle of her canvas into a square box. The page draws her
 * with room around her to be turned in; the card wants her filling it.
 */
export function drawYumi(ctx: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, size: number, crop = 0.92) {
  const source = image as { width: number; height: number };
  const w = source.width || size;
  const h = source.height || size;
  const side = Math.min(w, h) * crop;
  ctx.drawImage(image, (w - side) / 2, (h - side) / 2, side, side, x, y, size, size);
}

/** A panel cut at two corners, with a hairline edge and accent corner ticks. */
export function hudPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  colors: HudColors,
  options: { rail?: boolean } = {},
) {
  const cut = 26;
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
  ctx.fillStyle = colors.panel;
  ctx.fill();
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + cut + 48, y);
  ctx.moveTo(x + width - cut, y + height);
  ctx.lineTo(x + width - cut - 48, y + height);
  ctx.stroke();
  if (options.rail) {
    ctx.fillStyle = colors.accent;
    ctx.fillRect(x, y + cut + 10, 5, Math.max(0, height - cut * 2 - 20));
  }
}

/** A row of segments, lit or dark: the seven days of the week. */
export function segments(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  lit: boolean[],
  colors: HudColors,
) {
  const gap = 6;
  const each = (width - gap * (lit.length - 1)) / lit.length;
  lit.forEach((on, index) => {
    ctx.fillStyle = on ? colors.accent : colors.line;
    ctx.fillRect(x + index * (each + gap), y, each, height);
  });
}

/**
 * The QR code on white, always: a code a camera cannot read on obsidian is
 * no code. Drawn without smoothing so its modules stay square, inside
 * accent brackets.
 */
export function qrPlate(ctx: CanvasRenderingContext2D, qr: CanvasImageSource, x: number, y: number, size: number, colors: HudColors) {
  const pad = 14;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - pad, y - pad, size + pad * 2, size + pad * 2);
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, x, y, size, size);
  ctx.imageSmoothingEnabled = smoothing;

  const out = pad + 12;
  const arm = 28;
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  const corner = (cx: number, cy: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * arm);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * arm, cy);
    ctx.stroke();
  };
  corner(x - out, y - out, 1, 1);
  corner(x + size + out, y - out, -1, 1);
  corner(x - out, y + size + out, 1, -1);
  corner(x + size + out, y + size + out, -1, -1);
}

/** The ISO week of a date, for the card's code: "WK 46". */
export function isoWeek(date: Date): number {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  return Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
