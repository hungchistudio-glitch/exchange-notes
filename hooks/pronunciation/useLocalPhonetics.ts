"use client";

import { useEffect, useState } from "react";

import type { LanguageCode } from "@/lib/languages";
import type { Phonetics } from "@/lib/pronunciation";

/* =========================================================
   The phonetics dictionary, after the message is on screen

   lib/pronunciation reaches pinyin-pro and pinyin-to-zhuyin, which is
   ~304KB of dictionary. Statically imported, it landed in the conversation
   room's first payload — a phone spent that parse budget before it could
   draw a single message, on an annotation that sits under the text rather
   than being the text.

   So it is imported after mount instead. Until it resolves this hands back
   a function that answers "no annotations", which every call site already
   handles: they all guard with `(p.pinyin || p.zhuyin) && ...` and simply
   draw nothing. The row appears when the dictionary lands.

   That is the trade, stated plainly: the annotation fades in a moment late
   instead of the whole conversation opening a moment late. The module
   promise is shared, so this happens once per session rather than once per
   card.
   ========================================================= */

type GetPhonetics = (text: string, code: LanguageCode) => Phonetics;

/** Same shape, no answers. Not an error state — just "not yet". */
const NO_PHONETICS: GetPhonetics = () => ({});

let dictionary: Promise<GetPhonetics> | null = null;

function loadDictionary(): Promise<GetPhonetics> {
  dictionary ??= import("@/lib/pronunciation").then((m) => m.getPhonetics);

  return dictionary;
}

/**
 * A `getPhonetics` that is safe to call during render.
 *
 * Callers keep their synchronous call sites; what changes is that the first
 * render or two answer empty. Server rendering also answers empty, so the
 * client's first pass matches it and hydration stays quiet.
 */
export default function useLocalPhonetics(): GetPhonetics {
  const [getPhonetics, setGetPhonetics] = useState<GetPhonetics>(
    () => NO_PHONETICS,
  );

  useEffect(() => {
    let live = true;

    void loadDictionary().then((real) => {
      // setState with a function argument would *call* it; wrap it.
      if (live) setGetPhonetics(() => real);
    });

    return () => {
      live = false;
    };
  }, []);

  return getPhonetics;
}
