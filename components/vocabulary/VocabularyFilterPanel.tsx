"use client";

import { Search } from "lucide-react";
import { useMemo } from "react";

import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { VocabularyItem, VocabularyStatus } from "@/lib/types/app";

type VocabularyFilterPanelProps = {
  items: VocabularyItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onSelect: (item: VocabularyItem) => void;
};

export default function VocabularyFilterPanel({
  items,
  search,
  onSearchChange,
  onClose,
  onSelect,
}: VocabularyFilterPanelProps) {
  const { t } = useTranslation();
  const translations = t.vocabulary.search;
  const motion = useSheetMotion({ onClose });

  const statusLabels: Record<VocabularyStatus, string> = {
    new: translations.statuses.new,
    learning: translations.statuses.learning,
    mastered: translations.statuses.mastered,
  };

  const letters = useMemo(() => {
    const groups = new Map<string, VocabularyItem[]>();

    for (const item of items) {
      const firstCharacter = item.word.trim().charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
      const group = groups.get(letter) ?? [];

      group.push(item);
      groups.set(letter, group);
    }

    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [items]);

  return (
    <div
      {...motion.panelProps}
      className={`${motion.panelClassName} fixed inset-0 z-[300] overflow-y-auto bg-white text-black`}
    >
      <header className="sticky top-0 z-10 border-b border-black/10 bg-white">
        <div
          className={`${motion.handleClassName} flex h-7 items-center justify-center sm:hidden`}
          {...motion.handleProps}
        >
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        <div className="flex items-center justify-between px-5 py-5">
          <button
            type="button"
            onClick={motion.requestClose}
            className="text-sm uppercase tracking-[0.08em]"
          >
            {translations.cancel}
          </button>

          <p className="text-sm uppercase tracking-[0.08em]">
            {translations.vocabulary}
          </p>

          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="text-sm uppercase tracking-[0.08em]"
          >
            {translations.clear}
          </button>
        </div>

        <div className="relative border-t border-black/10 px-5 py-4">
          <Search
            size={18}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400"
          />

          <input
            autoFocus
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={translations.searchPlaceholder}
            aria-label={translations.searchAriaLabel}
            className="w-full border-0 bg-transparent py-2 pl-8 pr-10 text-xl outline-none placeholder:text-neutral-300"
          />

          {search && (
            <ClearFieldButton
              floating
              className="!right-5"
              onClear={() => onSearchChange("")}
            />
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-xl grid-cols-[72px_1fr] gap-5 px-5 py-8">
        <aside className="text-xs uppercase leading-5 text-neutral-500">
          <p>{String(items.length).padStart(2, "0")}</p>
          <p>
            {items.length === 1
              ? translations.word
              : translations.words}
          </p>
        </aside>

        <div className="space-y-10">
          {letters.length === 0 ? (
            <p className="text-neutral-400">
              {translations.noMatchingWords}
            </p>
          ) : (
            letters.map(([letter, group]) => (
              <section key={letter} id={`letter-${letter}`}>
                <h2 className="mb-5 text-2xl font-medium">{letter}</h2>

                <div className="space-y-5">
                  {group.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item)}
                      className="block w-full text-left"
                    >
                      <span className="block text-2xl leading-tight">
                        {item.word}
                      </span>

                      <span className="mt-1 block text-sm text-neutral-400">
                        {item.translation} · {statusLabels[item.status]}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <nav className="fixed right-2 top-1/2 hidden -translate-y-1/2 flex-col text-[10px] leading-4 text-neutral-400 sm:flex">
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
          <a key={letter} href={`#letter-${letter}`}>
            {letter}
          </a>
        ))}
      </nav>
    </div>
  );
}
