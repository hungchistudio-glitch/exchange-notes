import { HTMLAttributes, ReactNode } from "react";

type InlineGap = "none" | "xs" | "sm" | "md" | "lg" | "xl";
type InlineAlign = "start" | "center" | "end" | "baseline" | "stretch";
type InlineJustify =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around";

type InlineProps = {
  children: ReactNode;
  className?: string;
  gap?: InlineGap;
  align?: InlineAlign;
  justify?: InlineJustify;
  wrap?: boolean;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

const gapClasses: Record<InlineGap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
};

const alignClasses: Record<InlineAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  baseline: "items-baseline",
  stretch: "items-stretch",
};

const justifyClasses: Record<InlineJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

export default function Inline({
  children,
  className = "",
  gap = "md",
  align = "center",
  justify = "start",
  wrap = false,
  ...props
}: InlineProps) {
  return (
    <div
      className={[
        "flex",
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        wrap ? "flex-wrap" : "flex-nowrap",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
