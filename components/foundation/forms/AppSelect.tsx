import { forwardRef, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export type AppSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

const AppSelect = forwardRef<HTMLSelectElement, AppSelectProps>(
  ({ invalid = false, className = "", disabled, children, ...props }, ref) => {
    return (
      <div
        className={[
          "relative min-h-12 w-full rounded-2xl border bg-white",
          "transition-colors focus-within:ring-2 focus-within:ring-black/[0.08]",
          invalid
            ? "border-red-400 focus-within:border-red-500"
            : "border-black/[0.12] focus-within:border-black/40",
          disabled ? "bg-black/[0.025] opacity-55" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className="min-h-12 w-full appearance-none bg-transparent px-4 py-3 pr-11 text-[15px] text-black outline-none"
          {...props}
        >
          {children}
        </select>

        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={1.8}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/40"
        />
      </div>
    );
  },
);

AppSelect.displayName = "AppSelect";

export default AppSelect;
