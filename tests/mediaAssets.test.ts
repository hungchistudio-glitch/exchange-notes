import { describe, expect, it, vi } from "vitest";

import { AssetWriteError, commitCapture, removeAssets } from "@/lib/media/assets";
import { COMPRESSION_VERSION } from "@/lib/media/config";
import { isPdf } from "@/lib/media/pdf";
import type { PendingCapture } from "@/lib/media/assets";
import type { SupabaseClient } from "@supabase/supabase-js";

/* =========================================================
   Getting two files into storage, or neither

   The half-written case is the one worth testing. A source with no card is
   not half a saved word — it is a file nothing will ever point at or clean
   up, and the only moment it can be removed cheaply is right now, while the
   code that wrote it is still holding the path.
   ========================================================= */

const capture: PendingCapture = {
  sourceType: "camera",
  source: {
    blob: new Blob(["source"]),
    width: 2048,
    height: 1536,
    mimeType: "image/webp",
    quality: 0.86,
  },
  card: {
    blob: new Blob(["card"]),
    width: 1200,
    height: 675,
    mimeType: "image/webp",
    quality: 0.78,
  },
  targetRect: { x: 0.1, y: 0.2, width: 0.3, height: 0.2 },
  originalDimensions: { width: 4032, height: 3024 },
};

/** A storage double that records what it was asked to do. */
function storageDouble(failOn?: "source" | "card") {
  const uploaded: string[] = [];
  const removed: string[][] = [];

  const upload = vi.fn(async (path: string) => {
    const which = path.endsWith("card.webp") ? "card" : "source";

    if (failOn === which) return { error: { message: "boom" } };

    uploaded.push(path);
    return { error: null };
  });

  const remove = vi.fn(async (paths: string[]) => {
    removed.push(paths);
    return { error: null };
  });

  const client = {
    storage: { from: () => ({ upload, remove }) },
  } as unknown as SupabaseClient;

  return { client, uploaded, removed, upload, remove };
}

describe("committing a capture", () => {
  it("writes both derivatives under one group folder", async () => {
    const store = storageDouble();

    const media = await commitCapture(store.client, "user-1", capture);

    expect(store.uploaded).toHaveLength(2);

    // One folder, so deleting a word is a prefix's worth of files rather
    // than a list that has to stay in step with however many derivatives
    // the pipeline happens to produce this year.
    const [sourceGroup] = media.sourcePath.split("/").slice(1, 2);
    const [cardGroup] = media.cardPath.split("/").slice(1, 2);

    expect(sourceGroup).toBe(cardGroup);
    expect(media.sourcePath.startsWith("user-1/")).toBe(true);
  });

  it("records what was actually stored, not what was asked for", async () => {
    const store = storageDouble();

    const media = await commitCapture(store.client, "user-1", capture);

    expect(media).toMatchObject({
      version: 1,
      sourceType: "camera",
      targetRect: capture.targetRect,
      originalDimensions: { width: 4032, height: 3024 },
      storedDimensions: { width: 2048, height: 1536 },
      mimeType: "image/webp",
      compressionVersion: COMPRESSION_VERSION,
    });

    expect(Date.parse(media.createdAt)).not.toBeNaN();
  });

  it("removes the source when the card cannot be written", async () => {
    /*
     * The whole point of this test. Without it the failure leaves a file
     * that no row references and no delete path will ever reach.
     */
    const store = storageDouble("card");

    await expect(
      commitCapture(store.client, "user-1", capture),
    ).rejects.toBeInstanceOf(AssetWriteError);

    expect(store.removed).toHaveLength(1);
    expect(store.removed[0][0]).toContain("user-1/");
    expect(store.removed[0][0]).toContain("source");
  });

  it("writes nothing to remove when the source itself fails", async () => {
    const store = storageDouble("source");

    await expect(
      commitCapture(store.client, "user-1", capture),
    ).rejects.toBeInstanceOf(AssetWriteError);

    expect(store.uploaded).toHaveLength(0);
    expect(store.removed).toHaveLength(0);
  });

  it("keeps each capture in its own folder", async () => {
    const store = storageDouble();

    const first = await commitCapture(store.client, "user-1", capture);
    const second = await commitCapture(store.client, "user-1", capture);

    expect(first.sourcePath).not.toBe(second.sourcePath);
  });
});

describe("removing assets", () => {
  it("does nothing at all for a word with no pictures", async () => {
    const store = storageDouble();

    await removeAssets(store.client, []);

    expect(store.remove).not.toHaveBeenCalled();
  });

  it("removes every path it is given in one call", async () => {
    const store = storageDouble();

    await removeAssets(store.client, ["a/b/source.webp", "a/b/card.webp"]);

    expect(store.remove).toHaveBeenCalledWith([
      "a/b/source.webp",
      "a/b/card.webp",
    ]);
  });
});

describe("recognising a document", () => {
  it("accepts a PDF by type or by name", () => {
    expect(isPdf(new File([""], "menu.pdf", { type: "application/pdf" }))).toBe(
      true,
    );

    // Some pickers hand over an empty type; the extension is the fallback.
    expect(isPdf(new File([""], "MENU.PDF", { type: "" }))).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isPdf(new File([""], "photo.jpg", { type: "image/jpeg" }))).toBe(
      false,
    );
    expect(isPdf(new File([""], "notes.txt", { type: "text/plain" }))).toBe(
      false,
    );
  });
});
