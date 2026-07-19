import { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type DisplaySize = "sm" | "md" | "lg";

type DisplayProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  size?: DisplaySize;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className" | "color"
>;

const sizeClasses: Record<DisplaySize, string> = {
  sm: "text-3xl leading-tight tracking-tight sm:text-4xl",
  md: "text-4xl leading-tight tracking-tight sm:text-5xl",
  lg: "text-5xl leading-none tracking-tight sm:text-6xl",
};

export default function Display<T extends ElementType = "h1">({
  as,
  children,
  className = "",
  size = "md",
  ...props
}: DisplayProps<T>) {
  const Component = as ?? "h1";

  return (
    <Component
      className={[
        "font-semibold text-black",
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
