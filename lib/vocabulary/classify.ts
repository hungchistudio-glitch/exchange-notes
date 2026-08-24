import { normalizeQuery } from "@/lib/lexicon/normalize";
import type { LexiconEntry } from "@/lib/lexicon/types";
import { isLexiconEntry } from "@/lib/lexicon/types";

/* =========================================================
   The lookup, for callers that only want the answer

   Text selected on a card, and nothing else. Everything with a search field
   goes through hooks/lexicon/useLexiconSearch instead, which adds the
   reader's own words, the language question and the cache; this is the bare
   request underneath, for a flow with no field and no result screen.

   It returns the same LexiconEntry the search engine works in. It used to
   return a shape of its own with fields named after two languages, which
   meant a Spanish word selected by a French reader arrived in a field called
   `chineseName` and was saved as whatever that implied.
   ========================================================= */

export async function classifyText(text: string): Promise<LexiconEntry> {
  const query = normalizeQuery(text);

  const response = await fetch("/api/classify-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: query }),
  });

  const data = await response.json();

  if (!response.ok || "error" in data) {
    throw new Error(
      "error" in data ? data.error : "Couldn't look up the selected text.",
    );
  }

  const { degraded: _degraded, ...entry } = data as LexiconEntry & {
    degraded?: boolean;
  };
  void _degraded;

  if (!isLexiconEntry(entry)) {
    throw new Error("Couldn't look up the selected text.");
  }

  return entry;
}
