import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type AppHeaderProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  // A sub-screen of the page named here. Settings' Devices & Widgets and
  // Help & About are the first two; the dock stays where it is either way.
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
};

export default function AppHeader({
  title,
  eyebrow,
  action,
  backHref,
  onBack,
  backLabel,
  className = "",
}: AppHeaderProps) {
  return (
    <header
      // Named so the device-tier rules in globals.css can reach it — the
      // blur here is re-computed on every frame of every scroll.
      data-app-header
      className={`sticky top-0 z-30 border-b border-black/[0.05] bg-surface/90 px-4 backdrop-blur-xl ${className}`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex h-16 items-center justify-between gap-3">
        {backHref || onBack ? (
          onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-strong transition-colors duration-100 hover:bg-black/[0.04] active:bg-black/[0.07]"
            >
              <ArrowLeft size={20} strokeWidth={1.9} />
            </button>
          ) : (
            <Link
              href={backHref!}
              aria-label={backLabel}
              className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-strong transition-colors duration-100 hover:bg-black/[0.04] active:bg-black/[0.07]"
            >
              <ArrowLeft size={20} strokeWidth={1.9} />
            </Link>
          )
        ) : null}

        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
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
