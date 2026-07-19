import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
    fullWidth?: boolean;
  };

const styles: Record<Variant, string> = {
  primary:
    "bg-black text-white hover:opacity-90",

  secondary:
    "border border-neutral-200 bg-white hover:bg-neutral-50",

  ghost:
    "hover:bg-neutral-100",

  danger:
    "bg-red-600 text-white hover:bg-red-700",
};

export default function Button({
  variant = "primary",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-2xl
        px-5 py-3
        text-sm font-medium
        transition
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${fullWidth ? "w-full" : ""}
        ${styles[variant]}
        ${className}
      `}
      {...props}
    >
      {leadingIcon && (
        <span className="flex shrink-0">
          {leadingIcon}
        </span>
      )}

      <span>{children}</span>

      {trailingIcon && (
        <span className="flex shrink-0">
          {trailingIcon}
        </span>
      )}
    </button>
  );
}
