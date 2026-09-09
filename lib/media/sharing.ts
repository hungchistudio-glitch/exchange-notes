"use client";

/* =========================================================
   The copy of a picture that goes into a conversation

   Sharing writes its own copy rather than pointing a message at the sender's
   library asset, and there are two separate reasons, either of which would
   be enough.

   The first is lifetime. A message is permanent and a library is not: a
   reader who deletes a word three months from now would otherwise blank out
   a card they sent someone, in a conversation neither of them can repair.

   The second is authorisation. /api/vocabulary-image has to answer "may this
   person see this file", and the honest version of that answer is "this is a
   file its owner deliberately shared". A path is a fact the server can check;
   "they are friends" is not the same question, and answering it instead would
   make every picture in a reader's library readable by every friend rather
   than the one card they were actually sent.

   The copy is the card derivative — a few hundred kilobytes — never the
   retained source. A friend is being shown a vocabulary card, not given the
   original photograph.
   ========================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";

import { VOCABULARY_BUCKET } from "@/lib/media/record";

/**
 * The folder that /api/vocabulary-image treats as shareable.
 *
 * Matched on the server by path segment, so it is part of the contract
 * between these two files rather than a naming convention. Changing it means
 * changing both.
 */
export const SHARED_SEGMENT = "shared";

function extensionOf(path: string) {
  const extension = path.split(".").pop();

  return extension && extension.length <= 5 ? extension : "webp";
}

/**
 * A library card image, copied into the shareable folder.
 *
 * Server-side copy rather than a download and re-upload: the bytes never
 * come to the device, which on a phone on mobile data is the difference
 * between sharing a word and sharing a word twice over the same connection.
 *
 * Returns null rather than throwing. A card that arrives without its picture
 * is still the word someone wanted to send; a share that failed outright
 * because a copy did not complete is not.
 */
export async function publishCardImage(
  supabase: SupabaseClient,
  userId: string,
  cardPath: string,
): Promise<string | null> {
  const destination = `${userId}/${SHARED_SEGMENT}/${crypto.randomUUID()}.${extensionOf(cardPath)}`;

  const { error } = await supabase.storage
    .from(VOCABULARY_BUCKET)
    .copy(cardPath, destination);

  if (error) {
    console.error("Could not share that picture:", error);
    return null;
  }

  return destination;
}

/**
 * A card image published straight from memory.
 *
 * For the case where there is nothing to copy from yet: a reader who
 * photographs something and sends it to a friend without saving it
 * themselves. The card derivative already exists — the pipeline built it
 * before recognition — so this is an upload rather than any new work.
 */
export async function publishCardBlob(
  supabase: SupabaseClient,
  userId: string,
  blob: Blob,
): Promise<string | null> {
  const extension = blob.type === "image/jpeg" ? "jpg" : "webp";
  const destination = `${userId}/${SHARED_SEGMENT}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(VOCABULARY_BUCKET)
    .upload(destination, blob, {
      contentType: blob.type || "image/webp",
      upsert: false,
    });

  if (error) {
    console.error("Could not share that picture:", error);
    return null;
  }

  return destination;
}

/**
 * A card image the recipient now owns a copy of.
 *
 * Called when someone saves a word card they were sent. Their row points at
 * their own file, in their own folder, so the sender deleting the original
 * cannot take it away and so deleting either word cleans up exactly one
 * picture.
 *
 * The copy is made through the server route rather than storage-to-storage,
 * because a recipient has no read policy on the sender's object — the route
 * is the one place allowed to decide that they may see it.
 */
export async function adoptSharedImage(
  supabase: SupabaseClient,
  userId: string,
  sharedPath: string,
): Promise<{ path: string; mimeType: string; bytes: number } | null> {
  try {
    const response = await fetch(
      `/api/vocabulary-image?path=${encodeURIComponent(sharedPath)}`,
    );

    if (!response.ok) return null;

    const blob = await response.blob();
    const destination = `${userId}/${crypto.randomUUID()}/card.${extensionOf(sharedPath)}`;

    const { error } = await supabase.storage
      .from(VOCABULARY_BUCKET)
      .upload(destination, blob, {
        contentType: blob.type || "image/webp",
        upsert: false,
      });

    if (error) {
      console.error("Could not keep that picture:", error);
      return null;
    }

    return {
      path: destination,
      mimeType: blob.type || "image/webp",
      bytes: blob.size,
    };
  } catch (copyError) {
    console.error("Could not keep that picture:", copyError);
    return null;
  }
}
