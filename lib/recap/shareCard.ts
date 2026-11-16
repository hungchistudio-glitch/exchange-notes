/* =========================================================
   The weekly recap, drawn to share (Chi, 2026-11-15)

   One drawing for both the image and the three-second video: the video
   draws it once a frame, with the numbers counting up, the title decoding,
   the reticle's arcs turning and Yumi making one turn. Drawn from the
   numbers on a canvas, not photographed from the page, so it looks the
   same on every phone. The instrument look is lib/share/hud.ts (Chi: 更有
   科技感 → 儀表 HUD), paper in Standard and obsidian in Cosmic.

   Chi chose what a friend who sees it gets:
   - the reader's own Yumi in what they have bought her, as they turned her;
   - the week's numbers, and its seven days as a row of lights;
   - one word to learn from the image itself (本週一字小教室), which the
     reader may choose;
   - a QR code that adds the reader as a friend. Someone without an account
     signs up first, and the invite is kept through sign-up (/invite/<id>).

   Two shapes: 9:16 for a story, 1:1 for a post.
   ========================================================= */

import {
  decodeText,
  drawYumi,
  fitText,
  fittedLine,
  hudBackdrop,
  hudColors,
  hudFrame,
  hudPanel,
  led,
  mono,
  qrPlate,
  readHudFonts,
  reticle,
  sans,
  segments,
  SHARE_SIZES,
  tracked,
  type HudColors,
  type HudFonts,
  type ShareFormat,
} from "@/lib/share/hud";

export { SHARE_SIZES, type ShareFormat };

/** A measure; `days` lights a row of seven over it (the days learned on). */
export type ShareStat = { label: string; value: string; days?: boolean[] };

export type ShareLesson = { label: string; word: string; reading?: string; meaning?: string };

export type ShareCardInput = {
  format: ShareFormat;
  cosmic: boolean;
  /** The app's faces (readHudFonts); the system's when absent. */
  fonts?: HudFonts;
  title: string;
  /** In figures: "11/09 – 11/15". */
  range: string;
  /** The header's code: "WK 46". */
  code?: string;
  /** A milestone's line, over the numbers: "Your 500th word". */
  headline?: string | null;
  stats: ShareStat[];
  lesson?: ShareLesson | null;
  footer: string;
  /** The address written out, for whoever cannot scan. */
  link?: string;
  yumi?: CanvasImageSource | null;
  qr?: CanvasImageSource | null;
  qrLabel?: string;
  /** 0 to 1 through the video's opening; 1, or absent, for the still image. */
  progress?: number;
  /** 0 to 1 through the whole video: the reticle's turn. */
  spin?: number;
  /** The frame's count, for the decoding letters. */
  tick?: number;
};

/** A number counted up to over the opening: "100%" from "0%", "3/7" from "0/7". */
export function countUp(value: string, progress = 1): string {
  const match = /^(\d+)(.*)$/.exec(value);
  if (!match || progress >= 1) return value;
  const eased = 1 - (1 - Math.max(0, progress)) ** 3;
  return `${Math.round(Number(match[1]) * eased)}${match[2]}`;
}

/** As tall as its lines: the word, then its reading and meaning if known. */
export function lessonHeight(lesson: ShareLesson, scale = 1) {
  return Math.round((156 + (lesson.reading ? 44 : 0) + (lesson.meaning ? 46 : 0)) * scale);
}

function statsPanel(
  ctx: CanvasRenderingContext2D,
  stats: ShareStat[],
  x: number,
  y: number,
  columnWidth: number,
  rowHeight: number,
  valueSize: number,
  colors: HudColors,
  fonts: HudFonts,
  progress: number,
) {
  const columns = 3;
  const rows = Math.ceil(stats.length / columns);
  const width = columnWidth * columns;
  hudPanel(ctx, x, y, width, rowHeight * rows, colors);

  /* Hairlines between the cells. */
  ctx.fillStyle = colors.line;
  for (let column = 1; column < columns; column++) ctx.fillRect(x + column * columnWidth, y + 22, 2, rowHeight * rows - 44);
  for (let row = 1; row < rows; row++) ctx.fillRect(x + 22, y + row * rowHeight, width - 44, 2);

  const pad = Math.round(valueSize * 0.34);
  stats.forEach((stat, index) => {
    const cx = x + (index % columns) * columnWidth;
    const cy = y + Math.floor(index / columns) * rowHeight;
    ctx.fillStyle = colors.accent;
    ctx.font = mono(fonts, Math.round(valueSize * 0.28), 600);
    ctx.fillText(String(index + 1).padStart(2, "0"), cx + pad, cy + Math.round(rowHeight * 0.26));
    if (stat.days) {
      const lit = stat.days.map((on, day) => on && progress * stat.days!.length >= day + 0.5);
      segments(ctx, cx + pad + valueSize * 0.62, cy + Math.round(rowHeight * 0.26) - 13, columnWidth - pad * 2 - valueSize * 0.62, 12, lit, colors);
    }
    ctx.fillStyle = colors.ink;
    ctx.font = mono(fonts, valueSize, 700);
    ctx.fillText(countUp(stat.value, progress), cx + pad, cy + Math.round(rowHeight * 0.7));
    ctx.fillStyle = colors.soft;
    ctx.font = sans(fonts, Math.round(valueSize * 0.33), 600);
    ctx.fillText(fitText(ctx, stat.label, columnWidth - pad * 2), cx + pad, cy + Math.round(rowHeight * 0.89));
  });
}

function lessonPanel(
  ctx: CanvasRenderingContext2D,
  lesson: ShareLesson,
  x: number,
  y: number,
  width: number,
  colors: HudColors,
  fonts: HudFonts,
  cosmic: boolean,
  scale: number,
  word: string,
) {
  const s = (value: number) => Math.round(value * scale);
  hudPanel(ctx, x, y, width, lessonHeight(lesson, scale), colors, { rail: true });
  led(ctx, x + s(44), y + s(46), s(7), colors.accent, cosmic);
  ctx.fillStyle = colors.accent;
  ctx.font = sans(fonts, s(26), 700);
  ctx.fillText(fitText(ctx, lesson.label, width - s(100)), x + s(64), y + s(55));
  ctx.fillStyle = colors.ink;
  ctx.font = sans(fonts, s(70), 800);
  ctx.fillText(fitText(ctx, word, width - s(80)), x + s(40), y + s(132));
  let line = y + s(132);
  if (lesson.reading) {
    line += s(44);
    ctx.fillStyle = colors.soft;
    ctx.font = `500 ${s(30)}px ${fonts.phonetic}`;
    ctx.fillText(fitText(ctx, lesson.reading, width - s(80)), x + s(40), line);
  }
  if (lesson.meaning) {
    line += s(46);
    ctx.fillStyle = colors.ink;
    ctx.font = sans(fonts, s(34), 600);
    ctx.fillText(fitText(ctx, lesson.meaning, width - s(80)), x + s(40), line);
  }
}

/** The milestone, as a tag with a light: "▸ Word number 500!". */
function headlineTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
  colors: HudColors,
  fonts: HudFonts,
  cosmic: boolean,
) {
  ctx.font = sans(fonts, size, 800);
  const label = fitText(ctx, text, maxWidth - size * 2.2);
  const width = ctx.measureText(label).width + size * 2.2;
  const height = Math.round(size * 1.7);
  ctx.fillStyle = colors.accentSoft;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  led(ctx, x + size * 0.7, y + height / 2, size * 0.2, colors.alert, cosmic);
  ctx.fillStyle = colors.accent;
  ctx.fillText(label, x + size * 1.2, y + height / 2 + size * 0.36);
}

export function drawShareCard(ctx: CanvasRenderingContext2D, input: ShareCardInput) {
  const { width, height } = SHARE_SIZES[input.format];
  const colors = hudColors(input.cosmic);
  const fonts = input.fonts ?? readHudFonts();
  const progress = input.progress ?? 1;
  const tick = input.tick ?? 0;
  /* Sized once: a video draws this every frame, and resizing clears the
     context's state as well as its pixels. */
  if (ctx.canvas.width !== width) ctx.canvas.width = width;
  if (ctx.canvas.height !== height) ctx.canvas.height = height;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  hudBackdrop(ctx, width, height, colors, input.cosmic);
  const story = input.format === "story";
  hudFrame(ctx, width, height, colors, fonts, input.cosmic, { top: story ? 104 : 96, right: input.code });

  const title = decodeText(input.title, progress * 1.6, tick);
  const word = input.lesson ? decodeText(input.lesson.word, progress * 1.3 - 0.2, tick) : "";

  if (story) {
    ctx.fillStyle = colors.ink;
    ctx.font = sans(fonts, 96, 800);
    ctx.fillText(fitText(ctx, title, width - 168), 84, 236);
    ctx.fillStyle = colors.soft;
    ctx.font = mono(fonts, 30, 500);
    tracked(ctx, input.range, 86, 288, 2);
    if (input.headline) headlineTag(ctx, input.headline, 84, 316, 30, 400, colors, fonts, input.cosmic);

    reticle(ctx, 540, 700, 260, colors, fonts, input.spin ?? 0);
    if (input.yumi) drawYumi(ctx, input.yumi, 540 - 270, 700 - 270, 540);

    statsPanel(ctx, input.stats, 72, 1050, 312, 155, 76, colors, fonts, progress);
    if (input.lesson) lessonPanel(ctx, input.lesson, 72, 1384, 936, colors, fonts, input.cosmic, 1, word);

    const qrSize = 168;
    const qrX = width - 84 - qrSize;
    const textWidth = qrX - 40 - 84 - 30;
    if (input.qr && input.qrLabel) {
      ctx.fillStyle = colors.accent;
      ctx.font = sans(fonts, 34, 800);
      ctx.fillText(fitText(ctx, `${input.qrLabel} →`, textWidth), 84, 1716);
    }
    ctx.fillStyle = colors.soft;
    ctx.font = sans(fonts, 28, 600);
    ctx.fillText(fitText(ctx, input.footer, textWidth), 84, 1762);
    if (input.link) {
      ctx.fillStyle = colors.faint;
      ctx.font = mono(fonts, 22, 500);
      ctx.fillText(fitText(ctx, input.link, textWidth), 84, 1804);
    }
    if (input.qr) qrPlate(ctx, input.qr, qrX, 1668, qrSize, colors);
    return;
  }

  ctx.fillStyle = colors.ink;
  ctx.font = sans(fonts, 72, 800);
  ctx.fillText(fitText(ctx, title, 560), 84, 214);
  ctx.fillStyle = colors.soft;
  ctx.font = mono(fonts, 26, 500);
  tracked(ctx, input.range, 86, 258, 2);
  if (input.headline) headlineTag(ctx, input.headline, 84, 282, 24, 520, colors, fonts, input.cosmic);

  reticle(ctx, 836, 340, 150, colors, fonts, input.spin ?? 0);
  if (input.yumi) drawYumi(ctx, input.yumi, 836 - 158, 340 - 158, 316);

  statsPanel(ctx, input.stats, 72, 360, 190, 150, 60, colors, fonts, progress);
  if (input.lesson) lessonPanel(ctx, input.lesson, 72, 686, 570, colors, fonts, input.cosmic, 0.82, word);

  const qrSize = 180;
  const qrX = width - 84 - qrSize;
  if (input.qr) qrPlate(ctx, input.qr, qrX, 604, qrSize, colors);
  if (input.qr && input.qrLabel) {
    ctx.fillStyle = colors.accent;
    ctx.textAlign = "center";
    fittedLine(ctx, input.qrLabel, qrX + qrSize / 2, 862, qrSize + 28, { max: 24, min: 18, weight: 800 }, fonts);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = colors.soft;
  ctx.font = sans(fonts, 24, 600);
  ctx.fillText(fitText(ctx, input.footer, 560), 84, 966);
  if (input.link) {
    ctx.fillStyle = colors.faint;
    ctx.font = mono(fonts, 20, 500);
    ctx.fillText(fitText(ctx, input.link, 560), 84, 1002);
  }
}
