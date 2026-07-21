import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
  padding?: CardPadding;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className"
>;

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export default function Card<T extends ElementType = "div">({
  as,
  children,
  className = "",
  padding = "md",
  ...props
}: CardProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
      className={[
        "rounded-[24px]",
        "border border-black/[0.07]",
        "bg-white",
        "shadow-[0_8px_22px_rgba(0,0,0,0.045)]",
        paddingClasses[padding],
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
