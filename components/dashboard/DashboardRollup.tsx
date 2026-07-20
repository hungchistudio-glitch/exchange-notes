"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

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
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      setExpanded(saved === "true");
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded, ready]);

  
  useLayoutEffect(() => {
    if (!contentRef.current) return;

    if (expanded) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [expanded, children]);

  return (
    <section className="mb-8">
      <div className="overflow-hidden rounded-[30px] bg-[#DADAD7] shadow-[0_8px_24px_rgba(0,0,0,.06)]">

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between px-8 py-7 text-left transition hover:bg-black/[0.02]"
        >
          <div>
            <div className="text-[11px] uppercase tracking-[0.36em] text-black/35">
              Learning System
            </div>

            <div className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-black">
              {title}
            </div>
          </div>

          <ChevronDown
            size={26}
            strokeWidth={1.7}
            className={`transition-transform duration-500 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          style={{
            height: ready ? `${height}px` : "0px",
            opacity: expanded ? 1 : 0,
          }}
          className="overflow-hidden transition-all duration-500"
        >
          <div
            ref={contentRef}
            className="border-t border-black/8 bg-white p-5"
          >
            {children}
          </div>
        </div>

      </div>
    </section>
  );
}
