import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* =========================================================
   The directory has to rebuild a database, not just describe one

   `supabase db reset` against an empty database used to stop on the third
   file: 20260713173000 alters public.messages, which nothing before it
   creates. Several tables and sixteen policies reached production through
   the dashboard and were never written down, and the chain had been altering
   them ever since — invisible, because every environment that mattered
   already had them.

   These two tests are the invariant that was missing. They are static: they
   read the SQL rather than run it, so they cost nothing and fail in CI the
   moment a migration is written against something no earlier migration
   creates. Running the real thing still belongs in `supabase start`; this is
   what catches the mistake before it gets that far.
   ========================================================= */

const MIGRATIONS = join(process.cwd(), "supabase/migrations");

type Migration = { name: string; sql: string };

const files: Migration[] = readdirSync(MIGRATIONS)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((name) => ({
    name,
    // Comments discuss tables these files do not touch, and a `create table`
    // inside a block comment creates nothing.
    sql: readFileSync(join(MIGRATIONS, name), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/--[^\n]*/g, " ")
      .toLowerCase(),
  }));

function matchAll(sql: string, pattern: RegExp): RegExpMatchArray[] {
  return [...sql.matchAll(pattern)];
}

describe("the migration chain rebuilds from empty", () => {
  it("never alters a table an earlier migration has not created", () => {
    const created = new Set<string>();
    const broken: string[] = [];

    for (const { name, sql } of files) {
      // A file may create a table and then alter it, so its own creates
      // count before its own alters are checked.
      for (const [, table] of matchAll(
        sql,
        /create table\s+(?:if not exists\s+)?(?:public\.)?([a-z_0-9]+)/g,
      )) {
        created.add(table);
      }

      for (const [, to] of matchAll(
        sql,
        /alter table\s+(?:if exists\s+)?(?:only\s+)?public\.[a-z_0-9]+\s+rename to\s+([a-z_0-9]+)/g,
      )) {
        created.add(to);
      }

      for (const [, table] of matchAll(
        sql,
        /alter table\s+(?:if exists\s+)?(?:only\s+)?public\.([a-z_0-9]+)/g,
      )) {
        if (!created.has(table)) broken.push(`${name} alters public.${table}`);
      }
    }

    expect(broken).toEqual([]);
  });

  it("never alters a policy an earlier migration has not created", () => {
    const created = new Set<string>();
    const broken: string[] = [];

    for (const { name, sql } of files) {
      for (const [, policy, table] of matchAll(
        sql,
        /create policy\s+"([^"]+)"\s+on\s+(?:public\.)?([a-z_0-9]+)/g,
      )) {
        created.add(`${table}.${policy}`);
      }

      for (const [, policy, table] of matchAll(
        sql,
        /alter policy\s+"([^"]+)"\s+on\s+(?:public\.)?([a-z_0-9]+)/g,
      )) {
        if (!created.has(`${table}.${policy}`)) {
          broken.push(`${name} alters "${policy}" on public.${table}`);
        }
      }
    }

    expect(broken).toEqual([]);
  });

  it("adds columns in a form that survives a replay", () => {
    // Not style: a second run of the chain — a rebuilt environment, a version
    // mismatch like the ones supabase/migrations/README.md lists — has to
    // reach the same place rather than stop half way. `add column` has an
    // `if not exists`; there is exactly one in the directory that did not use
    // it, and it collided with the baseline the moment one existed.
    //
    // `add constraint` has no such form, and six migrations still add one
    // without a `drop constraint if exists` in front. They replay from empty
    // perfectly well — nothing is there to collide with — so they are left
    // alone rather than edited after the fact.
    const unguarded: string[] = [];

    for (const { name, sql } of files) {
      for (const match of matchAll(sql, /add column(?!\s+if not exists)/g)) {
        unguarded.push(
          `${name}: ${sql.slice(match.index, match.index! + 40).trim()}`,
        );
      }
    }

    expect(unguarded).toEqual([]);
  });
});
