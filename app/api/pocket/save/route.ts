import { NextResponse } from "next/server";

import { isLanguageCode } from "@/lib/languages";
import { findDuplicate } from "@/lib/lexicon/personal";
import { pocketKeyFrom, userForPocketKey } from "@/lib/pocket/keys";
import { readLanguageRoles } from "@/lib/profile/languagePair";
import { createServiceClient } from "@/lib/supabase/service";
import type { VocabularyCategory, VocabularyItem } from "@/lib/types/app";
import { buildVocabularyRow } from "@/lib/vocabulary/entryRow";
import { resolveLanguageIdentity } from "@/lib/vocabulary/languageIdentity";

/*
 * Saving a word from Yumi Pocket Lookup's share extension (Chi, 2026-11-12:
 * the reader presses 收藏; nothing saves by itself).
 *
 * Only for the extension's own key (lib/pocket/keys.ts), never a cookie:
 * inside the app a word is saved on the device, through
 * createVocabularyEntry. This is that door's server twin, and it builds the
 * same row (lib/vocabulary/entryRow.ts), resolves the languages the same
 * way (the lookup's languages as model evidence, the reader's pair as the
 * fallback) and refuses the same duplicates.
 */

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const CATEGORIES: readonly VocabularyCategory[] = ["people", "objects", "actions", "other"];
const CONFIDENCES = ["high", "medium", "low"] as const;

function text(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || [...value].length > max) throw new Error("invalid");
  return value;
}

export async function POST(request: Request) {
  const key = pocketKeyFrom(request);
  if (!key) return NextResponse.json({ error: "key" }, { status: 401, headers: NO_STORE });

  const service = createServiceClient();
  const userId = await userForPocketKey(service, key);
  if (!userId) return NextResponse.json({ error: "key" }, { status: 401, headers: NO_STORE });

  let body: Record<string, unknown>;
  let term: string;
  let translation: string;
  let termExample: string | null;
  let translationExample: string | null;
  let partOfSpeech: string | null;
  try {
    body = await request.json();
    term = (text(body.term, 200) ?? "").trim();
    translation = (text(body.translation, 400) ?? "").trim();
    termExample = text(body.termExample, 600);
    translationExample = text(body.translationExample, 600);
    partOfSpeech = text(body.partOfSpeech, 60);
    if (!term) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  }

  const roles = await readLanguageRoles(service, userId);
  const identity = resolveLanguageIdentity({
    term,
    translation,
    pair: [roles.learning, roles.support],
    ai: {
      termLanguage: isLanguageCode(body.termLanguage) ? body.termLanguage : null,
      translationLanguage: isLanguageCode(body.translationLanguage) ? body.translationLanguage : null,
      confidence: body.languageConfidence,
    },
  });

  // The same duplicate rule as the app, against the reader's library.
  const { data: library, error: readError } = await service
    .from("vocabulary_items")
    .select("id, word, word_language, texts, translation, created_at")
    .eq("user_id", userId);
  if (readError) {
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }
  const existing = findDuplicate((library ?? []) as VocabularyItem[], term, identity.termLanguage);
  if (existing) {
    return NextResponse.json({ status: "duplicate", id: existing.id }, { headers: NO_STORE });
  }

  const row = buildVocabularyRow(
    {
      userId,
      term,
      translation,
      partOfSpeech,
      termExample,
      translationExample,
      confidence: CONFIDENCES.includes(body.confidence as (typeof CONFIDENCES)[number])
        ? (body.confidence as VocabularyItem["confidence"])
        : "medium",
      category: CATEGORIES.includes(body.category as VocabularyCategory)
        ? (body.category as VocabularyCategory)
        : "other",
      status: "new",
    },
    identity,
  );

  const { data, error } = await service
    .from("vocabulary_items")
    // The deprecated column, as insertVocabulary fills it.
    .insert({ ...row, id: crypto.randomUUID(), language: row.word_language })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Pocket save failed:", error?.message);
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ status: "saved", id: data.id }, { headers: NO_STORE });
}
