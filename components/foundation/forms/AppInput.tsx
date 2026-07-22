import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
} from "react";

export type AppInputProps =
  InputHTMLAttributes<HTMLInputElement> & {
    leading?: ReactNode;
    trailing?: ReactNode;
    invalid?: boolean;
  };

const AppInput = forwardRef<
  HTMLInputElement,
  AppInputProps
>(
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
          "flex min-h-[52px] w-full items-center overflow-hidden rounded-[16px] border",
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
        {leading ? (
          <span className="flex shrink-0 items-center pl-4 text-[var(--en-icon-secondary)]">
            {leading}
          </span>
        ) : null}

        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={[
            "min-w-0 flex-1 bg-transparent px-4 py-3 text-[16px] outline-none",
            "text-[var(--en-text-primary)] placeholder:text-[var(--en-text-tertiary)]",
            leading ? "pl-2" : "",
            trailing ? "pr-2" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />

        {trailing ? (
          <span className="flex shrink-0 items-center pr-4 text-[var(--en-icon-secondary)]">
            {trailing}
          </span>
        ) : null}
      </div>
    );
  },
);

AppInput.displayName = "AppInput";

export default AppInput;
