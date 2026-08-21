import {
  itemNames,
  sectionTitle,
  type MenuDocument,
  type MenuRegion,
} from "@/lib/scanner/menuTypes";

/*
 * The rebuilt menu: the photograph with its own text replaced.
 *
 * Region by region rather than by regenerating the picture. For each line the
 * reader found, the background immediately around it is sampled, the line is
 * painted out in that colour, and the translation is drawn back in the ink
 * colour the original used — so the paper, the photographs, the logo and the
 * borders survive untouched, and only the words change.
 *
 * This is honest about what it can do. A menu printed on flat card comes back
 * looking printed; one photographed over a wood grain or a gradient comes back
 * with visible patches. That is why it is a view you can switch away from
 * rather than the only answer, and why the overlay it sits beside stays.
 *
 * Everything here is language-neutral: it draws whatever strings the document
 * carries, in whatever script, at whatever size fits.
 */

// The rebuild is drawn at the photo's own resolution, capped so a 12-megapixel
// capture does not put a 48MB canvas on a phone.
const MAX_CANVAS_EDGE = 2000;

const MIN_FONT_PX = 7;
// Roughly the cap-height-to-line-height ratio of a printed menu line.
const FONT_TO_BAND = 0.62;

type Rgb = { r: number; g: number; b: number };

function toCss({ r, g, b }: Rgb) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function luminance({ r, g, b }: Rgb) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function medianColour(samples: Rgb[]): Rgb {
  if (samples.length === 0) return { r: 255, g: 255, b: 255 };

  const byLuma = [...samples].sort((a, b) => luminance(a) - luminance(b));
  return byLuma[Math.floor(byLuma.length / 2)];
}

/**
 * The colour of the paper around a line.
 *
 * Sampled from a ring just outside the region rather than from inside it: the
 * inside is mostly ink, and averaging that in produces a grey smear where the
 * line used to be. The median rather than the mean, so one dark pixel of a
 * neighbouring glyph cannot drag the fill colour with it.
 */
function sampleBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rect: { x: number; y: number; w: number; h: number },
): Rgb {
  const samples: Rgb[] = [];
  const band = Math.max(2, Math.round(rect.h * 0.35));

  const read = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;

    const offset = (y * width + x) * 4;
    samples.push({
      r: data[offset],
      g: data[offset + 1],
      b: data[offset + 2],
    });
  };

  const step = Math.max(1, Math.round(rect.w / 40));

  for (let x = rect.x; x < rect.x + rect.w; x += step) {
    for (let d = 1; d <= band; d += 1) {
      read(Math.round(x), Math.round(rect.y - d));
      read(Math.round(x), Math.round(rect.y + rect.h + d));
    }
  }

  for (let d = 1; d <= band; d += 1) {
    for (let y = rect.y; y < rect.y + rect.h; y += step) {
      read(Math.round(rect.x - d), Math.round(y));
      read(Math.round(rect.x + rect.w + d), Math.round(y));
    }
  }

  return medianColour(samples);
}

/**
 * The colour the line was printed in.
 *
 * Taken from the pixels furthest from the paper colour inside the region —
 * the darkest tenth on a light menu, the lightest tenth on a dark one — so a
 * white-on-black board comes back white on black rather than black on black.
 */
function sampleInk(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rect: { x: number; y: number; w: number; h: number },
  background: Rgb,
): Rgb {
  const samples: Rgb[] = [];
  const stepX = Math.max(1, Math.round(rect.w / 60));
  const stepY = Math.max(1, Math.round(rect.h / 12));

  for (let y = rect.y; y < rect.y + rect.h; y += stepY) {
    for (let x = rect.x; x < rect.x + rect.w; x += stepX) {
      const px = Math.round(x);
      const py = Math.round(y);
      if (px < 0 || py < 0 || px >= width || py >= height) continue;

      const offset = (py * width + px) * 4;
      samples.push({
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
      });
    }
  }

  if (samples.length === 0) return { r: 20, g: 20, b: 20 };

  const backgroundIsLight = luminance(background) > 127;
  const sorted = samples.sort((a, b) => luminance(a) - luminance(b));
  const index = backgroundIsLight
    ? Math.floor(sorted.length * 0.05)
    : Math.floor(sorted.length * 0.95);

  const ink = sorted[Math.min(sorted.length - 1, Math.max(0, index))];

  // A line whose ink and paper are nearly the same colour was probably not
  // text at all; fall back to something readable rather than invisible.
  if (Math.abs(luminance(ink) - luminance(background)) < 24) {
    return backgroundIsLight ? { r: 20, g: 20, b: 20 } : { r: 245, g: 245, b: 245 };
  }

  return ink;
}

function fontStack(size: number) {
  /*
   * One stack for every script the app can be asked to draw. Latin faces
   * first for languages that have them, CJK behind so Chinese and Japanese
   * resolve rather than falling through to the missing-glyph box — the same
   * ordering problem this app fixed once already in CSS.
   */
  return `600 ${size}px system-ui, -apple-system, "Helvetica Neue", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
}

/** Largest size at or below `start` that fits `text` into `maxWidth`. */
function fitFontSize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start: number,
): number {
  let size = start;

  while (size > MIN_FONT_PX) {
    context.font = fontStack(size);
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 1;
  }

  return MIN_FONT_PX;
}

function toRect(region: MenuRegion, width: number, height: number) {
  return {
    x: region.x * width,
    y: region.y * height,
    w: region.width * width,
    h: region.height * height,
  };
}

export type ReconstructionResult = {
  canvas: HTMLCanvasElement;
  // Lines the rebuild painted. Below about a third of the document it is
  // worth telling the user the picture is mostly the original.
  drawn: number;
  total: number;
};

/**
 * Draws the rebuilt menu, or returns null if the photo cannot be read back
 * out of the canvas (a tainted canvas, a zero-sized image).
 */
export function reconstructMenu(
  image: HTMLImageElement,
  document_: MenuDocument,
  targetLanguage: string,
): ReconstructionResult | null {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) return null;

  const scale = Math.min(1, MAX_CANVAS_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, width, height);

  let pixels: Uint8ClampedArray;

  try {
    pixels = context.getImageData(0, 0, width, height).data;
  } catch {
    // A cross-origin photo would taint the canvas. Nothing to rebuild from.
    return null;
  }

  /*
   * Two passes, and the order matters.
   *
   * Every patch is painted before any word is written. Done line by line, the
   * patch for one dish lands on top of the heading written a moment earlier
   * and shears the letters off it — which is exactly what happened to
   * "Appetizers" sitting directly above its first dish.
   *
   * Sampling is unaffected either way: the pixel data was snapshotted before
   * anything was drawn, so every colour comes from the original photograph.
   */
  type Line = {
    rect: { x: number; y: number; w: number; h: number };
    left: string;
    right: string;
    fontBand: number;
    leftWidthFraction?: number;
    background: Rgb;
    ink: Rgb;
  };

  const lines: Line[] = [];
  let total = 0;

  const plan = (
    region: MenuRegion,
    left: string,
    right: string,
    /*
     * The type size, as a fraction of the image height — given rather than
     * derived, because a heading's patch is often thinner than the heading
     * itself and sizing the words to the patch is what made them shrink to
     * nothing on a photograph taken at an angle.
     */
    fontBand: number,
    /*
     * How far the left-hand text may run, as a fraction of the image width.
     * A section heading's measured region is only as wide as the words that
     * were printed there, and a translation is usually longer. There is blank
     * paper to the right of a heading, so it may use it.
     */
    leftWidthFraction?: number,
  ) => {
    total += 1;

    const rect = toRect(region, width, height);
    if (rect.w < 8 || rect.h < 5) return;

    const background = sampleBackground(pixels, width, height, rect);

    lines.push({
      rect,
      left,
      right,
      fontBand,
      leftWidthFraction,
      background,
      ink: sampleInk(pixels, width, height, rect, background),
    });
  };

  for (const section of document_.sections) {
    const heading = sectionTitle(section, targetLanguage);

    if (heading) {
      /*
       * Where the heading actually sits.
       *
       * Models are inconsistent about what a section's region means: some
       * return the heading line, others the whole block of dishes it groups.
       * Both agree on the top edge, and both agree that the first dish is
       * below the heading — so the band runs from the region's top down to
       * whichever comes first, its own bottom or that dish. Painting the
       * whole region blindly would erase the dishes on the second reading.
       */
      const firstItem = section.items[0];
      const regionBottom = section.region.y + section.region.height;
      const bottom = firstItem
        ? Math.min(regionBottom, firstItem.region.y)
        : regionBottom;

      // Named apart from the canvas height it would otherwise shadow.
      const bandHeight = bottom - section.region.y;

      // Below this the band is a sliver the model drew around nothing.
      if (bandHeight > 0.012) {
        const itemHeights = section.items
          .map((item) => item.region.height)
          .sort((a, b) => a - b);

        const medianItem =
          itemHeights.length > 0
            ? itemHeights[Math.floor(itemHeights.length / 2)]
            : bandHeight;

        const widest = section.items.reduce(
          (value, item) => Math.max(value, item.region.width),
          section.region.width,
        );

        // A heading is never smaller than the dishes under it. Its own band
        // decides the patch; the dishes decide the type.
        plan(
          {
            x: section.region.x,
            y: section.region.y,
            width: section.region.width,
            height: bandHeight,
          },
          heading,
          "",
          Math.max(bandHeight, medianItem * 0.85),
          Math.min(widest, 1 - section.region.x),
        );
      }
    }

    for (const item of section.items) {
      const { primary } = itemNames(item, targetLanguage);
      plan(item.region, primary, item.price, item.region.height);
    }
  }

  // Pass one: erase.
  for (const line of lines) {
    const { rect } = line;

    /*
     * The patch runs a little past the measured line on every side. A region
     * that clips the top of the glyphs leaves a row of severed ascenders
     * above the replacement, which reads as a printing fault rather than a
     * translation.
     */
    const padX = Math.max(1, rect.h * 0.12);
    const padY = Math.max(1, rect.h * 0.16);

    context.fillStyle = toCss(line.background);
    context.fillRect(
      rect.x - padX,
      rect.y - padY,
      rect.w + padX * 2,
      rect.h + padY * 2,
    );
  }

  // Pass two: write.
  for (const line of lines) {
    const { rect, left, right } = line;
    const padX = Math.max(1, rect.h * 0.12);

    context.fillStyle = toCss(line.ink);
    context.textBaseline = "middle";

    const centreY = rect.y + rect.h / 2;
    const bandFont = Math.max(
      MIN_FONT_PX,
      line.fontBand * height * FONT_TO_BAND,
    );

    let rightWidth = 0;

    if (right) {
      const rightSize = fitFontSize(context, right, rect.w * 0.4, bandFont);
      context.font = fontStack(rightSize);
      rightWidth = context.measureText(right).width;

      context.textAlign = "right";
      context.fillText(right, rect.x + rect.w, centreY);
    }

    if (left) {
      const room = line.leftWidthFraction
        ? line.leftWidthFraction * width
        : rect.w;
      const available = room - (rightWidth ? rightWidth + rect.h * 0.5 : 0);
      const leftSize = fitFontSize(context, left, available, bandFont);
      context.font = fontStack(leftSize);

      context.textAlign = "left";

      /*
       * Clipped horizontally so a long name cannot run into the price, and
       * deliberately not clipped vertically: a heading drawn larger than the
       * patch it replaced is normal, and bounding it to the patch sheared the
       * tops off the letters.
       */
      context.save();
      context.beginPath();
      context.rect(
        rect.x - padX,
        rect.y - rect.h * 1.5,
        available + padX,
        rect.h * 4,
      );
      context.clip();
      context.fillText(left, rect.x, centreY);
      context.restore();
    }
  }

  const drawn = lines.length;

  return { canvas, drawn, total };
}
