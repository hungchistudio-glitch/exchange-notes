"use client";

import { Search, X } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search conversations",
}: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        size={17}
        strokeWidth={1.8}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
      />

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-2xl border border-black/[0.06] bg-white pl-11 pr-11 text-[15px] text-black outline-none transition placeholder:text-black/35 focus:border-black/[0.14] focus:ring-4 focus:ring-black/[0.03]"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/[0.05] text-black/45 transition hover:bg-black/[0.08]"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
