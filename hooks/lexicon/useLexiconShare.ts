"use client";

import { useCallback, useState } from "react";

import { hasPhonetics, type LanguageCode } from "@/lib/languages";
import type { LexiconEntry, LexiconLanguages } from "@/lib/lexicon/types";

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

/*
 * The romaniser, fetched the first time somebody shares something.
 *
 * `toPinyin` is four lines around pinyin-pro, and pinyin-pro is a megabyte
 * of dictionary. Imported at the top of this file it was a megabyte on the
 * home screen: this hook is used by the universal search field, the search
 * sheet and the Cosmic console, so the dictionary was parsed and compiled
 * during hydration on nearly every route — while the opening animation was
 * playing — to produce a line of pinyin that appears only inside a share
 * sheet somebody has yet to open.
 *
 * Now it arrives when that sheet is opened. Nothing about the shared text
 * changes; the await simply happens before the share instead of before the
 * screen.
 */
async function romanise(text: string, language: LanguageCode): Promise<string> {
  if (!text.trim()) return "";

  // Only Chinese has a romanisation this app can produce. Everything else
  // is written in an alphabet the reader can already sound out.
  if (!hasPhonetics(language, "pinyin")) return "";

  try {
    const { toPinyin } = await import("@/lib/pinyin");
    return toPinyin(text) ?? "";
  } catch (error) {
    // A share without the reading is still the word, the translation and
    // both examples. Losing the whole share over a chunk that would not
    // load would be the worse trade.
    console.error("Could not load the romaniser for sharing.", error);
    return "";
  }
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

  const buildShareText = useCallback(async () => {
    if (!entry || !languages) return "";

    const reading =
      (await romanise(entry.term, languages.sourceLanguage)) ||
      (await romanise(entry.translation, languages.glossLanguage));

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

    const text = await buildShareText();

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
