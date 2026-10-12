"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { copyText } from "@/lib/vocabulary/share";
import { insertValues } from "@/lib/utils";

type VocabularyCopyButtonProps = {
  text: string;
  className?: string;
};

/** Icon-only shortcut placed beside the primary learning-language word. */
export default function VocabularyCopyButton({
  text,
  className = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.055] text-ink-soft transition active:scale-90",
}: VocabularyCopyButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const label = copied
    ? t.vocabulary.detail.copiedAriaLabel
    : insertValues(t.vocabulary.detail.copyWordAriaLabel, { text });

  async function handleCopy() {
    if (!text.trim()) return;

    try {
      await copyText(text);
      setCopied(true);

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }

      resetTimerRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Unable to copy vocabulary word:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleCopy();
      }}
      aria-label={label}
      title={label}
      className={className}
    >
      {copied ? (
        <Check size={15} strokeWidth={2.1} aria-hidden="true" />
      ) : (
        <Copy size={15} strokeWidth={1.8} aria-hidden="true" />
      )}
    </button>
  );
}
