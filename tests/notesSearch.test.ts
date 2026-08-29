import { describe, expect, it } from "vitest";

import { searchNotes, type Note } from "@/lib/notes/repository";

const base: Note = {
  id: "note-1",
  ownerId: "owner-1",
  originalText: "Keep the moment",
  originalLanguage: "en",
  personalMeaning: "A reminder to notice ordinary days",
  context: "Walk home",
  tags: ["memory", "evening"],
  privacy: "private",
  sourceKind: "manual",
  sourceName: null,
  sourceUrl: null,
  sourceNoteId: null,
  sourceOwnerId: null,
  sourceOwnerName: null,
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
  isSharedWithMe: false,
  interpretations: [{
    id: "interpretation-1",
    noteId: "note-1",
    targetLanguage: "zh-TW",
    naturalTranslation: "把這一刻留下來",
    meaning: "珍惜稍縱即逝的日常",
    localExpressions: ["留住當下"],
    tone: "溫柔而直接",
    culturalNuance: "",
    usageExamples: ["我想留住今天傍晚的光。"],
    warnings: [],
    model: "test",
    createdAt: "2026-08-29T00:00:00.000Z",
  }],
};

describe("multilingual note search", () => {
  it("matches canonical text, metadata, and cached language views", () => {
    expect(searchNotes([base], "moment")).toEqual([base]);
    expect(searchNotes([base], "evening")).toEqual([base]);
    expect(searchNotes([base], "留住當下")).toEqual([base]);
    expect(searchNotes([base], "稍縱即逝")).toEqual([base]);
    expect(searchNotes([base], "missing")).toEqual([]);
  });
});
