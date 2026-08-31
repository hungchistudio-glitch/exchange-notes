/*
 * Two cheap read-outs of a camera frame: is this a document, and is this
 * photo good enough to read.
 *
 * Both run on a downscaled grayscale copy — 192 pixels on the long edge, so
 * roughly 25k samples per pass. That is small enough to run five times a
 * second beside a live camera without the preview dropping frames, which is
 * the only reason detection is allowed to exist at all.
 *
 * Neither of these is a classifier. Detection decides whether to draw a
 * "menu detected" marker, never whether the shutter works; quality decides
 * whether to *offer* a retake, never to force one.
 */

const ANALYSIS_EDGE = 192;

// Two consecutive agreeing frames to lock on, four to let go. Hysteresis,
// because a marker that flickers while the user is lining up a shot is worse
// than no marker at all.
export const DETECTION_LOCK_FRAMES = 2;
export const DETECTION_RELEASE_FRAMES = 4;

export type FrameAnalysis = {
  // 0–1. How much of the frame reads as lines of printed text.
  textDensity: number;
  meanLuminance: number;
  // 0–1. Fraction of pixels blown out to near-white — a glossy menu under a
  // ceiling light.
  glare: number;
  // Variance of a cheap Laplacian. Low means soft focus or motion.
  sharpness: number;
  looksLikeDocument: boolean;
};

export type QualityVerdict = {
  usable: boolean;
  reason: "dark" | "glare" | "blur" | null;
};

let analysisCanvas: HTMLCanvasElement | null = null;

function getAnalysisContext(width: number, height: number) {
  if (!analysisCanvas) {
    analysisCanvas = document.createElement("canvas");
  }

  analysisCanvas.width = width;
  analysisCanvas.height = height;

  // willReadFrequently: every one of these frames is read straight back out,
  // which is the case the flag exists for.
  return analysisCanvas.getContext("2d", { willReadFrequently: true });
}

function toGrayscale(data: Uint8ClampedArray, pixelCount: number) {
  const gray = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * 4;
    gray[i] =
      data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
  }

  return gray;
}

/**
 * One frame, downscaled to grayscale samples.
 *
 * Split out of analyseFrame so that region detection can read the same
 * 192-pixel copy rather than making a second one. Two passes over one small
 * buffer is affordable beside a live preview; two draws and two
 * getImageData calls at five frames a second is not, and the whole reason
 * this analysis is allowed to exist is that it stays cheap.
 *
 * Returns null when the source has no pixels yet — a video element that has
 * not reached its first frame reports 0×0, and drawing it throws.
 */
export function sampleFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
): { gray: Float32Array; width: number; height: number } | null {
  if (!sourceWidth || !sourceHeight) return null;

  const scale = ANALYSIS_EDGE / Math.max(sourceWidth, sourceHeight);
  const width = Math.max(16, Math.round(sourceWidth * scale));
  const height = Math.max(16, Math.round(sourceHeight * scale));

  const context = getAnalysisContext(width, height);
  if (!context) return null;

  try {
    context.drawImage(source, 0, 0, width, height);
  } catch {
    return null;
  }

  const { data } = context.getImageData(0, 0, width, height);

  return { gray: toGrayscale(data, width * height), width, height };
}

/**
 * Reads one frame from a video or image element.
 *
 * Returns null when the source has no pixels yet — a video element that has
 * not reached its first frame reports 0×0, and drawing it throws.
 */
export function analyseFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
): FrameAnalysis | null {
  const sampled = sampleFrame(source, sourceWidth, sourceHeight);

  if (!sampled) return null;

  const { gray, width, height } = sampled;
  const pixelCount = width * height;

  let luminanceTotal = 0;
  let glarePixels = 0;

  for (let i = 0; i < pixelCount; i += 1) {
    luminanceTotal += gray[i];
    if (gray[i] > 248) glarePixels += 1;
  }

  const meanLuminance = luminanceTotal / pixelCount;

  /*
   * Text density, one row at a time.
   *
   * Printed text is a row that crosses back and forth over its own local
   * average many times: dark glyph, light paper, dark glyph. A photograph of
   * a plate crosses a handful of times; a page of dish names crosses dozens.
   * Counting sign changes is the cheapest description of that difference that
   * still tells the two apart.
   */
  let textRows = 0;
  let sharpnessTotal = 0;
  let sharpnessSamples = 0;

  const firstRow = Math.round(height * 0.1);
  const lastRow = Math.round(height * 0.9);

  for (let y = firstRow; y < lastRow; y += 1) {
    const rowStart = y * width;
    let rowTotal = 0;

    for (let x = 0; x < width; x += 1) rowTotal += gray[rowStart + x];

    const rowMean = rowTotal / width;
    let crossings = 0;
    let above = gray[rowStart] > rowMean;

    for (let x = 1; x < width; x += 1) {
      const isAbove = gray[rowStart + x] > rowMean;

      // A 6-level dead band, so sensor noise on flat paper is not a crossing.
      if (isAbove !== above && Math.abs(gray[rowStart + x] - rowMean) > 6) {
        crossings += 1;
        above = isAbove;
      }

      if (y % 4 === 0 && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const laplacian =
          4 * gray[rowStart + x] -
          gray[rowStart + x - 1] -
          gray[rowStart + x + 1] -
          gray[rowStart - width + x] -
          gray[rowStart + width + x];

        sharpnessTotal += laplacian * laplacian;
        sharpnessSamples += 1;
      }
    }

    // Six crossings across ~190 samples is about four words of print.
    if (crossings >= 6) textRows += 1;
  }

  const scannedRows = Math.max(1, lastRow - firstRow);
  const textDensity = textRows / scannedRows;
  const sharpness =
    sharpnessSamples > 0 ? sharpnessTotal / sharpnessSamples : 0;

  return {
    textDensity,
    meanLuminance,
    glare: glarePixels / pixelCount,
    sharpness,
    looksLikeDocument:
      textDensity > 0.32 && meanLuminance > 42 && meanLuminance < 246,
  };
}

/**
 * Whether the captured photo is worth offering a retake for.
 *
 * Deliberately generous. The cost of a false "this is fine" is one wasted
 * scan; the cost of nagging about a photo that would have read perfectly is
 * that the warning gets ignored the next time it is right.
 */
export function assessQuality(analysis: FrameAnalysis | null): QualityVerdict {
  if (!analysis) return { usable: true, reason: null };

  if (analysis.meanLuminance < 38) return { usable: false, reason: "dark" };
  if (analysis.glare > 0.18) return { usable: false, reason: "glare" };
  if (analysis.sharpness < 55) return { usable: false, reason: "blur" };

  return { usable: true, reason: null };
}
