"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import LanguageOriginBadge from "@/components/language/LanguageOriginBadge";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  getLanguage,
  getLanguageName,
  type LanguageCode,
} from "@/lib/languages";

/**
 * Which languages the library is showing.
 *
 * A dimension of its own, beside status, collection and sort rather than
 * instead of any of them — a French word can be in the Cooking collection
 * and still be being learned, and all three questions get asked at once.
 *
 * Single-select for now, and only in the interface: the value it reports is
 * a list, every consumer down to `useVisibleVocabularyItems` takes a list,
 * and turning this into a multi-select is a change to this file alone.
 *
 * Only languages the reader has actually saved words in appear. A row
 * reading "Italiano 0" is an invitation to tap something that leads to an
 * empty screen.
 */
export default function LanguageFilterSheet({
  open,
  selected,
  counts,
  totalCount,
  onClose,
  onChange,
}: {
  open: boolean;
  /** Empty means every language. */
  selected: readonly LanguageCode[];
  counts: ReadonlyMap<LanguageCode, number>;
  totalCount: number;
  onClose: () => void;
  onChange: (languages: readonly LanguageCode[]) => void;
}) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.vocabulary.language;

  const present = [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || getLanguage(a[0]).endonym.localeCompare(getLanguage(b[0]).endonym));

  function choose(languages: readonly LanguageCode[]) {
    onChange(languages);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={copy.title}>
      <ul className="space-y-1.5 p-4" aria-label={copy.filterAriaLabel}>
        <li>
          <Row
            label={copy.allLanguages}
            count={totalCount}
            selected={selected.length === 0}
            onSelect={() => choose([])}
          />
        </li>

        {present.map(([code, count]) => (
          <li key={code}>
            <Row
              badge={<LanguageOriginBadge language={code} />}
              label={getLanguage(code).endonym}
              secondaryLabel={
                getLanguageName(code, interfaceLanguage) !==
                getLanguage(code).endonym
                  ? getLanguageName(code, interfaceLanguage)
                  : undefined
              }
              count={count}
              selected={selected.includes(code)}
              onSelect={() => choose([code])}
            />
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}

function Row({
  badge,
  label,
  secondaryLabel,
  count,
  selected,
  onSelect,
}: {
  badge?: ReactNode;
  label: string;
  secondaryLabel?: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-[52px] w-full items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition ${
        selected
          ? "border-black bg-black text-white"
          : "border-black/[0.07] bg-white text-black hover:border-black/20"
      }`}
    >
      {badge}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold tracking-[-0.01em]">
          {label}
        </span>

        {secondaryLabel ? (
          <span
            className={`block truncate text-[0.75rem] ${
              selected ? "text-white/70" : "text-ink-faint"
            }`}
          >
            {secondaryLabel}
          </span>
        ) : null}
      </span>

      <span
        className={`shrink-0 text-[0.8125rem] font-semibold tabular-nums ${
          selected ? "text-white/80" : "text-ink-faint"
        }`}
      >
        {count}
      </span>

      {selected ? (
        <Check size={17} strokeWidth={2.2} className="shrink-0" />
      ) : null}
    </button>
  );
}
