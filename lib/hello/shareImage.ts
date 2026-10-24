"use client";

import type { HelloSnapshot } from "./types";

/* =========================================================
   The hello as one picture: 1080 × 1350

   The same hello as the page — the same Yumi picture, the same two words,
   the same name — with a QR code for the link, for sharing where a link
   preview would not show, or for printing (Chi's hello brief, §9).

   A picture, so nothing on it looks pressable: no speakers, no buttons.
   The QR is a standard one, drawn by the share screen at a size its
   module count can be read at, on its own white panel with the full
   quiet zone, in both looks — never tinted, rotated or overlaid.

   Drawn only once the fonts have loaded and the Yumi picture has decoded,
   so it never goes out with a fallback font or without her.
   ========================================================= */

export const SHARE_IMAGE = { width: 1080, height: 1350 } as const;

const LOOKS = {
  standard: { page: "#efe8da", paper: "#fbf7ee", surface: "#fffdf8", ink: "#1c1a16", soft: "rgba(28,26,22,0.66)", faint: "rgba(28,26,22,0.46)", brass: "#a8843c", glow: "rgba(168,132,60,0.18)" },
  "yumi-cosmic": { page: "#0a0f1f", paper: "#121a33", surface: "#172042", ink: "#f2efe8", soft: "rgba(242,239,232,0.72)", faint: "rgba(242,239,232,0.5)", brass: "#d6b26a", glow: "rgba(150,190,255,0.18)" },
} as const;

export type ShareImageInput = {
  hello: HelloSnapshot;
  /** Yumi's picture, decoded; null draws her frame empty, never another Yumi. */
  poster: CanvasImageSource | null;
  /** The QR code, already drawn with its quiet zone on white. */
  qr: HTMLCanvasElement;
  greeting: string;
  gift: string;
  scanCaption: string;
  /** The two languages' names, in the reader's interface language. */
  languageNames: readonly [string, string];
  url: string;
};

function fontFamily(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
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

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function composeShareImage(input: ShareImageInput): Promise<Blob> {
  const { hello } = input;
  const look = LOOKS[hello.yumi.mode];
  const latin = fontFamily("--font-latin", "system-ui, sans-serif");
  const cjk = fontFamily("--font-cjk", "system-ui, sans-serif");
  const mono = fontFamily("--font-mono", "ui-monospace, monospace");
  const wordFont = (language: string) => (language === "zh-TW" ? cjk : latin);

  /* Every face this picture uses, loaded with the text it will draw. */
  const [a, b] = hello.pair;
  const sideA = hello.sense[a];
  const sideB = hello.sense[b];
  await Promise.all([
    document.fonts.load(`600 52px ${latin}`, input.greeting),
    document.fonts.load(`600 52px ${cjk}`, `${input.greeting}${sideA?.text ?? ""}${sideB?.text ?? ""}`),
    document.fonts.load(`500 26px ${mono}`, "STATION 33"),
  ]).catch(() => undefined);
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = SHARE_IMAGE.width;
  canvas.height = SHARE_IMAGE.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas");

  /* Page and sheet. */
  ctx.fillStyle = look.page;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  roundedRect(ctx, 40, 40, 1000, 1270, 56);
  ctx.fillStyle = look.paper;
  ctx.fill();

  /* The orbital rules across the top. */
  ctx.save();
  roundedRect(ctx, 40, 40, 1000, 1270, 56);
  ctx.clip();
  ctx.fillStyle = look.brass;
  ctx.globalAlpha = 0.55;
  for (let x = 48; x < 1040; x += 16) ctx.fillRect(x, 40, 2, 12);
  ctx.restore();

  /* Header. */
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = look.brass;
  ctx.font = `500 26px ${mono}`;
  ctx.fillText("STATION 33", 96, 130);
  /* Who it is from, by the ID no one else can hold, beside any nickname. */
  if (hello.sender.name) {
    ctx.fillStyle = look.soft;
    ctx.textAlign = "right";
    const handle = wrapText((text) => ctx.measureText(text).width, `@${hello.sender.exchangeId}`, 560, 1)[0];
    ctx.fillText(handle, 984, 130);
    ctx.textAlign = "left";
  }

  /* Greeting. */
  ctx.fillStyle = look.ink;
  ctx.font = `600 52px ${latin}, ${cjk}`;
  const greetingLines = wrapText((text) => ctx.measureText(text).width, input.greeting, 888, 2);
  greetingLines.forEach((line, index) => ctx.fillText(line, 96, 206 + index * 64));
  const giftY = 206 + greetingLines.length * 64 + 4;
  ctx.fillStyle = look.soft;
  ctx.font = `400 32px ${latin}, ${cjk}`;
  ctx.fillText(input.gift, 96, giftY);

  /* Yumi, on a soft round glow: a filled circle, so it has no edge to show. */
  const yumiTop = giftY + 30;
  const yumiSize = 500;
  const yumiX = (canvas.width - yumiSize) / 2;
  const glowY = yumiTop + yumiSize * 0.6;
  const glow = ctx.createRadialGradient(540, glowY, 10, 540, glowY, 280);
  glow.addColorStop(0, look.glow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(540, glowY, 280, 0, Math.PI * 2);
  ctx.fill();
  if (input.poster) ctx.drawImage(input.poster, yumiX, yumiTop, yumiSize, yumiSize);

  /*
   * The two words, on the left; the QR on the right. One size for both
   * words, the largest at which each fits its column on one line if it
   * can, and both, with their readings, fit above the link at the foot.
   */
  const blockTop = yumiTop + yumiSize + 30;
  const qrSize = 300;
  const qrX = 984 - qrSize;
  const columnWidth = qrX - 40 - 96;
  const wordsBottom = 1226;
  const sides = ([[a, sideA, input.languageNames[0]], [b, sideB, input.languageNames[1]]] as const).map(
    ([language, side, name]) => ({
      language,
      name,
      text: side?.text ?? "—",
      reading: side?.phonetic?.zhuyin ?? side?.phonetic?.ipa ?? null,
    }),
  );
  const measure = (text: string) => ctx.measureText(text).width;
  const layoutAt = (size: number) =>
    sides.map((side) => {
      ctx.font = `600 ${size}px ${wordFont(side.language)}`;
      const lines = wrapText(measure, side.text, columnWidth, 2);
      const height = 22 + size + 8 + (lines.length - 1) * (size + 6) + (side.reading ? 38 : 0);
      return { ...side, lines, height };
    });
  const totalHeight = (layout: ReturnType<typeof layoutAt>) =>
    layout.reduce((sum, side) => sum + side.height, 0) + 34 * (layout.length - 1);
  const widest = (size: number) =>
    Math.max(
      ...sides.map((side) => {
        ctx.font = `600 ${size}px ${wordFont(side.language)}`;
        return measure(side.text);
      }),
    );
  let size = 60;
  while (size > 40 && widest(size) > columnWidth) size -= 4;
  let layout = layoutAt(size);
  while (size > 28 && blockTop + totalHeight(layout) > wordsBottom) {
    size -= 4;
    layout = layoutAt(size);
  }

  let y = blockTop;
  for (const side of layout) {
    ctx.fillStyle = look.brass;
    ctx.font = `600 22px ${latin}, ${cjk}`;
    ctx.fillText(side.name.toUpperCase(), 96, y + 22);
    ctx.fillStyle = look.ink;
    ctx.font = `600 ${size}px ${wordFont(side.language)}`;
    side.lines.forEach((line, index) => ctx.fillText(line, 96, y + 22 + size + 8 + index * (size + 6)));
    if (side.reading) {
      const readingY = y + 22 + size + 8 + (side.lines.length - 1) * (size + 6) + 38;
      ctx.fillStyle = look.soft;
      ctx.font = `400 26px ${side.language === "zh-TW" ? cjk : latin}`;
      ctx.fillText(wrapText(measure, side.reading, columnWidth, 1)[0], 96, readingY);
    }
    y += side.height + 34;
  }

  /* The QR, on white with its quiet zone, in both looks. */
  const qrTop = blockTop;
  roundedRect(ctx, qrX - 8, qrTop - 8, qrSize + 16, qrSize + 16, 20);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(input.qr, qrX, qrTop, qrSize, qrSize);
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = look.soft;
  ctx.font = `500 24px ${latin}, ${cjk}`;
  ctx.textAlign = "center";
  ctx.fillText(input.scanCaption, qrX + qrSize / 2, qrTop + qrSize + 48);
  ctx.textAlign = "left";

  /*
   * The link, written out, for anyone who cannot scan — a picture opened
   * on the phone that would scan it. Across the foot of the sheet, below
   * both columns, at the largest size that fits the sheet's width.
   */
  const link = input.url.replace(/^https?:\/\//, "");
  let linkSize = 22;
  ctx.font = `400 ${linkSize}px ${mono}`;
  while (linkSize > 14 && ctx.measureText(link).width > 888) {
    linkSize -= 1;
    ctx.font = `400 ${linkSize}px ${mono}`;
  }
  ctx.fillStyle = look.faint;
  ctx.textAlign = "center";
  ctx.fillText(link, 540, 1284);
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No image"))), "image/png");
  });
}
