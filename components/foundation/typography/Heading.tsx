import { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type HeadingSize = "sm" | "md" | "lg";

type HeadingProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  size?: HeadingSize;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className" | "color"
>;

const sizeClasses: Record<HeadingSize, string> = {
  sm: "text-lg leading-snug",
  md: "text-xl leading-snug",
  lg: "text-2xl leading-tight sm:text-3xl",
};

export default function Heading<T extends ElementType = "h2">({
  as,
  children,
  className = "",
  size = "md",
  ...props
}: HeadingProps<T>) {
  const Component = as ?? "h2";

  return (
    <Component
      className={[
        "font-semibold tracking-tight text-black",
        sizeClasses[size],
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
