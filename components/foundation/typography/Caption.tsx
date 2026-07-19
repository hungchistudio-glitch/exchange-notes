import { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type CaptionTone = "default" | "muted" | "subtle";

type CaptionProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  tone?: CaptionTone;
  uppercase?: boolean;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className" | "color"
>;

const toneClasses: Record<CaptionTone, string> = {
  default: "text-black",
  muted: "text-neutral-600",
  subtle: "text-neutral-500",
};

export default function Caption<T extends ElementType = "span">({
  as,
  children,
  className = "",
  tone = "muted",
  uppercase = false,
  ...props
}: CaptionProps<T>) {
  const Component = as ?? "span";

  return (
    <Component
      className={[
        "text-xs leading-5",
        uppercase ? "font-medium uppercase tracking-wider" : "font-normal",
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
