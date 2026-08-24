"use client";

import LanguageFlag from "@/components/language/LanguageFlag";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getLanguage, getLanguageName, type LanguageCode } from "@/lib/languages";
import { insertValues } from "@/lib/utils";

/* =========================================================
   Which language is this card in

   A metadata signal, not an action. It sits at the same visual weight as the
   status eyebrow it shares a line with and well below the word itself: the
   point is to be readable at a glance while scrolling a mixed-language list,
   not to be the first thing the eye lands on.

   It is called an *origin* badge rather than a country badge because that is
   what it says. English is not the United States and Spanish is not only
   Spain's; the flag is a fast visual key the way a book spine's colour is,
   and the accessible name says the language outright so nothing depends on
   reading a flag correctly — or on seeing it at all.
   ========================================================= */

const SIZES = {
  sm: { flag: "h-[11px] w-[16px]", gap: "gap-1", text: "text-[9px]" },
  md: { flag: "h-[14px] w-[20px]", gap: "gap-1.5", text: "text-[10px]" },
} as const;

export default function LanguageOriginBadge({
  language,
  size = "md",
  showLabel = false,
  className = "",
}: {
  language: LanguageCode;
  size?: keyof typeof SIZES;
  /**
   * Whether to print the language's own name beside the flag.
   *
   * Off on cards, where the flag is a key to a list the reader is scanning
   * and the name would compete with the word. On in pickers and filters,
   * where the row *is* the language and the name is the content.
   */
  showLabel?: boolean;
  className?: string;
}) {
  const { t, language: interfaceLanguage } = useTranslation();
  const meta = getLanguage(language);
  const name = getLanguageName(language, interfaceLanguage);

  const accessibleName = insertValues(t.vocabulary.language.badgeAriaLabel, {
    language: name,
  });

  /*
   * The pointer tooltip names the language twice — once as the reader's
   * interface calls it, once as its own speakers do — because the second is
   * what they will see printed on the card, and the first is what they
   * chose in Settings.
   */
  const tooltip = name === meta.endonym ? name : `${name} · ${meta.endonym}`;

  const scale = SIZES[size];

  return (
    <span
      role="img"
      aria-label={accessibleName}
      title={tooltip}
      className={`inline-flex shrink-0 items-center ${scale.gap} rounded-full border border-black/[0.06] bg-black/[0.028] px-1.5 py-[3px] ${className}`}
    >
      <LanguageFlag region={meta.representativeRegion} className={scale.flag} />

      {showLabel ? (
        <span
          className={`${scale.text} font-semibold uppercase tracking-[0.1em] text-ink-soft`}
        >
          {meta.badge}
        </span>
      ) : null}
    </span>
  );
}
