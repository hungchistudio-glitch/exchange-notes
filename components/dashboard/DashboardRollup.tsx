"use client";

import { ChevronDown } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  title?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

const STORAGE_KEY = "vocabulary-dashboard-expanded";

export default function DashboardRollup({
  title = "Dashboard",
  defaultExpanded = false,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [ready, setReady] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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

  const contentHeight =
    expanded && contentRef.current
      ? contentRef.current.scrollHeight
      : 0;

  return (
    <section className="mb-7">
      <div className="relative overflow-hidden rounded-[18px] border border-black/15 bg-[#d8d8d3] shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="vocabulary-dashboard-panel"
          onClick={() => setExpanded((value) => !value)}
          className="group relative flex w-full items-center justify-between overflow-hidden px-5 py-[18px] text-left outline-none transition active:scale-[0.997] focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, rgba(255,255,255,0.34) 0px, rgba(255,255,255,0.34) 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 3px)",
            }}
          />

          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-white/80"
          />

          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-black/20"
          />

          <span className="relative flex items-center gap-4">
            <span className="flex h-3 w-3 items-center justify-center rounded-full border border-black/35 bg-[#b9b9b4] shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)]">
              <span className="h-1 w-1 rounded-full bg-black/45" />
            </span>

            <span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.32em] text-black/45">
                Learning System
              </span>

              <span className="mt-1 block text-[12px] font-bold uppercase tracking-[0.29em] text-black">
                {title}
              </span>
            </span>
          </span>

          <span className="relative flex items-center gap-4">
            <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-black/40 sm:block">
              {expanded ? "Retract" : "Release"}
            </span>

            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/25 bg-[#c7c7c2] shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_1px_2px_rgba(0,0,0,0.15)]">
              <ChevronDown
                size={15}
                strokeWidth={1.8}
                className={`transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  expanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </span>
          </span>
        </button>

        <div
          id="vocabulary-dashboard-panel"
          aria-hidden={!expanded}
          className="overflow-hidden transition-[height,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            height: ready ? `${contentHeight}px` : "0px",
            opacity: expanded ? 1 : 0,
          }}
        >
          <div ref={contentRef}>
            <div className="h-3 border-y border-black/15 bg-[#aaa9a4] shadow-[inset_0_2px_3px_rgba(0,0,0,0.15)]">
              <div
                className="h-full opacity-35"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, transparent 0px, transparent 11px, rgba(0,0,0,0.16) 11px, rgba(0,0,0,0.16) 12px)",
                }}
              />
            </div>

            <div className="bg-[#efefec] p-3 sm:p-4">
              {children}
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-5 bottom-0 h-3 rounded-b-full bg-black/15 blur-md transition-opacity duration-500 ${
            expanded ? "opacity-0" : "opacity-70"
          }`}
        />
      </div>
    </section>
  );
}
