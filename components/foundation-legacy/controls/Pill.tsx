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
      /* Exposed so a stylesheet can tell the two states apart without the
         caller passing two different class names. Cosmic Mode is the first
         consumer (see .cosmic-chip in app/cosmic.css); nothing reads it in
         Standard Mode, where the classes below already say everything. */
      data-selected={selected ? "true" : "false"}
      className={[
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5",
        "font-sans text-[0.75rem] font-medium tracking-[-0.01em]",
        "transition active:scale-[0.98]",
        selected
          ? "bg-gradient-to-br from-[var(--accent-amber-soft)] to-[var(--accent-amber)] text-[var(--accent-amber-ink)] shadow-[0_2px_10px_rgba(201,150,46,0.35)]"
          : "border border-black/[0.07] bg-white text-ink-soft",
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
