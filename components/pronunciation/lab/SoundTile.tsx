"use client";

import Link from "next/link";

import useTranslation from "@/hooks/i18n/useTranslation";
import { getLanguage } from "@/lib/languages";
import { localize } from "@/lib/pronunciation/localizedText";
import type {
  PronunciationMastery,
  PronunciationUnit,
} from "@/lib/pronunciation/lab/types";

const MASTERY_TONE: Record<PronunciationMastery, string> = {
  new: "bg-black/[0.08]",
  learning: "bg-[var(--accent-amber)]/40",
  improving: "bg-[var(--accent-amber)]",
  mastered: "bg-[var(--success)]",
};

export function MasteryDot({
  mastery,
  label,
}: {
  mastery: PronunciationMastery;
  label: string;
}) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${MASTERY_TONE[mastery]}`}
      // Mastery is drawn as a colour, so the colour cannot be the only way
      // to read it. The title carries the same fact as text.
      title={label}
      aria-label={label}
      role="img"
    />
  );
}

type SoundTileProps = {
  unit: PronunciationUnit;
  href: string;
  mastery: PronunciationMastery;
  masteryLabel: string;
};

/**
 * One sound in the grid.
 *
 * The symbol is the hero and everything else is support, because a learner
 * scanning for "the one with the two r's" is looking at glyphs, not at
 * labels. The script's own font stack is applied from the language table
 * rather than guessed — zhuyin through a Latin stack is the missing-glyph
 * box this app has fixed once already.
 */
export default function SoundTile({
  unit,
  href,
  mastery,
  masteryLabel,
}: SoundTileProps) {
  const { language } = useTranslation();
  const meta = getLanguage(unit.language);
  const displayLabel = unit.displayLabel
    ? localize(unit.displayLabel, language)
    : null;

  return (
    <Link
      href={href}
      className="group flex min-h-[112px] flex-col justify-between rounded-3xl border border-black/[0.06] bg-white p-4 transition-colors hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[1.875rem] font-bold leading-none tracking-[-0.02em]"
          style={{ fontFamily: `var(${meta.fontVariable})` }}
          lang={meta.htmlLang}
        >
          {unit.symbol}
        </span>
        <MasteryDot mastery={mastery} label={masteryLabel} />
      </div>

      <div className="mt-3 min-w-0">
        {unit.phoneticRepresentation ? (
          <p className="font-phonetic truncate text-xs text-ink-faint">
            {unit.phoneticRepresentation}
          </p>
        ) : null}

        {displayLabel ? (
          <p className="font-cjk mt-0.5 truncate text-[0.8125rem] font-medium text-ink-soft">
            {displayLabel}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
