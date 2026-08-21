"use client";

import { ChevronRight } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";
import {
  hasLowConfidence,
  itemNames,
  sectionTitle,
  type MenuDocument,
  type MenuItem,
} from "@/lib/scanner/menuTypes";

/*
 * The same menu as text.
 *
 * Not a downgrade of the overlay — the required form of it. A reconstructed
 * image is unreadable to a screen reader and unresizable to anyone using
 * larger type, so every scan exists here as well, in reading order: section,
 * dish, description, price.
 */

type MenuListViewProps = {
  document: MenuDocument;
  onSelect: (item: MenuItem) => void;
};

export default function MenuListView({
  document: menu,
  onSelect,
}: MenuListViewProps) {
  const { t } = useTranslation();
  const copy = t.scanner.menu;

  return (
    <div className="space-y-7">
      {menu.sections.map((section) => (
        <section key={section.id}>
          <h2 className="mb-2 px-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {sectionTitle(section, menu.targetLanguage) ||
              copy.untitledSection}
          </h2>

          <ul className="divide-y divide-black/[0.05] overflow-hidden rounded-[18px] border border-black/[0.06] bg-white">
            {section.items.map((item) => {
              const { primary, secondary, primaryDescription } = itemNames(
                item,
                menu.targetLanguage,
              );

              return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-100 active:bg-black/[0.035]"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={[
                        "block text-[16px] font-semibold leading-[21px] tracking-[-0.02em] text-black",
                        hasLowConfidence(item)
                          ? "underline decoration-dotted decoration-ink-faint underline-offset-[3px]"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {primary}
                    </span>

                    {/*
                      The other language, on every row. A word you can read
                      but not say back in the language you are learning is
                      half a word — and which half you get should not depend
                      on what the list happened to be printed in.
                    */}
                    {secondary && secondary !== primary ? (
                      <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-soft">
                        {secondary}
                      </span>
                    ) : null}

                    {primaryDescription ? (
                      <span className="mt-1 block text-[13px] leading-[19px] text-ink-faint">
                        {primaryDescription}
                      </span>
                    ) : null}
                  </span>

                  <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
                    <span className="text-[14px] font-semibold text-ink-strong">
                      {item.price || "—"}
                    </span>

                    <ChevronRight
                      aria-hidden="true"
                      size={16}
                      strokeWidth={1.8}
                      className="text-ink-faint"
                    />
                  </span>
                </button>
              </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
