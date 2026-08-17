"use client";

import { Fragment, useMemo } from "react";

import { findPhraseSpans, type DetectedPhrase } from "@/lib/messages/decode";

/*
 * A message, with the parts Yumi picked out marked in place.
 *
 * §18 is the whole brief for this file: the language help lives inside the
 * real message, and the conversation still has to look like a conversation.
 * So the marking is a dotted underline in the accent colour and nothing else —
 * no highlight fill, no badge, no colour change to the words themselves. At a
 * glance the bubble reads as text; at a second glance three phrases are
 * offering something.
 *
 * With no phrases this renders exactly what it was given, which is the case
 * for almost every message.
 */

type HighlightedMessageBodyProps = {
  body: string;
  phrases: DetectedPhrase[];
  /** Opens the card scrolled to this phrase. */
  onSelectPhrase?: (phrase: DetectedPhrase) => void;
};

export default function HighlightedMessageBody({
  body,
  phrases,
  onSelectPhrase,
}: HighlightedMessageBodyProps) {
  const spans = useMemo(
    () => (phrases.length > 0 ? findPhraseSpans(body, phrases) : []),
    [body, phrases],
  );

  if (spans.length === 0) {
    return (
      <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.55]">
        {body}
      </p>
    );
  }

  const pieces: React.ReactNode[] = [];
  let cursor = 0;

  spans.forEach((span, index) => {
    if (span.start > cursor) {
      pieces.push(
        <Fragment key={`text-${index}`}>{body.slice(cursor, span.start)}</Fragment>,
      );
    }

    pieces.push(
      <button
        key={`phrase-${span.phrase.id}`}
        type="button"
        onClick={() => onSelectPhrase?.(span.phrase)}
        /*
         * `inline` rather than a flex or block button: this sits mid-sentence
         * and has to wrap with the text around it like any other word.
         */
        className="inline cursor-pointer bg-transparent p-0 text-left underline decoration-dotted underline-offset-4"
        style={{ textDecorationColor: "var(--msg-accent)", color: "inherit" }}
      >
        {body.slice(span.start, span.end)}
      </button>,
    );

    cursor = span.end;
  });

  if (cursor < body.length) {
    pieces.push(<Fragment key="text-tail">{body.slice(cursor)}</Fragment>);
  }

  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.55]">
      {pieces}
    </p>
  );
}
