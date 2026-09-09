"use client";

/* =========================================================
   Where the things worth reading probably are

   This is a heuristic and it is important to say so plainly, because the
   word "detection" invites people to expect more. It does not know what
   text is. It finds bands of the frame whose brightness oscillates the way
   printed lines oscillate, and offers them as places a reader might mean.

   That is the honest ceiling of what can be done here at five frames a
   second. The recogniser this app uses returns a word, not a rectangle —
   it is asked what is in a picture and it answers in language — so there
   are no real boxes to draw. The alternatives were to send frames to a
   server continuously, which contradicts every performance line in the
   spec, or to offer nothing to tap at all.

   Being a heuristic shapes how the result is used. Candidates are drawn as
   quiet corner marks rather than confident boxes; the centre target always
   remains available; and nothing here ever decides what gets recognised —
   it only decides what is easy to point at. A wrong band costs a tap. It
   never costs a wrong answer, because the crop the reader confirms is the
   crop that gets read.
   ========================================================= */

import type { NormalizedRect } from "@/lib/media/geometry";
import { sampleFrame } from "@/lib/scanner/imageAnalysis";

/** How many bands are ever offered. More than this is a debug overlay. */
const MAX_REGIONS = 5;

/** Below this fraction of the frame's height a band is noise. */
const MIN_BAND_HEIGHT = 0.02;

/** Bands closer together than this merge into one. */
const MERGE_GAP = 0.018;

/** A row needs this many crossings of its own mean to look like print. */
const ROW_CROSSINGS = 6;

/** Noise dead band, in grey levels. The same 6 the menu detector uses. */
const DEAD_BAND = 6;

type Band = { top: number; bottom: number; score: number };

/**
 * Rows that oscillate like lines of print, grouped into bands.
 *
 * The row test is the menu scanner's, which has been reading menus in
 * production for months: count how often a row crosses its own average by
 * more than sensor noise. Dark glyph, light paper, dark glyph. A row of
 * tablecloth crosses a handful of times; a row of dish names crosses dozens.
 */
function findBands(
  gray: Float32Array,
  width: number,
  height: number,
): Band[] {
  const bands: Band[] = [];
  let open: Band | null = null;

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width;
    let total = 0;

    for (let x = 0; x < width; x += 1) total += gray[rowStart + x];

    const mean = total / width;
    let crossings = 0;
    let above = gray[rowStart] > mean;

    for (let x = 1; x < width; x += 1) {
      const isAbove = gray[rowStart + x] > mean;

      if (isAbove !== above && Math.abs(gray[rowStart + x] - mean) > DEAD_BAND) {
        crossings += 1;
        above = isAbove;
      }
    }

    if (crossings >= ROW_CROSSINGS) {
      if (open) {
        open.bottom = y;
        open.score += crossings;
      } else {
        open = { top: y, bottom: y, score: crossings };
      }
      continue;
    }

    if (open) {
      bands.push(open);
      open = null;
    }
  }

  if (open) bands.push(open);

  return bands;
}

/**
 * The horizontal extent of a band, with its quiet margins trimmed.
 *
 * A line of text rarely spans the frame; the columns either side of it are
 * flat. Trimming them is what turns a full-width stripe into a rectangle
 * that sits around the words, which is the difference between a candidate
 * worth tapping and a candidate that is just "this row".
 */
function bandExtent(
  gray: Float32Array,
  width: number,
  band: Band,
): { left: number; right: number } {
  const activity = new Float32Array(width);

  for (let y = band.top; y <= band.bottom; y += 1) {
    const rowStart = y * width;

    for (let x = 1; x < width - 1; x += 1) {
      activity[x] += Math.abs(
        gray[rowStart + x + 1] - gray[rowStart + x - 1],
      );
    }
  }

  let peak = 0;
  for (let x = 0; x < width; x += 1) peak = Math.max(peak, activity[x]);

  // A fifth of the busiest column is enough to count as "something here".
  const floor = peak * 0.2;

  let left = 0;
  let right = width - 1;

  while (left < width && activity[left] < floor) left += 1;
  while (right > left && activity[right] < floor) right -= 1;

  return left >= right ? { left: 0, right: width - 1 } : { left, right };
}

/** Bands that nearly touch, joined. Lines of one paragraph, not five words. */
function mergeAdjacent(rects: NormalizedRect[]): NormalizedRect[] {
  if (rects.length < 2) return rects;

  const sorted = [...rects].sort((a, b) => a.y - b.y);
  const merged: NormalizedRect[] = [sorted[0]];

  for (const rect of sorted.slice(1)) {
    const previous = merged[merged.length - 1];
    const gap = rect.y - (previous.y + previous.height);

    /*
     * Merged only when they also overlap horizontally. Two columns of a
     * menu are adjacent vertically and are not one thing; joining them
     * would produce a candidate spanning both, which is exactly the "one
     * enormous box" outcome the spec warns against.
     */
    const overlaps =
      rect.x < previous.x + previous.width && previous.x < rect.x + rect.width;

    if (gap <= MERGE_GAP && overlaps) {
      const left = Math.min(previous.x, rect.x);
      const right = Math.max(
        previous.x + previous.width,
        rect.x + rect.width,
      );

      previous.width = right - left;
      previous.x = left;
      previous.height = rect.y + rect.height - previous.y;
      continue;
    }

    merged.push({ ...rect });
  }

  return merged;
}

/**
 * Candidate targets in a frame, normalised.
 *
 * Returns an empty list freely — no candidates is an ordinary answer for a
 * camera pointed at a wall, and the screen falls back to its centre target.
 */
export function detectRegions(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
): NormalizedRect[] {
  const sampled = sampleFrame(source, sourceWidth, sourceHeight);

  if (!sampled) return [];

  const { gray, width, height } = sampled;

  const rects = findBands(gray, width, height)
    .map((band) => {
      const { left, right } = bandExtent(gray, width, band);

      return {
        rect: {
          x: left / width,
          y: band.top / height,
          width: (right - left + 1) / width,
          height: (band.bottom - band.top + 1) / height,
        },
        score: band.score,
      };
    })
    .filter((candidate) => candidate.rect.height >= MIN_BAND_HEIGHT);

  /*
   * Ranked before merging and cut after, so the strongest bands survive but
   * the ones that survive are whole paragraphs rather than the top lines of
   * five different ones.
   */
  const merged = mergeAdjacent(
    rects
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_REGIONS * 3)
      .map((candidate) => candidate.rect),
  );

  return merged
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, MAX_REGIONS);
}
