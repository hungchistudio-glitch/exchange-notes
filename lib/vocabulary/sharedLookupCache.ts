import { createServiceClient } from "@/lib/supabase/service";
import type { VocabularyLookupResult } from "@/lib/types/vocabularyLookup";
import { isVocabularyLookupResult } from "@/lib/types/vocabularyLookup";

/**
 * Cross-user, cross-instance cache for vocabulary lookups.
 *
 * The in-memory cache in the classify-text route is per serverless instance
 * and dies on every cold start, so the same word kept costing a fresh Gemini
 * call. This layer makes a word a one-time cost for the entire app.
 *
 * The cached rows hold no user data — the key is a normalized query string
 * prefixed with the language pair it was answered in, and the value is
 * dictionary content — so a leak of this table would reveal
 * nothing a user could not obtain by performing the lookup themselves. That
 * is what makes reaching it from a user-facing (but authenticated) route with
 * the service role acceptable, provided access stays behind this module's two
 * narrow functions and never accepts a caller-controlled table or column.
 *
 * Every function here fails soft. A cache that is unreachable, misconfigured,
 * or serving rows in an old shape must degrade to a normal lookup, never
 * break one.
 */

const TABLE = "vocabulary_lookup_cache";

/** Bump when VocabularyLookupResult changes shape. */
const CACHE_SCHEMA_VERSION = 1;

/*
 * Matches the column's own check constraint, so an over-long key is refused
 * here rather than at the database.
 *
 * The key is a language-pair prefix plus the query, and the query is allowed
 * to be as long as this on its own — so the longest queries now fall past the
 * ceiling and skip this cache entirely. That is a miss, not a wrong answer,
 * and a miss is the failure this module is built to take. Widening the column
 * would close the gap; a word worth looking up is rarely seventy characters.
 */
const MAX_KEY_LENGTH = 80;

/** Mirrors the size ceiling enforced by the table's own check constraint. */
const MAX_SERIALIZED_RESULT_BYTES = 8192;

function isUsableKey(key: string) {
  return key.length > 0 && key.length <= MAX_KEY_LENGTH;
}

export async function readSharedLookupCache(
  key: string,
): Promise<VocabularyLookupResult | null> {
  if (!isUsableKey(key)) return null;

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from(TABLE)
      .select("result, schema_version")
      .eq("query_key", key)
      .maybeSingle();

    if (error || !data) return null;

    // A row written by an older result shape is discarded, not served.
    if (data.schema_version !== CACHE_SCHEMA_VERSION) return null;
    if (!isVocabularyLookupResult(data.result)) return null;

    // Fire-and-forget: hit accounting must not add latency to the response.
    void supabase
      .rpc("touch_vocabulary_lookup_cache", { p_query_key: key })
      .then(() => undefined, () => undefined);

    return data.result;
  } catch {
    return null;
  }
}

export async function writeSharedLookupCache(
  key: string,
  result: VocabularyLookupResult,
  source: string,
): Promise<void> {
  if (!isUsableKey(key)) return;

  // Guard before the round trip so an oversized result fails quietly here
  // rather than as a constraint violation at the database.
  if (JSON.stringify(result).length > MAX_SERIALIZED_RESULT_BYTES) return;

  try {
    const supabase = createServiceClient();

    await supabase.from(TABLE).upsert(
      {
        query_key: key,
        schema_version: CACHE_SCHEMA_VERSION,
        result,
        source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "query_key" },
    );
  } catch {
    // A cache that cannot be written is not a failed lookup.
  }
}
