import { japaneseInTraditional, toTraditionalForms } from "@/lib/japanese/traditional";
import { hanjaFor } from "@/lib/korean/hanja";
import { HANJA_WORDS } from "@/lib/korean/hanjaWords";
import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   The kanji bridge (Chi, 2026-11-16: 漢字橋樑)

   One line under a Japanese or Korean word that a reader of Chinese
   characters can use at once:

     Korean     도서관  →  漢字 圖書館   (the word's hanja)
     Japanese   経験    →  繁體 經驗     (its Traditional forms)

   Loaded on demand (hooks/useKanjiBridge.ts): the tables are tens of
   kilobytes, and a card in any other language never needs them.
   ========================================================= */

export type BridgeEntry = { text: string; language: LanguageCode };

export type Bridge = { kind: "hanja" | "traditional"; text: string };

let words: Map<string, string> | null = null;

/** HANJA_WORDS is Korean then hanja, run after run. */
function knownWords(): Map<string, string> {
  if (words) return words;
  words = new Map();
  for (const [, korean, hanja] of HANJA_WORDS.matchAll(/([가-힣]+)(\p{Script=Han}+)/gu)) {
    words.set(korean, hanja);
  }
  return words;
}

/**
 * The bridge for `entry`, given the other sides of the same card (a
 * Chinese or Japanese translation can say what a Korean word's hanja are),
 * or null when there is none to show.
 */
export function bridgeFor(entry: BridgeEntry, siblings: readonly BridgeEntry[]): Bridge | null {
  const text = entry.text.trim();
  if (!text) return null;

  if (entry.language === "ko") {
    const candidates = siblings
      .filter((sibling) => sibling.language === "zh-TW" || sibling.language === "ja")
      .map((sibling) => toTraditionalForms(sibling.text.trim()));
    const hanja = knownWords().get(text) ?? hanjaFor(text, candidates);
    return hanja ? { kind: "hanja", text: hanja } : null;
  }

  if (entry.language === "ja") {
    const traditional = japaneseInTraditional(text);
    if (!traditional) return null;
    // The card shows the Chinese already, written just so: nothing to add.
    if (siblings.some((sibling) => sibling.language === "zh-TW" && sibling.text.trim() === traditional)) return null;
    return { kind: "traditional", text: traditional };
  }

  return null;
}
