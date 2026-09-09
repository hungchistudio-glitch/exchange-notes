/* =========================================================
   Which URL a card should actually load

   Three kinds of row reach this, and the whole point is that no component
   has to know which kind it is holding.

   A word saved since the media pipeline has a card derivative and a path.
   A word saved before it has a public URL in `image_url` pointing into a
   bucket that is no longer public — the path is still inside that URL, so
   it is pulled out and served the same way. And a row with neither has no
   picture, which is a perfectly ordinary thing for a word to be.

   Legacy rows are never rewritten. There is nothing to gain: the URL
   already contains everything needed to serve it, and a migration that
   touched every reader's rows to restate a fact already recorded would be
   risk spent on tidiness.
   ========================================================= */

import { pathFromLegacyUrl, readMedia } from "@/lib/media/record";

/** The shape this needs off a vocabulary row. Deliberately minimal. */
type ImageBearing = {
  image_url?: string | null;
  media?: unknown;
};

/** The route that authorises and signs. */
export function signedImageHref(path: string): string {
  return `/api/vocabulary-image?path=${encodeURIComponent(path)}`;
}

/**
 * The URL to put in an `src`, or null where there is no picture.
 *
 * `prefer` decides which derivative a caller wants when the row has both.
 * A list cell wants the card — it is a twentieth of the bytes, and decoding
 * a 2048px source per row is what makes a vocabulary list stutter. A crop
 * editor wants the source, because that is the thing being re-cropped.
 */
export function vocabularyImageUrl(
  item: ImageBearing,
  prefer: "card" | "source" = "card",
): string | null {
  const media = readMedia(item.media);

  if (media) {
    return signedImageHref(
      prefer === "source" ? media.sourcePath : media.cardPath,
    );
  }

  const legacy = item.image_url;

  if (!legacy) return null;

  const path = pathFromLegacyUrl(legacy);

  /*
   * Anything that is not one of ours goes out untouched — a data URL held
   * in a draft, or an absolute URL to somewhere else entirely. Rewriting
   * those into a signed-path request would break them.
   */
  return path ? signedImageHref(path) : legacy;
}

/**
 * Whether a row has a picture at all.
 *
 * Cheaper than building the URL and throwing it away, and it reads better
 * at a call site that is deciding whether to render a container.
 */
export function hasVocabularyImage(item: ImageBearing): boolean {
  return Boolean(readMedia(item.media) || item.image_url);
}
