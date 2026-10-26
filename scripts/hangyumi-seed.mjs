import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/* =========================================================
   Bring Hangyumi's drafted word bank into the database

   The bank is written in supabase/hangyumi/<language>.json, 60 words a
   level in each of the five languages, and checked by
   tests/hangyumiBank.test.ts. It lives outside lib/ and app/ so no page
   can import it: the answers must never reach a browser.

   Every word goes in as 'draft'. Only a word Chi approves on
   /hangyumi/review is ever dealt. Running this again adds new words and
   refreshes words that are still drafts; a word already approved or
   rejected is left exactly as it was reviewed.

     node scripts/hangyumi-seed.mjs            says what it would do
     node scripts/hangyumi-seed.mjs --apply    writes it

   Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
   .env.local.
   ========================================================= */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGUAGES = ["en", "zh-TW", "es", "fr", "it"];
const apply = process.argv.includes("--apply");

function readEnvFile() {
  const text = readFileSync(join(root, ".env.local"), "utf8");
  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      }),
  );
}

const env = { ...readEnvFile(), ...process.env };
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!env[key]) throw new Error(`${key} is missing from .env.local`);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** The same key as private.yumi_word_key: NFC, lower case, single spaces. */
const wordKey = (word) => word.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

const rows = LANGUAGES.flatMap((language) => {
  const file = JSON.parse(readFileSync(join(root, "supabase/hangyumi", `${language}.json`), "utf8"));
  return file.words.map(([level, answer, partOfSpeech, ...clues]) => ({
    language,
    level,
    answer: answer.normalize("NFC"),
    part_of_speech: partOfSpeech,
    clues: Object.fromEntries(LANGUAGES.map((clueLanguage, index) => [clueLanguage, clues[index]])),
    source: file.source,
  }));
});

const { data: existing, error: readError } = await supabase
  .from("hangyumi_words")
  .select("id, language, canonical, status");
if (readError) throw readError;

const known = new Map(existing.map((row) => [`${row.language}:${row.canonical}`, row]));
const inserts = [];
const updates = [];
let kept = 0;
for (const row of rows) {
  const found = known.get(`${row.language}:${wordKey(row.answer)}`);
  if (!found) inserts.push(row);
  else if (found.status === "draft") updates.push({ ...row, id: found.id, updated_at: new Date().toISOString() });
  else kept += 1;
}

console.log(`${rows.length} words in the bank: ${inserts.length} new, ${updates.length} drafts to refresh, ${kept} already reviewed and left alone.`);
if (!apply) {
  console.log("Nothing written. Run again with --apply.");
  process.exit(0);
}

for (let i = 0; i < inserts.length; i += 100) {
  const { error } = await supabase.from("hangyumi_words").insert(inserts.slice(i, i + 100));
  if (error) throw error;
}
for (let i = 0; i < updates.length; i += 100) {
  const { error } = await supabase.from("hangyumi_words").upsert(updates.slice(i, i + 100), { onConflict: "id" });
  if (error) throw error;
}
console.log("Written.");
