"use client";

import { ChevronRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import useTranslation from "@/hooks/i18n/useTranslation";
import {
  buildSettingsSearchIndex,
  matchSettingsEntries,
  type SettingsSearchEntry,
} from "@/components/settings/settingsSearchIndex";

/**
 * Search, because two groups now live one screen deeper.
 *
 * It does not change a setting on your behalf — it takes you to the row and
 * flashes it, on this page or on the screen that holds it. That is the whole
 * contract, and it is why a result can point at a widget three taps away
 * without anyone having to wonder what it just did.
 */
export default function SettingsSearch() {
  const { t } = useTranslation();
  const copy = t.settings.search;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Rebuilt only when the interface language changes, not on every keystroke.
  const entries = useMemo(() => buildSettingsSearchIndex(t), [t]);
  const results = matchSettingsEntries(entries, query);

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    // Captured now rather than read in the cleanup: the button this returns
    // focus to is the one that was on screen when the overlay opened.
    const trigger = triggerRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);

      /*
       * Focus goes back to the magnifier it came from. Closing an overlay
       * that took focus and then dropping it on the document body leaves a
       * keyboard user at the top of the page, which is a long way from where
       * they were.
       */
      trigger?.focus();
    };
  }, [open]);

  function handleSelect(entry: SettingsSearchEntry) {
    setOpen(false);
    setQuery("");

    if (entry.href) {
      router.push(`${entry.href}#${entry.id}`);
      return;
    }

    /*
     * The fragment is what makes `:target` match, which is what draws the
     * flash — and replacing rather than pushing keeps Back on the dock where
     * it belongs. Chrome does not scroll for a replace(), though, so the
     * scroll is asked for explicitly on the next frame; scrollIntoView honours
     * the anchor's scroll-margin-top, so the row lands clear of the header.
     */
    window.location.replace(`#${entry.id}`);

    requestAnimationFrame(() => {
      document.getElementById(entry.id)?.scrollIntoView({
        block: "start",
        /*
         * Instant, not the page's smooth default. A search result is a jump,
         * not a journey — animating past nine other settings on the way is
         * both slower and, for anyone who asked for reduced motion, wrong.
         */
        behavior: "instant",
      });
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={copy.open}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.07] bg-white text-ink-strong transition-colors duration-100 hover:bg-black/[0.03] active:bg-black/[0.06]"
      >
        <Search size={17} strokeWidth={1.9} />
      </button>

      {/*
        Portalled to the body, because this button lives in AppHeader and the
        header carries backdrop-blur. A backdrop-filter makes an element the
        containing block for its fixed-position descendants, so an inset-0
        overlay rendered in place covers the header's 64 points and nothing
        else — which is exactly the see-through half-panel this replaced.
      */}
      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.open}
          className="fixed inset-0 z-50 flex flex-col bg-surface"
        >
          <div
            className="flex items-center gap-2 px-4 pb-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            <div className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-black/[0.07] bg-white px-4">
              <Search
                aria-hidden="true"
                size={16}
                strokeWidth={1.9}
                className="shrink-0 text-ink-faint"
              />

              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.placeholder}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-transparent py-2.5 text-[0.9375rem] text-black outline-none placeholder:text-ink-faint"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t.common.clearField}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-ink-soft"
                >
                  <X size={12} strokeWidth={2.4} />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 px-1 text-[0.9375rem] font-semibold text-ink-strong"
            >
              {copy.cancel}
            </button>
          </div>

          {/*
            overscroll-contain rather than a body lock: the page behind is
            covered anyway, and locking the body would still be lifting when
            the scroll to the chosen row runs a frame later.
          */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
            {!query.trim() ? (
              <p className="px-1.5 pt-2 text-[0.8125rem] leading-6 text-ink-soft">
                {copy.hint}
              </p>
            ) : results.length === 0 ? (
              <p className="px-1.5 pt-2 text-[0.8125rem] leading-6 text-ink-soft">
                {copy.empty.replace("{query}", query.trim())}
              </p>
            ) : (
              <ul
                aria-label={copy.resultsLabel}
                className="divide-y divide-black/[0.05] overflow-hidden rounded-[18px] border border-black/[0.06] bg-white"
              >
                {results.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(entry)}
                      className="flex min-h-[58px] w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-100 active:bg-black/[0.035]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-semibold tracking-[-0.02em] text-black">
                          {entry.title}
                        </span>

                        <span className="mt-0.5 block truncate text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
                          {entry.section}
                        </span>
                      </span>

                      <ChevronRight
                        aria-hidden="true"
                        size={17}
                        strokeWidth={1.8}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
