"use client";

import { useEffect, useState } from "react";
import { RotateCw, X } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";
import {
  requestReplySuggestions,
  type ReplyDirection,
  type ReplySuggestion,
} from "@/lib/messages/decode";

/*
 * Reply Coach.
 *
 * Its own panel rather than more rows inside the Decode card, which §24 asks
 * for and which is also the honest shape: the card explains what was said,
 * this proposes what to say back, and stacking generated text under an
 * explanation makes both harder to read.
 *
 * Each suggestion carries a gloss in the language the user already has. Handing
 * someone a sentence in the language they are still learning and inviting them
 * to send it without knowing what it says is not coaching, it is a dare.
 *
 * Nothing here can send. Choosing a reply puts it in the composer and stops;
 * the send button is still a thing the user has to press, which is what §24
 * means by the user owning the final message.
 */

type ReplyCoachPanelProps = {
  conversationId: string;
  messageId: number;
  onInsert: (text: string) => void;
  onClose: () => void;
};

export default function ReplyCoachPanel({
  conversationId,
  messageId,
  onInsert,
  onClose,
}: ReplyCoachPanelProps) {
  const { t } = useTranslation();
  const copy = t.messages.coach;

  const [attempt, setAttempt] = useState(0);
  const [insertedDirection, setInsertedDirection] =
    useState<ReplyDirection | null>(null);

  /*
   * The outcome, tagged with the attempt that produced it.
   *
   * Carrying the attempt number is what makes "still drafting" and "failed"
   * derivable instead of two more pieces of state cleared at the top of the
   * effect — which is both a cascading render and, on retry, a moment where
   * the old suggestions are shown as if they were the new ones.
   */
  const [result, setResult] = useState<{
    attempt: number;
    suggestions: ReplySuggestion[] | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const drafted = await requestReplySuggestions(conversationId, messageId);
      if (cancelled) return;
      setResult({ attempt, suggestions: drafted });
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, messageId, attempt]);

  const current = result?.attempt === attempt ? result : null;
  const suggestions = current?.suggestions ?? null;
  const failed = current !== null && current.suggestions === null;

  const directionLabel: Record<ReplyDirection, string> = {
    friendly: copy.directions.friendly,
    casual: copy.directions.casual,
    natural: copy.directions.natural,
  };

  return (
    <section
      className="mt-3 rounded-[20px] border p-4"
      style={{
        background: "var(--msg-surface-soft)",
        borderColor: "var(--msg-line)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[13px] font-bold">{copy.title}</h4>
          <p
            className="mt-0.5 text-[12px] leading-5"
            style={{ color: "var(--msg-ink-soft)" }}
          >
            {copy.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ color: "var(--msg-ink-faint)" }}
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      {!suggestions && !failed && (
        <p
          className="mt-3 text-[13px]"
          style={{ color: "var(--msg-ink-soft)" }}
        >
          {copy.drafting}
        </p>
      )}

      {failed && (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-[13px]" style={{ color: "var(--msg-ink-soft)" }}>
            {copy.failed}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold"
            style={{
              borderColor: "var(--msg-line)",
              color: "var(--msg-accent)",
            }}
          >
            <RotateCw size={13} strokeWidth={2} />
            {copy.retry}
          </button>
        </div>
      )}

      {suggestions && (
        <>
          <ul className="mt-3 space-y-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.direction}>
                <button
                  type="button"
                  onClick={() => {
                    onInsert(suggestion.text);
                    setInsertedDirection(suggestion.direction);
                  }}
                  aria-label={`${directionLabel[suggestion.direction]} — ${copy.insert}`}
                  className="w-full rounded-2xl border p-3 text-left transition-colors"
                  style={{
                    background: "var(--msg-surface)",
                    borderColor:
                      insertedDirection === suggestion.direction
                        ? "var(--msg-accent)"
                        : "var(--msg-line)",
                  }}
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--msg-accent)" }}
                  >
                    {directionLabel[suggestion.direction]}
                  </span>

                  <span className="mt-1 block text-[14px] leading-[1.5]">
                    {suggestion.text}
                  </span>

                  {/* What it means, so nobody sends a sentence they cannot read. */}
                  <span
                    className="mt-1 block text-[12px] leading-5"
                    style={{ color: "var(--msg-ink-soft)" }}
                  >
                    {suggestion.gloss}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p
            className="mt-2.5 text-[11px]"
            style={{ color: "var(--msg-ink-faint)" }}
          >
            {insertedDirection ? copy.inserted : copy.ownership}
          </p>
        </>
      )}
    </section>
  );
}
