import { NextResponse } from "next/server";

import { normalizeQuery } from "@/lib/lexicon/normalize";
import type { LexiconPreview } from "@/lib/lexicon/types";
import { readLanguageRoles } from "@/lib/profile/languagePair";
import { createClient } from "@/lib/supabase/server";
import { lookupOffline } from "@/lib/vocabulary/offlineLookup";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 240;

/**
 * Instant half of a two-phase lookup.
 *
 * This never calls Gemini. It reads the bundled CC-CEDICT index and returns
 * only the parts that dictionary actually knows — the word, its translation
 * and its part of speech — so the card can render while the real lookup is
 * still in flight.
 *
 * The offline index fabricates example sentences ("Today I learned the word
 * X"), and those are deliberately stripped rather than sent: showing one
 * would flash invented content that the real result then overwrites. The
 * client renders the example area as a skeleton instead.
 *
 * Deliberately a separate route from /api/classify-text so the existing
 * lookup path is untouched. A failure here costs a skeleton, not a lookup.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in before looking up a word." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { text?: string };
    const query = normalizeQuery(body.text ?? "");

    if (!query || query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json({ error: "Invalid query." }, { status: 400 });
    }

    /*
     * The pair matters even here. This index only speaks English and Chinese,
     * so for a reader studying French the honest preview is the one that says
     * it has no translation — not a Chinese gloss they cannot read, which is
     * what an index consulted without knowing the pair would hand back.
     */
    const roles = await readLanguageRoles(supabase, user.id);
    const offline = await lookupOffline(query, { roles });

    const preview: LexiconPreview = {
      term: offline.term,
      translation: offline.translation,
      partOfSpeech: offline.partOfSpeech,
      category: offline.category,
      // Without this the preview would render one side blank with nothing to
      // explain it, which is the same misleading gap in a quieter form.
      translationUnavailable: offline.translationUnavailable,
    };

    return NextResponse.json(preview);
  } catch {
    // The caller treats any failure as "no preview available".
    return NextResponse.json({ error: "No preview available." }, { status: 503 });
  }
}
