"use client";

import { useEffect, useState } from "react";

import { hasPhonetics, type LanguageCode } from "@/lib/languages";
import type { Phonetics } from "@/lib/pronunciation";

/* =========================================================
   The readings this app can work out for itself, fetched when it needs to

   `lib/pronunciation` computes pinyin and zhuyin locally, which it does by
   importing pinyin-pro — a megabyte of dictionary. Imported at the top of a
   client component that is a megabyte in that route's bundle, parsed and
   compiled during hydration, to annotate a headline that may not be Chinese
   and may not be on screen.

   So it arrives when a Chinese sentence actually needs annotating, and the
   annotation appears a tick later. Every other reading in the app already
   behaves that way — usePhonetics answers from a batched request — so a
   caption that fills in shortly after the text is the established rhythm
   here rather than a new one.

   The module promise is module-level: the dictionary is parsed once per
   session however many cards ask for it.
   ========================================================= */

const EMPTY: Phonetics = {};

let pending: Promise<typeof import("@/lib/pronunciation")> | null = null;
let loaded: typeof import("@/lib/pronunciation") | null = null;

function loadPronunciation() {
  if (loaded) return Promise.resolve(loaded);

  pending ??= import("@/lib/pronunciation").then((module) => {
    loaded = module;
    return module;
  });

  return pending;
}

/**
 * Pinyin and zhuyin for one piece of text, once the dictionary is here.
 *
 * Returns nothing for a language that has no local readings — which is every
 * language but Traditional Chinese — without loading anything at all.
 */
export default function useLocalPhonetics(
  text: string,
  language: LanguageCode,
): Phonetics {
  const trimmed = text.trim();
  const wanted =
    trimmed && (hasPhonetics(language, "pinyin") || hasPhonetics(language, "zhuyin"))
      ? `${language}:${trimmed}`
      : "";

  /*
   * Keyed by what was asked for, so the answer to the previous question is
   * never shown under the next one. Text that has no local reading asks
   * nothing and renders nothing, without a state update to say so.
   */
  const [answer, setAnswer] = useState<{ key: string; value: Phonetics }>(() =>
    wanted && loaded
      ? { key: wanted, value: loaded.getPhonetics(trimmed, language) }
      : { key: "", value: EMPTY },
  );

  useEffect(() => {
    if (!wanted) return;

    let active = true;

    void loadPronunciation()
      .then((module) => {
        if (active) {
          setAnswer({ key: wanted, value: module.getPhonetics(trimmed, language) });
        }
      })
      .catch((error) => {
        // A headline without its romanisation is still the headline.
        console.error("Could not load the local readings.", error);
      });

    return () => {
      active = false;
    };
  }, [language, trimmed, wanted]);

  return answer.key === wanted && wanted ? answer.value : EMPTY;
}
