import type { ButtonHTMLAttributes, ReactNode } from "react";

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
};

export default function SecondaryButton({
  children,
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-2xl",
        "border border-black/[0.08] bg-white px-5 py-3",
        "text-sm font-semibold text-neutral-800",
        "transition-all duration-150",
        "hover:bg-neutral-50",
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
