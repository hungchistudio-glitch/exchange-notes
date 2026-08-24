/**
 * Writes every file that carries the Exchange Notes logo.
 *
 *   npm run generate:brand
 *
 * The brand asset tree under public/brand, the favicon and app icons in app/,
 * and the PWA icons the manifest points at are all generated — none of them
 * is hand-drawn. Change a number in lib/brand/exchangeNotesLogo.ts, run this,
 * and every surface the mark appears on moves together. Editing one of the
 * output files by hand puts that surface out of step with the rest until the
 * next run silently overwrites it.
 *
 * This is §28's pipeline: one geometry, one canonical SVG, one React
 * component, light/dark colour tokens, and automated raster exports from the
 * same source.
 *
 * Rasterising uses sharp, which reaches this project as one of Next's own
 * dependencies and is declared in devDependencies so that this script does
 * not quietly depend on someone else's install tree.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  renderFaviconSvg,
  renderLogoSvg,
} from "../lib/brand/exchangeNotesLogoSvg.ts";
import { LOGO_COLORS } from "../lib/brand/exchangeNotesLogo.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brand = path.join(root, "public", "brand");

const written = [];

async function write(relativePath, contents) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
  written.push({ relativePath, bytes: contents.length });
}

/**
 * SVG to PNG.
 *
 * `density` is set from the requested size rather than left at the default
 * 72dpi: librsvg rasterises at the document's own size first and then sharp
 * resizes, so a 1024px icon rendered from a 512-unit document at 72dpi is
 * upscaled from 512 and lands soft. Rendering at the right density instead
 * keeps every edge on the curve.
 */
async function png(svg, size, { opaque = false } = {}) {
  const pipeline = sharp(Buffer.from(svg), {
    density: Math.max(72, (size / 512) * 96),
  }).resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  /*
   * App icons drop their alpha channel entirely. The artwork is opaque
   * already — it is a filled square — but an icon that merely *happens* to be
   * opaque still carries an alpha channel that iOS and Android will honour if
   * anything ever punches through it, and a maskable icon with a transparent
   * pixel shows a seam inside the OS's crop. Favicons keep their alpha: they
   * are drawn on a tab strip whose colour is not ours.
   */
  return (opaque ? pipeline.removeAlpha() : pipeline)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Where the app icon's artwork lives. Every icon size is resampled from it. */
const ICON_MASTER = "public/brand/app-icon/icon-master-1024.png";

/*
 * Two framings of the same artwork, because two platforms crop it
 * differently and one framing cannot satisfy both.
 *
 * Measured on the master: the carved symbol is 694 x 772 of its 1024, so
 * 67.8% wide, centred at (504, 509), and its farthest point is 392px from
 * the centre.
 *
 * HOME lifts that to the 74% width the icon needs to carry the same visual
 * weight as the apps it sits beside on a Home Screen — a 1.09x zoom into the
 * slab, which also takes the artwork's own corners out of the frame. iOS
 * masks with a squircle and keeps everything but the corners, so a symbol
 * reaching 428px from the centre is never touched.
 *
 * MASKABLE keeps the wider framing, because Android guarantees only the
 * inner 80% circle — radius 409.6 — and 392 fits inside it where 428 does
 * not. A launcher that crops to a circle would otherwise clip the arc.
 */
const HOME_ZOOM = 0.74 / 0.678;
const SYMBOL_CENTRE = { x: 504, y: 509 };

/**
 * One icon size, resampled from the master artwork.
 *
 * Lanczos rather than the default, because this is a photograph of stone
 * being reduced by up to 5.7x and the texture is the point — a cheaper
 * kernel turns the grain into mush at 192. Alpha is dropped for the same
 * reason app icons always drop it: a maskable icon with a transparent pixel
 * shows a seam inside the platform's crop.
 *
 * Palette-quantised, which takes the 512 from 442 KB to 117 KB. These are
 * downloaded by every install, and at icon size the difference is not
 * visible — 256 colours is generous for a monochrome slab. The master keeps
 * its full depth; it is the archive, not the payload.
 */
async function iconPng(master, size, { zoom = 1 } = {}) {
  const pipeline = sharp(master);

  if (zoom !== 1) {
    /*
     * Zooming is a crop, centred on the symbol rather than on the canvas, so
     * the mark stays centred as the stone around it is trimmed.
     */
    const side = Math.round(1024 / zoom);
    const half = Math.round(side / 2);
    const left = Math.max(0, Math.min(1024 - side, SYMBOL_CENTRE.x - half));
    const top = Math.max(0, Math.min(1024 - side, SYMBOL_CENTRE.y - half));
    pipeline.extract({ left, top, width: side, height: side });
  }

  return pipeline
    .resize(size, size, { fit: "cover", kernel: "lanczos3" })
    .removeAlpha()
    .toColourspace("srgb")
    .png({ palette: true, quality: 90, effort: 10 })
    .toBuffer();
}

/**
 * A .ico holding PNG payloads — the format Vista and everything since reads,
 * and small enough to be worth writing here rather than taking a dependency
 * for. Three sizes, because this file exists for the browsers that will not
 * take app/icon.svg and those are the ones that pick from the ico's table.
 */
async function ico(sizes, svg) {
  const images = await Promise.all(sizes.map((size) => png(svg, size)));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const directory = images.map((image, index) => {
    const entry = Buffer.alloc(16);
    // 0 means 256 in this field; every size we emit is smaller than that.
    entry.writeUInt8(sizes[index] % 256, 0);
    entry.writeUInt8(sizes[index] % 256, 1);
    entry.writeUInt8(0, 2); // palette size, unused for PNG payloads
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(image.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.length;
    return entry;
  });

  return Buffer.concat([header, ...directory, ...images]);
}

const README = `# Exchange Notes brand assets

Generated by \`npm run generate:brand\`. Do not edit these by hand — the
geometry lives in \`lib/brand/exchangeNotesLogo.ts\` and every file here is
written from it.

The mark is a ~44% wide symbol inside a large field of negative space. That
proportion is part of the identity: do not enlarge it to fill an icon, and do
not shrink the surrounding space.

| Path | What it is |
| --- | --- |
| \`exchange-notes-mark.svg\` | The canonical master. Painted in \`currentColor\`, so it takes the colour of whatever it is placed in. |
| \`light/exchange-notes-mark-light.svg\` | Light-surface logo — \`${LOGO_COLORS.markLight}\`, no canvas. |
| \`dark/exchange-notes-mark-dark.svg\` | Dark-surface logo — \`${LOGO_COLORS.markDark}\`, no canvas. Identical geometry to the light one; only the colour differs. |
| \`monochrome/exchange-notes-black.svg\` | Single-colour pure black, for print and one-ink output. |
| \`monochrome/exchange-notes-white.svg\` | Single-colour pure white, for the same. |
| \`micro/exchange-notes-micro.svg\` | The 16–24px drawing. Same proportions; the catchlight is dropped because below ~24px it lands on under half a pixel. |
| \`app-icon/icon-master-1024.png\` | **The app icon's source of truth.** Rendered artwork — a charcoal slate slab with the mark carved into it — cropped to the slab's own surface so it reaches all four edges. Not generated from the vector; see below. |
| \`app-icon/icon-512.png\`, \`icon-192.png\` | Home Screen framing — the symbol at 74% of the canvas, so it carries the same weight as the apps beside it. Square and opaque; the platform supplies the rounding. |
| \`app-icon/maskable-512.png\`, \`maskable-192.png\` | Android's maskable framing — pulled back so the symbol sits inside the inner 80% circle every launcher mask keeps. |
| \`favicon/favicon.svg\` | The micro mark on transparency, switching ink with \`prefers-color-scheme\`. Shipped as \`app/icon.svg\`. |
| \`favicon/favicon-32.png\`, \`favicon/favicon-16.png\` | Raster fallbacks, also bundled into \`app/favicon.ico\`. |

Also written outside this directory, from the same geometry:
\`app/icon.svg\`, \`app/apple-icon.png\`, \`app/favicon.ico\`.

## Why the app icon is not generated from the vector

Everything else here is drawn from \`lib/brand/exchangeNotesLogo.ts\`. The app
icon is not. It is a rendered stone slab with the mark carved into it, and no
amount of SVG would produce its texture, bevel or contact shadow — so the
master PNG is the source and every size is a resample of that one file. That
is what keeps the symbol identical at every resolution rather than subtly
different per export.

The favicon stays vector. At 16px a photograph of stone is mud; the vector
mark is the same geometry in one colour, which is what survives that size.

## Why the maskable icon is a separate file

Measured on the master, the carved symbol is 67.8% of the canvas and reaches
38.3% of the way out from the centre. Android guarantees only the inner 80%
circle — 40% radius — so that framing is safe, but it reads small on an iOS
Home Screen next to apps whose glyphs fill three quarters of their tile.

The Home Screen framing zooms 1.09x to put the symbol at 74%, which takes it
41.6% out from the centre. iOS masks with a squircle and keeps everything but
the corners, so nothing is lost there; a circular Android mask would clip the
arc. Hence two framings of one master rather than one file used twice.

## Why there is no PDF master

A vector PDF is a design-tool export, and every route to one from this script
would rasterise the mark on the way — which is the one thing a master must not
do. Open \`exchange-notes-mark.svg\` in Illustrator, Figma or Affinity and
export the PDF from there.
`;

async function main() {
  await mkdir(brand, { recursive: true });

  // The canonical master. currentColor, full detail, no canvas.
  await write("public/brand/exchange-notes-mark.svg", renderLogoSvg());

  await write(
    "public/brand/light/exchange-notes-mark-light.svg",
    renderLogoSvg({ color: LOGO_COLORS.markLight }),
  );
  await write(
    "public/brand/dark/exchange-notes-mark-dark.svg",
    renderLogoSvg({ color: LOGO_COLORS.markDark }),
  );

  await write(
    "public/brand/monochrome/exchange-notes-black.svg",
    renderLogoSvg({ color: "#000000" }),
  );
  await write(
    "public/brand/monochrome/exchange-notes-white.svg",
    renderLogoSvg({ color: "#ffffff" }),
  );

  await write(
    "public/brand/micro/exchange-notes-micro.svg",
    renderLogoSvg({ tier: "micro", size: 64 }),
  );

  /*
   * The app icon is artwork, not geometry.
   *
   * Every other file here is drawn from lib/brand/exchangeNotesLogo.ts. The
   * icon is not: it is a rendered stone slab with the mark carved into it,
   * and no amount of SVG would produce its texture, its bevel or its contact
   * shadow. So the master PNG is the source, and every size below is a
   * resample of that one file — which is what keeps the symbol identical at
   * every resolution instead of subtly different per export.
   *
   * The master is already cropped to the slab's own surface, so the artwork
   * reaches all four edges and the platform's mask supplies the only
   * rounding. Nothing here adds a corner radius; a shape rounded twice shows
   * a lighter seam inside iOS's squircle.
   */
  const master = await readFile(path.join(root, ICON_MASTER));

  /*
   * No 1024 export: icon-master-1024.png already is one, at full depth. A
   * resampled copy of a file at its own size is a second name for the same
   * picture, and the README points at the master for anyone who needs it.
   */
  for (const size of [512, 192]) {
    await write(
      `public/brand/app-icon/icon-${size}.png`,
      await iconPng(master, size, { zoom: HOME_ZOOM }),
    );
    await write(
      `public/brand/app-icon/maskable-${size}.png`,
      await iconPng(master, size),
    );
  }

  const favicon = renderFaviconSvg();
  await write("public/brand/favicon/favicon.svg", favicon);
  await write("public/brand/favicon/favicon-32.png", await png(favicon, 32));
  await write("public/brand/favicon/favicon-16.png", await png(favicon, 16));

  await write("public/brand/README.md", README);

  /*
   * The three files Next serves from app/ by file convention. They are copies
   * of assets above rather than a second drawing — same geometry, same run.
   * This is what §19 means by integrating with the App Router's own icon
   * conventions instead of standing up a competing set under /public.
   */
  await write("app/icon.svg", favicon);
  await write(
    "app/apple-icon.png",
    await iconPng(master, 180, { zoom: HOME_ZOOM }),
  );
  await write("app/favicon.ico", await ico([16, 32, 48], favicon));

  const total = written.reduce((sum, file) => sum + file.bytes, 0);
  for (const file of written) {
    console.log(
      `  ${file.relativePath.padEnd(52)} ${String(file.bytes).padStart(8)} bytes`,
    );
  }
  console.log(`\n${written.length} files, ${(total / 1024).toFixed(1)} KB.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
