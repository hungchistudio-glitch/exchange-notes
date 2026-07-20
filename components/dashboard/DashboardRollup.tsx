"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode, useState } from "react";

type Props = {
  title?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

export default function DashboardRollup({
  title = "Dashboard",
  defaultExpanded = false,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-full border border-neutral-800 bg-black px-6 py-4 text-white transition hover:bg-neutral-900"
      >
        <span className="text-xs uppercase tracking-[0.28em]">
          {title}
        </span>

        {expanded ? (
          <ChevronUp size={18} />
        ) : (
          <ChevronDown size={18} />
        )}
      </button>

      {expanded && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </section>
  );
}
