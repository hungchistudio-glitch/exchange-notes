import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type PillProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    selected?: boolean;
  };

export default function Pill({
  children,
  selected = false,
  className = "",
  type = "button",
  ...props
}: PillProps) {
  return (
    <button
      type={type}
      className={[
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5",
        "font-sans text-[12px] font-medium tracking-[-0.01em]",
        "transition active:scale-[0.98]",
        selected
          ? "bg-black text-white"
          : "border border-black/[0.07] bg-white text-black/50",
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
