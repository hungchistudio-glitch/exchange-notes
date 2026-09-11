import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { listAnalysisForMessages } from "@/lib/messages/decode";

type Filters = Record<string, unknown>;

/**
 * A client that records what each table was asked for.
 *
 * Both queries in `listAnalysisForMessages` run against the same client, and
 * the point of these tests is that they are filtered *independently* — so a
 * single shared spy, which cannot tell one table's `eq` from the other's,
 * would pass whether or not the phrase query carried the pair.
 */
function recordingClient(rowsByTable: Record<string, unknown[]>) {
  const filters: Record<string, Filters> = {};

  function table(name: string) {
    const seen: Filters = {};
    filters[name] = seen;

    // Thenable rather than a promise-returning terminal call: the two queries
    // end differently (`.in(...)` and `.in(...).order(...)`), and awaiting the
    // builder itself is what PostgREST actually does.
    const result = { data: rowsByTable[name] ?? [], error: null };

    const query = {
      select: () => query,
      order: () => query,
      eq: (column: string, value: unknown) => {
        seen[column] = value;
        return query;
      },
      in: (column: string, value: unknown) => {
        seen[column] = value;
        return query;
      },
      then: (resolve: (value: typeof result) => unknown) => resolve(result),
    };

    return query;
  }

  return {
    client: { from: vi.fn((name: string) => table(name)) } as unknown as SupabaseClient,
    filters,
  };
}

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260911114625_message_analysis_language_pair.sql",
  ),
  "utf8",
);

describe("message-analysis language cache", () => {
  it("loads only the reader's current directed pair", async () => {
    const { client, filters } = recordingClient({
      message_language_analysis: [],
    });

    await listAnalysisForMessages(client, "reader-1", [12, 13], ["es", "fr"]);

    expect(filters.message_language_analysis).toEqual({
      user_id: "reader-1",
      learning_language: "es",
      native_language: "fr",
      message_id: [12, 13],
    });
  });

  it("reads the phrases of that pair, not of whichever pair wrote last", async () => {
    const { client, filters } = recordingClient({
      message_language_analysis: [
        { message_id: 12, status: "ready", tone: null, tone_confidence: null },
      ],
      detected_phrases: [],
    });

    await listAnalysisForMessages(client, "reader-1", [12], ["it", "zh-TW"]);

    expect(filters.detected_phrases).toEqual({
      user_id: "reader-1",
      learning_language: "it",
      native_language: "zh-TW",
      message_id: [12],
    });
  });

  it("makes the pair part of the cache key on both tables", () => {
    expect(migration).toContain(
      "primary key (message_id, user_id, learning_language, native_language)",
    );
    expect(migration).toContain("detected_phrases_reader_pair_idx");

    for (const table of [
      "message_language_analysis",
      "detected_phrases",
    ]) {
      expect(migration).toContain(`alter table public.${table}
  alter column learning_language set not null,
  alter column native_language set not null;`);
    }
  });

  it("constrains both sides of the pair to a supported, different language", () => {
    expect(migration).toContain("learning_language <> native_language");
    for (const code of ["en", "zh-TW", "es", "fr", "it"]) {
      expect(migration).toContain(`'${code}'`);
    }
  });

  it("clears rows that were written before a pair was recorded", () => {
    // Left in place they would be unreachable forever: every read filters on
    // a pair, and a NULL matches none of the twenty.
    for (const table of ["detected_phrases", "message_language_analysis"]) {
      expect(migration).toContain(`delete from public.${table}
where learning_language is null
   or native_language is null;`);
    }
  });
});
