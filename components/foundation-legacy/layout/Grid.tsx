import { HTMLAttributes, ReactNode } from "react";

type GridColumns = 1 | 2 | 3 | 4;
type GridGap = "none" | "sm" | "md" | "lg" | "xl";

type GridProps = {
  children: ReactNode;
  className?: string;
  columns?: GridColumns;
  gap?: GridGap;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

const columnClasses: Record<GridColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const gapClasses: Record<GridGap, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
};

export default function Grid({
  children,
  className = "",
  columns = 1,
  gap = "lg",
  ...props
}: GridProps) {
  return (
    <div
      className={[
        "grid",
        columnClasses[columns],
        gapClasses[gap],
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
