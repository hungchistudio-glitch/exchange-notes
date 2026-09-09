"use client";

/* =========================================================
   The files nothing points at any more

   Two things put them there. Deleting a word never used to delete its
   picture, so every library that has ever had a word removed is carrying
   some number of them; that is fixed going forward, but the existing ones
   will not remove themselves. And a tab closed between an upload and the
   insert that was going to reference it leaves the same debris, which no
   amount of care in the save path can fully prevent.

   Two rules this must not get wrong, because both failure modes destroy
   something a reader cannot get back.

   Shared files are never swept. They live in the shared/ folder and are
   referenced by message bodies, not by rows — a sweep that only consults
   the vocabulary table would see every one of them as an orphan and delete
   pictures out of conversations.

   Recent files are never swept. An upload that finished ninety seconds ago
   may belong to a row that is still being written, or queued offline and
   not yet replayed. Age is the only signal available here, so it is used
   generously.
   ========================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";

import { findOrphans, listOwnedPaths, removeAssets } from "@/lib/media/assets";
import { ownedPaths, readMedia } from "@/lib/media/record";
import { SHARED_SEGMENT } from "@/lib/media/sharing";

/**
 * How old a file must be before it is considered abandoned.
 *
 * A day. The cost of waiting is a file that lingers; the cost of not
 * waiting is deleting the picture of a word saved on a train, whose insert
 * is still sitting in the offline outbox.
 */
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

/** At most one sweep per session, per device. */
const SESSION_KEY = "exchange-notes:orphan-sweep";

type ImageBearing = { image_url?: string | null; media?: unknown };

function alreadySweptThisSession() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "done";
  } catch {
    // Private browsing. Sweeping twice is harmless; failing here is not.
    return false;
  }
}

function markSwept() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "done");
  } catch {
    // As above.
  }
}

/** Every path the reader's rows legitimately point at. */
export function referencedPaths(items: readonly ImageBearing[]): string[] {
  return items.flatMap((item) =>
    ownedPaths(readMedia(item.media), item.image_url ?? null),
  );
}

/**
 * Whether a path is one the sweep is allowed to touch.
 *
 * Exported so the rule can be tested directly. It is the whole safety of
 * this module: get it wrong in the permissive direction and the sweep eats
 * pictures out of other people's conversations.
 */
export function isSweepable(
  path: string,
  createdAt: string | null,
  now = Date.now(),
): boolean {
  // Never the shared folder: those are referenced by messages, and no
  // amount of looking at the vocabulary table will ever find that out.
  if (path.split("/")[1] === SHARED_SEGMENT) return false;

  // No timestamp means no way to know it is not mid-write. Left alone.
  if (!createdAt) return false;

  const age = now - new Date(createdAt).getTime();

  return Number.isFinite(age) && age >= MIN_AGE_MS;
}

/**
 * Remove the reader's abandoned image files. At most once a session.
 *
 * Deliberately best-effort and silent: this is housekeeping, and a reader
 * who opened their vocabulary list should never see an error about it.
 * Returns how many were removed, which is for tests and logs rather than
 * for the screen.
 */
export async function sweepOrphans(
  supabase: SupabaseClient,
  userId: string,
  items: readonly ImageBearing[],
): Promise<number> {
  if (alreadySweptThisSession()) return 0;

  markSwept();

  try {
    const stored = await listOwnedPaths(supabase, userId);

    if (stored.length === 0) return 0;

    const orphans = findOrphans(stored, referencedPaths(items));

    if (orphans.length === 0) return 0;

    /*
     * The age and shared-folder checks need each file's metadata, which the
     * listing already fetched — but listOwnedPaths flattens it away. Rather
     * than widen that return type for one caller, the shared-folder rule is
     * applied here from the path alone and the age rule from a second,
     * cheap listing of only the candidate folders.
     */
    const candidates = orphans.filter(
      (path) => path.split("/")[1] !== SHARED_SEGMENT,
    );

    if (candidates.length === 0) return 0;

    const ages = await fileAges(supabase, userId, candidates);

    const removable = candidates.filter((path) =>
      isSweepable(path, ages.get(path) ?? null),
    );

    if (removable.length === 0) return 0;

    await removeAssets(supabase, removable);

    return removable.length;
  } catch (sweepError) {
    console.error("Orphan sweep did not complete:", sweepError);
    return 0;
  }
}

/** created_at for each candidate, by listing the folders they sit in. */
async function fileAges(
  supabase: SupabaseClient,
  userId: string,
  paths: readonly string[],
): Promise<Map<string, string | null>> {
  const folders = new Set(
    paths.map((path) => path.split("/").slice(0, -1).join("/")),
  );

  const ages = new Map<string, string | null>();

  for (const folder of folders) {
    const { data } = await supabase.storage
      .from("vocabulary-images")
      .list(folder === userId ? userId : folder, { limit: 100 });

    for (const file of data ?? []) {
      ages.set(`${folder}/${file.name}`, file.created_at ?? null);
    }
  }

  return ages;
}
