"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  ReactNode,
  useEffect,
  useState,
} from "react";

type Props = {
  title?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

const STORAGE_KEY = "dashboard-expanded";

export default function DashboardRollup({
  title = "Dashboard",
  defaultExpanded = false,
  children,
}: Props) {
  const [expanded, setExpanded] =
    useState(defaultExpanded);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      setExpanded(saved === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      String(expanded),
    );
  }, [expanded]);

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() =>
          setExpanded((value) => !value)
        }
        className="flex w-full items-center justify-between rounded-full border border-neutral-800 bg-black px-6 py-4 text-white transition hover:bg-neutral-900"
      >
        <span className="text-xs uppercase tracking-[0.30em]">
          {title}
        </span>

        {expanded ? (
          <ChevronUp size={18} />
        ) : (
          <ChevronDown size={18} />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ${
          expanded
            ? "mt-4 max-h-[1200px] opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </section>
  );
}
