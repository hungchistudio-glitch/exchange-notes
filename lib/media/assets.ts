"use client";

/* =========================================================
   Getting the two pictures into storage, and out again

   The lifecycle the spec asks for, in one place. A capture produces blobs
   that live in memory and belong to nobody; only a save promotes them to
   files. Nothing is written to storage before there is a row that will
   point at it, which is what makes cancellation free — a reader who backs
   out of the camera leaves nothing behind because nothing was ever created.

   That is a change of order rather than an addition. The capture screen
   used to upload first and insert second, and clean up the upload if the
   insert failed — which works right up until the tab closes between the
   two, and leaves an image nothing will ever point at or delete.
   ========================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";

import { COMPRESSION_VERSION } from "@/lib/media/config";
import type { NormalizedRect } from "@/lib/media/geometry";
import type { EncodedImage } from "@/lib/media/raster";
import {
  VOCABULARY_BUCKET,
  type MediaSourceType,
  type VocabularyMedia,
} from "@/lib/media/record";

/**
 * A finished capture, still entirely in memory.
 *
 * Held by the screen between "the reader has a result" and "the reader
 * pressed save". Nothing here has touched storage.
 */
export type PendingCapture = {
  sourceType: MediaSourceType;
  source: EncodedImage;
  card: EncodedImage;
  targetRect: NormalizedRect;
  originalDimensions: { width: number; height: number };
  recognition?: Record<string, unknown>;
  sourceFileName?: string;
  sourcePage?: number;
};

export class AssetWriteError extends Error {
  constructor(cause?: unknown) {
    super("The picture could not be saved.");
    this.name = "AssetWriteError";
    this.cause = cause;
  }
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

/**
 * Both derivatives written, under one group id.
 *
 * The two files share a folder so that deleting a word is a prefix removal
 * rather than a list of paths that has to stay in step with however many
 * derivatives the pipeline happens to produce this year. A third one added
 * later is cleaned up by code that was written before it existed.
 *
 * If the second upload fails the first is removed before throwing. A source
 * with no card is not half a saved word, it is a file nothing points at.
 */
export async function commitCapture(
  supabase: SupabaseClient,
  userId: string,
  capture: PendingCapture,
): Promise<VocabularyMedia> {
  const group = crypto.randomUUID();
  const sourcePath = `${userId}/${group}/source.${extensionFor(capture.source.mimeType)}`;
  const cardPath = `${userId}/${group}/card.${extensionFor(capture.card.mimeType)}`;

  const storage = supabase.storage.from(VOCABULARY_BUCKET);

  const { error: sourceError } = await storage.upload(
    sourcePath,
    capture.source.blob,
    { contentType: capture.source.mimeType, upsert: false },
  );

  if (sourceError) throw new AssetWriteError(sourceError);

  const { error: cardError } = await storage.upload(
    cardPath,
    capture.card.blob,
    { contentType: capture.card.mimeType, upsert: false },
  );

  if (cardError) {
    await storage.remove([sourcePath]).catch(() => {});
    throw new AssetWriteError(cardError);
  }

  return {
    version: 1,
    sourceType: capture.sourceType,
    sourcePath,
    cardPath,
    targetRect: capture.targetRect,
    originalDimensions: capture.originalDimensions,
    storedDimensions: {
      width: capture.source.width,
      height: capture.source.height,
    },
    mimeType: capture.source.mimeType,
    compressionVersion: COMPRESSION_VERSION,
    createdAt: new Date().toISOString(),
    recognition: capture.recognition,
    sourceFileName: capture.sourceFileName,
    sourcePage: capture.sourcePage,
  };
}

/**
 * The files a word owned, removed.
 *
 * Best-effort by design, and called after the row is gone rather than
 * before: an image with no row is litter that the orphan sweep will find,
 * whereas a row whose image was deleted first is a card with a hole in it
 * that nothing will ever repair.
 */
export async function removeAssets(
  supabase: SupabaseClient,
  paths: readonly string[],
): Promise<void> {
  if (paths.length === 0) return;

  await supabase.storage
    .from(VOCABULARY_BUCKET)
    .remove([...paths])
    .catch(() => {
      // Reported nowhere on purpose. The reader asked to delete a word, and
      // they did; a storage object that outlived it is the sweep's problem.
    });
}

/**
 * Everything in a reader's folder that no row of theirs points at.
 *
 * The answer to the spec's orphan requirement and to the bug that made it
 * necessary: deleting a word has never deleted its picture, so every
 * library carries some number of files that nothing references. Also covers
 * the genuinely unavoidable case — a tab closed between the upload and the
 * insert.
 *
 * Returns the paths rather than deleting them, so a caller can decide. The
 * one caller sweeps at most once a session and never blocks on it.
 */
export function findOrphans(
  storedPaths: readonly string[],
  referencedPaths: readonly string[],
): string[] {
  const referenced = new Set(referencedPaths);

  return storedPaths.filter((path) => !referenced.has(path));
}

/**
 * A group folder listed, as full paths.
 *
 * Supabase lists one level at a time and returns names relative to the
 * prefix, which is a detail every caller would otherwise have to rebuild.
 */
export async function listOwnedPaths(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const storage = supabase.storage.from(VOCABULARY_BUCKET);

  const { data: groups, error } = await storage.list(userId, { limit: 1000 });

  if (error || !groups) return [];

  const paths: string[] = [];

  for (const group of groups) {
    /*
     * A legacy image is a file directly in the reader's folder — the old
     * `{userId}/{uuid}.jpg` — rather than a group folder. Supabase reports
     * both here; the file has metadata and the folder does not.
     */
    if (group.id) {
      paths.push(`${userId}/${group.name}`);
      continue;
    }

    const { data: files } = await storage.list(`${userId}/${group.name}`, {
      limit: 100,
    });

    for (const file of files ?? []) {
      paths.push(`${userId}/${group.name}/${file.name}`);
    }
  }

  return paths;
}
