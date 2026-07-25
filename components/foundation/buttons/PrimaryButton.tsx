import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
};

export default function PrimaryButton({
  children,
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-2xl",
        "bg-neutral-950 px-5 py-3",
        "text-sm font-semibold text-white",
        "transition-transform duration-150",
        "hover:bg-neutral-800",
        "active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-neutral-950",
        "focus-visible:ring-offset-2",
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
