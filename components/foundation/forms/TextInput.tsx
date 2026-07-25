import { forwardRef, type InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    {
      className = "",
      error = false,
      disabled,
      ...props
    },
    ref
  ) {
    return (
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={[
          "h-12 w-full rounded-2xl border bg-white px-4 text-sm text-neutral-950",
          "outline-none transition-colors",
          "placeholder:text-neutral-400",
          "focus:border-neutral-400",
          "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400",
          error
            ? "border-red-400 focus:border-red-500"
            : "border-black/[0.07]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    );
  }
);

export default TextInput;
