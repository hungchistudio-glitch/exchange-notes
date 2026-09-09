import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(process.cwd(), "supabase/migrations");

/**
 * One migration, found by its name rather than by its version.
 *
 * The version prefix is not stable. Applying through the Supabase MCP stamps
 * a version generated at apply time, so the committed file gets renamed to
 * match what the database recorded — see supabase/migrations/README.md, which
 * lists eight of these. A test that spells the prefix out breaks on a rename
 * that changed nothing it was testing, which is exactly what happened to
 * publicProfilesReadOnly when 20260902005607 became 20260902005619.
 *
 * The name after the version is the part nobody rewrites.
 */
export function readMigration(name: string): string {
  const matches = readdirSync(MIGRATIONS).filter(
    (file) => file.endsWith(`_${name}.sql`),
  );

  if (matches.length === 0) {
    throw new Error(
      `No migration named "${name}" in supabase/migrations. ` +
        "It has been deleted, or renamed to something this test does not know about.",
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `More than one migration named "${name}": ${matches.join(", ")}. ` +
        "A duplicate like this is how a replay applies the wrong one.",
    );
  }

  return readFileSync(join(MIGRATIONS, matches[0]), "utf8");
}
