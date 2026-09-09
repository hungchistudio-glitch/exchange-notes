"use client";

import { useState } from "react";
import { Check, HelpCircle, MessageSquare, Plus, Volume2, X } from "lucide-react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import ReplyCoachPanel from "@/components/messages/ReplyCoachPanel";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { DetectedPhrase, MessageAnalysis } from "@/lib/messages/decode";
import { speak, type SpeechLanguage } from "@/lib/speech";

/*
 * The Decode card.
 *
 * Inline under the message it explains, and deliberately wider than a message
 * bubble — §19 is explicit that this is supporting intelligence rather than
 * something someone said, and forcing it to bubble width was the constraint
 * the two-page architecture existed to remove.
 *
 * Each phrase is its own block with its own type label, because three
 * explanations run together are one paragraph nobody reads.
 */

type YumiDecodeCardProps = {
  analysis: MessageAnalysis;
  conversationId: string;
  /** The language the phrases are in — what the reader is here to learn. */
  speechLanguage: SpeechLanguage;
  savedPhraseIds: Set<string>;
  savingPhraseId: string | null;
  onSavePhrase: (phrase: DetectedPhrase) => void;
  onInsertReply: (text: string) => void;
  onClose: () => void;
};

export default function YumiDecodeCard({
  analysis,
  conversationId,
  speechLanguage,
  savedPhraseIds,
  savingPhraseId,
  onSavePhrase,
  onInsertReply,
  onClose,
}: YumiDecodeCardProps) {
  const { t } = useTranslation();
  const copy = t.messages.decode;

  const [showWhy, setShowWhy] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  const typeLabel: Record<DetectedPhrase["phraseType"], string> = {
    expression: copy.types.expression,
    abbreviation: copy.types.abbreviation,
    phrase: copy.types.phrase,
    slang: copy.types.slang,
    idiom: copy.types.idiom,
  };

  return (
    <article
      className="mt-2 w-full max-w-[760px] rounded-[24px] border p-4 sm:p-5"
      style={{
        background: "var(--msg-surface)",
        borderColor: "var(--msg-line)",
        boxShadow: "var(--msg-glow)",
      }}
    >
      <header className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--msg-surface-soft)" }}
        >
          <ExchangeNotesMark
            className="h-6 w-6"
            surfaceColor="var(--msg-mark-surface)"
            highlightColor="var(--msg-mark-highlight)"
          />
        </span>

        <h3
          className="flex-1 text-[0.6875rem] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--msg-accent)" }}
        >
          {copy.label}
        </h3>

        {/*
          §20's optional second action. It answers a question the card raises
          just by existing — why these words and not others — and the answer is
          the honest one: a learner-trouble heuristic, minus what you have
          already saved.
        */}
        <button
          type="button"
          onClick={() => setShowWhy((open) => !open)}
          aria-expanded={showWhy}
          className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium"
          style={{
            borderColor: "var(--msg-line)",
            color: "var(--msg-ink-soft)",
          }}
        >
          <HelpCircle size={13} strokeWidth={1.9} />
          {copy.whyThis}
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ color: "var(--msg-ink-faint)" }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </header>

      {showWhy && (
        <p
          className="mt-2.5 rounded-xl p-3 text-[0.75rem] leading-5"
          style={{
            background: "var(--msg-surface-soft)",
            color: "var(--msg-ink-soft)",
          }}
        >
          {copy.whyThisBody}
        </p>
      )}

      <div className="mt-3.5 space-y-3.5">
        {analysis.phrases.map((phrase) => {
          const saved = savedPhraseIds.has(phrase.id);

          return (
            <div key={phrase.id}>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span
                  className="text-[1.0625rem] font-semibold underline decoration-dotted underline-offset-4"
                  style={{ textDecorationColor: "var(--msg-accent)" }}
                >
                  {phrase.phrase}
                </span>
                <span
                  className="text-[0.625rem] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--msg-ink-faint)" }}
                >
                  {typeLabel[phrase.phraseType]}
                </span>
              </div>

              {/* Abbreviations get their long form first — "lmk" is not a word
                  with a meaning, it is a shorthand for one. */}
              {phrase.expanded && (
                <p
                  className="mt-1 text-[0.875rem] leading-[1.5]"
                  style={{ color: "var(--msg-ink)" }}
                >
                  {phrase.expanded}
                </p>
              )}

              <p
                className="mt-1 text-[0.875rem] leading-[1.5]"
                style={{ color: "var(--msg-ink-soft)" }}
              >
                {phrase.meaning}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => speak(phrase.phrase, speechLanguage)}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.75rem] font-semibold"
                  style={{
                    borderColor: "var(--msg-line)",
                    color: "var(--msg-ink-soft)",
                  }}
                >
                  <Volume2 size={13} strokeWidth={1.9} />
                  {copy.listen}
                </button>

                <button
                  type="button"
                  onClick={() => onSavePhrase(phrase)}
                  disabled={saved || savingPhraseId === phrase.id}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.75rem] font-semibold disabled:opacity-70"
                  style={
                    saved
                      ? {
                          borderColor: "transparent",
                          background: "var(--success-soft)",
                          color: "var(--success)",
                        }
                      : {
                          borderColor: "var(--msg-line)",
                          color: "var(--msg-ink-soft)",
                        }
                  }
                >
                  {saved ? (
                    <Check size={13} strokeWidth={2.2} />
                  ) : (
                    <Plus size={13} strokeWidth={2.2} />
                  )}
                  {saved ? copy.savedPhrase : copy.savePhrase}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/*
        Tone, and only when Yumi has one. §22 rules out manufacturing emotional
        certainty, so a low-confidence read says so in words rather than being
        presented at the same weight as a confident one.
      */}
      {analysis.tone && (
        <div
          className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3"
          style={{ borderColor: "var(--msg-line)" }}
        >
          <span
            className="text-[0.625rem] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--msg-ink-faint)" }}
          >
            {copy.tone}
          </span>
          <span className="text-[0.8125rem] font-medium">{analysis.tone}</span>
          {analysis.toneConfidence === "low" && (
            <span
              className="text-[0.6875rem]"
              style={{ color: "var(--msg-ink-faint)" }}
            >
              {copy.toneUncertain}
            </span>
          )}
        </div>
      )}

      <div
        className="mt-3.5 border-t pt-3.5"
        style={{ borderColor: "var(--msg-line)" }}
      >
        <button
          type="button"
          onClick={() => setCoachOpen((open) => !open)}
          aria-expanded={coachOpen}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[0.8125rem] font-semibold"
          style={{
            background: coachOpen ? "var(--msg-accent-soft)" : "var(--msg-accent)",
            color: coachOpen ? "var(--msg-accent)" : "var(--msg-accent-ink)",
            border: `1px solid ${coachOpen ? "var(--msg-accent)" : "transparent"}`,
          }}
        >
          <MessageSquare size={14} strokeWidth={1.9} />
          {copy.replyCoach}
        </button>
      </div>

      {coachOpen && (
        <ReplyCoachPanel
          conversationId={conversationId}
          messageId={analysis.messageId}
          onInsert={onInsertReply}
          onClose={() => setCoachOpen(false)}
        />
      )}
    </article>
  );
}
