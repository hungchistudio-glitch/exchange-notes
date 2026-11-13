"use client";

import { useMemo, useSyncExternalStore } from "react";

import { useOptionalVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { INTERFACE_LANGUAGE_CODE } from "@/lib/languages";
import { localDayNumber, themeWordsFor } from "@/lib/lexicon/themeWords";
import { insertValues } from "@/lib/utils";

/*
 * Five of today's theme's words under the empty search, each a tap away
 * from being looked up (lib/lexicon/themeWords.ts; Chi, 2026-11-13).
 *
 * Nothing on the server's pass: which day it is belongs to the reader's
 * clock, and a server in another time zone would draw yesterday's theme and
 * hand React a mismatch. The day is read once per visit; a page left open
 * past midnight keeps its theme until it is next opened, which is nothing a
 * reader would notice.
 */

const subscribeNothing = () => () => {};
let visitDay: number | null = null;
const readDay = () => (visitDay ??= localDayNumber());

export default function ThemeWords({
  onPick,
  tone = "warm",
  className = "",
}: {
  onPick: (word: string) => void;
  tone?: "warm" | "cosmic";
  className?: string;
}) {
  const { t, language } = useTranslation();
  const { pair } = useDisplayLanguages();
  const items = useOptionalVocabulary()?.items;
  const day = useSyncExternalStore(subscribeNothing, readDay, () => null);

  const today = useMemo(() => {
    if (day === null) return null;
    return themeWordsFor(
      day,
      pair[0],
      (items ?? []).flatMap((item) => [item.word, item.translation]),
    );
  }, [day, items, pair]);

  if (!today) return null;

  const themeName = today.theme.name[INTERFACE_LANGUAGE_CODE[language]];

  return (
    <div className={`text-center ${className}`} data-theme-words={today.theme.id}>
      <p
        className={
          tone === "cosmic"
            ? "hud-label"
            : "text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-faint"
        }
      >
        {insertValues(t.lexicon.themeWords, { theme: themeName })}
      </p>

      <div role="list" className="mt-2 flex flex-wrap justify-center gap-1.5">
        {today.words.map((word) => (
          <span role="listitem" key={word}>
            <button
              type="button"
              lang={pair[0]}
              onClick={() => onPick(word)}
              className={`h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold transition-transform active:scale-95 ${
                tone === "cosmic"
                  ? "border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
                  : "border border-[#eadfc4] bg-white text-ink-strong shadow-[0_2px_8px_rgba(35,28,12,0.06)]"
              }`}
            >
              {word}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
