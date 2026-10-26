import type { SupabaseClient } from "@supabase/supabase-js";

import type { LanguageCode } from "@/lib/languages";

import { isLevel, type HangyumiLevel, type PartOfSpeech } from "./rules";

/* =========================================================
   The word bank, for the one who approves it

   hangyumi_review_words sends every word, answers and all, but only to a
   reader listed in private.hangyumi_reviewers; anyone else gets 42501.
   hangyumi_review_set moves words between draft, approved and rejected.
   ========================================================= */

export type ReviewStatus = "draft" | "approved" | "rejected";

export type ReviewWord = {
  id: string;
  language: LanguageCode;
  level: HangyumiLevel;
  answer: string;
  partOfSpeech: PartOfSpeech;
  clues: Partial<Record<LanguageCode, string>>;
  source: string;
  status: ReviewStatus;
};

export class NotReviewerError extends Error {
  constructor() {
    super("Only a word reviewer can do this.");
    this.name = "NotReviewerError";
  }
}

/** A level needs this many approved words in each language. */
export const WORDS_PER_CELL = 60;

export function readReviewWords(value: unknown): ReviewWord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const row = (item ?? {}) as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.answer !== "string" || !isLevel(row.level)) return [];
    const status: ReviewStatus = row.status === "approved" || row.status === "rejected" ? row.status : "draft";
    return [{
      id: row.id,
      language: row.language as LanguageCode,
      level: row.level,
      answer: row.answer,
      partOfSpeech: row.partOfSpeech as PartOfSpeech,
      clues: (row.clues ?? {}) as Partial<Record<LanguageCode, string>>,
      source: typeof row.source === "string" ? row.source : "",
      status,
    }];
  });
}

export function createWordReview(supabase: SupabaseClient) {
  async function call(name: string, args?: Record<string, unknown>) {
    const { data, error } = await supabase.rpc(name, args);
    if (error?.code === "42501") throw new NotReviewerError();
    if (error) throw new Error(error.message);
    return data;
  }
  return {
    async list() {
      return readReviewWords(await call("hangyumi_review_words"));
    },
    async set(ids: string[], status: ReviewStatus) {
      return Number(await call("hangyumi_review_set", { p_ids: ids, p_status: status })) || 0;
    },
  };
}

export type WordReview = ReturnType<typeof createWordReview>;
