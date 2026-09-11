import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* =========================================================
   A column name inside a policy subquery has to say which table it means

   20260817140000 wrote a membership check as

     exists (
       select 1 from public.messages m
       where m.id = message_id and m.conversation_id = conversation_id
     )

   and got one binding right and one wrong. Postgres resolves an unqualified
   name against the innermost scope first. `messages` has no `message_id`, so
   that one fell through to the outer table as intended — but `messages` does
   have a `conversation_id`, so the other bound to `m.conversation_id` and the
   comparison became a column against itself, true for every row.

   It read correctly. It passed review. It sat in production for three weeks
   letting any signed-in reader insert an analysis row against a message in a
   conversation they cannot see.

   So this reads every policy subquery in the directory and flags a bare name
   that is *also* a column of the table being scanned. It does not object to
   bare names generally — `m.id = message_id` is fine and there are a dozen
   like it — only to the ones that are genuinely ambiguous. Across eighty
   migrations that is a single hit, which is the one above.
   ========================================================= */

const MIGRATIONS = join(process.cwd(), "supabase/migrations");

/**
 * The one migration allowed to contain the mistake: it is where the mistake
 * was made, and 20260911223505 replaces the policy. Editing an applied
 * migration would not change the database, and would erase the record of how
 * the defect got in.
 */
const CORRECTED_BY_A_LATER_MIGRATION = new Set([
  "20260817140000_yumi_language_analysis.sql",
]);

function withoutComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

const files = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => ({ name, sql: withoutComments(readFileSync(join(MIGRATIONS, name), "utf8")) }));

/** Every column this directory ever gives each table. */
const columnsByTable = (() => {
  const byTable = new Map<string, Set<string>>();
  const structural = new Set(["constraint", "primary", "unique", "foreign", "check"]);

  for (const { sql } of files) {
    const lower = sql.toLowerCase();

    for (const match of lower.matchAll(
      /create table\s+(?:if not exists\s+)?(?:public\.)?([a-z_0-9]+)\s*\(([\s\S]*?)\n\s*\);/g,
    )) {
      const columns = byTable.get(match[1]) ?? new Set<string>();
      for (const line of match[2].split("\n")) {
        const column = /^\s*([a-z_][a-z_0-9]*)\s+[a-z]/.exec(line);
        if (column && !structural.has(column[1])) columns.add(column[1]);
      }
      byTable.set(match[1], columns);
    }

    for (const match of lower.matchAll(
      /alter table\s+(?:public\.)?([a-z_0-9]+)[\s\S]{0,80}?add column\s+(?:if not exists\s+)?([a-z_][a-z_0-9]*)/g,
    )) {
      const columns = byTable.get(match[1]) ?? new Set<string>();
      columns.add(match[2]);
      byTable.set(match[1], columns);
    }
  }

  return byTable;
})();

describe("policy subqueries name the table they mean", () => {
  it("parsed enough of the schema for the check to be meaningful", () => {
    // A regression in the parser would make the test below vacuously pass.
    expect(columnsByTable.size).toBeGreaterThan(30);
    expect(columnsByTable.get("messages")).toContain("conversation_id");
  });

  it("never compares against a bare name the inner table also defines", () => {
    const ambiguous: string[] = [];

    for (const { name, sql } of files) {
      if (CORRECTED_BY_A_LATER_MIGRATION.has(name)) continue;

      for (const subquery of sql.matchAll(
        /exists\s*\(\s*select\s+1\s+from\s+public\.([a-z_0-9]+)\s+(?:as\s+)?([a-z_0-9]+)\s+where([\s\S]*?)\)\s*\)/gi,
      )) {
        const table = subquery[1].toLowerCase();
        const inner = columnsByTable.get(table) ?? new Set<string>();

        for (const comparison of subquery[3].matchAll(/([a-z_0-9.]+)\s*=\s*([a-z_0-9.]+)/gi)) {
          for (const side of [comparison[1], comparison[2]]) {
            if (side.includes(".") || /^\d+$/.test(side)) continue;
            if (inner.has(side.toLowerCase())) {
              ambiguous.push(
                `${name}: "${comparison[0].trim()}" scans public.${table}, which has its own ${side}`,
              );
            }
          }
        }
      }
    }

    expect(ambiguous).toEqual([]);
  });

  it("the migration that fixed it qualifies both sides", () => {
    const fix = files.find((f) => f.name.endsWith("_analysis_policy_qualify_conversation_id.sql"));
    expect(fix).toBeDefined();
    expect(fix!.sql).toContain("m.conversation_id = message_language_analysis.conversation_id");
    expect(fix!.sql).toContain("m.id = message_language_analysis.message_id");
  });
});
