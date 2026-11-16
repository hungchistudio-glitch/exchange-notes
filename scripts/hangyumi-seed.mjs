import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/* =========================================================
   Bring Hangyumi's drafted word bank into the database

   The bank is written in supabase/hangyumi/<language>.json, 60 words a
   level in each of the seven languages, and checked by
   tests/hangyumiBank.test.ts. It lives outside lib/ and app/ so no page
   can import it: the answers must never reach a browser.

   Every word goes in as 'draft'. Only a word Chi approves on
   /hangyumi/review is ever dealt. Running this again adds new words and
   refreshes words that are still drafts; a word already approved or
   rejected is left exactly as it was reviewed. The exception is Japanese
   and Korean (Chi, 2026-11-16: 起草後直接核准上線): their words arrive
   approved, and Chi can still reject any of them on the review page.

   A reviewed word does get the clues of languages added after it was
   reviewed (Japanese and Korean, 2026-11-16) — only the missing ones;
   a clue that was reviewed is never rewritten.

   Each word's card, from supabase/hangyumi/cards/<language>.json (its
   reading, and the word in the other six languages with theirs), is
   written to every word, reviewed or not: it is what the finished round
   shows under the answer, not what was reviewed.

     node scripts/hangyumi-seed.mjs            says what it would do
     node scripts/hangyumi-seed.mjs --apply    writes it

   Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
   .env.local.
   ========================================================= */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGUAGES = ["en", "zh-TW", "es", "fr", "it", "ja", "ko"];
/** Banks Chi chose to have approved on arrival rather than one by one. */
const APPROVED_ON_ARRIVAL = new Set(["ja", "ko"]);
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
  const cards = JSON.parse(readFileSync(join(root, "supabase/hangyumi/cards", `${language}.json`), "utf8"));
  return file.words.map(([level, answer, partOfSpeech, ...clues]) => ({
    language,
    level,
    answer: answer.normalize("NFC"),
    part_of_speech: partOfSpeech,
    // The file's own columns name each clue: banks gained Japanese and
    // Korean clues after their first five.
    clues: Object.fromEntries(file.columns.slice(3).map((clueLanguage, index) => [clueLanguage, clues[index]])),
    source: file.source,
    card: cards[answer] ?? null,
    ...(APPROVED_ON_ARRIVAL.has(language) ? { status: "approved", reviewed_at: new Date().toISOString() } : {}),
  }));
});

// A page at a time: PostgREST answers at most 1,000 rows, and the bank
// has 1,200; reading one page took the other 200 for new words.
const existing = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("hangyumi_words")
    .select("id, language, canonical, status, card, clues")
    .order("id")
    .range(from, from + 999);
  if (error) throw error;
  existing.push(...data);
  if (data.length < 1000) break;
}

const known = new Map(existing.map((row) => [`${row.language}:${row.canonical}`, row]));
/** JSON with its keys sorted: jsonb keeps keys in an order of its own. */
const canonicalJson = (value) =>
  JSON.stringify(value, (_, inner) =>
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : 1)))
      : inner,
  );

const inserts = [];
const updates = [];
const cardUpdates = [];
const clueUpdates = [];
let kept = 0;
for (const row of rows) {
  const found = known.get(`${row.language}:${wordKey(row.answer)}`);
  if (!found) inserts.push(row);
  else if (found.status === "draft") updates.push({ ...row, id: found.id, updated_at: new Date().toISOString() });
  else {
    kept += 1;
    if (canonicalJson(found.card) !== canonicalJson(row.card)) cardUpdates.push({ id: found.id, card: row.card });
    // Only the clues of languages added since it was reviewed.
    const added = Object.fromEntries(Object.entries(row.clues).filter(([clueLanguage]) => !(clueLanguage in (found.clues ?? {}))));
    if (Object.keys(added).length > 0) clueUpdates.push({ id: found.id, clues: { ...added, ...found.clues } });
  }
}

console.log(`${rows.length} words in the bank: ${inserts.length} new, ${updates.length} drafts to refresh, ${kept} already reviewed and left alone but for ${cardUpdates.length} cards and ${clueUpdates.length} sets of new-language clues to write.`);
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
// One word at a time, ten at once: an update names its row, and an upsert
// of only the card would have to satisfy every not-null column to insert.
for (let i = 0; i < cardUpdates.length; i += 10) {
  const results = await Promise.all(
    cardUpdates.slice(i, i + 10).map(({ id, card }) =>
      supabase.from("hangyumi_words").update({ card, updated_at: new Date().toISOString() }).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
}
for (let i = 0; i < clueUpdates.length; i += 10) {
  const results = await Promise.all(
    clueUpdates.slice(i, i + 10).map(({ id, clues }) =>
      supabase.from("hangyumi_words").update({ clues, updated_at: new Date().toISOString() }).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
}
console.log("Written.");
