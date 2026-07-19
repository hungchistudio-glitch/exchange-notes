import { Search, X } from "lucide-react";
import type { InputHTMLAttributes } from "react";

type SearchBarProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  onClear?: () => void;
};

export default function SearchBar({
  className = "",
  value,
  onClear,
  ...props
}: SearchBarProps) {
  const hasValue =
    typeof value === "string" && value.trim().length > 0;

  return (
    <div
      className={`
        relative
        flex
        h-[52px]
        items-center
        rounded-2xl
        border
        border-[#E3E3DC]
        bg-white/90
        shadow-sm
        transition
        focus-within:border-[#B7C9AB]
        focus-within:ring-4
        focus-within:ring-[#D2DEC9]/40
        ${className}
      `}
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 text-[#768B6F]"
        size={19}
        strokeWidth={2}
      />

      <input
        type="search"
        value={value}
        className="
          h-full
          w-full
          rounded-2xl
          bg-transparent
          pl-11
          pr-11
          text-[16px]
          text-[#2F312D]
          outline-none
          placeholder:text-[#8A8D85]
        "
        {...props}
      />

      {hasValue && onClear ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="
            en-focus-ring
            absolute
            right-2.5
            inline-flex
            size-8
            items-center
            justify-center
            rounded-full
            text-[#666A63]
            transition
            hover:bg-[#E7EEE4]
            hover:text-[#394A35]
          "
        >
          <X size={17} />
        </button>
      ) : null}
    </div>
  );
}
