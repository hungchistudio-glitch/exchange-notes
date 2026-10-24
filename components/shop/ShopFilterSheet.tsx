"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import { plural } from "@/lib/i18n/format";
import type { TranslationDictionary } from "@/lib/i18n/types";
import type { ShopCountry, ShopItem } from "@/lib/shop/catalog";
import {
  COLOUR_FAMILIES,
  COLOUR_SWATCHES,
  NO_FILTERS,
  ORIGINS,
  OWNERSHIP,
  PRICE_BANDS,
  SORTS,
  activeCount,
  applyFilters,
  choose,
  facetCounts,
  priceBandLabel,
  type FilterGroup,
  type ShopFilters,
  type Wallet,
} from "@/lib/shop/filters";

import EnergyCookie from "./EnergyCookie";
import shop from "./YumiShop.module.css";
import styles from "./ShopFilterSheet.module.css";

/** Origins wear a small emblem: a flag, or the station's star for its basics. */
const ORIGIN_EMBLEMS: Record<ShopCountry, string> = { basic: "✦", tw: "🇹🇼", us: "🇺🇸", fr: "🇫🇷", it: "🇮🇹", es: "🇪🇸" };

type Section = "sort" | FilterGroup;

/**
 * The filter sheet (Chi, 2026-10-24: "更有質感更多不同篩選定義"): five
 * groups that fold open one by one, chips that say how many pieces each
 * would show, and a key at the foot that says how many the whole choice
 * shows. Nothing reaches the catalogue until that key is pressed; closing
 * the sheet any other way leaves it as it was.
 *
 * Mount it afresh for each opening (a new `key`), so it starts from the
 * filters in force.
 */
export default function ShopFilterSheet({ open, onClose, filters, onApply, items, wallet, showOwnership, copy, locale }: {
  open: boolean;
  onClose: () => void;
  filters: ShopFilters;
  onApply: (filters: ShopFilters) => void;
  /** The pieces where the reader is (department, collection, new, wardrobe). */
  items: readonly ShopItem[];
  wallet: Wallet;
  showOwnership: boolean;
  copy: TranslationDictionary["shop"];
  locale: string;
}) {
  const words = copy.browse.refine;
  const [draft, setDraft] = useState(filters);
  const sections: Section[] = ["sort", "price", ...(showOwnership ? ["ownership" as const] : []), "colour", "origin"];
  // Open where something is chosen; otherwise price, the question most asked.
  const [expanded, setExpanded] = useState<ReadonlySet<Section>>(() => {
    const chosen = sections.filter(section => section !== "sort" && hasChoice(filters, section));
    return new Set(chosen.length ? chosen : ["price"]);
  });
  const shown = useMemo(() => applyFilters(items, draft, wallet).length, [items, draft, wallet]);
  const counts = useMemo(() => ({
    price: facetCounts(items, draft, wallet, "price", PRICE_BANDS),
    ownership: facetCounts(items, draft, wallet, "ownership", OWNERSHIP),
    colour: facetCounts(items, draft, wallet, "colour", COLOUR_FAMILIES),
    origin: facetCounts(items, draft, wallet, "origin", ORIGINS),
  }), [items, draft, wallet]);

  const toggle = (section: Section) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    return next;
  });
  const pick = (group: FilterGroup, option: string) => setDraft(current => choose(current, group, option));
  const number = (count: number) => count.toLocaleString(locale);

  const footer = (
    <div className={`${shop.tokens} ${styles.footer}`}>
      <button
        type="button"
        className={styles.apply}
        disabled={shown === 0}
        onClick={() => { onApply(draft); onClose(); }}
      >
        {/* Keyed by the number, so it rolls in afresh when it changes. */}
        <span key={shown} className={styles.applyLabel}>
          {shown === 0 ? words.none : plural(shown, locale, words.showOne, words.showOther, { count: number(shown) })}
        </span>
      </button>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={copy.browse.filters}
      maxHeight="min(88dvh, 760px)"
      titleAction={
        <button type="button" className={styles.reset} disabled={activeCount(draft) === 0} onClick={() => setDraft(NO_FILTERS)}>
          {words.reset}
        </button>
      }
      footer={footer}
    >
      <div className={`${shop.tokens} ${styles.sheet}`}>
        <Group
          title={words.sort}
          summary={words.sorts[draft.sort]}
          open={expanded.has("sort")}
          onToggle={() => toggle("sort")}
        >
          <div className={styles.chips} role="radiogroup" aria-label={words.sort}>
            {SORTS.map(sort => (
              <Chip key={sort} role="radio" on={draft.sort === sort} onClick={() => setDraft(current => ({ ...current, sort }))}>
                {words.sorts[sort]}
              </Chip>
            ))}
          </div>
        </Group>

        <Group
          title={words.price}
          summary={draft.price.map(priceBandLabel).join(" · ")}
          open={expanded.has("price")}
          onToggle={() => toggle("price")}
        >
          <div className={styles.chips} role="group" aria-label={words.price}>
            {PRICE_BANDS.map(band => (
              <Chip key={band} on={draft.price.includes(band)} count={counts.price[band]} locale={locale} onClick={() => pick("price", band)}>
                <EnergyCookie className={styles.cookie} />{priceBandLabel(band)}
              </Chip>
            ))}
          </div>
        </Group>

        {showOwnership && (
          <Group
            title={words.ownership}
            summary={draft.ownership ? words.ownerships[draft.ownership] : ""}
            open={expanded.has("ownership")}
            onToggle={() => toggle("ownership")}
          >
            <div className={styles.chips} role="group" aria-label={words.ownership}>
              {OWNERSHIP.map(option => (
                <Chip key={option} on={draft.ownership === option} count={counts.ownership[option]} locale={locale} onClick={() => pick("ownership", option)}>
                  {words.ownerships[option]}
                </Chip>
              ))}
            </div>
          </Group>
        )}

        <Group
          title={words.colour}
          summary={draft.colour.length > 0 && (
            <span className={styles.summaryDots} aria-label={draft.colour.map(family => words.colours[family]).join(", ")}>
              {draft.colour.map(family => <i key={family} style={{ background: COLOUR_SWATCHES[family] }} />)}
            </span>
          )}
          open={expanded.has("colour")}
          onToggle={() => toggle("colour")}
        >
          <div className={styles.swatches} role="group" aria-label={words.colour}>
            {COLOUR_FAMILIES.map(family => {
              const on = draft.colour.includes(family);
              const count = counts.colour[family];
              return (
                <button
                  key={family}
                  type="button"
                  className={styles.swatch}
                  aria-pressed={on}
                  disabled={count === 0 && !on}
                  onClick={() => pick("colour", family)}
                >
                  <span className={styles.swatchDisc} style={{ background: COLOUR_SWATCHES[family] }} aria-hidden="true">
                    <Check size={16} strokeWidth={3} />
                  </span>
                  <span className={styles.swatchName}>{words.colours[family]}</span>
                  <span className={styles.count}>{number(count)}</span>
                </button>
              );
            })}
          </div>
          <p className={styles.note}>{words.colourNote}</p>
        </Group>

        <Group
          title={words.origin}
          summary={draft.origin.map(country => copy.countries[country]).join(" · ")}
          open={expanded.has("origin")}
          onToggle={() => toggle("origin")}
        >
          <div className={styles.chips} role="group" aria-label={words.origin}>
            {ORIGINS.map(country => (
              <Chip key={country} on={draft.origin.includes(country)} count={counts.origin[country]} locale={locale} onClick={() => pick("origin", country)}>
                <span className={styles.emblem} aria-hidden="true">{ORIGIN_EMBLEMS[country]}</span>{copy.countries[country]}
              </Chip>
            ))}
          </div>
        </Group>
      </div>
    </BottomSheet>
  );
}

/** A choice: a check that springs in when it is on, and its count. */
function Chip({ on, count, locale, role, onClick, children }: {
  on: boolean; count?: number; locale?: string; role?: "radio"; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.chip}
      role={role}
      aria-checked={role ? on : undefined}
      aria-pressed={role ? undefined : on}
      disabled={count === 0 && !on}
      onClick={onClick}
    >
      <span className={styles.check} aria-hidden="true"><Check size={14} strokeWidth={2.6} /></span>
      <span className={styles.chipLabel}>{children}</span>
      {count !== undefined && <span className={styles.count}>{count.toLocaleString(locale)}</span>}
    </button>
  );
}

function hasChoice(filters: ShopFilters, group: FilterGroup) {
  return group === "ownership" ? filters.ownership !== null : filters[group].length > 0;
}

/** One fold of the sheet: its title, what is chosen in it, and its choices. */
function Group({ title, summary, open, onToggle, children }: {
  title: string; summary: ReactNode; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  const id = useId();
  return (
    <section className={styles.group} data-open={open}>
      <h3 className={styles.groupHeading}>
        <button type="button" id={`${id}-title`} className={styles.groupKey} aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
          <span className={styles.groupTitle}>{title}</span>
          <span className={styles.groupSummary}>{summary}</span>
          <ChevronDown className={styles.chevron} size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </h3>
      <div id={`${id}-body`} className={styles.groupBody} role="region" aria-labelledby={`${id}-title`} inert={!open}>
        <div className={styles.groupInner}>{children}</div>
      </div>
    </section>
  );
}

