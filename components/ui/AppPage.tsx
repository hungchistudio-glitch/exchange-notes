import type { ReactNode } from "react";

type AppPageProps = {
  children: ReactNode;
  className?: string;
  width?: "compact" | "default" | "wide";
};

const widths = {
  compact: "max-w-lg",
  default: "max-w-xl",
  wide: "max-w-2xl",
};

export default function AppPage({
  children,
  className = "",
  width = "default",
}: AppPageProps) {
  return (
    <main className={`min-h-[100dvh] bg-white ${className}`}>
      <div className={`mx-auto min-h-[100dvh] w-full pb-28 ${widths[width]}`}>
        {children}
      </div>
    </main>
  );
}
