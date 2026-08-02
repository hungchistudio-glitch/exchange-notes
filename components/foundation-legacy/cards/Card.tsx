import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

type CardPadding =
  | "none"
  | "sm"
  | "md"
  | "lg";

type CardTone =
  | "default"
  | "secondary"
  | "elevated";

type CardProps<
  T extends ElementType = "div",
> = {
  as?: T;
  children: ReactNode;
  className?: string;
  padding?: CardPadding;
  tone?: CardTone;
  interactive?: boolean;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className"
>;

const paddingClasses: Record<
  CardPadding,
  string
> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

const toneClasses: Record<
  CardTone,
  string
> = {
  default:
    "bg-[var(--en-surface)]",
  secondary:
    "bg-[var(--en-surface-secondary)]",
  elevated:
    "bg-[var(--en-page-elevated)]",
};

export default function Card<
  T extends ElementType = "div",
>({
  as,
  children,
  className = "",
  padding = "md",
  tone = "default",
  interactive = false,
  ...props
}: CardProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
      className={[
        "rounded-[24px]",
        "border border-[var(--en-border)]",
        "text-[var(--en-text-primary)]",
        "shadow-[0_8px_22px_rgba(0,0,0,0.045)]",
        "transition-colors",
        toneClasses[tone],
        paddingClasses[padding],
        interactive
          ? [
              "transition-all duration-200",
              "hover:-translate-y-0.5",
              "hover:border-[var(--en-border-strong)]",
              "hover:bg-[var(--en-surface-hover)]",
              "hover:shadow-[0_12px_30px_rgba(0,0,0,0.09)]",
            ].join(" ")
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}
