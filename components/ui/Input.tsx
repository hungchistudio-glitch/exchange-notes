import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leadingIcon?: ReactNode;
};

export default function Input({
  label,
  hint,
  error,
  leadingIcon,
  className = "",
  id,
  ...props
}: InputProps) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-semibold text-[#3E423B]">
          {label}
        </span>
      ) : null}

      <span className="relative block">
        {leadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#768B6F]">
            {leadingIcon}
          </span>
        ) : null}

        <input
          id={id}
          className={`
            h-[52px]
            w-full
            rounded-2xl
            border
            bg-white/90
            px-4
            text-[16px]
            text-[#2F312D]
            outline-none
            shadow-sm
            transition
            placeholder:text-[#8A8D85]
            focus:ring-4
            ${
              error
                ? "border-[#C38A8A] focus:border-[#A06060] focus:ring-[#A06060]/10"
                : "border-line focus:border-[#B7C9AB] focus:ring-[#D2DEC9]/40"
            }
            ${leadingIcon ? "pl-11" : ""}
            ${className}
          `}
          {...props}
        />
      </span>

      {error ? (
        <span className="mt-1.5 block text-sm text-[#A06060]">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-sm text-[#777A73]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
