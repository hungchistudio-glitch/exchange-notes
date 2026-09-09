import { forwardRef, type TextareaHTMLAttributes } from "react";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      className = "",
      error = false,
      disabled,
      ...props
    },
    ref
  ) {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={[
          "w-full resize-none rounded-2xl border bg-white px-4 py-3",
          "text-sm leading-6 text-neutral-950",
          "outline-none transition-colors",
          "placeholder:text-ink-faint",
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

export default TextArea;
