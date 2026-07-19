import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

export default function PageContainer({
  children,
  className = "",
  compact = false,
}: PageContainerProps) {
  return (
    <main
      className={`
        en-page
        ${compact ? "" : "en-page-stack"}
        ${className}
      `}
    >
      {children}
    </main>
  );
}
