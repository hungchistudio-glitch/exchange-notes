"use client";

import { useCallback, useState } from "react";

import { hasPhonetics, type LanguageCode } from "@/lib/languages";
import type { LexiconEntry, LexiconLanguages } from "@/lib/lexicon/types";
import { toPinyin } from "@/lib/pinyin";

/* =========================================================
   Handing a word to something outside the app

   The text is assembled here rather than in the button, because the same
   text goes to the share sheet and to the clipboard fallback, and those
   drifting apart is how a reader ends up pasting something different from
   what they sent.

   The romanisation is asked of the language rather than of the field. This
   used to run toPinyin over whatever sat in the "chinese" slot, which for a
   Spanish–French reader was French, and pinyin of French is a row of
   nonsense syllables attached to a word somebody was about to send a friend.
   ========================================================= */

function romanise(text: string, language: LanguageCode): string {
  if (!text.trim()) return "";

  // Only Chinese has a romanisation this app can produce. Everything else
  // is written in an alphabet the reader can already sound out.
  return hasPhonetics(language, "pinyin") ? (toPinyin(text) ?? "") : "";
}

export default function useLexiconShare(
  entry: LexiconEntry | null,
  languages: LexiconLanguages | null,
) {
  const [copied, setCopied] = useState(false);

  const showCopiedFeedback = useCallback(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, []);

  const buildShareText = useCallback(() => {
    if (!entry || !languages) return "";

    const reading =
      romanise(entry.term, languages.sourceLanguage) ||
      romanise(entry.translation, languages.glossLanguage);

    const meta = [reading, entry.partOfSpeech?.toLowerCase()]
      .filter(Boolean)
      .join(" · ");

    return [
      entry.term,
      entry.translation,
      meta,
      "",
      entry.termExample,
      entry.translationExample,
    ]
      .filter((line, index, array) => {
        if (line !== "") return true;
        return index > 0 && index < array.length - 1;
      })
      .join("\n");
  }, [entry, languages]);

  const share = useCallback(async () => {
    if (!entry) return;

    const text = buildShareText();

    try {
      if (navigator.share) {
        await navigator.share({ title: entry.term, text });
        return;
      }

      await navigator.clipboard.writeText(text);
      showCopiedFeedback();
    } catch (shareError) {
      // The reader closed the share sheet. Not a failure, and not a reason
      // to fall back to the clipboard behind their back.
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        showCopiedFeedback();
      } catch {
        console.error("Could not share the looked-up word:", shareError);
      }
    }
  }, [buildShareText, entry, showCopiedFeedback]);

  return { copied, share };
}
