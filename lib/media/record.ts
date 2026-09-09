/* =========================================================
   What a saved word remembers about the picture it came from

   One jsonb column rather than ten flat ones, and for a specific reason:
   none of this is ever queried. Nothing filters words by mime type or sorts
   them by stored height — it is read whole, with the row, to put a picture
   on a card. Ten columns would be ten migrations' worth of surface area for
   a thing that is always fetched together.

   The shape is versioned and deliberately says nothing about who did the
   recognising. The spec's warning is the right one: recognition providers
   have shorter lives than the memories readers keep, and an image record
   shaped like one vendor's response is a migration waiting to happen the
   day that vendor changes. `recognition` is a small, open bag for whatever
   a provider wants to leave behind; nothing in the app reads it to render.
   ========================================================= */

import type { NormalizedRect } from "@/lib/media/geometry";

/** Where the picture came from. */
export type MediaSourceType = "camera" | "photo" | "file";

export type MediaDimensions = { width: number; height: number };

export type VocabularyMedia = {
  /** The shape of this record, so a later change can find the old ones. */
  version: 1;

  sourceType: MediaSourceType;

  /**
   * Storage paths, not URLs.
   *
   * A URL bakes in the bucket's visibility and the project's hostname, and
   * the bucket became private — every existing row that stored a public URL
   * is now a broken image that has to be parsed back into a path. Storing
   * the path means the URL is decided at read time, by whoever is reading.
   */
  sourcePath: string;
  cardPath: string;

  /** The target, as a fraction of the retained source. */
  targetRect: NormalizedRect;

  /** What came off the camera or out of the file, before any reduction. */
  originalDimensions: MediaDimensions;
  /** What was actually kept, after fitting to SOURCE_MAX_EDGE. */
  storedDimensions: MediaDimensions;

  mimeType: string;
  compressionVersion: number;
  createdAt: string;

  /**
   * Whatever the recogniser wanted to leave behind.
   *
   * Deliberately untyped beyond "an object". Nothing renders from it; it
   * exists so a future feature can find out how a crop was arrived at
   * without today's provider getting a say in the schema.
   */
  recognition?: Record<string, unknown>;

  /** The originating file's name, where a file is what this came from. */
  sourceFileName?: string;
  /** The page a document render came from, one-based. */
  sourcePage?: number;
};

const SOURCE_TYPES: readonly MediaSourceType[] = ["camera", "photo", "file"];

function isRect(value: unknown): value is NormalizedRect {
  if (!value || typeof value !== "object") return false;

  const rect = value as Record<string, unknown>;

  return (["x", "y", "width", "height"] as const).every(
    (key) => typeof rect[key] === "number" && Number.isFinite(rect[key]),
  );
}

function isDimensions(value: unknown): value is MediaDimensions {
  if (!value || typeof value !== "object") return false;

  const size = value as Record<string, unknown>;

  return (
    typeof size.width === "number" &&
    typeof size.height === "number" &&
    size.width > 0 &&
    size.height > 0
  );
}

/**
 * A media record read back off a row, or null.
 *
 * Null for a legacy row that has none, and null for one whose record does
 * not parse — a half-written record is not a reason to fail a whole word.
 * The caller falls back to `image_url`, which is what every row saved
 * before this feature has.
 */
export function readMedia(value: unknown): VocabularyMedia | null {
  if (!value || typeof value !== "object") return null;

  const media = value as Record<string, unknown>;

  if (media.version !== 1) return null;

  if (
    typeof media.sourcePath !== "string" ||
    typeof media.cardPath !== "string" ||
    !media.sourcePath ||
    !media.cardPath
  ) {
    return null;
  }

  if (!SOURCE_TYPES.includes(media.sourceType as MediaSourceType)) return null;
  if (!isRect(media.targetRect)) return null;
  if (!isDimensions(media.originalDimensions)) return null;
  if (!isDimensions(media.storedDimensions)) return null;

  return {
    version: 1,
    sourceType: media.sourceType as MediaSourceType,
    sourcePath: media.sourcePath,
    cardPath: media.cardPath,
    targetRect: media.targetRect,
    originalDimensions: media.originalDimensions,
    storedDimensions: media.storedDimensions,
    mimeType:
      typeof media.mimeType === "string" ? media.mimeType : "image/jpeg",
    compressionVersion:
      typeof media.compressionVersion === "number"
        ? media.compressionVersion
        : 0,
    createdAt:
      typeof media.createdAt === "string"
        ? media.createdAt
        : new Date(0).toISOString(),
    recognition:
      media.recognition && typeof media.recognition === "object"
        ? (media.recognition as Record<string, unknown>)
        : undefined,
    sourceFileName:
      typeof media.sourceFileName === "string"
        ? media.sourceFileName
        : undefined,
    sourcePage:
      typeof media.sourcePage === "number" ? media.sourcePage : undefined,
  };
}

/** The bucket every vocabulary picture lives in, old and new alike. */
export const VOCABULARY_BUCKET = "vocabulary-images";

/**
 * The storage path inside a legacy public URL.
 *
 * Every word saved before this feature stored a public URL in `image_url`,
 * and the bucket those point into is no longer public. The path is still in
 * there, though, which is what makes the migration a read-time concern
 * rather than a rewrite of everyone's rows: pull it out, sign it, and a
 * three-month-old word renders exactly as it did.
 *
 * Returns null for anything that is not one of ours — a data URL, an
 * absolute URL to somewhere else — which the caller passes through
 * untouched.
 */
export function pathFromLegacyUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${VOCABULARY_BUCKET}/`;
  const index = url.indexOf(marker);

  if (index === -1) return null;

  const path = url.slice(index + marker.length).split("?")[0];

  return path ? decodeURIComponent(path) : null;
}

/**
 * Every storage path a row is responsible for.
 *
 * What deletion consults, so that "which files does this word own" is
 * answered in one place rather than by each caller remembering that there
 * are two of them now.
 */
export function ownedPaths(
  media: VocabularyMedia | null,
  imageUrl: string | null,
): string[] {
  if (media) return [media.sourcePath, media.cardPath];

  const legacy = imageUrl ? pathFromLegacyUrl(imageUrl) : null;

  return legacy ? [legacy] : [];
}
