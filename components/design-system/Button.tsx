import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "./tokens";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost";

type ButtonSize =
  | "small"
  | "default"
  | "large";

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
  };

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-black text-white hover:bg-black/85",
  secondary:
    "border border-black/[0.07] bg-white text-black hover:bg-black/[0.025]",
  ghost:
    "bg-transparent text-black/60 hover:bg-black/[0.04]",
};

const sizeClasses: Record<ButtonSize, string> = {
  small: "h-8 px-3 text-[11px]",
  default: "h-11 px-5 text-[13px]",
  large: "h-12 px-6 text-[14px]",
};

export default function Button({
  children,
  variant = "primary",
  size = "default",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold tracking-[-0.01em] outline-none transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-35",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
