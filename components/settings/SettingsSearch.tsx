"use client";

import { ChevronRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import useTranslation from "@/hooks/i18n/useTranslation";
import usePwaInstall from "@/hooks/pwa/usePwaInstall";
import { focusSetting } from "@/components/settings/SettingsAnchor";
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

  /*
   * Whether "Install Exchange Notes" is a thing this browser can actually do.
   * A result that scrolls you to a row which then says the browser will not
   * install anything is a worse answer than no result, and the hook that
   * knows is now shared across every screen, so asking here is free.
   */
  const { platform, isStandalone, canPromptInstall } = usePwaInstall();
  const installIsReal = isStandalone || platform === "ios" || canPromptInstall;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  /*
   * Closing by Escape or Cancel gives the magnifier its focus back; closing
   * by choosing a result does not, because that focus is going to the row
   * the reader just asked for.
   */
  const returnFocusToTrigger = useRef(true);
  const dialogId = useId();

  // Rebuilt only when the interface language changes, not on every keystroke.
  const entries = useMemo(() => buildSettingsSearchIndex(t), [t]);
  const results = matchSettingsEntries(entries, query).filter(
    (entry) => entry.id !== "setting-install" || installIsReal,
  );

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    returnFocusToTrigger.current = true;
    inputRef.current?.focus();

    /*
     * The page behind is covered, but covered is not the same as gone: every
     * row on it was still in the tab order and still announced by a screen
     * reader, so Tab walked straight out of a dialog that says aria-modal and
     * into nine settings nobody could see. `inert` is what makes that claim
     * true. Applied per top-level child, and only to those not already inert,
     * so whatever put them there gets them back.
     */
    const backgrounded = Array.from(document.body.children).filter(
      (child) => !child.contains(dialog) && !child.hasAttribute("inert"),
    );

    for (const child of backgrounded) child.setAttribute("inert", "");

    // Captured now rather than read in the cleanup: the button this returns
    // focus to is the one that was on screen when the overlay opened.
    const trigger = triggerRef.current;

    function focusableInDialog() {
      return Array.from(
        dialog!.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]',
        ),
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      // Re-read each time: the result list is what changes, and it changes
      // on every keystroke.
      const stops = focusableInDialog();
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      for (const child of backgrounded) child.removeAttribute("inert");

      /*
       * Focus goes back to the magnifier it came from. Closing an overlay
       * that took focus and then dropping it on the document body leaves a
       * keyboard user at the top of the page, which is a long way from where
       * they were.
       */
      if (returnFocusToTrigger.current) trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  function handleSelect(entry: SettingsSearchEntry) {
    returnFocusToTrigger.current = false;
    setOpen(false);
    setQuery("");

    if (entry.href) {
      router.push(`${entry.href}#${entry.id}`);
      return;
    }

    /*
     * Two things have to be true here and only one of them used to be.
     *
     * `:target` has to match, because that is the 1.4s flash in globals.css
     * that points at the row — the entire "and points" half of what this
     * component promises. Only a real fragment navigation sets it:
     * history.replaceState moves location.hash without ever re-evaluating
     * `:target`, so routing the hash through the history API alone leaves the
     * reader scrolled to a row with nothing marking it.
     *
     * And Next's router state has to survive, because location.replace with a
     * fragment writes a new history entry whose state is null, and the
     * router reads that state on the next Back.
     *
     * So: navigate for the flash, then hand the entry its state back.
     * replaceState with an empty URL keeps the fragment that was just
     * applied, and `:target` — already resolved — stays resolved.
     */
    const routerState: unknown = window.history.state;
    window.location.replace(`#${entry.id}`);
    window.history.replaceState(routerState, "");

    // A frame later, because the dialog is still unmounting and the row it
    // covers cannot take focus until it is gone.
    requestAnimationFrame(() => focusSetting(entry.id));
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={copy.open}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? dialogId : undefined}
        className="settings-search-trigger flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.07] bg-white text-ink-strong transition-colors duration-100 hover:bg-black/[0.03] active:bg-black/[0.06]"
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
          ref={dialogRef}
          id={dialogId}
          role="dialog"
          aria-modal="true"
          aria-label={copy.open}
          className="settings-search-overlay fixed inset-0 z-50 flex flex-col bg-surface"
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
                type="search"
                aria-label={copy.placeholder}
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
            {/* How many answers there are, for someone who cannot see the
                list change under the field. */}
            <p role="status" className="sr-only">
              {query.trim() ? `${copy.resultsLabel}: ${results.length}` : ""}
            </p>

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
