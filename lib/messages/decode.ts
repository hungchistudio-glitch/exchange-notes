import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileLanguagePair } from "@/lib/languages";

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
  [learningLanguage, nativeLanguage]: ProfileLanguagePair,
): Promise<Map<number, MessageAnalysis>> {
  const byMessageId = new Map<number, MessageAnalysis>();
  if (messageIds.length === 0) return byMessageId;

  const { data: analysisRows, error: analysisError } = await supabase
    .from("message_language_analysis")
    .select("message_id, status, tone, tone_confidence")
    .eq("user_id", userId)
    .eq("learning_language", learningLanguage)
    .eq("native_language", nativeLanguage)
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
    .eq("learning_language", learningLanguage)
    .eq("native_language", nativeLanguage)
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

/* =========================================================
   Holding off, across the whole app

   On 2026-09-25 the daily quota ran out while a conversation was open, and
   the screen asked about the next message, and the next — eleven requests
   in four seconds, every one refused. Every new message that arrived then
   sent the whole backlog out again.

   The route now answers "not until …" when asking is pointless, and this
   remembers it: in memory for this page, and in localStorage so that
   reopening the app does not start the backlog over. Until the time
   passes, no conversation asks; after it, the next one opened fills in its
   cards as it always did.
   ========================================================= */

const PAUSE_KEY = "exchange-notes:message-analysis-paused-until";

/** Used when a request fails without saying how long to wait. */
export const ANALYSIS_FALLBACK_PAUSE_MS = 2 * 60 * 1000;

let pausedUntilMemory = 0;

/** When asking may start again, or 0 when it may start now. */
export function messageAnalysisPausedUntil(now: number = Date.now()): number {
  let until = pausedUntilMemory;

  if (!until) {
    try {
      until = Number(window.localStorage.getItem(PAUSE_KEY) ?? 0) || 0;
      pausedUntilMemory = until;
    } catch {
      /* No storage (private mode, a test): memory alone is enough. */
    }
  }

  return until > now ? until : 0;
}

export function pauseMessageAnalysis(until: number) {
  if (!Number.isFinite(until) || until <= Date.now()) return;
  pausedUntilMemory = Math.max(pausedUntilMemory, until);

  try {
    window.localStorage.setItem(PAUSE_KEY, String(pausedUntilMemory));
  } catch {
    /* As above. */
  }
}

export function resetMessageAnalysisPauseForTests() {
  pausedUntilMemory = 0;
  try {
    window.localStorage.removeItem(PAUSE_KEY);
  } catch {
    /* As above. */
  }
}

export type MessageAnalysisOutcome =
  | { kind: "analysis"; analysis: MessageAnalysis }
  /** Stop asking about anything until `until`. */
  | { kind: "paused"; until: number };

/**
 * Ask the server to read a message.
 *
 * Never throws. A card is enrichment: when it cannot be had, the caller
 * shows nothing and — this is the part that changed — stops asking until
 * the time this returns, instead of moving straight on to the next message.
 */
export async function requestMessageAnalysis(
  messageId: number,
): Promise<MessageAnalysisOutcome> {
  const fallback = (): MessageAnalysisOutcome => ({
    kind: "paused",
    until: Date.now() + ANALYSIS_FALLBACK_PAUSE_MS,
  });

  try {
    const response = await fetch("/api/messages/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      analysis?: MessageAnalysis;
      pauseUntil?: unknown;
    };

    if (response.ok && payload.analysis) {
      return { kind: "analysis", analysis: payload.analysis };
    }

    const until = Number(payload.pauseUntil);
    return Number.isFinite(until) && until > Date.now()
      ? { kind: "paused", until }
      : fallback();
  } catch (error) {
    console.warn("Could not analyse this message:", error);
    return fallback();
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
