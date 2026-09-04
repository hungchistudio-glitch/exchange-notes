import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { readMigration } from "./readMigration";

/* =========================================================
   public_profiles is a directory, not a way to edit the directory

   profiles is owner-only under RLS. This view exists so a signed-in reader
   can look up the few fields you need to find and name a partner — display
   name, exchange id, avatar, languages — and it deliberately leaves email
   out. That part was always right.

   What was wrong is that a plain SELECT of one table is auto-updatable, so
   Postgres will write through it, and `authenticated` held INSERT, UPDATE
   and DELETE on it. The view runs with its owner's privileges, so RLS on
   profiles does not apply to a write arriving that way: any signed-in user
   could rewrite or delete any other user's profile row.

   The original migration only granted SELECT. The write grants came from
   Supabase's default privileges on new objects in the public schema, and
   `revoke all ... from public, anon` does not touch a direct grant to
   `authenticated` — the same trap already written up for functions in
   20260808024242.

   The grants are fixed in the database. This file guards the other side: the
   app must never try to write through this view. Since the revoke, such a
   write fails in production with a permission error, and a test is a cheaper
   place to find that out than a reader's profile page.
   ========================================================= */

const VIEW = "public_profiles";

const WRITES = ["insert", "update", "upsert", "delete"];

/** Every source file that mentions the view at all. */
function filesMentioningTheView(): string[] {
  try {
    return execFileSync(
      "grep",
      ["-rl", VIEW, "--include=*.ts", "--include=*.tsx", "app", "components", "hooks", "lib"],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * The chain that follows each `.from(...)` naming this view.
 *
 * A supabase query is a fluent chain, so the write verb sits after the table
 * in the same statement. Reading to the end of the statement is enough and
 * does not need a parser.
 */
function chainsFromTheView(source: string): string[] {
  const chains: string[] = [];
  const from = /\.from\(\s*(?:"public_profiles"|'public_profiles'|`public_profiles`|PUBLIC_PROFILES)\s*\)/g;

  let match: RegExpExecArray | null;

  while ((match = from.exec(source)) !== null) {
    const rest = source.slice(match.index + match[0].length);
    const end = rest.indexOf(";");
    chains.push(rest.slice(0, end === -1 ? 400 : end));
  }

  return chains;
}

describe("nothing in the app writes to the directory", () => {
  const files = filesMentioningTheView();

  it("finds the places that use it, so this test is not vacuous", () => {
    // If the view is renamed and this list empties, the cases below would
    // pass without checking anything.
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s only reads", (file) => {
    const chains = chainsFromTheView(readFileSync(file, "utf8"));

    for (const chain of chains) {
      for (const write of WRITES) {
        expect(chain.toLowerCase()).not.toContain(`.${write}(`);
      }
    }
  });
});

describe("the grants that make that true", () => {
  it("has a migration revoking the write privileges", () => {
    /*
     * The database is the real enforcement and cannot be reached from here.
     * What this checks is that the fix is recorded as a migration rather than
     * living only as a change someone once made by hand — a project rebuilt
     * from migrations alone has to come back safe.
     */
    const migration = readMigration("public_profiles_read_only");

    expect(migration).toMatch(
      /revoke[\s\S]*insert[\s\S]*update[\s\S]*delete[\s\S]*on\s+public\.public_profiles\s+from\s+authenticated/i,
    );
    // And that it does not quietly take the reading away with it.
    expect(migration).toMatch(
      /grant\s+select\s+on\s+public\.public_profiles\s+to\s+authenticated/i,
    );
  });
});
