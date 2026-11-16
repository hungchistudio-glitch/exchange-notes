"use client";

import {
  decodeText,
  drawYumi,
  eyebrow,
  fitText,
  hudBackdrop,
  hudColors,
  hudFrame,
  hudPanel,
  mono,
  qrPlate,
  readHudFonts,
  reticle,
  sans,
  serif,
  SHARE_SIZES,
  wrapText,
  type HudColors,
  type HudFonts,
  type ShareFormat,
  WEIGHT,
} from "@/lib/share/hud";

import type { HelloSnapshot } from "./types";

/* =========================================================
   The hello as one picture, or a video of Yumi's one full turn

   The same hello as the page — Yumi in the outfit saved with it, the same
   two words, the same name — with a QR code for the link, for sharing
   where a link preview would not show, or for printing (Chi's hello
   brief, §9). Since 2026-11-15 in the shared cards' instrument look
   (lib/share/hud.ts; Chi: 送一個字的分享圖換新卡), in a story's 9:16 or a
   post's 1:1, with Yumi as the sharer turned her on the share screen, or
   her picture where the live figure is not to be had.

   The look is the one the hello was made in, as the page's is: paper in
   Standard, obsidian in Cosmic.

   A picture, so nothing on it looks pressable: no speakers, no buttons.
   The QR is a standard one, drawn by the share screen at a size its
   module count can be read at, on its own white plate with the full quiet
   zone, in both looks — never tinted, rotated or overlaid. The link is
   written out too, for whoever opens the picture on the phone that would
   scan it.
   ========================================================= */

export { wrapText };

export type HelloCardInput = {
  hello: HelloSnapshot;
  format: ShareFormat;
  fonts?: HudFonts;
  /** The live figure's canvas, or her picture; null leaves her reticle empty. */
  yumi: CanvasImageSource | null;
  /** True for her picture, which is framed already: drawn whole, not cut. */
  yumiIsPoster?: boolean;
  /** The QR code, already drawn with its quiet zone on white. */
  qr: CanvasImageSource;
  greeting: string;
  gift: string;
  scanCaption: string;
  /** The two languages' names, in the reader's interface language. */
  languageNames: readonly [string, string];
  url: string;
  /** 0 to 1 through the video's opening; 1, or absent, for the still image. */
  progress?: number;
  /** 0 to 1 through the whole video: the reticle's turn. */
  spin?: number;
  tick?: number;
};

type Side = { mark: string; name: string; text: string; reading: string | null; language: string };

/**
 * The two words, one panel each, stacked: one size for both, the largest
 * at which each fits its panel in at most two lines and both, with their
 * readings, fit above `bottom`.
 */
function wordPanels(
  ctx: CanvasRenderingContext2D,
  sides: Side[],
  x: number,
  top: number,
  width: number,
  bottom: number,
  sizes: { max: number; min: number },
  colors: HudColors,
  fonts: HudFonts,
  texts: string[],
) {
  const measure = (text: string) => ctx.measureText(text).width;
  const inner = width - 96;
  const gap = 20;
  const layoutAt = (size: number) =>
    sides.map((side) => {
      ctx.font = serif(fonts, size, WEIGHT.word);
      const lines = wrapText(measure, side.text, inner, 2);
      const height = 52 + size + 10 + (lines.length - 1) * (size + 8) + (side.reading ? 42 : 0) + 34;
      return { ...side, lines, height };
    });
  const total = (layout: ReturnType<typeof layoutAt>) => layout.reduce((sum, side) => sum + side.height, 0) + gap * (layout.length - 1);
  let size = sizes.max;
  while (size > sizes.min) {
    ctx.font = serif(fonts, size, WEIGHT.word);
    if (sides.every((side) => measure(side.text) <= inner)) break;
    size -= 4;
  }
  let layout = layoutAt(size);
  while (size > sizes.min && top + total(layout) > bottom) {
    size -= 4;
    layout = layoutAt(size);
  }

  let y = top;
  layout.forEach((side, index) => {
    hudPanel(ctx, x, y, width, side.height, colors, { rail: true });
    eyebrow(ctx, side.name, x + 44, y + 50, 22, colors, fonts);
    ctx.fillStyle = colors.faint;
    ctx.font = mono(fonts, 24);
    ctx.textAlign = "right";
    ctx.fillText(side.mark, x + width - 40, y + 50);
    ctx.textAlign = "left";
    ctx.fillStyle = colors.ink;
    ctx.font = serif(fonts, size, WEIGHT.word);
    /* While it decodes, one line; settled, its own lines. */
    const lines = texts[index] === side.text ? side.lines : [fitText(ctx, texts[index], inner)];
    lines.forEach((line, row) => ctx.fillText(line, x + 44, y + 52 + size + 4 + row * (size + 8)));
    if (side.reading) {
      ctx.fillStyle = colors.soft;
      ctx.font = `500 28px ${fonts.phonetic}`;
      ctx.fillText(fitText(ctx, side.reading, inner), x + 44, y + 52 + size + 4 + (side.lines.length - 1) * (size + 8) + 44);
    }
    y += side.height + gap;
  });
}

export function drawHelloCard(ctx: CanvasRenderingContext2D, input: HelloCardInput) {
  const { hello } = input;
  const { width, height } = SHARE_SIZES[input.format];
  const cosmic = hello.yumi.mode === "yumi-cosmic";
  const colors = hudColors(cosmic);
  const fonts = input.fonts ?? readHudFonts();
  const progress = input.progress ?? 1;
  const tick = input.tick ?? 0;
  if (ctx.canvas.width !== width) ctx.canvas.width = width;
  if (ctx.canvas.height !== height) ctx.canvas.height = height;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const story = input.format === "story";
  hudBackdrop(ctx, width, height, colors, cosmic);
  /* Who it is from, by the ID no one else can hold, at the header's right. */
  hudFrame(ctx, width, height, colors, fonts, cosmic, { top: story ? 104 : 96, right: `@${hello.sender.exchangeId}` });

  const [a, b] = hello.pair;
  const sides: Side[] = ([
    [a, "A", input.languageNames[0]],
    [b, "B", input.languageNames[1]],
  ] as const).map(([language, mark, name]) => {
    const side = hello.sense[language];
    return {
      mark,
      name,
      language,
      text: side?.text ?? "—",
      reading: side?.phonetic?.zhuyin ?? side?.phonetic?.ipa ?? side?.phonetic?.pinyin ?? null,
    };
  });
  const texts = sides.map((side, index) => decodeText(side.text, progress * 1.3 - 0.2 - index * 0.2, tick));
  const measure = (text: string) => ctx.measureText(text).width;
  const yumiAt = (cx: number, cy: number, size: number) => {
    if (!input.yumi) return;
    if (input.yumiIsPoster) ctx.drawImage(input.yumi, cx - size / 2, cy - size / 2, size, size);
    else drawYumi(ctx, input.yumi, cx - size / 2, cy - size / 2, size);
  };

  if (story) {
    ctx.fillStyle = colors.ink;
    ctx.font = serif(fonts, 64);
    const greeting = wrapText(measure, input.greeting, 912, 2);
    greeting.forEach((line, index) => ctx.fillText(line, 84, 236 + index * 72));
    const giftY = 236 + (greeting.length - 1) * 72 + 60;
    ctx.fillStyle = colors.soft;
    ctx.font = sans(fonts, 36);
    ctx.fillText(fitText(ctx, input.gift, 912), 84, giftY);

    reticle(ctx, 540, 770, 270, colors, fonts, input.spin ?? 0);
    yumiAt(540, 770, 560);

    wordPanels(ctx, sides, 72, 1150, 936, 1590, { max: 76, min: 40 }, colors, fonts, texts);

    const qrSize = 200;
    const qrX = width - 84 - qrSize;
    qrPlate(ctx, input.qr, qrX, 1640, qrSize, colors);
    const textWidth = qrX - 40 - 84 - 30;
    ctx.fillStyle = colors.ink;
    ctx.font = sans(fonts, 34, WEIGHT.label);
    const caption = wrapText(measure, `${input.scanCaption} →`, textWidth, 2);
    caption.forEach((line, index) => ctx.fillText(line, 84, 1690 + index * 44));
    ctx.fillStyle = colors.faint;
    linkLine(ctx, input.url, 84, 1690 + caption.length * 44 + 20, textWidth, 24, fonts);
    return;
  }

  ctx.fillStyle = colors.ink;
  ctx.font = serif(fonts, 52);
  const greeting = wrapText(measure, input.greeting, 560, 2);
  greeting.forEach((line, index) => ctx.fillText(line, 84, 196 + index * 58));
  const giftY = 196 + (greeting.length - 1) * 58 + 50;
  ctx.fillStyle = colors.soft;
  ctx.font = sans(fonts, 30);
  ctx.fillText(fitText(ctx, input.gift, 560), 84, giftY);

  reticle(ctx, 836, 330, 150, colors, fonts, input.spin ?? 0);
  yumiAt(836, 330, 316);

  wordPanels(ctx, sides, 72, Math.max(380, giftY + 46), 570, 930, { max: 62, min: 32 }, colors, fonts, texts);

  const qrSize = 180;
  const qrX = width - 84 - qrSize;
  qrPlate(ctx, input.qr, qrX, 600, qrSize, colors);
  ctx.fillStyle = colors.ink;
  ctx.font = sans(fonts, 22, WEIGHT.label);
  ctx.textAlign = "center";
  wrapText(measure, input.scanCaption, qrSize + 28, 2).forEach((line, index) => ctx.fillText(line, qrX + qrSize / 2, 852 + index * 30));
  ctx.textAlign = "left";
  ctx.fillStyle = colors.faint;
  linkLine(ctx, input.url, 84, 990, 912, 22, fonts);
}

/**
 * The link, written out whole: on one line at the largest size from `max`
 * down to 18 that fits, else over two lines broken after a slash, so it
 * stays large enough to type.
 */
function linkLine(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, width: number, max: number, fonts: HudFonts) {
  const link = url.replace(/^https?:\/\//, "");
  let size = max;
  ctx.font = mono(fonts, size);
  while (size > 18 && ctx.measureText(link).width > width) {
    size -= 1;
    ctx.font = mono(fonts, size);
  }
  if (ctx.measureText(link).width <= width) {
    ctx.fillText(link, x, y);
    return;
  }
  size = max;
  ctx.font = mono(fonts, size);
  let cut = link.length;
  while (cut > 1 && ctx.measureText(link.slice(0, cut)).width > width) cut -= 1;
  const slash = link.lastIndexOf("/", cut - 1);
  if (slash > 0) cut = slash + 1;
  ctx.fillText(link.slice(0, cut), x, y);
  ctx.fillText(fitText(ctx, link.slice(cut), width), x, y + size + 8);
}
