import {
  forwardRef,
  SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

export type AppSelectProps =
  SelectHTMLAttributes<HTMLSelectElement> & {
    invalid?: boolean;
  };

const AppSelect = forwardRef<
  HTMLSelectElement,
  AppSelectProps
>(
  (
    {
      invalid = false,
      className = "",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className={[
          "relative min-h-[52px] w-full rounded-[16px] border",
          "bg-[var(--en-surface)] transition-colors",
          "focus-within:ring-2 focus-within:ring-[var(--en-border-strong)]",
          invalid
            ? "border-red-400 focus-within:border-red-500"
            : "border-[var(--en-border)] focus-within:border-[var(--en-border-strong)]",
          disabled
            ? "bg-[var(--en-surface-secondary)] opacity-55"
            : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={[
            "min-h-[52px] w-full appearance-none bg-transparent px-4 py-3 pr-11",
            "text-[16px] text-[var(--en-text-primary)] outline-none",
          ].join(" ")}
          {...props}
        >
          {children}
        </select>

        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={1.8}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--en-icon-secondary)]"
        />
      </div>
    );
  },
);

AppSelect.displayName = "AppSelect";

export default AppSelect;
