"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";

type Props = {
  title?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

const STORAGE_KEY = "vocabulary-dashboard-sheet-expanded";

export default function DashboardSheet({
  title = "Dashboard",
  defaultExpanded = false,
  children,
}: Props) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      setExpanded(saved === "true");
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      String(expanded),
    );
  }, [expanded, ready]);

  useEffect(() => {
    if (!expanded) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  return (
    <>
      <button
        type="button"
        aria-label="Close dashboard"
        tabIndex={expanded ? 0 : -1}
        onClick={() => setExpanded(false)}
        className={`fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          expanded
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <section
        className={`fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-[760px] px-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 ${
          expanded
            ? "translate-y-0"
            : "translate-y-[calc(100%-76px)]"
        }`}
      >
        <div className="flex max-h-[72dvh] min-h-[76px] flex-col overflow-hidden rounded-[28px] border border-black/[0.08] bg-[#dededb] shadow-[0_-12px_40px_rgba(0,0,0,0.12)]">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((value) => !value)}
            className="flex min-h-[76px] w-full items-center justify-between px-6 text-left outline-none transition hover:bg-black/[0.025] focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset sm:px-7"
          >
            <span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.32em] text-black/35">
                Learning System
              </span>

              <span className="mt-1 block text-[18px] font-semibold tracking-[-0.025em] text-black">
                {title}
              </span>
            </span>

            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70">
              {expanded ? (
                <ChevronDown
                  size={19}
                  strokeWidth={1.7}
                />
              ) : (
                <ChevronUp
                  size={19}
                  strokeWidth={1.7}
                />
              )}
            </span>
          </button>

          <div
            id={panelId}
            aria-hidden={!expanded}
            className={`min-h-0 flex-1 border-t border-black/[0.07] bg-[#f4f4f1] transition-opacity duration-300 ${
              expanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex items-center justify-between px-6 pb-2 pt-4 sm:px-7">
              <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-black/30">
                Learning overview
              </span>

              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/[0.06]"
                aria-label="Close dashboard"
              >
                <X size={16} strokeWidth={1.7} />
              </button>
            </div>

            <div className="max-h-[calc(72dvh-126px)] overflow-y-auto overscroll-contain px-3 pb-3 sm:px-4 sm:pb-4">
              {children}
            </div>
          </div>
        </div>
      </section>

      <div className="h-[88px]" aria-hidden="true" />
    </>
  );
}
