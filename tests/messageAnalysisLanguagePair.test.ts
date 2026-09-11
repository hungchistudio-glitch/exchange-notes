import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { listAnalysisForMessages } from "@/lib/messages/decode";
import { readMigration } from "./readMigration";

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

/*
 * Two migrations, applied either side of the deploy. The first has to stay
 * additive or the running app writes a NULL pair into a NOT NULL column; the
 * second is where the key actually changes.
 */
const additive = readMigration("message_analysis_language_pair");
const restrictive = readMigration("message_analysis_pair_key");

/**
 * The statements, without the prose around them.
 *
 * The headers of these two files discuss the primary key and the NOT NULLs
 * at length, so an assertion that a migration does *not* do something has to
 * read the SQL rather than the explanation of it.
 */
function statementsOf(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

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

  it("adds the columns nullable, so the running app keeps writing", () => {
    for (const table of ["message_language_analysis", "detected_phrases"]) {
      expect(additive).toContain(`alter table public.${table}
  add column if not exists learning_language text,
  add column if not exists native_language text;`);
    }

    const statements = statementsOf(additive);
    expect(statements).not.toContain("set not null");
    expect(statements).not.toContain("add constraint message_language_analysis_pkey");
    expect(statements).toContain(
      "(learning_language is null and native_language is null)",
    );
  });

  it("creates the full key up front, for the deploy's first upsert to land on", () => {
    // The route conflicts on all four columns from its very first request, so
    // the unique index cannot wait for the second half.
    expect(additive).toContain(`create unique index if not exists message_language_analysis_pair_key`);
    expect(additive).toContain("detected_phrases_reader_pair_idx");
  });

  it("makes the pair mandatory and the key, in the half that runs after", () => {
    for (const table of ["message_language_analysis", "detected_phrases"]) {
      expect(restrictive).toContain(`alter table public.${table}
  alter column learning_language set not null,
  alter column native_language set not null;`);
    }

    // Adopted rather than rebuilt, so no second copy of the index is written.
    expect(restrictive).toContain(
      "primary key using index message_language_analysis_pair_key",
    );
    expect(restrictive.toLowerCase()).toContain("apply this only once the deploy");
  });

  it("constrains both sides of the pair to a supported, different language", () => {
    for (const sql of [additive, restrictive]) {
      expect(sql).toContain("learning_language <> native_language");
      for (const code of ["en", "zh-TW", "es", "fr", "it"]) {
        expect(sql).toContain(`'${code}'`);
      }
    }

    // The tolerant branch exists only for the overlap.
    expect(statementsOf(restrictive)).not.toContain(
      "(learning_language is null and native_language is null)",
    );
  });

  it("clears rows that were written before a pair was recorded", () => {
    // Left in place they would be unreachable forever: every read filters on
    // a pair, and a NULL matches none of the twenty. Both halves sweep, so
    // anything the previous deploy wrote during the window goes too.
    for (const sql of [additive, restrictive]) {
      for (const table of ["detected_phrases", "message_language_analysis"]) {
        expect(sql).toContain(`delete from public.${table}
where learning_language is null
   or native_language is null;`);
      }
    }
  });
});
