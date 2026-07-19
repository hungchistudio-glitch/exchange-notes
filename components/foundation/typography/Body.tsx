import { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type BodySize = "sm" | "md" | "lg";
type BodyTone = "default" | "muted" | "subtle";

type BodyProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  size?: BodySize;
  tone?: BodyTone;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className" | "color"
>;

const sizeClasses: Record<BodySize, string> = {
  sm: "text-sm leading-6",
  md: "text-base leading-7",
  lg: "text-lg leading-8",
};

const toneClasses: Record<BodyTone, string> = {
  default: "text-black",
  muted: "text-neutral-600",
  subtle: "text-neutral-500",
};

export default function Body<T extends ElementType = "p">({
  as,
  children,
  className = "",
  size = "md",
  tone = "default",
  ...props
}: BodyProps<T>) {
  const Component = as ?? "p";

  return (
    <Component
      className={[
        "font-normal",
        sizeClasses[size],
        toneClasses[tone],
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
