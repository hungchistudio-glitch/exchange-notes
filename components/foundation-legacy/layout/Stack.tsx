import { HTMLAttributes, ReactNode } from "react";

type StackGap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type StackAlign = "stretch" | "start" | "center" | "end";

type StackProps = {
  children: ReactNode;
  className?: string;
  gap?: StackGap;
  align?: StackAlign;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

const gapClasses: Record<StackGap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
  "2xl": "gap-8",
};

const alignClasses: Record<StackAlign, string> = {
  stretch: "items-stretch",
  start: "items-start",
  center: "items-center",
  end: "items-end",
};

export default function Stack({
  children,
  className = "",
  gap = "lg",
  align = "stretch",
  ...props
}: StackProps) {
  return (
    <div
      className={[
        "flex flex-col",
        gapClasses[gap],
        alignClasses[align],
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
