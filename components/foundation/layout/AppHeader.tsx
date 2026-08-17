import type { ReactNode } from "react";

type AppHeaderProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
};

export default function AppHeader({
  title,
  eyebrow,
  action,
  className = "",
}: AppHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-30 border-b border-black/[0.05] bg-surface/90 px-4 backdrop-blur-xl ${className}`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
              {eyebrow}
            </p>
          )}

          <h1 className="mt-0.5 truncate text-xl font-bold tracking-[-0.025em]">
            {title}
          </h1>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
