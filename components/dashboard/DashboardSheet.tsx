"use client";

import { ChevronDown } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type Props = {
  title?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

const STORAGE_KEY = "vocabulary-dashboard-top-expanded";

export default function DashboardSheet({
  title = "Dashboard",
  defaultExpanded = false,
  children,
}: Props) {
  const panelId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

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

  const contentHeight =
    expanded && contentRef.current
      ? contentRef.current.scrollHeight
      : 0;

  return (
    <section className="mb-8">
      <div className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-[#e9e8e4] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
          className="flex min-h-[82px] w-full items-center justify-between px-6 py-5 text-left font-sans outline-none transition hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset sm:px-7"
        >
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-black/40">
              Learning System
            </span>

            <span className="mt-1.5 block text-[20px] font-semibold tracking-[-0.025em] text-black">
              {title}
            </span>
          </span>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.07] bg-white/60">
            <ChevronDown
              size={18}
              strokeWidth={1.8}
              className={`transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        <div
          id={panelId}
          aria-hidden={!expanded}
          className="overflow-hidden transition-[height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            height: ready ? `${contentHeight}px` : "0px",
            opacity: expanded ? 1 : 0,
          }}
        >
          <div
            ref={contentRef}
            className="border-t border-black/[0.06] bg-[#f7f6f3] p-3 sm:p-4"
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
