import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Yumi's language layer, client side.
 *
 * Everything here is enrichment: it sits beside a conversation that already
 * works and adds to it when it can. Every read tolerates absence and every
 * failure is logged rather than thrown, because the one rule this layer has to
 * obey is that a model being slow, broken or unpaid-for must not stop two
 * people talking to each other (§45, §52).
 */

export type PhraseType =
  | "expression"
  | "abbreviation"
  | "phrase"
  | "slang"
  | "idiom";

export type AnalysisStatus = "pending" | "ready" | "failed" | "skipped";

export type ToneConfidence = "high" | "medium" | "low";

export type DetectedPhrase = {
  id: string;
  /** The literal substring, so the bubble can underline the real words. */
  phrase: string;
  phraseType: PhraseType;
  /** In the reader's own language. */
  meaning: string;
  /** Abbreviations only: "lmk" -> "let me know". */
  expanded: string | null;
};

export type MessageAnalysis = {
  messageId: number;
  status: AnalysisStatus;
  tone: string | null;
  toneConfidence: ToneConfidence | null;
  phrases: DetectedPhrase[];
};

export type ReplyDirection = "friendly" | "casual" | "natural";

export type ReplySuggestion = {
  direction: ReplyDirection;
  /** What to send, in the language the user is learning. */
  text: string;
  /** What it means, in the language they already have. */
  gloss: string;
};

type AnalysisRow = {
  message_id: number;
  status: AnalysisStatus;
  tone: string | null;
  tone_confidence: ToneConfidence | null;
};

type PhraseRow = {
  id: string;
  message_id: number;
  phrase: string;
  phrase_type: PhraseType;
  meaning: string;
  expanded: string | null;
  position: number;
};

/**
 * Load whatever analysis already exists for a window of messages.
 *
 * Two queries rather than a join because the phrase rows are the bulk and are
 * only wanted for messages that actually have an analysis. Called with the
 * visible window rather than the whole history — §43 is explicit that older
 * enrichment should not be bundled by default.
 */
export async function listAnalysisForMessages(
  supabase: SupabaseClient,
  userId: string,
  messageIds: number[],
): Promise<Map<number, MessageAnalysis>> {
  const byMessageId = new Map<number, MessageAnalysis>();
  if (messageIds.length === 0) return byMessageId;

  const { data: analysisRows, error: analysisError } = await supabase
    .from("message_language_analysis")
    .select("message_id, status, tone, tone_confidence")
    .eq("user_id", userId)
    .in("message_id", messageIds);

  if (analysisError) throw analysisError;

  for (const row of (analysisRows ?? []) as AnalysisRow[]) {
    byMessageId.set(row.message_id, {
      messageId: row.message_id,
      status: row.status,
      tone: row.tone,
      toneConfidence: row.tone_confidence,
      phrases: [],
    });
  }

  const readyIds = [...byMessageId.values()]
    .filter((analysis) => analysis.status === "ready")
    .map((analysis) => analysis.messageId);

  if (readyIds.length === 0) return byMessageId;

  const { data: phraseRows, error: phraseError } = await supabase
    .from("detected_phrases")
    .select("id, message_id, phrase, phrase_type, meaning, expanded, position")
    .eq("user_id", userId)
    .in("message_id", readyIds)
    .order("position", { ascending: true });

  if (phraseError) throw phraseError;

  for (const row of (phraseRows ?? []) as PhraseRow[]) {
    byMessageId.get(row.message_id)?.phrases.push({
      id: row.id,
      phrase: row.phrase,
      phraseType: row.phrase_type,
      meaning: row.meaning,
      expanded: row.expanded,
    });
  }

  return byMessageId;
}

/**
 * Ask the server to read a message.
 *
 * Returns null on any failure — a refusal, a timeout, an exhausted daily
 * quota. The caller's job is then to do nothing, which is the correct
 * behaviour: no card is the same as no card yet, and neither is an error the
 * user needs to be told about mid-conversation.
 */
export async function requestMessageAnalysis(
  messageId: number,
): Promise<MessageAnalysis | null> {
  try {
    const response = await fetch("/api/messages/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { analysis?: MessageAnalysis };
    return payload.analysis ?? null;
  } catch (error) {
    console.warn("Could not analyse this message:", error);
    return null;
  }
}

/**
 * Ask for three ways to reply. Null on failure, and the composer stays exactly
 * as usable as it was — §52 names this one specifically.
 */
export async function requestReplySuggestions(
  conversationId: string,
  messageId: number,
): Promise<ReplySuggestion[] | null> {
  try {
    const response = await fetch("/api/messages/reply-coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, messageId }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      suggestions?: ReplySuggestion[];
    };

    return payload.suggestions?.length ? payload.suggestions : null;
  } catch (error) {
    console.warn("Could not draft replies:", error);
    return null;
  }
}

/*
 * Which messages are worth asking about at all.
 *
 * Checked on the client before spending a request: your own messages are not
 * study material, the encoded cards are already bilingual by construction, and
 * a two-character reply has nothing in it to explain. This is a filter on cost
 * and noise, not on correctness — the route re-checks everything it relies on.
 */
export const MINIMUM_ANALYSABLE_LENGTH = 8;

export function isWorthAnalysing(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length < MINIMUM_ANALYSABLE_LENGTH) return false;

  // The marker-prefixed encodings — word cards and news cards — carry their own
  // translations already. See lib/messages/wordCard.ts.
  if (trimmed.startsWith("⟧")) return false;

  return true;
}

/** Where a phrase sits in the message text, for underlining it in place. */
export type PhraseSpan = {
  start: number;
  end: number;
  phrase: DetectedPhrase;
};

/**
 * Locate each detected phrase inside the message body.
 *
 * Case-insensitive, first occurrence only, and overlaps are dropped rather
 * than nested — §18 asks for a conversation that still looks like a
 * conversation, and two underlines fighting over the same words is the
 * opposite of subtle. A phrase the model paraphrased instead of quoting simply
 * will not match, and is left to the card alone.
 */
export function findPhraseSpans(
  body: string,
  phrases: DetectedPhrase[],
): PhraseSpan[] {
  const haystack = body.toLowerCase();
  const spans: PhraseSpan[] = [];

  for (const phrase of phrases) {
    const needle = phrase.phrase.trim().toLowerCase();
    if (!needle) continue;

    const start = haystack.indexOf(needle);
    if (start === -1) continue;

    const end = start + needle.length;
    const overlaps = spans.some(
      (existing) => start < existing.end && end > existing.start,
    );
    if (overlaps) continue;

    spans.push({ start, end, phrase });
  }

  return spans.sort((left, right) => left.start - right.start);
}
