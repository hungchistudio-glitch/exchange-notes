import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useVocabularyLanguageFill,
  type FilledRow,
} from "@/hooks/useVocabularyLanguageFill";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   Twenty words translated should cost twenty words

   The fill ran a batch, then told the library to re-read itself — the whole
   thing, every column, `select("*")`. Measured against the real database:
   a 329-word library is 307kB, and MAX_BATCHES_PER_SESSION is 25, so
   switching learning language could re-fetch and re-parse that library
   seventeen times in one sitting to show twenty changed words at a time.

   The route already held exactly what it wrote. It hands those rows back
   now, and only they are merged.
   ========================================================= */

function item(id: string): VocabularyItem {
  return {
    id,
    user_id: "u",
    word: id,
    translation: id,
    texts: { en: id },
    examples: {},
    status: "learning",
    created_at: "2026-01-01T00:00:00.000Z",
  } as unknown as VocabularyItem;
}

const server = vi.hoisted(() => ({
  calls: 0,
  reply: {} as Record<string, unknown>,
}));

beforeEach(() => {
  server.calls = 0;
  server.reply = { filled: 0, remaining: 0, done: true, updated: [] };

  vi.stubGlobal("fetch", async () => {
    server.calls += 1;
    return {
      ok: true,
      json: async () => server.reply,
    } as unknown as Response;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("what a finished batch reports", () => {
  it("hands back the rows it changed rather than asking for a re-read", async () => {
    const seen: FilledRow[][] = [];
    server.reply = {
      filled: 1,
      remaining: 0,
      done: false,
      updated: [{ id: "a", texts: { en: "a", it: "uno" }, examples: {} }],
    };

    renderHook(() =>
      useVocabularyLanguageFill({
        items: [item("a"), item("b")],
        learningLanguage: "it",
        loading: false,
        onFilled: (updated) => seen.push(updated),
      }),
    );

    await waitFor(() => expect(seen.length).toBeGreaterThan(0));

    expect(seen[0]).toEqual([
      { id: "a", texts: { en: "a", it: "uno" }, examples: {} },
    ]);
  });

  it("reports an empty batch as empty rather than as nothing at all", async () => {
    // An older deployment, or a batch that wrote nothing: the callback still
    // fires, with a list the caller can merge without special-casing.
    const seen: FilledRow[][] = [];
    server.reply = { filled: 1, remaining: 0, done: false };

    renderHook(() =>
      useVocabularyLanguageFill({
        items: [item("a")],
        learningLanguage: "it",
        loading: false,
        onFilled: (updated) => seen.push(updated),
      }),
    );

    await waitFor(() => expect(seen.length).toBeGreaterThan(0));

    expect(seen[0]).toEqual([]);
  });

  it("does not start at all when every word already has the language", async () => {
    const seen: FilledRow[][] = [];

    renderHook(() =>
      useVocabularyLanguageFill({
        items: [
          { ...item("a"), texts: { en: "a", it: "uno" } } as VocabularyItem,
        ],
        learningLanguage: "it",
        loading: false,
        onFilled: (updated) => seen.push(updated),
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(server.calls).toBe(0);
    expect(seen).toEqual([]);
  });
});
