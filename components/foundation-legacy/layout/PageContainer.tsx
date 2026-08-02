import { HTMLAttributes, ReactNode } from "react";

type PageContainerSize = "default" | "wide" | "full";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  size?: PageContainerSize;
  withBottomNavigationSpace?: boolean;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

const sizeClasses: Record<PageContainerSize, string> = {
  default: "mx-auto w-full max-w-2xl",
  wide: "mx-auto w-full max-w-5xl",
  full: "w-full",
};

export default function PageContainer({
  children,
  className = "",
  size = "default",
  withBottomNavigationSpace = true,
  ...props
}: PageContainerProps) {
  return (
    <main
      className={[
        sizeClasses[size],
        "px-4 sm:px-6",
        withBottomNavigationSpace ? "pb-28" : "pb-8",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </main>
  );
}
