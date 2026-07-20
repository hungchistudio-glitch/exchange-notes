import { forwardRef, InputHTMLAttributes, ReactNode } from "react";

export type AppInputProps = InputHTMLAttributes<HTMLInputElement> & {
  leading?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
};

const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  (
    {
      leading,
      trailing,
      invalid = false,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className={[
          "flex min-h-12 w-full items-center overflow-hidden rounded-2xl border bg-white",
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
        {leading && (
          <span className="flex shrink-0 items-center pl-4 text-black/45">
            {leading}
          </span>
        )}

        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={[
            "min-w-0 flex-1 bg-transparent px-4 py-3 text-[15px] text-black outline-none",
            "placeholder:text-black/30",
            leading ? "pl-2" : "",
            trailing ? "pr-2" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />

        {trailing && (
          <span className="flex shrink-0 items-center pr-4 text-black/45">
            {trailing}
          </span>
        )}
      </div>
    );
  },
);

AppInput.displayName = "AppInput";

export default AppInput;
