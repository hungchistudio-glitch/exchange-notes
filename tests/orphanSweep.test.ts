import { describe, expect, it } from "vitest";

import { findOrphans } from "@/lib/media/assets";
import { isSweepable, referencedPaths } from "@/lib/media/orphanSweep";

/* =========================================================
   Deciding what may be deleted

   The permissive direction of this rule destroys things a reader cannot get
   back — a picture in a friend's conversation, or the image of a word that
   was saved on a train and has not synced yet. So the two guards are tested
   directly rather than through the sweep, which needs a storage client.
   ========================================================= */

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 7, 30, 12, 0, 0);
const ago = (ms: number) => new Date(now - ms).toISOString();

const user = "0f9e8d7c-6b5a-4321-8f0e-1d2c3b4a5968";

describe("which files the sweep may touch", () => {
  it("sweeps an old file in a group folder", () => {
    expect(
      isSweepable(`${user}/group-1/source.webp`, ago(3 * DAY), now),
    ).toBe(true);
  });

  it("never sweeps the shared folder", () => {
    /*
     * The one that would be unrecoverable. These are referenced by message
     * bodies, and nothing in the vocabulary table knows they exist — so to
     * a sweep that only reads rows, every shared picture looks abandoned.
     */
    expect(
      isSweepable(`${user}/shared/abc.webp`, ago(365 * DAY), now),
    ).toBe(false);
  });

  it("never sweeps a file written in the last day", () => {
    // It may belong to a row still being written, or to one queued offline
    // and not yet replayed.
    expect(isSweepable(`${user}/group-1/card.webp`, ago(90_000), now)).toBe(
      false,
    );
    expect(
      isSweepable(`${user}/group-1/card.webp`, ago(DAY - 1000), now),
    ).toBe(false);
  });

  it("sweeps a file exactly at the threshold", () => {
    expect(isSweepable(`${user}/group-1/card.webp`, ago(DAY), now)).toBe(true);
  });

  it("leaves a file alone when its age is unknown", () => {
    // No timestamp is no evidence, and no evidence is not permission.
    expect(isSweepable(`${user}/group-1/card.webp`, null, now)).toBe(false);
    expect(isSweepable(`${user}/group-1/card.webp`, "not a date", now)).toBe(
      false,
    );
  });

  it("sweeps a legacy file sitting directly in the reader's folder", () => {
    // The old `{uid}/{uuid}.jpg` layout, which is what most orphans are.
    expect(isSweepable(`${user}/old-photo.jpg`, ago(200 * DAY), now)).toBe(
      true,
    );
  });
});

describe("which files the rows account for", () => {
  it("names both derivatives of a modern row and the file of a legacy one", () => {
    const referenced = referencedPaths([
      {
        media: {
          version: 1,
          sourceType: "camera",
          sourcePath: `${user}/g1/source.webp`,
          cardPath: `${user}/g1/card.webp`,
          targetRect: { x: 0, y: 0, width: 1, height: 1 },
          originalDimensions: { width: 10, height: 10 },
          storedDimensions: { width: 10, height: 10 },
        },
      },
      {
        image_url: `https://abc.supabase.co/storage/v1/object/public/vocabulary-images/${user}/old.jpg`,
      },
      { image_url: null },
    ]);

    expect(referenced).toEqual([
      `${user}/g1/source.webp`,
      `${user}/g1/card.webp`,
      `${user}/old.jpg`,
    ]);
  });

  it("finds only what no row accounts for", () => {
    const stored = [
      `${user}/g1/source.webp`,
      `${user}/g1/card.webp`,
      `${user}/g2/source.webp`,
      `${user}/old.jpg`,
    ];

    const referenced = [`${user}/g1/source.webp`, `${user}/g1/card.webp`];

    expect(findOrphans(stored, referenced)).toEqual([
      `${user}/g2/source.webp`,
      `${user}/old.jpg`,
    ]);
  });

  it("finds nothing when every file is accounted for", () => {
    const paths = [`${user}/g1/source.webp`, `${user}/g1/card.webp`];

    expect(findOrphans(paths, paths)).toEqual([]);
  });

  it("does not treat a shared file as referenced merely by being listed", () => {
    // It is not referenced — it is protected, which is a different rule and
    // lives in isSweepable. Keeping them separate is what stops one being
    // relaxed on the assumption the other covers it.
    const shared = `${user}/shared/abc.webp`;

    expect(findOrphans([shared], [])).toEqual([shared]);
    expect(isSweepable(shared, ago(365 * DAY), now)).toBe(false);
  });
});
