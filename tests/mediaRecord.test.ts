import { describe, expect, it } from "vitest";

import {
  hasVocabularyImage,
  signedImageHref,
  vocabularyImageUrl,
} from "@/lib/media/imageUrl";
import {
  ownedPaths,
  pathFromLegacyUrl,
  readMedia,
  type VocabularyMedia,
} from "@/lib/media/record";

/* =========================================================
   Legacy words, and the promise that they keep working

   The spec is explicit that a saved word with no image metadata has to
   carry on rendering, and that target images are never made mandatory. That
   is not a thing to assert once — it is the reason most of these exist,
   because the bucket turning private is exactly the change that would break
   three months of saved photographs quietly.
   ========================================================= */

const media: VocabularyMedia = {
  version: 1,
  sourceType: "camera",
  sourcePath: "user-1/group-1/source.webp",
  cardPath: "user-1/group-1/card.webp",
  targetRect: { x: 0.1, y: 0.2, width: 0.3, height: 0.2 },
  originalDimensions: { width: 4032, height: 3024 },
  storedDimensions: { width: 2048, height: 1536 },
  mimeType: "image/webp",
  compressionVersion: 1,
  createdAt: "2026-08-30T00:00:00.000Z",
};

describe("reading a media record off a row", () => {
  it("reads a well-formed record", () => {
    expect(readMedia(media)).toMatchObject({
      sourcePath: "user-1/group-1/source.webp",
      cardPath: "user-1/group-1/card.webp",
      sourceType: "camera",
    });
  });

  it("returns null for a row that has none", () => {
    // Every word saved before this feature. Not an error.
    expect(readMedia(null)).toBeNull();
    expect(readMedia(undefined)).toBeNull();
  });

  it("returns null rather than throwing on a malformed record", () => {
    /*
     * A half-written record must not take a word down with it. The caller
     * falls back to image_url, which is what a legacy row has anyway.
     */
    for (const broken of [
      {},
      { version: 2, sourcePath: "a", cardPath: "b" },
      { ...media, sourcePath: "" },
      { ...media, sourceType: "hologram" },
      { ...media, targetRect: { x: 0, y: 0 } },
      { ...media, targetRect: { x: NaN, y: 0, width: 1, height: 1 } },
      { ...media, storedDimensions: { width: 0, height: 0 } },
      "not an object",
      42,
    ]) {
      expect(readMedia(broken)).toBeNull();
    }
  });

  it("fills in defaults for fields a future writer may omit", () => {
    const sparse = readMedia({
      version: 1,
      sourceType: "photo",
      sourcePath: "u/g/source.webp",
      cardPath: "u/g/card.webp",
      targetRect: { x: 0, y: 0, width: 1, height: 1 },
      originalDimensions: { width: 10, height: 10 },
      storedDimensions: { width: 10, height: 10 },
    });

    expect(sparse?.compressionVersion).toBe(0);
    expect(sparse?.mimeType).toBe("image/jpeg");
  });
});

describe("pulling the path out of a legacy public URL", () => {
  const base = "https://abc.supabase.co/storage/v1/object/public";

  it("finds the path in a URL the capture screen wrote", () => {
    expect(
      pathFromLegacyUrl(`${base}/vocabulary-images/user-1/photo-9.jpg`),
    ).toBe("user-1/photo-9.jpg");
  });

  it("drops a query string", () => {
    expect(
      pathFromLegacyUrl(`${base}/vocabulary-images/user-1/photo.jpg?v=2`),
    ).toBe("user-1/photo.jpg");
  });

  it("decodes an escaped path", () => {
    expect(
      pathFromLegacyUrl(`${base}/vocabulary-images/user-1/a%20photo.jpg`),
    ).toBe("user-1/a photo.jpg");
  });

  it("declines a URL that is not one of ours", () => {
    expect(pathFromLegacyUrl(`${base}/avatars/user-1/face.jpg`)).toBeNull();
    expect(pathFromLegacyUrl("https://example.com/cat.jpg")).toBeNull();
    expect(pathFromLegacyUrl("data:image/jpeg;base64,AAAA")).toBeNull();
  });
});

describe("choosing the URL a card loads", () => {
  it("serves the card derivative by default", () => {
    expect(vocabularyImageUrl({ media })).toBe(
      signedImageHref("user-1/group-1/card.webp"),
    );
  });

  it("serves the retained source when asked for it", () => {
    // What a re-crop reads: the card is already cropped, and re-cropping a
    // crop loses the rest of the photograph for good.
    expect(vocabularyImageUrl({ media }, "source")).toBe(
      signedImageHref("user-1/group-1/source.webp"),
    );
  });

  it("still renders a legacy row through the signing route", () => {
    /*
     * The migration promise. This row was written when the bucket was
     * public; the bucket is private now, and it renders anyway.
     */
    const url = vocabularyImageUrl({
      image_url:
        "https://abc.supabase.co/storage/v1/object/public/vocabulary-images/user-1/old.jpg",
    });

    expect(url).toBe(signedImageHref("user-1/old.jpg"));
  });

  it("passes a foreign URL through untouched", () => {
    const url = "https://images.example.com/story.jpg";

    expect(vocabularyImageUrl({ image_url: url })).toBe(url);
  });

  it("says there is no picture when there is none", () => {
    expect(vocabularyImageUrl({})).toBeNull();
    expect(vocabularyImageUrl({ image_url: null, media: null })).toBeNull();
    expect(hasVocabularyImage({ image_url: null })).toBe(false);
  });

  it("prefers the media record over a stale image_url", () => {
    // A row can legitimately carry both while a reader's device syncs.
    const url = vocabularyImageUrl({
      media,
      image_url:
        "https://abc.supabase.co/storage/v1/object/public/vocabulary-images/user-1/old.jpg",
    });

    expect(url).toBe(signedImageHref("user-1/group-1/card.webp"));
  });

  it("escapes a path with characters that would break the query", () => {
    const href = signedImageHref("user-1/a photo&x.jpg");

    expect(href).toContain("a%20photo%26x.jpg");
    expect(new URL(href, "https://x.test").searchParams.get("path")).toBe(
      "user-1/a photo&x.jpg",
    );
  });
});

describe("which files a word owns", () => {
  it("names both derivatives for a modern row", () => {
    expect(ownedPaths(media, null)).toEqual([
      "user-1/group-1/source.webp",
      "user-1/group-1/card.webp",
    ]);
  });

  it("names the single legacy file for an old row", () => {
    expect(
      ownedPaths(
        null,
        "https://abc.supabase.co/storage/v1/object/public/vocabulary-images/user-1/old.jpg",
      ),
    ).toEqual(["user-1/old.jpg"]);
  });

  it("names nothing for a word with no picture", () => {
    expect(ownedPaths(null, null)).toEqual([]);
  });

  it("claims nothing it does not own", () => {
    // Deleting a word must never reach for a file in someone else's bucket.
    expect(ownedPaths(null, "https://images.example.com/story.jpg")).toEqual([]);
  });
});
